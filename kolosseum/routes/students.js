const express = require('express');
const { db } = require('../db/database');
const { requireStudent } = require('../middleware/auth');
const { BADGE_DEFINITIONS, checkAndAwardBadges } = require('../db/badges');

const router = express.Router();

// GET /api/students/profile
router.get('/profile', requireStudent, (req, res) => {
  const studentId = req.session.studentId;

  const student = db.prepare(
    'SELECT id, nick, xp, created_at, last_active FROM students WHERE id = ?'
  ).get(studentId);

  if (!student) return res.status(404).json({ error: 'Profil nicht gefunden.' });

  // Prüft auf neu verdiente Badges (z.B. nach manuellem XP-Update durch Admin)
  const newBadgeIds = checkAndAwardBadges(studentId);

  const earnedRows = db.prepare(
    'SELECT badge_id, earned_at FROM student_badges WHERE student_id = ? ORDER BY earned_at ASC'
  ).all(studentId);

  const earnedMap = new Map(earnedRows.map((r) => [r.badge_id, r.earned_at]));

  const badges = BADGE_DEFINITIONS.map(({ id, emoji, name, desc }) => ({
    id,
    emoji,
    name,
    desc,
    earned: earnedMap.has(id),
    earnedAt: earnedMap.get(id) || null,
    isNew: newBadgeIds.includes(id),
  }));

  const xpLog = db.prepare(
    `SELECT amount, reason, created_at
     FROM xp_log
     WHERE student_id = ?
     ORDER BY created_at DESC
     LIMIT 10`
  ).all(studentId);

  res.json({ student, badges, xpLog });
});

module.exports = router;
