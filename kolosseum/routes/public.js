const express = require('express');
const { db } = require('../db/database');
const router = express.Router();

const LEVELS = [
  { name: 'Rekrut',    min: 0,    icon: '🪖' },
  { name: 'Gladiator', min: 100,  icon: '⚔️' },
  { name: 'Kämpfer',   min: 250,  icon: '🗡️' },
  { name: 'Krieger',   min: 500,  icon: '🛡️' },
  { name: 'Veteran',   min: 900,  icon: '🔱' },
  { name: 'Champion',  min: 1400, icon: '👑' },
  { name: 'Legende',   min: 2000, icon: '🏆' },
];

function getLevel(xp) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].min) return LEVELS[i];
  }
  return LEVELS[0];
}

// GET /api/public/recent-gladiatoren
// Gibt die 2 zuletzt aktiven Gladiatoren zurück (xp >= 100). Öffentlich.
router.get('/recent-gladiatoren', (req, res) => {
  try {
    const rows = db.prepare(
      `SELECT nickname, xp, last_active
       FROM students
       WHERE xp >= 100
       ORDER BY last_active DESC
       LIMIT 2`
    ).all();
    const result = rows.map(r => ({
      nickname:    r.nickname,
      xp:          r.xp,
      level_name:  getLevel(r.xp).name,
      level_icon:  getLevel(r.xp).icon,
      last_active: r.last_active,
    }));
    res.json(result);
  } catch (e) {
    res.json([]);
  }
});

// GET /api/public/xp-aktivitaet
// Gibt die 5 zuletzt aktiven Gladiatoren mit Rang, Level und XP zurück.
router.get('/xp-aktivitaet', (req, res) => {
  try {
    const rows = db.prepare(
      `SELECT nickname, xp, last_active,
              (SELECT COUNT(*) + 1 FROM students s2 WHERE s2.xp > s.xp) AS rang
       FROM students s
       WHERE xp > 0
       ORDER BY last_active DESC
       LIMIT 5`
    ).all();
    const result = rows.map(r => ({
      nickname:    r.nickname,
      xp:          r.xp,
      rang:        r.rang,
      level_name:  getLevel(r.xp).name,
      level_icon:  getLevel(r.xp).icon,
      last_active: r.last_active,
    }));
    res.json(result);
  } catch (e) {
    res.json([]);
  }
});

module.exports = router;
