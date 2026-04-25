const express = require('express');
const router = express.Router();
const { pool } = require('../db/database');
const { checkAndAwardBadges, awardBadge } = require('../db/badges');
const { requireStudent } = require('../middleware/auth');

router.get('/', requireStudent, async (req, res) => {
  const studentId = req.session.studentId;
  try {
    const { rows } = await pool.query(`
      SELECT q.id, q.title, q.subject, q.description,
        (SELECT COUNT(*) FROM questions WHERE quiz_id = q.id)::int AS question_count,
        (SELECT COUNT(*) FROM quiz_results WHERE student_id = $1 AND quiz_id = q.id)::int AS attempt_count,
        (SELECT xp_earned FROM quiz_results WHERE student_id = $1 AND quiz_id = q.id ORDER BY attempt_number LIMIT 1) AS first_xp
      FROM quizzes q
      WHERE q.type = 'quiz'
      ORDER BY q.created_at DESC
    `, [studentId]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

router.get('/:id', requireStudent, async (req, res) => {
  try {
    const { rows: qrows } = await pool.query(
      'SELECT id, title, subject, description, type FROM quizzes WHERE id = $1', [req.params.id]
    );
    if (!qrows[0]) return res.status(404).json({ error: 'Quiz nicht gefunden' });
    const quiz = qrows[0];

    const { rows: questions } = await pool.query(
      'SELECT id, question_text, options, correct_index, xp_value FROM questions WHERE quiz_id = $1 ORDER BY id',
      [quiz.id]
    );

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
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

router.post('/:id/submit', requireStudent, async (req, res) => {
  const studentId = req.session.studentId;
  const quizId = parseInt(req.params.id);
  const { answers } = req.body;
  if (!Array.isArray(answers)) return res.status(400).json({ error: 'Antworten fehlen' });

  try {
    const { rows: qrows } = await pool.query('SELECT id, title FROM quizzes WHERE id = $1', [quizId]);
    if (!qrows[0]) return res.status(404).json({ error: 'Quiz nicht gefunden' });
    const quiz = qrows[0];

    const { rows: questions } = await pool.query(
      'SELECT id, correct_index, xp_value FROM questions WHERE quiz_id = $1 ORDER BY id', [quizId]
    );
    if (answers.length !== questions.length) return res.status(400).json({ error: 'Anzahl der Antworten stimmt nicht' });

    let score = 0, baseXP = 0;
    for (let i = 0; i < questions.length; i++) {
      if (answers[i] === questions[i].correct_index) { score++; baseXP += questions[i].xp_value; }
    }
    const isPerfect = score === questions.length;
    if (isPerfect) baseXP += 25;

    const { rows: prev } = await pool.query(
      'SELECT COUNT(*) as n FROM quiz_results WHERE student_id = $1 AND quiz_id = $2', [studentId, quizId]
    );
    const prevAttempts = parseInt(prev[0].n);
    const isFirstAttempt = prevAttempts === 0;
    const xpEarned = Math.max(0, Math.round(baseXP * (isFirstAttempt ? 1 : 0.25)));
    const attemptNumber = prevAttempts + 1;

    await pool.query(
      'INSERT INTO quiz_results (student_id, quiz_id, score, total, xp_earned, attempt_number) VALUES ($1, $2, $3, $4, $5, $6)',
      [studentId, quizId, score, questions.length, xpEarned, attemptNumber]
    );

    if (xpEarned > 0) {
      await pool.query('UPDATE students SET xp = xp + $1 WHERE id = $2', [xpEarned, studentId]);
      await pool.query(
        'INSERT INTO xp_log (student_id, amount, reason, quiz_id) VALUES ($1, $2, $3, $4)',
        [studentId, xpEarned, `Quiz: ${quiz.title}`, quizId]
      );
    }

    const newBadges = await checkAndAwardBadges(studentId);
    if (isPerfect) {
      const perfBadge = await awardBadge(studentId, 'perfektes-quiz');
      if (perfBadge) newBadges.push(perfBadge);
    }

    res.json({ score, total: questions.length, xp_earned: xpEarned, is_first_attempt: isFirstAttempt, is_perfect: isPerfect, newBadges });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

module.exports = router;
