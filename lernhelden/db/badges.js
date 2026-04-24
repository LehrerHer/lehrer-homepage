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

function checkAndAwardBadges(db, studentId) {
  const student = db.prepare('SELECT xp FROM students WHERE id = ?').get(studentId);
  if (!student) return [];

  const existing = new Set(
    db.prepare('SELECT badge_id FROM student_badges WHERE student_id = ?')
      .all(studentId)
      .map(b => b.badge_id)
  );

  const newBadges = [];
  const insert = db.prepare('INSERT OR IGNORE INTO student_badges (student_id, badge_id) VALUES (?, ?)');

  for (const { xp, id } of XP_BADGES) {
    if (student.xp >= xp && !existing.has(id)) {
      insert.run(studentId, id);
      newBadges.push(BADGE_DEFINITIONS.find(b => b.id === id));
      existing.add(id);
    }
  }

  if (!existing.has('erster-tag')) {
    insert.run(studentId, 'erster-tag');
    newBadges.push(BADGE_DEFINITIONS.find(b => b.id === 'erster-tag'));
  }

  return newBadges;
}

function awardBadge(db, studentId, badgeId) {
  const badge = BADGE_DEFINITIONS.find(b => b.id === badgeId);
  if (!badge) return null;
  const result = db.prepare('INSERT OR IGNORE INTO student_badges (student_id, badge_id) VALUES (?, ?)').run(studentId, badgeId);
  return result.changes > 0 ? badge : null;
}

function checkStreakBadge(db, studentId) {
  const streak = db.prepare('SELECT current_streak FROM streaks WHERE student_id = ?').get(studentId);
  if (!streak || streak.current_streak < 3) return null;

  const existing = db.prepare('SELECT 1 FROM student_badges WHERE student_id = ? AND badge_id = ?').get(studentId, 'dreitages-streak');
  if (existing) return null;

  db.prepare('INSERT OR IGNORE INTO student_badges (student_id, badge_id) VALUES (?, ?)').run(studentId, 'dreitages-streak');
  return BADGE_DEFINITIONS.find(b => b.id === 'dreitages-streak');
}

module.exports = { BADGE_DEFINITIONS, checkAndAwardBadges, awardBadge, checkStreakBadge };
