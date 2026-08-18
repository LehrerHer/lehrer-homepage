/* ============================================================
   VOKABELTRAINER
   Erfassen (Text/PDF/Foto → Claude-Extraktion), Speichern in
   Vokabelpaketen, sowie Lernoptionen (Karteikarten, Abfrage,
   Spaced Repetition, KI-generierte Mnemotechniken).

   Sichtbarkeit "familie" bedeutet: für alle eingeloggten
   Lernpartner:innen sichtbar (dieses System kennt keinen eigenen
   Familien-Account, nur individuelle Schüler:innen-Accounts).
   "einzeln" bedeutet: nur für die Erstellerin/den Ersteller sichtbar.
   ============================================================ */

const express = require('express');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const { db } = require('../db/database');
const { requireStudent } = require('../middleware/auth');
const { checkAndAwardBadges } = require('../db/badges');

const router = express.Router();

const VALID_SPRACHEN = ['Englisch', 'Französisch', 'Spanisch', 'Latein'];
const VALID_SICHTBARKEIT = ['familie', 'einzeln'];
const VALID_GENERIEREN_TYPEN = ['kontextsatz', 'luekentext', 'quiz', 'keyword', 'story', 'loci'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ALLOWED = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (ALLOWED.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Dateityp nicht erlaubt (erlaubt: PDF, JPG, PNG, WEBP).'));
  },
});

const limiterExtrahieren = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Anfragen. Bitte warte 10 Minuten.' },
});

const limiterGenerieren = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Anfragen. Bitte warte 10 Minuten.' },
});

/* ── Claude-API-Hilfsfunktionen ──────────────────────────────── */

async function callClaude({ model, maxTokens, system, userContent, tools }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw Object.assign(new Error('ANTHROPIC_API_KEY fehlt in .env'), { configMissing: true });
  }

  const body = {
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: userContent }],
  };
  if (tools) body.tools = tools;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error('Anthropic-Fehler:', data);
    throw Object.assign(new Error('Anthropic-API-Fehler'), { apiError: true });
  }

  const text = (data.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();

  return { text, stopReason: data.stop_reason };
}

const ABGESCHNITTEN_FEHLER =
  'Die Quelle enthält zu viele Vokabeln für eine einzelne Verarbeitung. Bitte in kleinere Abschnitte ' +
  'aufteilen (z. B. einzelne Kapitel oder Seiten) und einzeln hochladen.';

// Robust gegen führende/nachgestellte Markdown-Codeblöcke und gegen
// erklärenden Text vor/nach dem eigentlichen JSON (z. B. wenn Claude vor
// einer Websuche noch einen Zwischen-Text ausgibt).
function extractJson(raw) {
  const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  try {
    return JSON.parse(stripped);
  } catch (e) {
    const firstObj = stripped.indexOf('{');
    const firstArr = stripped.indexOf('[');
    const first = firstObj === -1 ? firstArr : (firstArr === -1 ? firstObj : Math.min(firstObj, firstArr));
    const last = Math.max(stripped.lastIndexOf('}'), stripped.lastIndexOf(']'));
    if (first !== -1 && last !== -1 && last > first) {
      return JSON.parse(stripped.slice(first, last + 1));
    }
    throw e;
  }
}

function buildFileBlock(file) {
  const data = file.buffer.toString('base64');
  if (file.mimetype === 'application/pdf') {
    return { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } };
  }
  return { type: 'image', source: { type: 'base64', media_type: file.mimetype, data } };
}

function buildExtraktionsPrompt(spracheEingabe) {
  const spracheHinweis = spracheEingabe
    ? `Die Sprache wurde von der Nutzerin/dem Nutzer als "${spracheEingabe}" angegeben – verwende diese für "sprache_erkannt", sofern die Quelle nicht eindeutig widerspricht.`
    : 'Aus der Quelle wurde keine Sprache vorgegeben – bestimme sie, falls eindeutig erkennbar.';

  return [
    'Du hilfst dabei, Vokabeln aus einer Quelle (eingegebener Text, Foto einer Buchseite/Karteikarte oder PDF-Vokabelliste) ',
    'für den Vokabeltrainer von lehrer-herrmann.de zu extrahieren. Sprachrichtung: Fremdsprache ↔ Deutsch.',
    '',
    'REGELN (unbedingt einhalten):',
    '1. Erfinde NIEMALS eine Vokabel oder Übersetzung, die nicht eindeutig in der Quelle erkennbar ist.',
    '2. Wenn eine Vokabel, Übersetzung oder ein Beispielsatz erkennbar abgeschnitten, unscharf oder unklar ist: setze ',
    '   "unsicher": true und beschreibe in "hinweis" kurz, was unklar ist. Nutze in diesem Fall das Websuche-Werkzeug, ',
    '   um die wahrscheinliche korrekte Vokabel/Übersetzung nachzuschlagen (z. B. bei einem bekannten Lehrwerk), und ',
    '   trage einen konkreten Vorschlag in "vorschlag" ein – markiere den Eintrag trotzdem weiter als "unsicher": true, ',
    '   damit er von der Nutzerin/dem Nutzer bestätigt werden muss. Liefert auch die Websuche keinen eindeutigen ',
    '   Vorschlag, lass "vorschlag" leer (null).',
    '3. Wenn aus der Quelle nicht eindeutig hervorgeht, um welche Fremdsprache es sich handelt, und auch keine Sprache ',
    '   vorgegeben wurde, setze "sprache_erkannt" auf null und "sprache_unsicher": true, anstatt zu raten.',
    '4. Bei Latein: erfasse zu jedem Verb die Grundformen (1. Person Singular Präsens, Infinitiv, Perfekt, Supin) und zu ',
    '   jedem Substantiv Nominativ, Genitiv und Genus – so weit sie in der Quelle stehen oder eindeutig per Websuche zu ',
    '   ergänzen sind (dann ebenfalls "unsicher": true setzen, falls per Websuche ergänzt).',
    '5. Prüfe bei jeder Vokabel automatisch auf "falsche Freunde" – Wörter, deren Fremdsprachenform der deutschen ',
    '   Bedeutung ähnelt, aber etwas anderes bedeutet (z. B. engl. "gift" ≠ dt. "Gift", franz. "actuellement" ≠ dt. ',
    '   "aktuell"). Falls ja, trage eine kurze Warnung in zusatzinfo.falscherFreund ein, sonst null.',
    `6. ${spracheHinweis}`,
    '7. Gib AUSSCHLIESSLICH JSON zurück, ohne Markdown-Codeblock, exakt in diesem Format:',
    '{',
    '  "sprache_erkannt": "Englisch" | "Französisch" | "Spanisch" | "Latein" | null,',
    '  "sprache_unsicher": true|false,',
    '  "vokabeln": [',
    '    {',
    '      "fremdsprache": "...",',
    '      "deutsch": "...",',
    '      "unsicher": true|false,',
    '      "hinweis": "..." (nur bei unsicher: true, sonst Feld weglassen),',
    '      "vorschlag": "..." (nur bei unsicher: true UND vorhandenem Vorschlag, sonst Feld weglassen),',
    '      "zusatzinfo": { ... } (nur bei Latein-Grundformen, Artikel oder falschem Freund, sonst Feld komplett weglassen)',
    '    }',
    '  ]',
    '}',
    'zusatzinfo, falls vorhanden, nur mit den tatsächlich benötigten Schlüsseln füllen (z. B. nur "artikel", oder nur ',
    '"typ"+"grundformen" bei Latein-Verben, oder nur "typ"+"nominativ"+"genitiv"+"genus" bei Latein-Substantiven, oder ',
    'nur "falscherFreund"). WICHTIG bei langen Listen: Halte die Antwort so knapp wie möglich – lasse "hinweis", ',
    '"vorschlag" und "zusatzinfo" bei jeder Vokabel, die sie nicht braucht, KOMPLETT WEG (nicht mit null befüllen), ',
    'damit auch sehr lange Vokabellisten vollständig in einer Antwort Platz finden.',
  ].join('\n');
}

/* ── POST /api/vokabeltrainer/extrahieren ────────────────────── */

router.post('/extrahieren', requireStudent, limiterExtrahieren, (req, res) => {
  upload.single('datei')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    try {
      await handleExtrahieren(req, res);
    } catch (e) {
      console.error('Vokabeltrainer-Extraktion Fehler:', e);
      res.status(503).json({ error: 'Verarbeitung momentan nicht verfügbar.' });
    }
  });
});

async function handleExtrahieren(req, res) {
  const spracheEingabe = (req.body.sprache || '').trim();
  const text = (req.body.text || '').trim();
  const file = req.file;

  if (spracheEingabe && !VALID_SPRACHEN.includes(spracheEingabe)) {
    return res.status(400).json({ error: 'Ungültige Sprache.' });
  }
  if (!text && !file) {
    return res.status(400).json({ error: 'Bitte Text eingeben oder eine Datei (PDF/Bild) hochladen.' });
  }

  const userContent = [];
  if (file) userContent.push(buildFileBlock(file));
  if (text) userContent.push({ type: 'text', text: 'Vokabelliste (eingegeben):\n' + text });
  if (!text && file) {
    userContent.push({ type: 'text', text: 'Extrahiere die Vokabeln aus dem angehängten Dokument/Bild.' });
  }

  let result;
  try {
    result = await callClaude({
      model: 'claude-sonnet-4-6',
      maxTokens: 16000,
      system: buildExtraktionsPrompt(spracheEingabe),
      userContent,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }],
    });
  } catch (e) {
    return res.status(503).json({ error: 'Verarbeitung momentan nicht verfügbar.' });
  }

  let parsed;
  try {
    parsed = extractJson(result.text);
  } catch (e) {
    if (result.stopReason === 'max_tokens') {
      console.error('Vokabeltrainer-Extraktion: Antwort durch max_tokens abgeschnitten.');
      return res.status(422).json({ error: ABGESCHNITTEN_FEHLER });
    }
    console.error('Vokabeltrainer: Antwort konnte nicht geparst werden:', result.text);
    return res.status(502).json({ error: 'Antwort konnte nicht verarbeitet werden. Bitte erneut versuchen.' });
  }

  const rohVokabeln = Array.isArray(parsed?.vokabeln) ? parsed.vokabeln : [];
  const vokabeln = rohVokabeln
    .map((v) => ({
      fremdsprache: typeof v?.fremdsprache === 'string' ? v.fremdsprache.trim() : '',
      deutsch: typeof v?.deutsch === 'string' ? v.deutsch.trim() : '',
      unsicher: !!v?.unsicher,
      hinweis: typeof v?.hinweis === 'string' && v.hinweis.trim() ? v.hinweis.trim() : null,
      vorschlag: typeof v?.vorschlag === 'string' && v.vorschlag.trim() ? v.vorschlag.trim() : null,
      zusatzinfo: (v && typeof v.zusatzinfo === 'object' && v.zusatzinfo !== null) ? v.zusatzinfo : null,
    }))
    .filter((v) => v.fremdsprache || v.deutsch || v.hinweis || v.vorschlag);

  const spracheErkannt = VALID_SPRACHEN.includes(parsed?.sprache_erkannt) ? parsed.sprache_erkannt : null;

  res.json({
    sprache: spracheEingabe || spracheErkannt,
    spracheUnsicher: !spracheEingabe && (!!parsed?.sprache_unsicher || !spracheErkannt),
    vokabeln,
  });
}

/* ── POST /api/vokabeltrainer/pakete – bestätigtes Paket speichern ── */

router.post('/pakete', requireStudent, (req, res) => {
  const studentId = req.session.studentId;
  const sprache = (req.body?.sprache || '').trim();
  const quelle = (req.body?.quelle || '').trim();
  const sichtbarkeit = (req.body?.sichtbarkeit || '').trim();
  const eingabeVokabeln = Array.isArray(req.body?.vokabeln) ? req.body.vokabeln : [];

  if (!VALID_SPRACHEN.includes(sprache)) return res.status(400).json({ error: 'Ungültige Sprache.' });
  if (!quelle) return res.status(400).json({ error: 'Quelle ist ein Pflichtfeld.' });
  if (!VALID_SICHTBARKEIT.includes(sichtbarkeit)) return res.status(400).json({ error: 'Ungültige Sichtbarkeit.' });

  const vokabeln = eingabeVokabeln
    .map((v) => ({
      fremdsprache: typeof v?.fremdsprache === 'string' ? v.fremdsprache.trim() : '',
      deutsch: typeof v?.deutsch === 'string' ? v.deutsch.trim() : '',
      zusatzinfo: (v && typeof v.zusatzinfo === 'object' && v.zusatzinfo !== null) ? v.zusatzinfo : null,
    }))
    .filter((v) => v.fremdsprache && v.deutsch);

  if (vokabeln.length === 0) {
    return res.status(400).json({ error: 'Mindestens eine vollständige Vokabel (Fremdsprache + Deutsch) erforderlich.' });
  }

  const insertPaket = db.prepare(
    'INSERT INTO vokabelpakete (sprache, quelle, ersteller_id, sichtbarkeit) VALUES (?, ?, ?, ?)'
  );
  const insertVokabel = db.prepare(
    'INSERT INTO vokabeln (paket_id, fremdsprache, deutsch, zusatzinfo) VALUES (?, ?, ?, ?)'
  );

  const speichern = db.transaction(() => {
    const { lastInsertRowid: paketId } = insertPaket.run(sprache, quelle, studentId, sichtbarkeit);
    const gespeichert = vokabeln.map((v) => {
      const { lastInsertRowid } = insertVokabel.run(
        paketId, v.fremdsprache, v.deutsch, v.zusatzinfo ? JSON.stringify(v.zusatzinfo) : null
      );
      return { id: lastInsertRowid, fremdsprache: v.fremdsprache, deutsch: v.deutsch, zusatzinfo: v.zusatzinfo };
    });
    return { paketId, gespeichert };
  });

  const { paketId, gespeichert } = speichern();

  res.status(201).json({
    id: paketId,
    sprache,
    quelle,
    sichtbarkeit,
    erstellerId: studentId,
    vokabeln: gespeichert,
  });
});

/* ── GET /api/vokabeltrainer/pakete – eigene + „familie"-Pakete auflisten ── */

router.get('/pakete', requireStudent, (req, res) => {
  const studentId = req.session.studentId;
  const { sprache, quelle, q } = req.query;

  let sql = `
    SELECT p.id, p.sprache, p.quelle, p.sichtbarkeit, p.ersteller_id, p.erstellt_am,
           s.nick AS ersteller_nick, COUNT(v.id) AS anzahl_vokabeln
    FROM vokabelpakete p
    JOIN students s ON s.id = p.ersteller_id
    LEFT JOIN vokabeln v ON v.paket_id = p.id
    WHERE (p.ersteller_id = ? OR p.sichtbarkeit = 'familie')
  `;
  const params = [studentId];

  if (sprache) {
    if (!VALID_SPRACHEN.includes(sprache)) return res.status(400).json({ error: 'Ungültige Sprache.' });
    sql += ' AND p.sprache = ?';
    params.push(sprache);
  }
  if (quelle) {
    sql += ' AND p.quelle LIKE ?';
    params.push('%' + quelle + '%');
  }
  if (q) {
    sql += ' AND (p.quelle LIKE ? OR p.sprache LIKE ?)';
    params.push('%' + q + '%', '%' + q + '%');
  }

  sql += ' GROUP BY p.id ORDER BY p.erstellt_am DESC';

  const rows = db.prepare(sql).all(...params);
  res.json(rows.map((r) => ({
    id: r.id,
    sprache: r.sprache,
    quelle: r.quelle,
    sichtbarkeit: r.sichtbarkeit,
    erstellerNick: r.ersteller_nick,
    eigenes: r.ersteller_id === studentId,
    anzahlVokabeln: r.anzahl_vokabeln,
    erstelltAm: r.erstellt_am,
  })));
});

/* ── GET /api/vokabeltrainer/pakete/:id – Detail inkl. eigenem Fortschritt ── */

router.get('/pakete/:id', requireStudent, (req, res) => {
  const studentId = req.session.studentId;
  const paketId = Number(req.params.id);
  if (!Number.isInteger(paketId)) return res.status(400).json({ error: 'Ungültige Paket-ID.' });

  const paket = db.prepare(
    `SELECT p.*, s.nick AS ersteller_nick FROM vokabelpakete p
     JOIN students s ON s.id = p.ersteller_id WHERE p.id = ?`
  ).get(paketId);
  if (!paket) return res.status(404).json({ error: 'Paket nicht gefunden.' });
  if (paket.ersteller_id !== studentId && paket.sichtbarkeit !== 'familie') {
    return res.status(403).json({ error: 'Kein Zugriff auf dieses Paket.' });
  }

  const vokabeln = db.prepare(
    `SELECT v.id, v.fremdsprache, v.deutsch, v.zusatzinfo,
            f.leitner_box, f.letzte_antwort_richtig, f.naechste_wiederholung
     FROM vokabeln v
     LEFT JOIN vokabel_fortschritt f ON f.vokabel_id = v.id AND f.student_id = ?
     WHERE v.paket_id = ?
     ORDER BY v.id`
  ).all(studentId, paketId);

  res.json({
    id: paket.id,
    sprache: paket.sprache,
    quelle: paket.quelle,
    sichtbarkeit: paket.sichtbarkeit,
    erstellerNick: paket.ersteller_nick,
    eigenes: paket.ersteller_id === studentId,
    erstelltAm: paket.erstellt_am,
    vokabeln: vokabeln.map((v) => ({
      id: v.id,
      fremdsprache: v.fremdsprache,
      deutsch: v.deutsch,
      zusatzinfo: v.zusatzinfo ? JSON.parse(v.zusatzinfo) : null,
      leitnerBox: v.leitner_box || 1,
      letzteAntwortRichtig: v.letzte_antwort_richtig === null ? null : !!v.letzte_antwort_richtig,
      naechsteWiederholung: v.naechste_wiederholung || null,
    })),
  });
});

/* ── POST /api/vokabeltrainer/fortschritt – Leitner-Box-Update ── */

const LEITNER_INTERVALL_TAGE = { 1: 0, 2: 1, 3: 3, 4: 7, 5: 14 };

function naechsteWiederholungFuer(box) {
  const tage = LEITNER_INTERVALL_TAGE[box] ?? 14;
  const d = new Date();
  d.setDate(d.getDate() + tage);
  return d.toISOString();
}

router.post('/fortschritt', requireStudent, (req, res) => {
  const studentId = req.session.studentId;
  const vokabelId = Number(req.body?.vokabelId);
  const richtig = !!req.body?.richtig;

  if (!Number.isInteger(vokabelId)) return res.status(400).json({ error: 'Ungültige Vokabel-ID.' });

  const vokabel = db.prepare(
    `SELECT v.id, v.fremdsprache, p.ersteller_id, p.sichtbarkeit
     FROM vokabeln v JOIN vokabelpakete p ON p.id = v.paket_id WHERE v.id = ?`
  ).get(vokabelId);
  if (!vokabel) return res.status(404).json({ error: 'Vokabel nicht gefunden.' });
  if (vokabel.ersteller_id !== studentId && vokabel.sichtbarkeit !== 'familie') {
    return res.status(403).json({ error: 'Kein Zugriff auf diese Vokabel.' });
  }

  const bestehend = db.prepare(
    'SELECT leitner_box, xp_vergeben FROM vokabel_fortschritt WHERE student_id = ? AND vokabel_id = ?'
  ).get(studentId, vokabelId);

  const bisherigeBox = bestehend?.leitner_box || 1;
  const bereitsXp = bestehend?.xp_vergeben || 0;
  const neueBox = richtig ? Math.min(bisherigeBox + 1, 5) : 1;
  const meisterung = richtig && neueBox === 5 && !bereitsXp;
  const naechste = naechsteWiederholungFuer(neueBox);

  db.prepare(`
    INSERT INTO vokabel_fortschritt
      (student_id, vokabel_id, leitner_box, letzte_antwort_richtig, naechste_wiederholung, xp_vergeben, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(student_id, vokabel_id) DO UPDATE SET
      leitner_box = excluded.leitner_box,
      letzte_antwort_richtig = excluded.letzte_antwort_richtig,
      naechste_wiederholung = excluded.naechste_wiederholung,
      xp_vergeben = excluded.xp_vergeben,
      updated_at = excluded.updated_at
  `).run(studentId, vokabelId, neueBox, richtig ? 1 : 0, naechste, bereitsXp || (meisterung ? 1 : 0));

  let xpEarned = 0;
  if (meisterung) {
    xpEarned = 3;
    db.prepare('UPDATE students SET xp = xp + ?, last_active = CURRENT_TIMESTAMP WHERE id = ?')
      .run(xpEarned, studentId);
    db.prepare('INSERT INTO xp_log (student_id, amount, reason) VALUES (?, ?, ?)')
      .run(studentId, xpEarned, 'Vokabel gemeistert: ' + vokabel.fremdsprache.slice(0, 60));
    checkAndAwardBadges(studentId);
  }

  res.json({ leitnerBox: neueBox, naechsteWiederholung: naechste, xpEarned, gemeistert: meisterung });
});

/* ── POST /api/vokabeltrainer/generieren – Sammelroute für Mnemotechniken/Kontext ── */

function buildGenerierenPrompt(typ) {
  switch (typ) {
    case 'kontextsatz':
      return 'Du erstellst zu vorgegebenen Fremdsprachen-Vokabeln (mit deutscher Übersetzung) je einen kurzen, ' +
        'altersgerechten Beispielsatz in der Fremdsprache, der das Wort im Kontext zeigt. Erfinde keine neuen ' +
        'Vokabeln, nutze ausschließlich die vorgegebene Liste. Gib AUSSCHLIESSLICH JSON zurück, ohne ' +
        'Markdown-Codeblock, im Format: [{"fremdsprache":"...","satz":"...","satzDeutsch":"..."}]. "satzDeutsch" ' +
        'ist eine kurze deutsche Übersetzung des Beispielsatzes. Ein Eintrag pro Vokabel.';
    case 'luekentext':
      return 'Du erstellst zu einer Vokabelliste einen zusammenhängenden, kurzen Lückentext (Fließtext) in der ' +
        'Fremdsprache der Liste, in den JEDES Wort der Liste mindestens einmal als Lücke eingesetzt werden muss. ' +
        'Der Text soll thematisch sinnvoll und auf dem Sprachniveau der Vokabeln sein. Gib AUSSCHLIESSLICH JSON ' +
        'zurück, ohne Markdown-Codeblock, im Format: {"text":"... ___1___ ...","luecken":[{"nummer":1,' +
        '"loesung":"..."}]}. Nummeriere die Lücken im Text durchgehend als ___1___, ___2___ usw. Für jede Vokabel ' +
        'der Liste muss es mindestens eine Lücke geben.';
    case 'quiz':
      return 'Du erstellst aus einer Vokabelliste Multiple-Choice-Fragen (gemischt Fremdsprache→Deutsch und ' +
        'Deutsch→Fremdsprache). Nutze als falsche Antwortoptionen plausible, aber eindeutig falsche Alternativen ' +
        '(z. B. andere Vokabeln der Liste). Gib AUSSCHLIESSLICH JSON zurück, ohne Markdown-Codeblock, im Format: ' +
        '[{"frage":"...","optionen":["...","...","...","..."],"loesungIndex":0}]. Eine Frage pro Vokabel, genau ' +
        'vier Optionen, loesungIndex ist der 0-basierte Index der richtigen Option.';
    case 'keyword':
      return 'Du erstellst zu einzelnen, als "schwierig" markierten Vokabeln eine Eselsbrücke nach der ' +
        'Schlüsselwort-Methode: ein klanglich ähnliches deutsches Wort plus eine kurze, bildhafte Merkgeschichte, ' +
        'die dieses Schlüsselwort mit der deutschen Bedeutung verknüpft. Gib AUSSCHLIESSLICH JSON zurück, ohne ' +
        'Markdown-Codeblock, im Format: [{"fremdsprache":"...","schluesselwort":"...","eselsbruecke":"..."}].';
    case 'story':
      return 'Du verknüpfst mehrere neue Vokabeln zu einer kurzen, möglichst kuriosen und einprägsamen ' +
        'Merkgeschichte auf Deutsch, in der alle vorgegebenen Fremdsprachen-Wörter (jeweils mit deutscher ' +
        'Bedeutung in Klammern) natürlich vorkommen. Gib AUSSCHLIESSLICH JSON zurück, ohne Markdown-Codeblock, im ' +
        'Format: {"geschichte":"...","vokabeln":["wort1","wort2"]}.';
    case 'loci':
      return 'Du hilfst bei der Loci-Technik: Verteile die vorgegebenen Vokabeln gedanklich auf Stationen entlang ' +
        'eines vom Nutzer beschriebenen, bekannten Ortes. Erfinde zu jeder Vokabel eine kurze, bildhafte ' +
        'Verknüpfung mit einer Station an diesem Ort. Gib AUSSCHLIESSLICH JSON zurück, ohne Markdown-Codeblock, im ' +
        'Format: [{"station":"...","fremdsprache":"...","deutsch":"...","verknuepfung":"..."}]. Eine Station pro ' +
        'Vokabel.';
    default:
      return '';
  }
}

router.post('/generieren', requireStudent, limiterGenerieren, async (req, res) => {
  const studentId = req.session.studentId;
  const typ = (req.body?.typ || '').trim();
  const vokabelIds = Array.isArray(req.body?.vokabelIds)
    ? req.body.vokabelIds.map(Number).filter(Number.isInteger)
    : [];
  const ort = (req.body?.ort || '').trim();

  if (!VALID_GENERIEREN_TYPEN.includes(typ)) return res.status(400).json({ error: 'Ungültiger Typ.' });
  if (vokabelIds.length === 0 || vokabelIds.length > 50) {
    return res.status(400).json({ error: 'Bitte 1 bis 50 Vokabeln auswählen.' });
  }
  if (typ === 'loci' && !ort) {
    return res.status(400).json({ error: 'Bitte einen bekannten Ort beschreiben (z. B. "mein Schulweg").' });
  }

  const platzhalter = vokabelIds.map(() => '?').join(',');
  const vokabeln = db.prepare(
    `SELECT v.id, v.fremdsprache, v.deutsch, v.zusatzinfo, p.ersteller_id, p.sichtbarkeit
     FROM vokabeln v JOIN vokabelpakete p ON p.id = v.paket_id
     WHERE v.id IN (${platzhalter})`
  ).all(...vokabelIds);

  const zugreifbar = vokabeln.filter((v) => v.ersteller_id === studentId || v.sichtbarkeit === 'familie');
  if (zugreifbar.length !== vokabelIds.length) {
    return res.status(403).json({ error: 'Zugriff auf eine oder mehrere Vokabeln nicht erlaubt.' });
  }

  const listeText = zugreifbar.map((v) => `${v.fremdsprache} = ${v.deutsch}`).join('\n');
  const userText = typ === 'loci'
    ? `Vokabelliste:\n${listeText}\n\nOrt: ${ort}`
    : `Vokabelliste:\n${listeText}`;

  let result;
  try {
    result = await callClaude({
      model: 'claude-sonnet-4-6',
      maxTokens: Math.min(8000, 220 * zugreifbar.length + 800),
      system: buildGenerierenPrompt(typ),
      userContent: [{ type: 'text', text: userText }],
    });
  } catch (e) {
    console.error('Vokabeltrainer-Generierung Fehler:', e);
    return res.status(503).json({ error: 'Verarbeitung momentan nicht verfügbar.' });
  }

  let ergebnis;
  try {
    ergebnis = extractJson(result.text);
  } catch (e) {
    if (result.stopReason === 'max_tokens') {
      console.error('Vokabeltrainer-Generierung: Antwort durch max_tokens abgeschnitten.');
      return res.status(422).json({ error: ABGESCHNITTEN_FEHLER });
    }
    console.error('Vokabeltrainer-Generierung: Antwort konnte nicht geparst werden:', result.text);
    return res.status(502).json({ error: 'Antwort konnte nicht verarbeitet werden. Bitte erneut versuchen.' });
  }

  res.json({ typ, ergebnis });
});

module.exports = router;
