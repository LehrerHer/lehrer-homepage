const express = require('express');
const router = express.Router();
const { getDB } = require('../db/database');
const { BADGE_DEFINITIONS } = require('../db/badges');
const { requireStudent } = require('../middleware/auth');

const LEVELS = [
  { name: 'Lehrling',  xpNeeded: 0    },
  { name: 'Entdecker', xpNeeded: 100  },
  { name: 'Kämpfer',   xpNeeded: 250  },
  { name: 'Held',      xpNeeded: 500  },
  { name: 'Ritter',    xpNeeded: 900  },
  { name: 'Champion',  xpNeeded: 1400 },
  { name: 'Legende',   xpNeeded: 2000 },
];

function getLevelInfo(xp) {
  let level = LEVELS[0];
  let idx = 0;
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xpNeeded) { level = LEVELS[i]; idx = i; break; }
  }
  const next = LEVELS[idx + 1] || null;
  const currentXP = xp - level.xpNeeded;
  const rangeXP = next ? next.xpNeeded - level.xpNeeded : 1;
  const pct = next ? Math.min(100, Math.round((currentXP / rangeXP) * 100)) : 100;
  return { level, idx, next, currentXP, rangeXP, pct };
}

router.get('/profile', requireStudent, (req, res) => {
  const db = getDB();
  const student = db.prepare('SELECT id, nick, xp, created_at, last_active FROM students WHERE id = ?').get(req.session.studentId);
  if (!student) return res.status(404).json({ error: 'Profil nicht gefunden' });

  const badges = db.prepare('SELECT badge_id, earned_at FROM student_badges WHERE student_id = ? ORDER BY earned_at').all(student.id);
  const badgeDetails = badges.map(b => {
    const def = BADGE_DEFINITIONS.find(d => d.id === b.badge_id);
    return def ? { ...def, earned_at: b.earned_at } : null;
  }).filter(Boolean);

  const recentXP = db.prepare('SELECT amount, reason, created_at FROM xp_log WHERE student_id = ? ORDER BY created_at DESC LIMIT 10').all(student.id);
  const streak = db.prepare('SELECT current_streak, longest_streak FROM streaks WHERE student_id = ?').get(student.id);

  const lvInfo = getLevelInfo(student.xp);

  res.json({
    id: student.id,
    nick: student.nick,
    xp: student.xp,
    created_at: student.created_at,
    last_active: student.last_active,
    levelIndex: lvInfo.idx,
    levelName: lvInfo.level.name,
    nextLevelName: lvInfo.next ? lvInfo.next.name : null,
    currentXP: lvInfo.currentXP,
    rangeXP: lvInfo.rangeXP,
    progressPct: lvInfo.pct,
    badges: badgeDetails,
    recentXP,
    streak: streak || { current_streak: 0, longest_streak: 0 },
  });
});

router.get('/leaderboard', (req, res) => {
  const db = getDB();
  const students = db.prepare(`
    SELECT s.id, s.nick, s.xp,
      (SELECT COUNT(*) FROM student_badges sb WHERE sb.student_id = s.id) as badge_count,
      sn.class
    FROM students s
    LEFT JOIN student_names sn ON sn.student_id = s.id
    ORDER BY s.xp DESC
    LIMIT 100
  `).all();

  const ranked = students.map((s, i) => {
    const lvInfo = getLevelInfo(s.xp);
    return {
      rank: i + 1,
      nick: s.nick,
      xp: s.xp,
      levelIndex: lvInfo.idx,
      levelName: lvInfo.level.name,
      badge_count: s.badge_count,
      class: s.class,
    };
  });

  res.json(ranked);
});

module.exports = router;
