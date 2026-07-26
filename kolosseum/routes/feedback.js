/* ============================================================
   FEEDBACK-NOTIZEN
   Der Lernbegleiter diktiert freien Text zu einer Lernzeit; Claude
   teilt ihn nach Lernpartner:in auf, ordnet jedem Abschnitt eine
   Kategorie zu und legt ihn in deren Notizen-Historie ab.
   ============================================================ */

const express = require('express');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const { db } = require('../db/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

router.use(requireAdmin);

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 Minuten
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Anfragen. Bitte warte 10 Minuten.' }
});

const CATEGORIES = ['Fachlich', 'Sozial', 'Verhalten', 'Verbindlichkeit'];

function normalize(s) {
  return (s || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

// Ordnet eine von Claude gelieferte Kategorie der festen Kategorienliste zu
function matchCategory(raw) {
  const n = normalize(raw);
  return CATEGORIES.find(c => normalize(c) === n) || null;
}

// Ordnet einen von Claude gelieferten Namen der Lernpartner:innen-Liste der Gruppe zu.
// Gibt NIE eine geratene Zuordnung zurück: bei 0 oder >1 Treffern ist eine manuelle
// Klärung nötig (type "none"/"ambiguous"), damit nie versehentlich die falsche Person
// eine Notiz bekommt (z. B. bei zwei gleichnamigen Lernpartner:innen in der Gruppe).
function matchStudent(name, students) {
  const n = normalize(name);
  if (!n) return { type: 'none', candidates: [] };

  const exact = students.filter(s => normalize(`${s.first_name} ${s.last_name}`) === n);
  if (exact.length === 1) return { type: 'match', student: exact[0] };
  if (exact.length > 1) return { type: 'ambiguous', candidates: exact };

  const partial = students.filter(s => {
    const vorname = normalize(s.first_name);
    const nachname = normalize(s.last_name);
    return (vorname && n.includes(vorname)) || (nachname && n.includes(nachname));
  });
  if (partial.length === 1) return { type: 'match', student: partial[0] };
  if (partial.length > 1) return { type: 'ambiguous', candidates: partial };

  return { type: 'none', candidates: [] };
}

// GET /api/feedback/groups
router.get('/groups', (req, res) => {
  const groups = db.prepare('SELECT id, name, type FROM feedback_groups ORDER BY name').all();
  res.json(groups);
});

// POST /api/feedback/groups – neue Gruppe manuell anlegen
router.post('/groups', (req, res) => {
  const name = (req.body?.name || '').trim();
  const type = (req.body?.type || '').trim();

  if (!name) return res.status(400).json({ error: 'Gruppenname erforderlich.' });
  if (!type) return res.status(400).json({ error: 'Gruppentyp erforderlich.' });

  const exists = db.prepare('SELECT id FROM feedback_groups WHERE name = ?').get(name);
  if (exists) return res.status(409).json({ error: 'Eine Gruppe mit diesem Namen existiert bereits.' });

  const { lastInsertRowid } = db.prepare(
    'INSERT INTO feedback_groups (name, type) VALUES (?, ?)'
  ).run(name, type);

  res.status(201).json({ id: lastInsertRowid, name, type });
});

// POST /api/feedback/students – neue*n Lernpartner:in manuell zu einer Gruppe hinzufügen
router.post('/students', (req, res) => {
  const groupId = Number(req.body?.group_id);
  const firstName = (req.body?.first_name || '').trim();
  const lastName = (req.body?.last_name || '').trim();

  if (!groupId) return res.status(400).json({ error: 'Gruppe erforderlich.' });
  if (!firstName || !lastName) return res.status(400).json({ error: 'Vorname und Nachname erforderlich.' });

  const group = db.prepare('SELECT id FROM feedback_groups WHERE id = ?').get(groupId);
  if (!group) return res.status(404).json({ error: 'Gruppe nicht gefunden.' });

  const exists = db.prepare(
    'SELECT id FROM feedback_students WHERE first_name = ? AND last_name = ? AND group_id = ?'
  ).get(firstName, lastName, groupId);
  if (exists) return res.status(409).json({ error: 'Diese Person ist in dieser Gruppe bereits vorhanden.' });

  const { lastInsertRowid } = db.prepare(
    'INSERT INTO feedback_students (first_name, last_name, group_id) VALUES (?, ?, ?)'
  ).run(firstName, lastName, groupId);

  res.status(201).json({ id: lastInsertRowid, first_name: firstName, last_name: lastName, group_id: groupId });
});

// GET /api/feedback/groups/:id/students – Lernpartner:innen einer Gruppe
router.get('/groups/:id/students', (req, res) => {
  const groupId = Number(req.params.id);
  const group = db.prepare('SELECT id FROM feedback_groups WHERE id = ?').get(groupId);
  if (!group) return res.status(404).json({ error: 'Gruppe nicht gefunden.' });

  const students = db.prepare(
    'SELECT id, first_name, last_name FROM feedback_students WHERE group_id = ? ORDER BY last_name, first_name'
  ).all(groupId);

  res.json(students);
});

// POST /api/feedback/process – Diktat per Claude nach Lernpartner:in aufteilen und speichern
router.post('/process', limiter, async (req, res) => {
  const { text, group_id } = req.body;
  const groupId = Number(group_id);

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Diktat-Text fehlt.' });
  }
  if (!groupId) {
    return res.status(400).json({ error: 'Gruppe erforderlich.' });
  }

  const group = db.prepare('SELECT id, name FROM feedback_groups WHERE id = ?').get(groupId);
  if (!group) return res.status(404).json({ error: 'Gruppe nicht gefunden.' });

  const students = db.prepare(
    'SELECT id, first_name, last_name FROM feedback_students WHERE group_id = ?'
  ).all(groupId);

  if (students.length === 0) {
    return res.status(400).json({ error: 'Für diese Gruppe sind keine Lernpartner:innen hinterlegt.' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY fehlt in .env');
    return res.status(503).json({ error: 'Verarbeitung momentan nicht verfügbar.' });
  }

  const namenListe = students.map(s => `${s.first_name} ${s.last_name}`).join(', ');
  const systemPrompt =
    'Du bekommst einen diktierten Text eines Lehrers über eine Unterrichtsstunde sowie eine Liste ' +
    'von Schülernamen dieser Gruppe. Teile den Text in Abschnitte auf, die jeweils genau einem ' +
    'Schüler zugeordnet werden können. Ordne jedem Abschnitt zusätzlich GENAU EINE der folgenden ' +
    'Kategorien zu: "Fachlich" (fachliche Leistungen, Lernfortschritt, Mitarbeit im Fach), ' +
    '"Sozial" (Umgang mit Mitschüler:innen, Zusammenarbeit, Konflikte), "Verhalten" (Verhalten im ' +
    'Unterricht, Aufmerksamkeit, Störungen), "Verbindlichkeit" (Zuverlässigkeit, erledigte Aufgaben, ' +
    'Pünktlichkeit, Absprachen). Gib im Feld "student_name" GENAU den Namen so wieder, wie er im ' +
    'Text erwähnt wurde (z. B. nur den Vornamen, falls nur dieser genannt wurde) – erfinde oder ' +
    'ergänze den Namen NICHT und entscheide NICHT selbst, welche Person aus der Liste gemeint ist, ' +
    'falls der genannte Name mehrdeutig sein könnte (z. B. weil es zwei Personen mit ähnlichem ' +
    'Namen gibt) – das übernimmt eine andere Stelle. Gib NUR JSON zurück, ohne Markdown-Codeblock, ' +
    'im Format: [{"student_name": "...", "category": "...", "text": "..."}]. Wenn eine Kategorie ' +
    'nicht eindeutig ist, wähle die am ehesten passende.';
  const userPrompt = `Schülerliste dieser Gruppe: ${namenListe}\n\nDiktierter Text:\n${text.trim()}`;

  let segments;
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Anthropic-Fehler:', data);
      return res.status(502).json({ error: 'Fehler bei der Verarbeitung.' });
    }

    const raw = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n')
      .trim();
    const jsonText = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();

    segments = JSON.parse(jsonText);
    if (!Array.isArray(segments)) throw new Error('Antwort ist kein Array.');
  } catch (err) {
    console.error('Feedback-Verarbeitung Fehler:', err);
    return res.status(502).json({ error: 'Antwort konnte nicht verarbeitet werden.' });
  }

  const heute = new Date().toISOString().slice(0, 10);
  const gespeichert = [];
  const zuKlaeren = [];

  const speichern = db.transaction(() => {
    const { lastInsertRowid: rawInputId } = db.prepare(
      "INSERT INTO feedback_raw_inputs (full_text, group_id, created_at) VALUES (?, ?, datetime('now'))"
    ).run(text.trim(), groupId);

    for (const segment of segments) {
      const segText = (segment?.text || '').trim();
      if (!segText) continue;

      const category = matchCategory(segment?.category);
      const result = matchStudent(segment?.student_name, students);

      if (result.type === 'match') {
        db.prepare(
          "INSERT INTO feedback_notes (student_id, group_id, date, text, category, raw_input_id, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))"
        ).run(result.student.id, groupId, heute, segText, category, rawInputId);
        gespeichert.push({ student_id: result.student.id, name: `${result.student.first_name} ${result.student.last_name}`, category });
        continue;
      }

      // Mehrdeutig oder gar nicht erkannt: NICHT automatisch zuordnen, sondern zur
      // manuellen Klärung ablegen (feedback_pending_notes) – keine Rate-Zuordnung.
      const { lastInsertRowid: pendingId } = db.prepare(
        "INSERT INTO feedback_pending_notes (group_id, date, text, category, mentioned_name, candidate_student_ids, raw_input_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))"
      ).run(groupId, heute, segText, category, segment?.student_name || null, JSON.stringify(result.candidates.map(c => c.id)), rawInputId);
      zuKlaeren.push({
        pending_id: pendingId,
        mentioned_name: segment?.student_name || '(unbekannt)',
        category,
        text: segText,
        kandidaten: result.candidates.map(c => ({ id: c.id, name: `${c.first_name} ${c.last_name}` }))
      });
    }

    return rawInputId;
  });

  const rawInputId = speichern();

  res.json({ ok: true, raw_input_id: rawInputId, gespeichert, zu_klaeren: zuKlaeren });
});

// GET /api/feedback/pending – offene, noch nicht zugeordnete Notiz-Abschnitte
// (optional gefiltert nach group_id; sonst gruppenübergreifend)
router.get('/pending', (req, res) => {
  const groupId = req.query.group_id ? Number(req.query.group_id) : null;
  const rows = groupId
    ? db.prepare(
        `SELECT p.id, p.group_id, g.name AS group_name, p.date, p.text, p.category,
                p.mentioned_name, p.candidate_student_ids, p.created_at
         FROM feedback_pending_notes p JOIN feedback_groups g ON g.id = p.group_id
         WHERE p.group_id = ? ORDER BY p.created_at DESC`
      ).all(groupId)
    : db.prepare(
        `SELECT p.id, p.group_id, g.name AS group_name, p.date, p.text, p.category,
                p.mentioned_name, p.candidate_student_ids, p.created_at
         FROM feedback_pending_notes p JOIN feedback_groups g ON g.id = p.group_id
         ORDER BY p.created_at DESC`
      ).all();

  res.json(rows.map(r => ({ ...r, candidate_student_ids: JSON.parse(r.candidate_student_ids || '[]') })));
});

// POST /api/feedback/pending/:id/resolve – offene Zuordnung klären:
// entweder { student_id } (speichert die Notiz für diese Person) oder { discard: true } (verwirft sie)
router.post('/pending/:id/resolve', (req, res) => {
  const id = Number(req.params.id);
  const pending = db.prepare('SELECT * FROM feedback_pending_notes WHERE id = ?').get(id);
  if (!pending) return res.status(404).json({ error: 'Offene Zuordnung nicht gefunden.' });

  if (req.body?.discard) {
    db.prepare('DELETE FROM feedback_pending_notes WHERE id = ?').run(id);
    return res.json({ ok: true, discarded: true });
  }

  const studentId = Number(req.body?.student_id);
  if (!studentId) return res.status(400).json({ error: 'student_id oder discard erforderlich.' });

  const student = db.prepare(
    'SELECT id, first_name, last_name FROM feedback_students WHERE id = ? AND group_id = ?'
  ).get(studentId, pending.group_id);
  if (!student) return res.status(400).json({ error: 'Ungültige Lernpartner:in für diese Gruppe.' });

  const speichern = db.transaction(() => {
    db.prepare(
      "INSERT INTO feedback_notes (student_id, group_id, date, text, category, raw_input_id, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))"
    ).run(student.id, pending.group_id, pending.date, pending.text, pending.category, pending.raw_input_id);
    db.prepare('DELETE FROM feedback_pending_notes WHERE id = ?').run(id);
  });
  speichern();

  res.json({ ok: true, student: { id: student.id, name: `${student.first_name} ${student.last_name}` } });
});

// GET /api/feedback/students/:id/notes – chronologische Notizen-Historie
router.get('/students/:id/notes', (req, res) => {
  const id = Number(req.params.id);
  const student = db.prepare(
    'SELECT id, first_name, last_name FROM feedback_students WHERE id = ?'
  ).get(id);
  if (!student) return res.status(404).json({ error: 'Lernpartner:in nicht gefunden.' });

  const notes = db.prepare(
    'SELECT id, date, text, category, group_id, created_at FROM feedback_notes WHERE student_id = ? ORDER BY date DESC, created_at DESC'
  ).all(id);

  res.json({ student, notes });
});

// POST /api/feedback/students/import – CSV-Import (Spalten: Vorname, Nachname, Gruppe)
router.post('/students/import', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Keine Datei hochgeladen.' });

  const lines = req.file.buffer.toString('utf8').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return res.status(400).json({ error: 'Datei enthält keine Datenzeilen.' });

  const delimiter = lines[0].includes(';') ? ';' : ',';
  const header = lines[0].split(delimiter).map(h => h.trim().toLowerCase());
  const idxVorname = header.indexOf('vorname');
  const idxNachname = header.indexOf('nachname');
  const idxGruppe = header.indexOf('gruppe');

  if (idxVorname === -1 || idxNachname === -1 || idxGruppe === -1) {
    return res.status(400).json({ error: 'Spalten "Vorname", "Nachname", "Gruppe" erwartet.' });
  }

  let createdGroups = 0;
  let createdStudents = 0;
  let skipped = 0;
  const groupCache = new Map();

  const importieren = db.transaction(() => {
    for (const line of lines.slice(1)) {
      const cols = line.split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''));
      const vorname = cols[idxVorname];
      const nachname = cols[idxNachname];
      const gruppe = cols[idxGruppe];
      if (!vorname || !nachname || !gruppe) { skipped++; continue; }

      let groupId = groupCache.get(gruppe);
      if (groupId === undefined) {
        let row = db.prepare('SELECT id FROM feedback_groups WHERE name = ?').get(gruppe);
        if (!row) {
          const { lastInsertRowid } = db.prepare(
            'INSERT INTO feedback_groups (name, type) VALUES (?, ?)'
          ).run(gruppe, 'Lernbüro');
          row = { id: lastInsertRowid };
          createdGroups++;
        }
        groupId = row.id;
        groupCache.set(gruppe, groupId);
      }

      const exists = db.prepare(
        'SELECT id FROM feedback_students WHERE first_name = ? AND last_name = ? AND group_id = ?'
      ).get(vorname, nachname, groupId);
      if (exists) { skipped++; continue; }

      db.prepare(
        'INSERT INTO feedback_students (first_name, last_name, group_id) VALUES (?, ?, ?)'
      ).run(vorname, nachname, groupId);
      createdStudents++;
    }
  });

  importieren();

  res.json({ ok: true, created_groups: createdGroups, created_students: createdStudents, skipped });
});

module.exports = router;
