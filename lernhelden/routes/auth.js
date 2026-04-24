const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { getDB } = require('../db/database');
const { checkAndAwardBadges, checkStreakBadge } = require('../db/badges');
const { loginLimiter, adminLoginLimiter } = require('../middleware/rateLimit');

function updateStreak(db, studentId) {
  const today = new Date().toISOString().split('T')[0];
  const streak = db.prepare('SELECT * FROM streaks WHERE student_id = ?').get(studentId);

  if (!streak) {
    db.prepare('INSERT INTO streaks (student_id, current_streak, last_active_date, longest_streak) VALUES (?, 1, ?, 1)').run(studentId, today);
    return 1;
  }

  if (streak.last_active_date === today) return streak.current_streak;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  let newStreak = streak.last_active_date === yesterdayStr ? streak.current_streak + 1 : 1;
  const longest = Math.max(newStreak, streak.longest_streak);

  db.prepare('UPDATE streaks SET current_streak = ?, last_active_date = ?, longest_streak = ? WHERE student_id = ?')
    .run(newStreak, today, longest, studentId);

  return newStreak;
}

function grantStreakXP(db, studentId) {
  const streak = db.prepare('SELECT current_streak FROM streaks WHERE student_id = ?').get(studentId);
  if (!streak || streak.current_streak < 3) return 0;

  const today = new Date().toISOString().split('T')[0];
  const alreadyGranted = db.prepare(
    "SELECT 1 FROM xp_log WHERE student_id = ? AND reason = 'Tagesstreak' AND date(created_at) = ?"
  ).get(studentId, today);
  if (alreadyGranted) return 0;

  db.prepare('UPDATE students SET xp = xp + 20 WHERE id = ?').run(studentId);
  db.prepare("INSERT INTO xp_log (student_id, amount, reason) VALUES (?, 20, 'Tagesstreak')").run(studentId);
  return 20;
}

router.post('/login', loginLimiter, async (req, res) => {
  const { nick, pin } = req.body;
  if (!nick || !pin) return res.status(400).json({ error: 'Nick und PIN erforderlich' });

  try {
    const db = getDB();
    const student = db.prepare('SELECT * FROM students WHERE nick = ?').get(nick.trim());
    if (!student) return res.status(401).json({ error: 'Ungültiger Spitzname oder PIN' });

    const valid = await bcrypt.compare(pin.toString(), student.pin_hash);
    if (!valid) return res.status(401).json({ error: 'Ungültiger Spitzname oder PIN' });

    db.prepare('UPDATE students SET last_active = CURRENT_TIMESTAMP WHERE id = ?').run(student.id);

    updateStreak(db, student.id);
    const streakXP = grantStreakXP(db, student.id);

    const newBadges = checkAndAwardBadges(db, student.id);
    const streakBadge = checkStreakBadge(db, student.id);
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
    if (!hash) {
      hash = await bcrypt.hash('lernhelden', 10);
    }
    const valid = await bcrypt.compare(password, hash);
    if (!valid) return res.status(401).json({ error: 'Falsches Passwort' });

    req.session.adminId = 'admin';
    res.json({ success: true });
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
