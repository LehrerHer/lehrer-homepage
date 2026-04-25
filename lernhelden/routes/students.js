const express = require('express');
const router = express.Router();
const { pool } = require('../db/database');
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
  let level = LEVELS[0], idx = 0;
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xpNeeded) { level = LEVELS[i]; idx = i; break; }
  }
  const next = LEVELS[idx + 1] || null;
  const currentXP = xp - level.xpNeeded;
  const rangeXP = next ? next.xpNeeded - level.xpNeeded : 1;
  const pct = next ? Math.min(100, Math.round((currentXP / rangeXP) * 100)) : 100;
  return { level, idx, next, currentXP, rangeXP, pct };
}

router.get('/profile', requireStudent, async (req, res) => {
  try {
    const { rows: sr } = await pool.query(
      'SELECT id, nick, xp, created_at, last_active FROM students WHERE id = $1', [req.session.studentId]
    );
    if (!sr[0]) return res.status(404).json({ error: 'Profil nicht gefunden' });
    const student = sr[0];

    const [badgeRows, recentXP, streakRows] = await Promise.all([
      pool.query('SELECT badge_id, earned_at FROM student_badges WHERE student_id = $1 ORDER BY earned_at', [student.id]),
      pool.query('SELECT amount, reason, created_at FROM xp_log WHERE student_id = $1 ORDER BY created_at DESC LIMIT 10', [student.id]),
      pool.query('SELECT current_streak, longest_streak FROM streaks WHERE student_id = $1', [student.id]),
    ]);

    const badges = badgeRows.rows.map(b => {
      const def = BADGE_DEFINITIONS.find(d => d.id === b.badge_id);
      return def ? { ...def, earned_at: b.earned_at } : null;
    }).filter(Boolean);

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
      badges,
      recentXP: recentXP.rows,
      streak: streakRows.rows[0] || { current_streak: 0, longest_streak: 0 },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

router.get('/leaderboard', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT s.id, s.nick, s.xp,
        COUNT(sb.badge_id)::int AS badge_count,
        sn.class
      FROM students s
      LEFT JOIN student_names sn ON sn.student_id = s.id
      LEFT JOIN student_badges sb ON sb.student_id = s.id
      GROUP BY s.id, s.nick, s.xp, sn.class
      ORDER BY s.xp DESC
      LIMIT 100
    `);

    const ranked = rows.map((s, i) => {
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

module.exports = router;
