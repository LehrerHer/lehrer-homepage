const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { pool } = require('../db/database');
const { checkAndAwardBadges, checkStreakBadge } = require('../db/badges');
const { loginLimiter, adminLoginLimiter } = require('../middleware/rateLimit');

async function updateStreak(studentId) {
  const today = new Date().toISOString().split('T')[0];
  const { rows } = await pool.query('SELECT * FROM streaks WHERE student_id = $1', [studentId]);
  const streak = rows[0];

  if (!streak) {
    await pool.query(
      'INSERT INTO streaks (student_id, current_streak, last_active_date, longest_streak) VALUES ($1, 1, $2, 1)',
      [studentId, today]
    );
    return 1;
  }

  const lastDate = String(streak.last_active_date).split('T')[0];
  if (lastDate === today) return streak.current_streak;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const newStreak = lastDate === yesterdayStr ? streak.current_streak + 1 : 1;
  const longest = Math.max(newStreak, streak.longest_streak);

  await pool.query(
    'UPDATE streaks SET current_streak = $1, last_active_date = $2, longest_streak = $3 WHERE student_id = $4',
    [newStreak, today, longest, studentId]
  );
  return newStreak;
}

async function grantStreakXP(studentId) {
  const { rows } = await pool.query('SELECT current_streak FROM streaks WHERE student_id = $1', [studentId]);
  if (!rows[0] || rows[0].current_streak < 3) return 0;

  const today = new Date().toISOString().split('T')[0];
  const { rows: already } = await pool.query(
    "SELECT 1 FROM xp_log WHERE student_id = $1 AND reason = 'Tagesstreak' AND DATE(created_at) = $2",
    [studentId, today]
  );
  if (already.length > 0) return 0;

  await pool.query('UPDATE students SET xp = xp + 20 WHERE id = $1', [studentId]);
  await pool.query("INSERT INTO xp_log (student_id, amount, reason) VALUES ($1, 20, 'Tagesstreak')", [studentId]);
  return 20;
}

router.post('/login', loginLimiter, async (req, res) => {
  const { nick, pin } = req.body;
  if (!nick || !pin) return res.status(400).json({ error: 'Nick und PIN erforderlich' });

  try {
    const { rows } = await pool.query('SELECT * FROM students WHERE nick = $1', [nick.trim()]);
    const student = rows[0];
    if (!student) return res.status(401).json({ error: 'Ungültiger Spitzname oder PIN' });

    const valid = await bcrypt.compare(pin.toString(), student.pin_hash);
    if (!valid) return res.status(401).json({ error: 'Ungültiger Spitzname oder PIN' });

    await pool.query('UPDATE students SET last_active = NOW() WHERE id = $1', [student.id]);
    await updateStreak(student.id);
    const streakXP = await grantStreakXP(student.id);
    const newBadges = await checkAndAwardBadges(student.id);
    const streakBadge = await checkStreakBadge(student.id);
    if (streakBadge) newBadges.push(streakBadge);

    req.session.studentId = student.id;
    req.session.studentNick = student.nick;

    res.json({ success: true, nick: student.nick, streakXP, newBadges });
  } catch (err) {
    console.error('Login-Fehler:', err);
    res.status(500).json({ error: 'Serverfehler beim Login' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

router.get('/me', (req, res) => {
  if (req.session && req.session.studentId) {
    return res.json({ loggedIn: true, studentId: req.session.studentId, nick: req.session.studentNick });
  }
  res.json({ loggedIn: false });
});

router.post('/admin-login', adminLoginLimiter, async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Passwort erforderlich' });

  try {
    let hash = process.env.ADMIN_PASSWORD_HASH;
    if (!hash && process.env.ADMIN_PASSWORD) {
      hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
    }
    if (!hash) hash = await bcrypt.hash('lernhelden', 10);

    const valid = await bcrypt.compare(password, hash);
    if (!valid) return res.status(401).json({ error: 'Falsches Passwort' });

    req.session.adminId = 'admin';
    req.session.save(err => {
      if (err) { console.error('Session-Fehler:', err); return res.status(500).json({ error: 'Session-Fehler' }); }
      res.json({ success: true });
    });
  } catch (err) {
    console.error('Admin-Login-Fehler:', err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

router.post('/admin-logout', (req, res) => {
  req.session.adminId = null;
  req.session.save(() => res.json({ success: true }));
});

router.get('/admin-me', (req, res) => {
  res.json({ loggedIn: !!(req.session && req.session.adminId) });
});

module.exports = router;
