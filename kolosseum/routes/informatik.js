// routes/informatik.js – Informatikwerkstatt 7/8 · Lernpfad (Vorname + Checkpoint-Ergebnisse)
//
// Lernpartner:innen melden sich mit ihrem Kolosseum-Konto an. Den Vornamen geben sie
// einmalig an; er liegt in einer eigenen Tabelle und ist nur in /admin/informatik.html sichtbar.
const express = require('express');
const { db } = require('../db/database');
const { requireStudent, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const STATIONEN = 6;
const BESTEHEN_AB = 0.7; // 70 % der Punkte

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
  res.json({ vorname: vn ? vn.vorname : null, stationen });
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
  if (!(station >= 1 && station <= STATIONEN) || !(max >= 1 && max <= 50) || !(punkte >= 0 && punkte <= max)) {
    return res.status(400).json({ error: 'Ungültiges Ergebnis.' });
  }
  const bestanden = punkte / max >= BESTEHEN_AB ? 1 : 0;
  db.prepare(
    'INSERT INTO informatik_checkpoints (student_id, station, punkte, max_punkte, bestanden) VALUES (?, ?, ?, ?, ?)'
  ).run(req.session.studentId, station, punkte, max, bestanden);
  res.json({ ok: true, bestanden: !!bestanden });
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
  res.json({
    stationen: STATIONEN,
    personen: personen.map(p => ({ id: p.id, nick: p.nick, vorname: p.vorname, stationen: map[p.id] || {} })),
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

module.exports = router;
