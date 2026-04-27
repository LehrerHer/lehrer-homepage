const express = require('express');
const { db } = require('../db/database');
const { requireStudent } = require('../middleware/auth');
const { awardBadge, checkAndAwardBadges } = require('../db/badges');

const router = express.Router();

// GET /api/quizzes – alle Quizze auflisten
router.get('/', (req, res) => {
  const quizzes = db.prepare(`
    SELECT q.id, q.title, q.subject, q.created_at,
           COUNT(qu.id) AS question_count
    FROM quizzes q
    LEFT JOIN questions qu ON qu.quiz_id = q.id
    GROUP BY q.id
    ORDER BY q.created_at DESC
  `).all();

  // Wenn eingeloggt: eigene Ergebnisse mitliefern
  const studentId = req.session && req.session.studentId;
  if (studentId) {
    const results = db.prepare(
      'SELECT quiz_id, MAX(score) AS best_score, MAX(xp_earned) AS best_xp, COUNT(*) AS attempts FROM quiz_results WHERE student_id = ? GROUP BY quiz_id'
    ).all(studentId);
    const resultMap = new Map(results.map((r) => [r.quiz_id, r]));
    return res.json(quizzes.map((q) => ({ ...q, myResult: resultMap.get(q.id) || null })));
  }

  res.json(quizzes);
});

// GET /api/quizzes/:id – Quiz mit Fragen (OHNE korrekte Antworten)
router.get('/:id', (req, res) => {
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(Number(req.params.id));
  if (!quiz) return res.status(404).json({ error: 'Quiz nicht gefunden.' });

  const questions = db.prepare(
    'SELECT id, question_text, options, xp_value FROM questions WHERE quiz_id = ? ORDER BY id ASC'
  ).all(quiz.id);

  res.json({
    quiz,
    questions: questions.map((q) => ({ ...q, options: JSON.parse(q.options) })),
  });
});

// POST /api/quizzes/:id/submit – Antworten einreichen (nur eingeloggte SuS)
router.post('/:id/submit', requireStudent, (req, res) => {
  const quizId = Number(req.params.id);
  const studentId = req.session.studentId;
  const { answers } = req.body; // Array von Indizes, z.B. [0, 2, 1, 3, 0]

  if (!Array.isArray(answers)) {
    return res.status(400).json({ error: 'answers muss ein Array sein.' });
  }

  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(quizId);
  if (!quiz) return res.status(404).json({ error: 'Quiz nicht gefunden.' });

  const questions = db.prepare(
    'SELECT id, correct_index, xp_value FROM questions WHERE quiz_id = ? ORDER BY id ASC'
  ).all(quizId);

  if (answers.length !== questions.length) {
    return res.status(400).json({ error: `Erwartet ${questions.length} Antworten.` });
  }

  // Auswertung
  let score = 0;
  let xpEarned = 0;
  const details = questions.map((q, i) => {
    const correct = answers[i] === q.correct_index;
    if (correct) {
      score++;
      xpEarned += q.xp_value;
    }
    return { correct, correctIndex: q.correct_index };
  });

  // Wie oft hat dieser SuS das Quiz schon gemacht?
  const prevAttempts = db.prepare(
    'SELECT COUNT(*) AS n FROM quiz_results WHERE student_id = ? AND quiz_id = ?'
  ).get(studentId, quizId).n;

  // Ergebnis speichern
  db.prepare(
    'INSERT INTO quiz_results (student_id, quiz_id, score, total, xp_earned, attempt_number) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(studentId, quizId, score, questions.length, xpEarned, prevAttempts + 1);

  // XP gutschreiben (auch bei Wiederholung, aber nur bei erstem Versuch vollen Betrag)
  const xpToAdd = prevAttempts === 0 ? xpEarned : Math.floor(xpEarned * 0.25);
  if (xpToAdd > 0) {
    const student = db.prepare('SELECT xp FROM students WHERE id = ?').get(studentId);
    db.prepare('UPDATE students SET xp = xp + ?, last_active = CURRENT_TIMESTAMP WHERE id = ?')
      .run(xpToAdd, studentId);
    db.prepare(
      'INSERT INTO xp_log (student_id, amount, reason, quiz_id) VALUES (?, ?, ?, ?)'
    ).run(studentId, xpToAdd,
      prevAttempts === 0
        ? `Quiz: ${quiz.title}`
        : `Quiz (Wiederholung): ${quiz.title}`,
      quizId);
  }

  // Badges prüfen
  const newBadgeIds = checkAndAwardBadges(studentId);

  // Perfektes Quiz?
  if (score === questions.length) {
    const isNewPerfect = awardBadge(studentId, 'perfect_quiz');
    if (isNewPerfect) newBadgeIds.push('perfect_quiz');
  }

  res.json({
    score,
    total: questions.length,
    xpEarned: xpToAdd,
    details,
    newBadgeIds,
    isRepeat: prevAttempts > 0,
  });
});

module.exports = router;
