const { pool } = require('./database');

const BADGE_DEFINITIONS = [
  { id: 'erster-tag',       name: 'Erster Tag',       icon: '🌟', description: 'Herzlich willkommen bei Lernhelden!' },
  { id: '100xp',            name: '100 XP',            icon: '💯', description: '100 XP erreicht!' },
  { id: '250xp',            name: '250 XP',            icon: '🔥', description: '250 XP erreicht!' },
  { id: '500xp',            name: '500 XP',            icon: '⚡', description: '500 XP erreicht!' },
  { id: '1000xp',           name: '1000 XP',           icon: '👑', description: '1000 XP erreicht!' },
  { id: 'perfektes-quiz',   name: 'Perfektes Quiz',    icon: '🎯', description: 'Quiz mit 100% abgeschlossen!' },
  { id: 'dreitages-streak', name: 'Dreitagesstreak',   icon: '🔁', description: '3 Tage in Folge aktiv!' },
  { id: 'legende',          name: 'Legende',           icon: '🏆', description: '2000 XP erreicht – absolute Legende!' },
];

const XP_BADGES = [
  { xp: 100,  id: '100xp' },
  { xp: 250,  id: '250xp' },
  { xp: 500,  id: '500xp' },
  { xp: 1000, id: '1000xp' },
  { xp: 2000, id: 'legende' },
];

async function checkAndAwardBadges(studentId) {
  const { rows: sr } = await pool.query('SELECT xp FROM students WHERE id = $1', [studentId]);
  if (!sr[0]) return [];

  const { rows: existing } = await pool.query(
    'SELECT badge_id FROM student_badges WHERE student_id = $1', [studentId]
  );
  const has = new Set(existing.map(b => b.badge_id));
  const newBadges = [];
  const xp = sr[0].xp;

  for (const { xp: threshold, id } of XP_BADGES) {
    if (xp >= threshold && !has.has(id)) {
      const r = await pool.query(
        'INSERT INTO student_badges (student_id, badge_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [studentId, id]
      );
      if (r.rowCount > 0) { newBadges.push(BADGE_DEFINITIONS.find(b => b.id === id)); has.add(id); }
    }
  }

  if (!has.has('erster-tag')) {
    const r = await pool.query(
      'INSERT INTO student_badges (student_id, badge_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [studentId, 'erster-tag']
    );
    if (r.rowCount > 0) newBadges.push(BADGE_DEFINITIONS.find(b => b.id === 'erster-tag'));
  }

  return newBadges;
}

async function awardBadge(studentId, badgeId) {
  const badge = BADGE_DEFINITIONS.find(b => b.id === badgeId);
  if (!badge) return null;
  const r = await pool.query(
    'INSERT INTO student_badges (student_id, badge_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [studentId, badgeId]
  );
  return r.rowCount > 0 ? badge : null;
}

async function checkStreakBadge(studentId) {
  const { rows } = await pool.query(
    'SELECT current_streak FROM streaks WHERE student_id = $1', [studentId]
  );
  if (!rows[0] || rows[0].current_streak < 3) return null;
  const r = await pool.query(
    'INSERT INTO student_badges (student_id, badge_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [studentId, 'dreitages-streak']
  );
  return r.rowCount > 0 ? BADGE_DEFINITIONS.find(b => b.id === 'dreitages-streak') : null;
}

module.exports = { BADGE_DEFINITIONS, checkAndAwardBadges, awardBadge, checkStreakBadge };
