const express = require('express');
const router = express.Router();
const { getDB } = require('../db/database');
const { checkAndAwardBadges, awardBadge } = require('../db/badges');
const { requireStudent } = require('../middleware/auth');

router.get('/', requireStudent, (req, res) => {
  const db = getDB();
  const studentId = req.session.studentId;

  const quizzes = db.prepare(`
    SELECT q.id, q.title, q.subject,
      (SELECT COUNT(*) FROM questions WHERE quiz_id = q.id) as question_count,
      (SELECT COUNT(*) FROM quiz_results WHERE student_id = ? AND quiz_id = q.id) as attempt_count,
      (SELECT xp_earned FROM quiz_results WHERE student_id = ? AND quiz_id = q.id ORDER BY attempt_number LIMIT 1) as first_xp
    FROM quizzes q
    ORDER BY q.created_at DESC
  `).all(studentId, studentId);

  res.json(quizzes);
});

router.get('/:id', requireStudent, (req, res) => {
  const db = getDB();
  const quiz = db.prepare('SELECT id, title, subject FROM quizzes WHERE id = ?').get(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Quiz nicht gefunden' });

  const questions = db.prepare(
    'SELECT id, question_text, options, correct_index, xp_value FROM questions WHERE quiz_id = ? ORDER BY id'
  ).all(quiz.id);

  res.json({
    ...quiz,
    questions: questions.map(q => ({
      id: q.id,
      text: q.question_text,
      options: JSON.parse(q.options),
      correct_index: q.correct_index,
      xp_value: q.xp_value,
    })),
  });
});

router.post('/:id/submit', requireStudent, (req, res) => {
  const db = getDB();
  const studentId = req.session.studentId;
  const quizId = parseInt(req.params.id);
  const { answers } = req.body;

  if (!Array.isArray(answers)) return res.status(400).json({ error: 'Antworten fehlen' });

  const quiz = db.prepare('SELECT id, title FROM quizzes WHERE id = ?').get(quizId);
  if (!quiz) return res.status(404).json({ error: 'Quiz nicht gefunden' });

  const questions = db.prepare('SELECT id, correct_index, xp_value FROM questions WHERE quiz_id = ? ORDER BY id').all(quizId);
  if (answers.length !== questions.length) return res.status(400).json({ error: 'Anzahl der Antworten stimmt nicht' });

  let score = 0;
  let baseXP = 0;
  for (let i = 0; i < questions.length; i++) {
    if (answers[i] === questions[i].correct_index) {
      score++;
      baseXP += questions[i].xp_value;
    }
  }

  const isPerfect = score === questions.length;
  if (isPerfect) baseXP += 25;

  const prevAttempts = db.prepare('SELECT COUNT(*) as n FROM quiz_results WHERE student_id = ? AND quiz_id = ?').get(studentId, quizId).n;
  const isFirstAttempt = prevAttempts === 0;
  const xpMultiplier = isFirstAttempt ? 1 : 0.25;
  const xpEarned = Math.max(0, Math.round(baseXP * xpMultiplier));
  const attemptNumber = prevAttempts + 1;

  db.prepare(
    'INSERT INTO quiz_results (student_id, quiz_id, score, total, xp_earned, attempt_number) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(studentId, quizId, score, questions.length, xpEarned, attemptNumber);

  if (xpEarned > 0) {
    db.prepare('UPDATE students SET xp = xp + ? WHERE id = ?').run(xpEarned, studentId);
    db.prepare('INSERT INTO xp_log (student_id, amount, reason, quiz_id) VALUES (?, ?, ?, ?)').run(
      studentId, xpEarned, `Quiz: ${quiz.title}`, quizId
    );
  }

  const newBadges = checkAndAwardBadges(db, studentId);
  if (isPerfect) {
    const perfBadge = awardBadge(db, studentId, 'perfektes-quiz');
    if (perfBadge) newBadges.push(perfBadge);
  }

  res.json({
    score,
    total: questions.length,
    xp_earned: xpEarned,
    is_first_attempt: isFirstAttempt,
    is_perfect: isPerfect,
    newBadges,
  });
});

module.exports = router;
