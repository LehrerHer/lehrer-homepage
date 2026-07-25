/* ============================================================
   FEEDBACK-NOTIZEN – Minimalversion
   Der Lernbegleiter diktiert freien Text zu einer Lernzeit; Claude
   teilt ihn nach Lernpartner:in auf und legt die Abschnitte in deren
   Notizen-Historie ab. Kategorien/Tags folgen später (siehe CLAUDE.md).
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

function normalize(s) {
  return (s || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

// Ordnet einen von Claude gelieferten Namen der Lernpartner:innen-Liste der Gruppe zu
function matchStudent(name, students) {
  const n = normalize(name);
  if (!n) return null;

  let hit = students.find(s => normalize(`${s.first_name} ${s.last_name}`) === n);
  if (hit) return hit;

  return students.find(s => {
    const vorname = normalize(s.first_name);
    const nachname = normalize(s.last_name);
    return (vorname && n.includes(vorname)) || (nachname && n.includes(nachname));
  }) || null;
}

// GET /api/feedback/groups
router.get('/groups', (req, res) => {
  const groups = db.prepare('SELECT id, name, type FROM feedback_groups ORDER BY name').all();
  res.json(groups);
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
    'Schüler zugeordnet werden können. Gib NUR JSON zurück, ohne Markdown-Codeblock, im Format: ' +
    '[{"student_name": "...", "text": "..."}]. Wenn ein Name nicht eindeutig aus der Liste ' +
    'zuordenbar ist, nutze trotzdem den wahrscheinlichsten Treffer.';
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
  const nichtZugeordnet = [];

  const speichern = db.transaction(() => {
    const { lastInsertRowid: rawInputId } = db.prepare(
      "INSERT INTO feedback_raw_inputs (full_text, group_id, created_at) VALUES (?, ?, datetime('now'))"
    ).run(text.trim(), groupId);

    for (const segment of segments) {
      const segText = (segment?.text || '').trim();
      if (!segText) continue;

      const match = matchStudent(segment?.student_name, students);
      if (!match) {
        nichtZugeordnet.push({ student_name: segment?.student_name || '(unbekannt)', text: segText });
        continue;
      }

      db.prepare(
        "INSERT INTO feedback_notes (student_id, group_id, date, text, raw_input_id, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))"
      ).run(match.id, groupId, heute, segText, rawInputId);
      gespeichert.push({ student_id: match.id, name: `${match.first_name} ${match.last_name}` });
    }

    return rawInputId;
  });

  const rawInputId = speichern();

  res.json({ ok: true, raw_input_id: rawInputId, gespeichert, nicht_zugeordnet: nichtZugeordnet });
});

// GET /api/feedback/students/:id/notes – chronologische Notizen-Historie
router.get('/students/:id/notes', (req, res) => {
  const id = Number(req.params.id);
  const student = db.prepare(
    'SELECT id, first_name, last_name FROM feedback_students WHERE id = ?'
  ).get(id);
  if (!student) return res.status(404).json({ error: 'Lernpartner:in nicht gefunden.' });

  const notes = db.prepare(
    'SELECT id, date, text, group_id, created_at FROM feedback_notes WHERE student_id = ? ORDER BY date DESC, created_at DESC'
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
