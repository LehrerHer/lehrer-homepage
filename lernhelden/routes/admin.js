const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { getDB } = require('../db/database');
const { BADGE_DEFINITIONS, checkAndAwardBadges, awardBadge } = require('../db/badges');
const { requireAdmin } = require('../middleware/auth');

const LEVELS = [
  { name: 'Lehrling', xpNeeded: 0 }, { name: 'Entdecker', xpNeeded: 100 },
  { name: 'Kämpfer', xpNeeded: 250 }, { name: 'Held', xpNeeded: 500 },
  { name: 'Ritter', xpNeeded: 900 }, { name: 'Champion', xpNeeded: 1400 },
  { name: 'Legende', xpNeeded: 2000 },
];
function getLevelName(xp) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xpNeeded) return LEVELS[i].name;
  }
  return LEVELS[0].name;
}

router.use(requireAdmin);

router.get('/stats', (req, res) => {
  const db = getDB();
  const student_count = db.prepare('SELECT COUNT(*) as n FROM students').get().n;
  const quiz_count = db.prepare('SELECT COUNT(*) as n FROM quizzes').get().n;
  const total_xp = db.prepare('SELECT SUM(xp) as s FROM students').get().s || 0;
  const today = new Date().toISOString().split('T')[0];
  const active_today = db.prepare("SELECT COUNT(*) as n FROM students WHERE date(last_active) = ?").get(today).n;
  const recent = db.prepare(`
    SELECT s.nick, xl.amount, xl.reason, xl.created_at
    FROM xp_log xl JOIN students s ON s.id = xl.student_id
    ORDER BY xl.created_at DESC LIMIT 10
  `).all();
  res.json({ student_count, quiz_count, total_xp, active_today, recent });
});

router.get('/students', (req, res) => {
  const db = getDB();
  const students = db.prepare(`
    SELECT s.id, s.nick, s.xp, s.created_at, s.last_active,
      sn.real_name, sn.class, sn.note,
      (SELECT COUNT(*) FROM student_badges sb WHERE sb.student_id = s.id) as badge_count
    FROM students s
    LEFT JOIN student_names sn ON sn.student_id = s.id
    ORDER BY s.xp DESC
  `).all();
  res.json(students.map(s => ({ ...s, levelName: getLevelName(s.xp) })));
});

router.post('/students', async (req, res) => {
  const { nick, pin, real_name, class: klasse } = req.body;
  if (!nick || !pin) return res.status(400).json({ error: 'Nick und PIN erforderlich' });
  if (pin.toString().length !== 4 || !/^\d{4}$/.test(pin.toString())) {
    return res.status(400).json({ error: 'PIN muss genau 4 Ziffern sein' });
  }

  try {
    const db = getDB();
    const existing = db.prepare('SELECT id FROM students WHERE nick = ?').get(nick.trim());
    if (existing) return res.status(409).json({ error: 'Spitzname bereits vergeben' });

    const pin_hash = await bcrypt.hash(pin.toString(), 10);
    const { lastInsertRowid } = db.prepare('INSERT INTO students (nick, pin_hash) VALUES (?, ?)').run(nick.trim(), pin_hash);

    if (real_name) {
      db.prepare('INSERT INTO student_names (student_id, real_name, class) VALUES (?, ?, ?)').run(lastInsertRowid, real_name, klasse || null);
    }

    res.json({ success: true, student: { id: lastInsertRowid, nick: nick.trim() } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

router.patch('/students/:id/xp', (req, res) => {
  const { amount, reason } = req.body;
  const studentId = parseInt(req.params.id);
  if (!amount || isNaN(amount)) return res.status(400).json({ error: 'Betrag erforderlich' });

  const db = getDB();
  const student = db.prepare('SELECT id, xp FROM students WHERE id = ?').get(studentId);
  if (!student) return res.status(404).json({ error: 'Schüler nicht gefunden' });

  const newXP = Math.max(0, student.xp + parseInt(amount));
  db.prepare('UPDATE students SET xp = ? WHERE id = ?').run(newXP, studentId);
  db.prepare('INSERT INTO xp_log (student_id, amount, reason) VALUES (?, ?, ?)').run(studentId, parseInt(amount), reason || 'Manuelle Anpassung durch Lehrer');

  const newBadges = checkAndAwardBadges(db, studentId);
  res.json({ success: true, new_xp: newXP, newBadges });
});

router.post('/students/:id/badges', (req, res) => {
  const { badge_id } = req.body;
  const studentId = parseInt(req.params.id);
  if (!badge_id) return res.status(400).json({ error: 'Badge-ID erforderlich' });

  const db = getDB();
  const badge = awardBadge(db, studentId, badge_id);
  if (!badge) return res.status(400).json({ error: 'Unbekanntes Badge oder bereits vorhanden' });
  res.json({ success: true, badge });
});

router.patch('/students/:id/note', (req, res) => {
  const { note } = req.body;
  const studentId = parseInt(req.params.id);
  const db = getDB();
  const existing = db.prepare('SELECT student_id FROM student_names WHERE student_id = ?').get(studentId);
  if (existing) {
    db.prepare('UPDATE student_names SET note = ? WHERE student_id = ?').run(note || null, studentId);
  } else {
    db.prepare('INSERT INTO student_names (student_id, real_name, note) VALUES (?, ?, ?)').run(studentId, '', note || null);
  }
  res.json({ success: true });
});

router.delete('/students/:id', (req, res) => {
  const db = getDB();
  const result = db.prepare('DELETE FROM students WHERE id = ?').run(parseInt(req.params.id));
  if (result.changes === 0) return res.status(404).json({ error: 'Schüler nicht gefunden' });
  res.json({ success: true });
});

router.get('/quiz', (req, res) => {
  const db = getDB();
  const quizzes = db.prepare(`
    SELECT q.id, q.title, q.subject, q.created_at,
      (SELECT COUNT(*) FROM questions WHERE quiz_id = q.id) as question_count
    FROM quizzes q ORDER BY q.created_at DESC
  `).all();
  res.json(quizzes);
});

router.post('/quiz', (req, res) => {
  const { title, subject, questions } = req.body;
  if (!title || !Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: 'Titel und mindestens eine Frage erforderlich' });
  }

  const db = getDB();
  const insertQuiz = db.prepare('INSERT INTO quizzes (title, subject) VALUES (?, ?)');
  const insertQ = db.prepare('INSERT INTO questions (quiz_id, question_text, options, correct_index, xp_value) VALUES (?, ?, ?, ?, ?)');

  const { lastInsertRowid } = insertQuiz.run(title, subject || null);
  for (const q of questions) {
    if (!q.text || !Array.isArray(q.options) || q.options.length !== 4) continue;
    insertQ.run(lastInsertRowid, q.text, JSON.stringify(q.options), q.correct_index ?? 0, q.xp_value ?? 15);
  }
  res.json({ success: true, quiz_id: lastInsertRowid });
});

router.delete('/quiz/:id', (req, res) => {
  const db = getDB();
  const result = db.prepare('DELETE FROM quizzes WHERE id = ?').run(parseInt(req.params.id));
  if (result.changes === 0) return res.status(404).json({ error: 'Quiz nicht gefunden' });
  res.json({ success: true });
});

router.get('/results', (req, res) => {
  const db = getDB();
  const results = db.prepare(`
    SELECT s.nick, qz.title as quiz_title, qr.score, qr.total, qr.xp_earned, qr.attempt_number, qr.completed_at
    FROM quiz_results qr
    JOIN students s ON s.id = qr.student_id
    JOIN quizzes qz ON qz.id = qr.quiz_id
    ORDER BY qr.completed_at DESC
    LIMIT 200
  `).all();
  res.json(results);
});

router.get('/xp-log/:id', (req, res) => {
  const db = getDB();
  const log = db.prepare('SELECT amount, reason, created_at FROM xp_log WHERE student_id = ? ORDER BY created_at DESC LIMIT 50').all(parseInt(req.params.id));
  res.json(log);
});

router.get('/badges', (req, res) => {
  res.json(BADGE_DEFINITIONS);
});

router.get('/export', (req, res) => {
  const db = getDB();
  const students = db.prepare(`
    SELECT s.id, s.nick, s.xp, s.created_at, s.last_active,
      sn.real_name, sn.class
    FROM students s LEFT JOIN student_names sn ON sn.student_id = s.id
    ORDER BY s.xp DESC
  `).all();

  const rows = ['Nick,Klarname,Klasse,XP,Level,Badges,Letzter Login,Anmeldedatum'];
  for (const s of students) {
    const level = getLevelName(s.xp);
    const badges = db.prepare('SELECT badge_id FROM student_badges WHERE student_id = ?').all(s.id).map(b => b.badge_id).join(';');
    rows.push([
      s.nick, s.real_name || '', s.class || '', s.xp, level, badges,
      s.last_active || '', s.created_at
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="lernhelden-export.csv"');
  res.send('﻿' + rows.join('\r\n'));
});

module.exports = router;
