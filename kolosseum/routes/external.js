const express = require('express');
const { db } = require('../db/database');
const { requireStudent } = require('../middleware/auth');
const { checkAndAwardBadges } = require('../db/badges');

const router = express.Router();

const VALID_SLUGS = ['stilmittel', 'literaturwissenschaft', 'rechtschreibung'];
const QUIZ_LABELS = {
  stilmittel:          'Stilmittel-Quiz',
  literaturwissenschaft: 'Literaturwissenschaft-Quiz',
  rechtschreibung:     'Rechtschreib-Quiz',
};

// Notenpunkte-Tabelle (Oberstufe, 0–15 Punkte)
function computeNotenpunkte(score, total) {
  const pct = total > 0 ? (score / total) * 100 : 0;
  if (pct >= 95) return 15;
  if (pct >= 90) return 14;
  if (pct >= 85) return 13;
  if (pct >= 80) return 12;
  if (pct >= 75) return 11;
  if (pct >= 70) return 10;
  if (pct >= 65) return  9;
  if (pct >= 60) return  8;
  if (pct >= 55) return  7;
  if (pct >= 50) return  6;
  if (pct >= 45) return  5;
  if (pct >= 40) return  4;
  if (pct >= 33) return  3;
  if (pct >= 27) return  2;
  if (pct >= 20) return  1;
  return 0;
}

// POST /api/external/submit – Ergebnis eines statischen Quizzes einreichen
router.post('/submit', requireStudent, (req, res) => {
  const studentId = req.session.studentId;
  const { quizSlug, score, total } = req.body;

  if (!VALID_SLUGS.includes(quizSlug)) {
    return res.status(400).json({ error: 'Unbekanntes Quiz.' });
  }
  if (
    typeof score !== 'number' || typeof total !== 'number' ||
    !Number.isInteger(score) || !Number.isInteger(total) ||
    score < 0 || total <= 0 || score > total
  ) {
    return res.status(400).json({ error: 'Ungültige score/total-Werte.' });
  }

  // Wie oft hat dieser SuS das Quiz schon gemacht?
  const prevAttempts = db.prepare(
    'SELECT COUNT(*) AS n FROM external_quiz_results WHERE student_id = ? AND quiz_slug = ?'
  ).get(studentId, quizSlug).n;

  const notenpunkte = computeNotenpunkte(score, total);
  const xpEarned = notenpunkte * total;
  // XP nur beim ersten Mal vergeben
  const xpToAdd = prevAttempts === 0 ? xpEarned : 0;

  // Ergebnis speichern
  db.prepare(
    'INSERT INTO external_quiz_results (student_id, quiz_slug, score, total, xp_earned, attempt_number) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(studentId, quizSlug, score, total, xpEarned, prevAttempts + 1);

  if (xpToAdd > 0) {
    db.prepare('UPDATE students SET xp = xp + ?, last_active = CURRENT_TIMESTAMP WHERE id = ?')
      .run(xpToAdd, studentId);
    db.prepare(
      'INSERT INTO xp_log (student_id, amount, reason) VALUES (?, ?, ?)'
    ).run(studentId, xpToAdd, QUIZ_LABELS[quizSlug]);
  }

  checkAndAwardBadges(studentId);

  res.json({
    xpEarned: xpToAdd,
    notenpunkte,
    isRepeat: prevAttempts > 0,
    total,
  });
});

// GET /api/external/completions – Abgeschlossene externe Quizze des eingeloggten SuS
router.get('/completions', (req, res) => {
  if (!req.session || !req.session.studentId) {
    return res.json({ completions: [] });
  }
  const rows = db.prepare(
    'SELECT DISTINCT quiz_slug FROM external_quiz_results WHERE student_id = ?'
  ).all(req.session.studentId);
  res.json({ completions: rows.map(r => r.quiz_slug) });
});

module.exports = router;
