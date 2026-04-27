const { db } = require('./database');

const BADGE_DEFINITIONS = [
  {
    id: 'first_day',
    emoji: '🌟',
    name: 'Erster Tag',
    desc: 'Erstanmeldung im Lernkolosseum',
    auto: true,
    check: () => true,
  },
  {
    id: 'xp_100',
    emoji: '💯',
    name: '100 XP',
    desc: 'XP-Stand von 100 erreicht',
    auto: true,
    check: (s) => s.xp >= 100,
  },
  {
    id: 'xp_250',
    emoji: '🔥',
    name: '250 XP',
    desc: 'XP-Stand von 250 erreicht',
    auto: true,
    check: (s) => s.xp >= 250,
  },
  {
    id: 'xp_500',
    emoji: '⚡',
    name: '500 XP',
    desc: 'XP-Stand von 500 erreicht',
    auto: true,
    check: (s) => s.xp >= 500,
  },
  {
    id: 'xp_1000',
    emoji: '👑',
    name: '1000 XP',
    desc: 'XP-Stand von 1000 erreicht',
    auto: true,
    check: (s) => s.xp >= 1000,
  },
  {
    id: 'perfect_quiz',
    emoji: '🎯',
    name: 'Perfektes Quiz',
    desc: 'Ein Quiz mit 100 % abgeschlossen',
    auto: false,
    check: null,
  },
  {
    id: 'streak_3',
    emoji: '🔁',
    name: 'Dreitagesstreak',
    desc: '3 Tage in Folge aktiv',
    auto: false,
    check: null,
  },
  {
    id: 'xp_2000',
    emoji: '🏆',
    name: 'Legende',
    desc: 'XP-Stand von 2000 erreicht',
    auto: true,
    check: (s) => s.xp >= 2000,
  },
];

// Verleiht ein einzelnes Badge. Gibt true zurück wenn es neu ist.
function awardBadge(studentId, badgeId) {
  const info = db.prepare(
    'INSERT OR IGNORE INTO student_badges (student_id, badge_id) VALUES (?, ?)'
  ).run(studentId, badgeId);
  return info.changes > 0;
}

// Prüft alle auto-Badges und gibt neu freigeschaltete Badge-IDs zurück.
function checkAndAwardBadges(studentId) {
  const student = db.prepare('SELECT xp FROM students WHERE id = ?').get(studentId);
  if (!student) return [];

  const earned = new Set(
    db.prepare('SELECT badge_id FROM student_badges WHERE student_id = ?')
      .all(studentId)
      .map((r) => r.badge_id)
  );

  const newBadges = [];
  for (const badge of BADGE_DEFINITIONS) {
    if (!badge.auto || earned.has(badge.id)) continue;
    if (badge.check(student)) {
      const isNew = awardBadge(studentId, badge.id);
      if (isNew) newBadges.push(badge.id);
    }
  }
  return newBadges;
}

module.exports = { BADGE_DEFINITIONS, awardBadge, checkAndAwardBadges };
