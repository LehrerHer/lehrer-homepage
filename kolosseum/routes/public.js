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

// GET /api/public/letzter-spitzname
// Gibt den zuletzt registrierten Spitznamen zurück. Öffentlich, kein Login nötig.
router.get('/letzter-spitzname', (req, res) => {
  try {
    const row = db.prepare(
      `SELECT nick, created_at FROM students ORDER BY created_at DESC LIMIT 1`
    ).get();
    if (!row) return res.json(null);
    res.json({ nick: row.nick, created_at: row.created_at });
  } catch (e) {
    res.json(null);
  }
});

// GET /api/public/recent-gladiatoren
// Gibt die 2 zuletzt aktiven Gladiatoren zurück, die bereits einen Rang
// über Rekrut erreicht haben (xp >= 100). Öffentlich, kein Login nötig.
router.get('/recent-gladiatoren', (req, res) => {
  try {
    const rows = db.prepare(
      `SELECT nick, xp, last_active
       FROM students
       WHERE xp >= 100
       ORDER BY last_active DESC
       LIMIT 3`
    ).all();
    const result = rows.map(r => ({
      nickname:    r.nick,
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

module.exports = router;
