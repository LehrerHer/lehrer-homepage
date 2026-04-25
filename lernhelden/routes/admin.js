const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { pool } = require('../db/database');
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

router.get('/stats', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [sc, qc, xpc, ac, recent] = await Promise.all([
      pool.query('SELECT COUNT(*) as n FROM students'),
      pool.query('SELECT COUNT(*) as n FROM quizzes'),
      pool.query('SELECT COALESCE(SUM(xp), 0) as s FROM students'),
      pool.query('SELECT COUNT(*) as n FROM students WHERE last_active::date = $1', [today]),
      pool.query(`SELECT s.nick, xl.amount, xl.reason, xl.created_at
                  FROM xp_log xl JOIN students s ON s.id = xl.student_id
                  ORDER BY xl.created_at DESC LIMIT 10`),
    ]);
    res.json({
      student_count: parseInt(sc.rows[0].n),
      quiz_count: parseInt(qc.rows[0].n),
      total_xp: parseInt(xpc.rows[0].s),
      active_today: parseInt(ac.rows[0].n),
      recent: recent.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

router.get('/students', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT s.id, s.nick, s.xp, s.created_at, s.last_active,
        sn.real_name, sn.class, sn.note,
        COUNT(sb.badge_id)::int AS badge_count
      FROM students s
      LEFT JOIN student_names sn ON sn.student_id = s.id
      LEFT JOIN student_badges sb ON sb.student_id = s.id
      GROUP BY s.id, s.nick, s.xp, s.created_at, s.last_active, sn.real_name, sn.class, sn.note
      ORDER BY s.xp DESC
    `);
    res.json(rows.map(s => ({ ...s, levelName: getLevelName(s.xp) })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

router.post('/students', async (req, res) => {
  const { nick, pin, real_name, class: klasse } = req.body;
  if (!nick || !pin) return res.status(400).json({ error: 'Nick und PIN erforderlich' });
  if (!/^\d{4}$/.test(pin.toString())) return res.status(400).json({ error: 'PIN muss genau 4 Ziffern sein' });

  try {
    const { rows: ex } = await pool.query('SELECT id FROM students WHERE nick = $1', [nick.trim()]);
    if (ex[0]) return res.status(409).json({ error: 'Spitzname bereits vergeben' });

    const pin_hash = await bcrypt.hash(pin.toString(), 10);
    const { rows } = await pool.query(
      'INSERT INTO students (nick, pin_hash) VALUES ($1, $2) RETURNING id', [nick.trim(), pin_hash]
    );
    const newId = rows[0].id;

    if (real_name) {
      await pool.query(
        'INSERT INTO student_names (student_id, real_name, class) VALUES ($1, $2, $3)',
        [newId, real_name, klasse || null]
      );
    }

    res.json({ success: true, student: { id: newId, nick: nick.trim() } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

router.patch('/students/:id/xp', async (req, res) => {
  const { amount, reason } = req.body;
  const studentId = parseInt(req.params.id);
  if (!amount || isNaN(amount)) return res.status(400).json({ error: 'Betrag erforderlich' });

  try {
    const { rows } = await pool.query('SELECT id, xp FROM students WHERE id = $1', [studentId]);
    if (!rows[0]) return res.status(404).json({ error: 'Schüler nicht gefunden' });

    const newXP = Math.max(0, rows[0].xp + parseInt(amount));
    await pool.query('UPDATE students SET xp = $1 WHERE id = $2', [newXP, studentId]);
    await pool.query(
      'INSERT INTO xp_log (student_id, amount, reason) VALUES ($1, $2, $3)',
      [studentId, parseInt(amount), reason || 'Manuelle Anpassung durch Lehrer']
    );

    const newBadges = await checkAndAwardBadges(studentId);
    res.json({ success: true, new_xp: newXP, newBadges });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

router.post('/students/:id/badges', async (req, res) => {
  const { badge_id } = req.body;
  const studentId = parseInt(req.params.id);
  if (!badge_id) return res.status(400).json({ error: 'Badge-ID erforderlich' });

  try {
    const badge = await awardBadge(studentId, badge_id);
    if (!badge) return res.status(400).json({ error: 'Unbekanntes Badge oder bereits vorhanden' });
    res.json({ success: true, badge });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

router.patch('/students/:id/note', async (req, res) => {
  const { note } = req.body;
  const studentId = parseInt(req.params.id);
  try {
    const { rows } = await pool.query('SELECT student_id FROM student_names WHERE student_id = $1', [studentId]);
    if (rows[0]) {
      await pool.query('UPDATE student_names SET note = $1 WHERE student_id = $2', [note || null, studentId]);
    } else {
      await pool.query(
        'INSERT INTO student_names (student_id, real_name, note) VALUES ($1, $2, $3)',
        [studentId, '', note || null]
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

router.delete('/students/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM students WHERE id = $1', [parseInt(req.params.id)]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Schüler nicht gefunden' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

router.get('/quiz', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT q.id, q.title, q.subject, q.type, q.created_at,
        (SELECT COUNT(*) FROM questions WHERE quiz_id = q.id)::int AS question_count
      FROM quizzes q ORDER BY q.type, q.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

router.post('/quiz', async (req, res) => {
  const { title, subject, questions, type = 'quiz', description } = req.body;
  if (!title || !Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: 'Titel und mindestens eine Frage erforderlich' });
  }

  try {
    const { rows } = await pool.query(
      'INSERT INTO quizzes (title, subject, type, description) VALUES ($1, $2, $3, $4) RETURNING id',
      [title, subject || null, type, description || null]
    );
    const quizId = rows[0].id;
    for (const q of questions) {
      if (!q.text || !Array.isArray(q.options) || q.options.length !== 4) continue;
      await pool.query(
        'INSERT INTO questions (quiz_id, question_text, options, correct_index, xp_value) VALUES ($1, $2, $3, $4, $5)',
        [quizId, q.text, JSON.stringify(q.options), q.correct_index ?? 0, q.xp_value ?? 15]
      );
    }
    res.json({ success: true, quiz_id: quizId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

router.delete('/quiz/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM quizzes WHERE id = $1', [parseInt(req.params.id)]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Quiz nicht gefunden' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

router.get('/results', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT s.nick, qz.title AS quiz_title, qr.score, qr.total, qr.xp_earned, qr.attempt_number, qr.completed_at
      FROM quiz_results qr
      JOIN students s ON s.id = qr.student_id
      JOIN quizzes qz ON qz.id = qr.quiz_id
      ORDER BY qr.completed_at DESC
      LIMIT 200
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

router.get('/xp-log/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT amount, reason, created_at FROM xp_log WHERE student_id = $1 ORDER BY created_at DESC LIMIT 50',
      [parseInt(req.params.id)]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

router.get('/badges', (req, res) => {
  res.json(BADGE_DEFINITIONS);
});

router.get('/export', async (req, res) => {
  try {
    const { rows: students } = await pool.query(`
      SELECT s.id, s.nick, s.xp, s.created_at, s.last_active,
        sn.real_name, sn.class,
        COALESCE(STRING_AGG(sb.badge_id, ';'), '') AS badges
      FROM students s
      LEFT JOIN student_names sn ON sn.student_id = s.id
      LEFT JOIN student_badges sb ON sb.student_id = s.id
      GROUP BY s.id, s.nick, s.xp, s.created_at, s.last_active, sn.real_name, sn.class
      ORDER BY s.xp DESC
    `);

    const csvRows = ['Nick,Klarname,Klasse,XP,Level,Badges,Letzter Login,Anmeldedatum'];
    for (const s of students) {
      csvRows.push([
        s.nick, s.real_name || '', s.class || '', s.xp, getLevelName(s.xp), s.badges,
        s.last_active || '', s.created_at,
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="lernhelden-export.csv"');
    res.send('﻿' + csvRows.join('\r\n'));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

module.exports = router;
