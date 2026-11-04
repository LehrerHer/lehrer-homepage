const express = require('express');
const { db } = require('../db/database');
const { requireStudent } = require('../middleware/auth');
const { checkAndAwardBadges } = require('../db/badges');

const router = express.Router();

function validId(id) {
  return typeof id === 'string' && /^[a-z0-9_-]{1,80}$/i.test(id);
}

// Whitelist: Höchst-XP je Arbeitsblatt (Wert, den die Seite selbst per worksheetComplete meldet).
// Unbekannte IDs werden abgelehnt – sonst könnte jeder beliebige IDs mit bis zu 100 XP einreichen.
// Neues Arbeitsblatt mit XP → hier eintragen.
const WORKSHEET_XP = {
  'deutsch-drama-ppp-jg10':      25,
  'geschichte-ab1-prag-stunde1': 25,
  'geschichte-prag-stunde1':     25,
  'geschichte-prag-stunde2':     25,
  'ki-werkstatt-a':             100,
  'ki-werkstatt-c1':             20,
  'ki-werkstatt-c2':             20,
  'ki-werkstatt-c3':             20,
  'ki-werkstatt-c4':             20,
  'ki-werkstatt-c5':             20,
  'ki-werkstatt-c6':             20,
  'ki-werkstatt-c7':             20,
  'ki-werkstatt-c8':             20,
  'ki-werkstatt-c9':             20,
  'ki-werkstatt-c10':            20,
  'ki-werkstatt-c11':            20,
  'rechenblatt-1000':            20, // fehlerZuXP: 20/10/5/1
  'rechenblatt-klasse45':        20,
};

// POST /api/worksheets/submit – XP für abgeschlossenes Arbeitsblatt einreichen
router.post('/submit', requireStudent, (req, res) => {
  const studentId = req.session.studentId;
  const { worksheetId, title, xp } = req.body;

  if (!validId(worksheetId) || !WORKSHEET_XP[worksheetId]) {
    return res.status(400).json({ error: 'Unbekanntes Arbeitsblatt.' });
  }
  if (typeof xp !== 'number' || !Number.isInteger(xp) || xp < 1 || xp > WORKSHEET_XP[worksheetId]) {
    return res.status(400).json({ error: 'Ungültiger XP-Wert.' });
  }

  // Bereits abgeschlossen? → kein zweites XP
  const prev = db.prepare(
    'SELECT id FROM worksheet_completions WHERE student_id = ? AND worksheet_id = ?'
  ).get(studentId, worksheetId);

  if (prev) {
    return res.json({ xpEarned: 0, alreadyDone: true });
  }

  db.prepare(
    'INSERT INTO worksheet_completions (student_id, worksheet_id, xp_earned) VALUES (?, ?, ?)'
  ).run(studentId, worksheetId, xp);

  db.prepare('UPDATE students SET xp = xp + ?, last_active = CURRENT_TIMESTAMP WHERE id = ?')
    .run(xp, studentId);

  const label = typeof title === 'string' && title.trim()
    ? 'Arbeitsblatt: ' + title.trim().slice(0, 80)
    : 'Arbeitsblatt abgeschlossen';
  db.prepare('INSERT INTO xp_log (student_id, amount, reason) VALUES (?, ?, ?)')
    .run(studentId, xp, label);

  checkAndAwardBadges(studentId);

  res.json({ xpEarned: xp, alreadyDone: false });
});

// GET /api/worksheets/completions – abgeschlossene Arbeitsblätter des eingeloggten SuS
router.get('/completions', (req, res) => {
  if (!req.session?.studentId) return res.json({ completions: [] });
  const rows = db.prepare(
    'SELECT worksheet_id FROM worksheet_completions WHERE student_id = ?'
  ).all(req.session.studentId);
  res.json({ completions: rows.map(r => r.worksheet_id) });
});

module.exports = router;
