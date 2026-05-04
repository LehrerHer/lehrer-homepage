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

// GET /api/students/avatar – eigene Avatar-Konfig lesen
router.get('/avatar', requireStudent, (req, res) => {
  const row = db.prepare('SELECT avatar_config FROM students WHERE id = ?').get(req.session.studentId);
  if (!row) return res.status(404).json({ error: 'Nicht gefunden.' });
  res.json({ avatarConfig: row.avatar_config ? JSON.parse(row.avatar_config) : null });
});

// PATCH /api/students/avatar – Avatar-Konfig speichern
router.patch('/avatar', requireStudent, (req, res) => {
  const allowed = new Set(['classId', 'raceId', 'genderId', 'skinId', 'hairColorId', 'accessoryId', 'name']);
  const input = req.body;
  if (typeof input !== 'object' || input === null) return res.status(400).json({ error: 'Ungültige Daten.' });
  const sanitized = {};
  for (const key of allowed) {
    if (key in input) sanitized[key] = String(input[key]).slice(0, 40);
  }
  db.prepare('UPDATE students SET avatar_config = ? WHERE id = ?')
    .run(JSON.stringify(sanitized), req.session.studentId);
  res.json({ ok: true });
});

// GET /api/students/rangliste – Top-Schüler nach XP
router.get('/rangliste', requireStudent, (req, res) => {
  const students = db.prepare(`
    SELECT s.id, s.nick, s.xp,
           COUNT(sb.badge_id) AS badge_count
    FROM students s
    LEFT JOIN student_badges sb ON sb.student_id = s.id
    GROUP BY s.id
    ORDER BY s.xp DESC, s.nick ASC
    LIMIT 50
  `).all();

  res.json(students);
});

module.exports = router;
