// routes/informatik.js – Informatikwerkstatt 7/8 · Lernpfad (Vorname + Checkpoint-Ergebnisse)
//
// Lernpartner:innen melden sich mit ihrem Kolosseum-Konto an. Den Vornamen geben sie
// einmalig an; er liegt in einer eigenen Tabelle und ist nur in /admin/informatik.html sichtbar.
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db } = require('../db/database');
const { requireStudent, requireAdmin } = require('../middleware/auth');
const { checkAndAwardBadges } = require('../db/badges');

const router = express.Router();

const STATIONEN = 7;
const BESTEHEN_AB = 0.7; // 70 % der Punkte
const XP_AUFGABE = 5, XP_TEIL = 25, XP_FRAGE = 5, XP_BESTANDEN = 25;
const ID_MUSTER = /^[a-z0-9-]{1,40}$/;
const XP_SCRATCH = 25; // erstes hochgeladenes Scratch-Projekt je Station

// Scratch-Projekte (.sb3) liegen bewusst NICHT unter /uploads (das ist öffentlich),
// sondern neben der Datenbank. Abruf nur über den Admin-Endpunkt.
const SCRATCH_DIR = path.join(__dirname, '..', 'db', 'informatik-scratch');
fs.mkdirSync(SCRATCH_DIR, { recursive: true });
const scratchUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, SCRATCH_DIR),
    filename: (_req, _file, cb) => cb(null, Date.now().toString(36) + Math.random().toString(36).slice(2, 8) + '.sb3'),
  }),
  limits: { fileSize: 20 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => cb(null, /\.sb3$/i.test(file.originalname || '')),
});

// XP einmalig je Schlüssel gutschreiben; liefert die tatsächlich vergebenen XP
const xpEintragen = db.transaction((studentId, eintraege, grund) => {
  const ins = db.prepare('INSERT OR IGNORE INTO informatik_xp (student_id, schluessel, xp) VALUES (?, ?, ?)');
  let summe = 0;
  eintraege.forEach(([schluessel, xp]) => { if (ins.run(studentId, schluessel, xp).changes) summe += xp; });
  if (summe > 0) {
    db.prepare('UPDATE students SET xp = xp + ?, last_active = CURRENT_TIMESTAMP WHERE id = ?').run(summe, studentId);
    db.prepare('INSERT INTO xp_log (student_id, amount, reason) VALUES (?, ?, ?)').run(studentId, summe, grund);
  }
  return summe;
});
function xpVergeben(studentId, eintraege, grund) {
  const summe = xpEintragen(studentId, eintraege, grund);
  if (summe > 0) { try { checkAndAwardBadges(studentId); } catch (e) { /* Badges sind optional */ } }
  return summe;
}

// Nachvergütung beim Serverstart: bereits gespeicherte Checkpoint-Ergebnisse bekommen ihre XP.
// Läuft bei jedem Start, vergibt aber dank fester Schlüssel nichts doppelt.
try {
  db.prepare(`
    SELECT student_id, station, MAX(punkte) AS beste, MAX(bestanden) AS bestanden
    FROM informatik_checkpoints GROUP BY student_id, station
  `).all().forEach(r => {
    const eintraege = [];
    for (let n = 1; n <= r.beste; n++) eintraege.push(['q:' + r.station + ':' + n, XP_FRAGE]);
    if (r.bestanden) eintraege.push(['c:' + r.station, XP_BESTANDEN]);
    xpVergeben(r.student_id, eintraege, 'Informatikwerkstatt Station ' + r.station + ': Checkpoint (nachträglich)');
  });
} catch (e) {
  console.error('Informatik-XP-Nachvergütung fehlgeschlagen:', e.message);
}

// GET /api/informatik/status – Login-, Vornamen- und Stationsstatus der eingeloggten Person
router.get('/status', requireStudent, (req, res) => {
  const id = req.session.studentId;
  const vn = db.prepare('SELECT vorname FROM informatik_vornamen WHERE student_id = ?').get(id);
  const rows = db.prepare(`
    SELECT station, MAX(punkte) AS beste, MAX(max_punkte) AS max_punkte, MAX(bestanden) AS bestanden
    FROM informatik_checkpoints WHERE student_id = ? GROUP BY station
  `).all(id);
  const stationen = {};
  rows.forEach(r => { stationen[r.station] = { beste: r.beste, max: r.max_punkte, bestanden: !!r.bestanden }; });
  const profi = {};
  db.prepare('SELECT station, teil, status FROM informatik_profi WHERE student_id = ?').all(id)
    .forEach(r => { profi[r.station + '-' + r.teil] = r.status; });
  const antworten = {};
  db.prepare('SELECT station, frage, antwort FROM informatik_antworten WHERE student_id = ?').all(id)
    .forEach(r => { antworten[r.station + '-' + r.frage] = r.antwort; });
  const xp = db.prepare('SELECT schluessel FROM informatik_xp WHERE student_id = ?').all(id).map(r => r.schluessel);
  const scratch = {};
  db.prepare('SELECT station, original_name, created_at FROM informatik_scratch WHERE student_id = ?').all(id)
    .forEach(r => { scratch[r.station] = { name: r.original_name, am: r.created_at }; });
  res.json({ vorname: vn ? vn.vorname : null, stationen, profi, antworten, xp, scratch });
});

// POST /api/informatik/vorname – Vorname einmalig speichern (später nur noch im Admin änderbar)
router.post('/vorname', requireStudent, (req, res) => {
  const vorname = String(req.body?.vorname || '').trim();
  if (vorname.length < 2 || vorname.length > 40) {
    return res.status(400).json({ error: 'Bitte gib deinen Vornamen ein (2 bis 40 Zeichen).' });
  }
  const vorhanden = db.prepare('SELECT 1 FROM informatik_vornamen WHERE student_id = ?').get(req.session.studentId);
  if (vorhanden) return res.status(409).json({ error: 'Dein Vorname ist schon gespeichert.' });
  db.prepare('INSERT INTO informatik_vornamen (student_id, vorname) VALUES (?, ?)').run(req.session.studentId, vorname);
  res.json({ ok: true });
});

// POST /api/informatik/checkpoint – Quiz-Ergebnis einer Station speichern
router.post('/checkpoint', requireStudent, (req, res) => {
  const station = parseInt(req.body?.station, 10);
  const punkte = parseInt(req.body?.punkte, 10);
  const max = parseInt(req.body?.max, 10);
  if (!(station >= 0 && station <= STATIONEN) || !(max >= 1 && max <= 50) || !(punkte >= 0 && punkte <= max)) {
    return res.status(400).json({ error: 'Ungültiges Ergebnis.' });
  }
  const bestanden = punkte / max >= BESTEHEN_AB ? 1 : 0;
  db.prepare(
    'INSERT INTO informatik_checkpoints (student_id, station, punkte, max_punkte, bestanden) VALUES (?, ?, ?, ?, ?)'
  ).run(req.session.studentId, station, punkte, max, bestanden);
  // 5 XP je richtiger Frage (nur Verbesserungen zählen) + 25 XP fürs erste Bestehen
  const eintraege = [];
  for (let n = 1; n <= punkte; n++) eintraege.push(['q:' + station + ':' + n, XP_FRAGE]);
  if (bestanden) eintraege.push(['c:' + station, XP_BESTANDEN]);
  const xp = xpVergeben(req.session.studentId, eintraege, 'Informatikwerkstatt Station ' + station + ': Checkpoint');
  res.json({ ok: true, bestanden: !!bestanden, xp });
});

// POST /api/informatik/profi – Profi-Teil melden: 'geloest' (alles selbst) oder 'angesehen' (Lösung aufgedeckt).
// Nur die erste Meldung je Teil zählt.
router.post('/profi', requireStudent, (req, res) => {
  const station = parseInt(req.body?.station, 10);
  const teil = parseInt(req.body?.teil, 10);
  const status = req.body?.status;
  const gesamt = parseInt(req.body?.gesamt, 10);
  const geloest = parseInt(req.body?.geloest, 10);
  const fehlversuche = parseInt(req.body?.fehlversuche, 10) || 0;
  if (!(station >= 0 && station <= STATIONEN) || !(teil >= 1 && teil <= 9)
      || !['geloest', 'angesehen'].includes(status)
      || !(gesamt >= 1 && gesamt <= 30) || !(geloest >= 0 && geloest <= gesamt)
      || (status === 'geloest' && geloest !== gesamt)
      || !(fehlversuche >= 0 && fehlversuche <= 9999)) {
    return res.status(400).json({ error: 'Ungültige Meldung.' });
  }
  db.prepare(`
    INSERT OR IGNORE INTO informatik_profi (student_id, station, teil, status, geloest_vorher, gesamt, fehlversuche)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(req.session.studentId, station, teil, status, geloest, gesamt, fehlversuche);
  const row = db.prepare('SELECT status FROM informatik_profi WHERE student_id = ? AND station = ? AND teil = ?')
    .get(req.session.studentId, station, teil);
  res.json({ ok: true, status: row.status });
});

// POST /api/informatik/antwort – freie Antwort (z. B. Denkfrage). Nur die erste Antwort zählt.
router.post('/antwort', requireStudent, (req, res) => {
  const station = parseInt(req.body?.station, 10);
  const frage = String(req.body?.frage || '');
  const text = String(req.body?.text || '').trim();
  if (!(station >= 0 && station <= STATIONEN) || !/^[a-z0-9-]{1,30}$/.test(frage)
      || text.length < 10 || text.length > 1000) {
    return res.status(400).json({ error: 'Ungültige Antwort.' });
  }
  db.prepare('INSERT OR IGNORE INTO informatik_antworten (student_id, station, frage, antwort) VALUES (?, ?, ?, ?)')
    .run(req.session.studentId, station, frage, text);
  const row = db.prepare('SELECT antwort FROM informatik_antworten WHERE student_id = ? AND station = ? AND frage = ?')
    .get(req.session.studentId, station, frage);
  res.json({ ok: true, text: row.antwort });
});

// POST /api/informatik/xp/aufgabe – selbst gelöste Aufgabe: 5 XP (einmalig)
router.post('/xp/aufgabe', requireStudent, (req, res) => {
  const station = parseInt(req.body?.station, 10);
  const id = String(req.body?.id || '');
  if (!(station >= 0 && station <= STATIONEN) || !ID_MUSTER.test(id)) return res.status(400).json({ error: 'Ungültige Aufgabe.' });
  const xp = xpVergeben(req.session.studentId, [['a:' + station + ':' + id, XP_AUFGABE]], 'Informatikwerkstatt Station ' + station + ': Aufgabe');
  res.json({ ok: true, xp });
});

// POST /api/informatik/xp/teil – ganzer Teil selbst gelöst: 25 XP (einmalig).
// Alle genannten Aufgaben des Teils müssen vorher als gelöst gespeichert sein.
router.post('/xp/teil', requireStudent, (req, res) => {
  const station = parseInt(req.body?.station, 10);
  const teil = String(req.body?.teil || '');
  const aufgaben = Array.isArray(req.body?.aufgaben) ? req.body.aufgaben.map(String) : [];
  if (!(station >= 0 && station <= STATIONEN) || !ID_MUSTER.test(teil) || aufgaben.length < 1 || aufgaben.length > 40
      || !aufgaben.every(a => ID_MUSTER.test(a) && a.indexOf(teil + '-') === 0)) {
    return res.status(400).json({ error: 'Ungültiger Teil.' });
  }
  const pruef = db.prepare('SELECT 1 FROM informatik_xp WHERE student_id = ? AND schluessel = ?');
  if (!aufgaben.every(a => pruef.get(req.session.studentId, 'a:' + station + ':' + a))) {
    return res.status(409).json({ error: 'Noch nicht alle Aufgaben des Teils gelöst.' });
  }
  const xp = xpVergeben(req.session.studentId, [['t:' + station + ':' + teil, XP_TEIL]], 'Informatikwerkstatt Station ' + station + ': Teil komplett');
  res.json({ ok: true, xp });
});

// POST /api/informatik/scratch – Scratch-Projekt (.sb3) hochladen. Ein neues ersetzt das alte.
// Das erste Hochladen je Station bringt 25 XP.
router.post('/scratch', requireStudent, (req, res) => {
  scratchUpload.single('datei')(req, res, (err) => {
    if (err) {
      const zuGross = err.code === 'LIMIT_FILE_SIZE';
      return res.status(400).json({ error: zuGross ? 'Die Datei ist zu groß (höchstens 20 MB).' : 'Hochladen fehlgeschlagen.' });
    }
    const station = parseInt(req.body?.station, 10);
    const weg = () => { if (req.file) fs.unlink(req.file.path, () => {}); };
    if (!req.file) return res.status(400).json({ error: 'Bitte wähle eine Scratch-Datei mit der Endung .sb3.' });
    if (!(station >= 0 && station <= STATIONEN)) { weg(); return res.status(400).json({ error: 'Ungültige Station.' }); }
    // .sb3 ist ein ZIP-Archiv: Die Datei muss mit „PK“ beginnen
    try {
      const fd = fs.openSync(req.file.path, 'r'); const kopf = Buffer.alloc(2); fs.readSync(fd, kopf, 0, 2, 0); fs.closeSync(fd);
      if (kopf.toString('latin1') !== 'PK') { weg(); return res.status(400).json({ error: 'Das ist keine gültige Scratch-Datei.' }); }
    } catch (_) { weg(); return res.status(500).json({ error: 'Datei konnte nicht geprüft werden.' }); }
    const id = req.session.studentId;
    const name = String(req.file.originalname).replace(/[^\w .()äöüÄÖÜß-]/g, '_').slice(0, 80);
    const alt = db.prepare('SELECT datei FROM informatik_scratch WHERE student_id = ? AND station = ?').get(id, station);
    db.prepare(`
      INSERT INTO informatik_scratch (student_id, station, datei, original_name, groesse) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(student_id, station) DO UPDATE SET datei = excluded.datei, original_name = excluded.original_name,
        groesse = excluded.groesse, created_at = datetime('now')
    `).run(id, station, req.file.filename, name, req.file.size);
    if (alt && alt.datei !== req.file.filename) fs.unlink(path.join(SCRATCH_DIR, path.basename(alt.datei)), () => {});
    const xp = xpVergeben(id, [['u:' + station, XP_SCRATCH]], 'Informatikwerkstatt Station ' + station + ': Scratch-Projekt hochgeladen');
    res.json({ ok: true, name, xp });
  });
});

// GET /api/informatik/scratch/mein/:station – eigenes hochgeladenes Projekt wieder herunterladen
router.get('/scratch/mein/:station', requireStudent, (req, res) => {
  const station = parseInt(req.params.station, 10);
  const r = db.prepare('SELECT datei, original_name FROM informatik_scratch WHERE student_id = ? AND station = ?')
    .get(req.session.studentId, station);
  if (!r) return res.status(404).send('Du hast für diese Station noch kein Projekt hochgeladen.');
  const datei = path.join(SCRATCH_DIR, path.basename(r.datei));
  if (!fs.existsSync(datei)) return res.status(404).send('Die Datei fehlt auf dem Server. Bitte lade sie noch einmal hoch.');
  const name = r.original_name.replace(/[^\w .()-]/g, '_');
  res.download(datei, /\.sb3$/i.test(name) ? name : name + '.sb3');
});

// ── Admin ─────────────────────────────────────────────────────────────

// GET /api/informatik/admin/uebersicht – alle Lernpartner:innen mit Vorname und bestem Ergebnis je Station
router.get('/admin/uebersicht', requireAdmin, (req, res) => {
  const personen = db.prepare(`
    SELECT s.id, s.nick, v.vorname
    FROM students s
    LEFT JOIN informatik_vornamen v ON v.student_id = s.id
    WHERE v.student_id IS NOT NULL
       OR s.id IN (SELECT DISTINCT student_id FROM informatik_checkpoints)
       OR s.id IN (SELECT DISTINCT student_id FROM informatik_profi)
       OR s.id IN (SELECT DISTINCT student_id FROM informatik_antworten)
       OR s.id IN (SELECT DISTINCT student_id FROM informatik_scratch)
    ORDER BY COALESCE(v.vorname, s.nick) COLLATE NOCASE
  `).all();
  const ergebnisse = db.prepare(`
    SELECT student_id, station, MAX(punkte) AS beste, MAX(max_punkte) AS max_punkte,
           MAX(bestanden) AS bestanden, COUNT(*) AS versuche, MAX(created_at) AS zuletzt
    FROM informatik_checkpoints GROUP BY student_id, station
  `).all();
  const map = {};
  ergebnisse.forEach(e => {
    (map[e.student_id] = map[e.student_id] || {})[e.station] = {
      beste: e.beste, max: e.max_punkte, bestanden: !!e.bestanden, versuche: e.versuche, zuletzt: e.zuletzt,
    };
  });
  const profi = {};
  db.prepare(`
    SELECT student_id, station, teil, status, geloest_vorher, gesamt, fehlversuche, created_at
    FROM informatik_profi ORDER BY station, teil
  `).all().forEach(r => {
    (profi[r.student_id] = profi[r.student_id] || []).push({
      station: r.station, teil: r.teil, status: r.status, geloestVorher: r.geloest_vorher,
      gesamt: r.gesamt, fehlversuche: r.fehlversuche, am: r.created_at,
    });
  });
  const antworten = {};
  db.prepare('SELECT student_id, station, frage, antwort, created_at FROM informatik_antworten ORDER BY station, frage')
    .all().forEach(r => {
      (antworten[r.student_id] = antworten[r.student_id] || []).push({
        station: r.station, frage: r.frage, antwort: r.antwort, am: r.created_at,
      });
    });
  const scratch = {};
  db.prepare('SELECT student_id, station, original_name, groesse, created_at FROM informatik_scratch ORDER BY station')
    .all().forEach(r => {
      (scratch[r.student_id] = scratch[r.student_id] || []).push({
        station: r.station, name: r.original_name, groesse: r.groesse, am: r.created_at,
      });
    });
  res.json({
    stationen: STATIONEN,
    personen: personen.map(p => ({
      id: p.id, nick: p.nick, vorname: p.vorname, stationen: map[p.id] || {}, profi: profi[p.id] || [],
      antworten: antworten[p.id] || [], scratch: scratch[p.id] || [],
    })),
  });
});

// PUT /api/informatik/admin/vorname/:id – Vorname korrigieren
router.put('/admin/vorname/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const vorname = String(req.body?.vorname || '').trim();
  if (!id || vorname.length < 2 || vorname.length > 40) return res.status(400).json({ error: 'Ungültige Eingabe.' });
  db.prepare(`
    INSERT INTO informatik_vornamen (student_id, vorname) VALUES (?, ?)
    ON CONFLICT(student_id) DO UPDATE SET vorname = excluded.vorname
  `).run(id, vorname);
  res.json({ ok: true });
});

// GET /api/informatik/admin/scratch/:id/:station – hochgeladenes Scratch-Projekt herunterladen
router.get('/admin/scratch/:id/:station', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10), station = parseInt(req.params.station, 10);
  const r = db.prepare(`
    SELECT x.datei, x.original_name, COALESCE(v.vorname, s.nick) AS name
    FROM informatik_scratch x JOIN students s ON s.id = x.student_id
    LEFT JOIN informatik_vornamen v ON v.student_id = x.student_id
    WHERE x.student_id = ? AND x.station = ?
  `).get(id, station);
  if (!r) return res.status(404).json({ error: 'Nicht gefunden.' });
  const datei = path.join(SCRATCH_DIR, path.basename(r.datei));
  if (!fs.existsSync(datei)) return res.status(404).json({ error: 'Datei fehlt auf dem Server.' });
  const sauber = (r.name + '_Station-' + station + '_' + r.original_name).replace(/[^\w.-]/g, '_');
  res.download(datei, /\.sb3$/i.test(sauber) ? sauber : sauber + '.sb3');
});

module.exports = router;
