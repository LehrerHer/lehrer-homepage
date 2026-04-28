const express = require('express');
const { db } = require('../db/database');
const { requireStudent } = require('../middleware/auth');
const { checkAndAwardBadges } = require('../db/badges');

const router = express.Router();

const VALID_SLUGS = ['stilmittel', 'literaturwissenschaft', 'rechtschreibung'];
const XP_PER_CORRECT = 15;
const QUIZ_LABELS = {
  stilmittel:          'Stilmittel-Quiz',
  literaturwissenschaft: 'Literaturwissenschaft-Quiz',
  rechtschreibung:     'Rechtschreib-Quiz',
};

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

  const xpEarned = score * XP_PER_CORRECT;
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
    isRepeat: prevAttempts > 0,
    total,
  });
});

module.exports = router;
