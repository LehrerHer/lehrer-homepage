const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../db/database');
const { requireAdmin } = require('../middleware/auth');
const { checkAndAwardBadges } = require('../db/badges');

const router = express.Router();

// Alle Routen erfordern Admin-Session
router.use(requireAdmin);

// === STATISTIKEN ===

// GET /api/admin/stats
router.get('/stats', (req, res) => {
  const studentCount = db.prepare('SELECT COUNT(*) AS n FROM students').get().n;
  const totalXp      = db.prepare('SELECT COALESCE(SUM(xp), 0) AS s FROM students').get().s;
  const quizCount    = db.prepare('SELECT COUNT(*) AS n FROM quizzes').get().n;
  const recentActivity = db.prepare(`
    SELECT s.nick, x.amount, x.reason, x.created_at
    FROM xp_log x
    JOIN students s ON s.id = x.student_id
    ORDER BY x.created_at DESC
    LIMIT 10
  `).all();

  res.json({ studentCount, totalXp, quizCount, recentActivity });
});

// === SCHÜLERVERWALTUNG ===

// GET /api/admin/students
router.get('/students', (req, res) => {
  const students = db.prepare(`
    SELECT s.id, s.nick, s.xp, s.created_at, s.last_active,
           sn.real_name, sn.class,
           COUNT(sb.badge_id) AS badge_count
    FROM students s
    LEFT JOIN student_names sn ON sn.student_id = s.id
    LEFT JOIN student_badges sb ON sb.student_id = s.id
    GROUP BY s.id
    ORDER BY s.xp DESC
  `).all();
  res.json(students);
});

// POST /api/admin/students – Schüler anlegen
router.post('/students', async (req, res) => {
  const { nick, pin, real_name, class: klasse } = req.body;

  if (!nick || !pin) {
    return res.status(400).json({ error: 'Spitzname und PIN erforderlich.' });
  }
  if (String(pin).length !== 4 || !/^\d{4}$/.test(String(pin))) {
    return res.status(400).json({ error: 'PIN muss genau 4 Ziffern haben.' });
  }

  const exists = db.prepare('SELECT id FROM students WHERE nick = ?').get(nick.trim());
  if (exists) return res.status(409).json({ error: 'Spitzname bereits vergeben.' });

  const pin_hash = await bcrypt.hash(String(pin), 10);

  const result = db.prepare(
    'INSERT INTO students (nick, pin_hash) VALUES (?, ?)'
  ).run(nick.trim(), pin_hash);

  const studentId = result.lastInsertRowid;

  if (real_name) {
    db.prepare(
      'INSERT INTO student_names (student_id, real_name, class) VALUES (?, ?, ?)'
    ).run(studentId, real_name.trim(), klasse ? klasse.trim() : null);
  }

  // Erster-Tag-Badge sofort vergeben
  db.prepare(
    'INSERT OR IGNORE INTO student_badges (student_id, badge_id) VALUES (?, ?)'
  ).run(studentId, 'first_day');

  res.status(201).json({ ok: true, id: studentId });
});

// PATCH /api/admin/students/:id/xp – XP anpassen
router.patch('/students/:id/xp', (req, res) => {
  const studentId = Number(req.params.id);
  const { amount, reason } = req.body;

  if (typeof amount !== 'number' || !Number.isInteger(amount)) {
    return res.status(400).json({ error: 'amount muss eine ganze Zahl sein.' });
  }

  const student = db.prepare('SELECT id, xp FROM students WHERE id = ?').get(studentId);
  if (!student) return res.status(404).json({ error: 'Schüler nicht gefunden.' });

  const newXp = Math.max(0, student.xp + amount);
  db.prepare('UPDATE students SET xp = ? WHERE id = ?').run(newXp, studentId);
  db.prepare(
    'INSERT INTO xp_log (student_id, amount, reason) VALUES (?, ?, ?)'
  ).run(studentId, amount, reason || (amount >= 0 ? 'XP vom Admin' : 'XP-Korrektur'));

  checkAndAwardBadges(studentId);

  res.json({ ok: true, newXp });
});

// DELETE /api/admin/students/:id
router.delete('/students/:id', (req, res) => {
  const studentId = Number(req.params.id);
  const info = db.prepare('DELETE FROM students WHERE id = ?').run(studentId);
  if (info.changes === 0) return res.status(404).json({ error: 'Schüler nicht gefunden.' });
  res.json({ ok: true });
});

// GET /api/admin/export – CSV-Download
router.get('/export', (req, res) => {
  const rows = db.prepare(`
    SELECT s.id, s.nick, s.xp, s.created_at, s.last_active,
           sn.real_name, sn.class,
           COUNT(sb.badge_id) AS badge_count
    FROM students s
    LEFT JOIN student_names sn ON sn.student_id = s.id
    LEFT JOIN student_badges sb ON sb.student_id = s.id
    GROUP BY s.id
    ORDER BY s.xp DESC
  `).all();

  const header = 'ID;Spitzname;Klarname;Klasse;XP;Abzeichen;Erstellt;Zuletzt aktiv\n';
  const lines = rows.map((r) => [
    r.id,
    r.nick,
    r.real_name || '',
    r.class || '',
    r.xp,
    r.badge_count,
    r.created_at || '',
    r.last_active || '',
  ].join(';'));

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="schueler-export.csv"');
  res.send('﻿' + header + lines.join('\n'));
});

// === QUIZ-VERWALTUNG ===

// GET /api/admin/quizzes
router.get('/quizzes', (req, res) => {
  const quizzes = db.prepare(`
    SELECT q.id, q.title, q.subject, q.created_at,
           COUNT(qu.id) AS question_count
    FROM quizzes q
    LEFT JOIN questions qu ON qu.quiz_id = q.id
    GROUP BY q.id
    ORDER BY q.created_at DESC
  `).all();

  res.json(quizzes);
});

// GET /api/admin/quizzes/:id – Quiz mit allen Fragen
router.get('/quizzes/:id', (req, res) => {
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(Number(req.params.id));
  if (!quiz) return res.status(404).json({ error: 'Quiz nicht gefunden.' });

  const questions = db.prepare(
    'SELECT * FROM questions WHERE quiz_id = ? ORDER BY id ASC'
  ).all(quiz.id);

  res.json({ quiz, questions: questions.map((q) => ({ ...q, options: JSON.parse(q.options) })) });
});

// POST /api/admin/quizzes – Quiz anlegen
router.post('/quizzes', (req, res) => {
  const { title, subject } = req.body;
  if (!title) return res.status(400).json({ error: 'Titel erforderlich.' });

  const result = db.prepare(
    'INSERT INTO quizzes (title, subject) VALUES (?, ?)'
  ).run(title.trim(), subject ? subject.trim() : null);

  res.status(201).json({ ok: true, id: result.lastInsertRowid });
});

// POST /api/admin/quizzes/:id/questions – Frage hinzufügen
router.post('/quizzes/:id/questions', (req, res) => {
  const quizId = Number(req.params.id);
  const { question_text, options, correct_index, xp_value } = req.body;

  if (!question_text || !Array.isArray(options) || options.length < 2) {
    return res.status(400).json({ error: 'Fragetext und mindestens 2 Antworten erforderlich.' });
  }
  if (typeof correct_index !== 'number' || correct_index < 0 || correct_index >= options.length) {
    return res.status(400).json({ error: 'correct_index ungültig.' });
  }

  const quiz = db.prepare('SELECT id FROM quizzes WHERE id = ?').get(quizId);
  if (!quiz) return res.status(404).json({ error: 'Quiz nicht gefunden.' });

  const result = db.prepare(
    'INSERT INTO questions (quiz_id, question_text, options, correct_index, xp_value) VALUES (?, ?, ?, ?, ?)'
  ).run(quizId, question_text.trim(), JSON.stringify(options), correct_index, xp_value || 15);

  res.status(201).json({ ok: true, id: result.lastInsertRowid });
});

// DELETE /api/admin/quizzes/:id
router.delete('/quizzes/:id', (req, res) => {
  const info = db.prepare('DELETE FROM quizzes WHERE id = ?').run(Number(req.params.id));
  if (info.changes === 0) return res.status(404).json({ error: 'Quiz nicht gefunden.' });
  res.json({ ok: true });
});

// DELETE /api/admin/questions/:id
router.delete('/questions/:id', (req, res) => {
  const info = db.prepare('DELETE FROM questions WHERE id = ?').run(Number(req.params.id));
  if (info.changes === 0) return res.status(404).json({ error: 'Frage nicht gefunden.' });
  res.json({ ok: true });
});

module.exports = router;
