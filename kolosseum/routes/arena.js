const express = require('express');
const { db } = require('../db/database');
const { requireStudent } = require('../middleware/auth');

const router = express.Router();

// Kampfboni pro Item (werden auf Basis-Stats addiert/multipliziert)
const ITEM_BONI = {
  titel_blut:     { atkBonus: 0.03 },
  titel_loewe:    { hpBonus:  0.08 },
  titel_blitz:    { atkBonus: 0.08 },
  titel_sturm:    { dodgeBonus: 0.08 },
  titel_schatten: { dodgeBonus: 0.10 },
  titel_drache:   { atkBonus: 0.10 },
  titel_koenig:   { hpBonus: 0.10, atkBonus: 0.05 },
  titel_legende:  { hpBonus: 0.12, atkBonus: 0.08 },
  effekt_feuer:   { atkBonus: 0.12 },
  effekt_frost:   { hpBonus:  0.15 },
  effekt_blitz:   { critBonus: 0.15 },
};

function kampfStats(xp, items = []) {
  // Logarithmische Skalierung: kleinerer Gap zwischen schwachen und starken S
  const w = Math.pow(Math.max(xp, 0), 0.35);
  const stats = {
    hp:          Math.round(100 + w * 8),
    atk:         Math.round(7   + w * 1.8),
    critChance:  0.20,
    dodgeChance: 0.12,
  };

  for (const itemId of items) {
    const bonus = ITEM_BONI[itemId];
    if (!bonus) continue;
    if (bonus.hpBonus)    stats.hp          = Math.round(stats.hp  * (1 + bonus.hpBonus));
    if (bonus.atkBonus)   stats.atk         = Math.round(stats.atk * (1 + bonus.atkBonus));
    if (bonus.critBonus)  stats.critChance  = Math.min(0.60, stats.critChance  + bonus.critBonus);
    if (bonus.dodgeBonus) stats.dodgeChance = Math.min(0.40, stats.dodgeChance + bonus.dodgeBonus);
  }

  return stats;
}

function equippedItems(sid) {
  return db.prepare(
    "SELECT item_id FROM student_items WHERE student_id = ? AND equipped = 1"
  ).all(sid).map(r => r.item_id);
}

function kampfSimulieren(xpA, xpB, itemsA = [], itemsB = []) {
  const statA = kampfStats(xpA, itemsA);
  const statB = kampfStats(xpB, itemsB);
  let hpA = statA.hp;
  let hpB = statB.hp;
  const runden = [];

  for (let i = 0; i < 15 && hpA > 0 && hpB > 0; i++) {
    // A greift B an – B kann ausweichen
    const dodgedB = Math.random() < statB.dodgeChance;
    const critA   = !dodgedB && Math.random() < statA.critChance;
    const baseDmgA = Math.max(1, Math.round(statA.atk * (0.7 + Math.random() * 0.6)));
    const dmgA = dodgedB ? 0 : Math.round(baseDmgA * (critA ? 1.8 : 1));

    // B greift A an – A kann ausweichen
    const dodgedA = Math.random() < statA.dodgeChance;
    const critB   = !dodgedA && Math.random() < statB.critChance;
    const baseDmgB = Math.max(1, Math.round(statB.atk * (0.7 + Math.random() * 0.6)));
    const dmgB = dodgedA ? 0 : Math.round(baseDmgB * (critB ? 1.8 : 1));

    hpA = Math.max(0, hpA - dmgB);
    hpB = Math.max(0, hpB - dmgA);
    runden.push({ runde: i + 1, dmgA, dmgB, hpA, hpB, critA, critB, dodgedA, dodgedB });
    if (hpA <= 0 || hpB <= 0) break;
  }

  return {
    runden,
    herausfordererGewinnt: hpA >= hpB,
    startHpA: statA.hp, atkA: statA.atk,
    critChanceA: statA.critChance, dodgeChanceA: statA.dodgeChance,
    startHpB: statB.hp, atkB: statB.atk,
    critChanceB: statB.critChance, dodgeChanceB: statB.dodgeChance,
  };
}

// POST /api/arena/herausforderung – Gegner herausfordern
router.post('/herausforderung', requireStudent, (req, res) => {
  const meinId  = req.session.studentId;
  const gegnerId = Number(req.body.gegnerId);

  if (!gegnerId || isNaN(gegnerId)) return res.status(400).json({ error: 'Ungültige Gegner-ID.' });
  if (gegnerId === meinId)           return res.status(400).json({ error: 'Du kannst dich nicht selbst herausfordern.' });

  const gegner = db.prepare('SELECT id, nick FROM students WHERE id = ?').get(gegnerId);
  if (!gegner) return res.status(404).json({ error: 'Gladiator nicht gefunden.' });

  const offen = db.prepare(
    "SELECT id FROM challenges WHERE challenger_id = ? AND opponent_id = ? AND status = 'pending'"
  ).get(meinId, gegnerId);
  if (offen) return res.status(409).json({ error: 'Du hast diesen Gladiator bereits herausgefordert.' });

  const anzahl = db.prepare(
    "SELECT COUNT(*) AS n FROM challenges WHERE challenger_id = ? AND status = 'pending'"
  ).get(meinId);
  if (anzahl.n >= 3) return res.status(429).json({ error: 'Maximal 3 offene Herausforderungen erlaubt.' });

  const r = db.prepare(
    "INSERT INTO challenges (challenger_id, opponent_id, status) VALUES (?, ?, 'pending')"
  ).run(meinId, gegnerId);

  res.json({ ok: true, id: r.lastInsertRowid, gegnerNick: gegner.nick });
});

// GET /api/arena/herausforderungen – eigene Challenges laden
router.get('/herausforderungen', requireStudent, (req, res) => {
  const id = req.session.studentId;

  const eingehend = db.prepare(`
    SELECT c.id, c.created_at,
           h.nick AS von_nick, h.xp AS von_xp, h.id AS von_id
    FROM challenges c
    JOIN students h ON h.id = c.challenger_id
    WHERE c.opponent_id = ? AND c.status = 'pending'
    ORDER BY c.created_at DESC LIMIT 10
  `).all(id);

  const ausgehend = db.prepare(`
    SELECT c.id, c.status, c.winner_id, c.created_at,
           g.nick AS an_nick, g.id AS an_id
    FROM challenges c
    JOIN students g ON g.id = c.opponent_id
    WHERE c.challenger_id = ? AND c.status IN ('pending','completed','declined')
    ORDER BY c.created_at DESC LIMIT 10
  `).all(id);

  const meineKaempfe = db.prepare(`
    SELECT c.id, c.winner_id, c.created_at,
           h.nick AS h_nick, h.id AS h_id,
           g.nick AS g_nick, g.id AS g_id
    FROM challenges c
    JOIN students h ON h.id = c.challenger_id
    JOIN students g ON g.id = c.opponent_id
    WHERE (c.challenger_id = ? OR c.opponent_id = ?) AND c.status = 'completed'
    ORDER BY c.created_at DESC LIMIT 5
  `).all(id, id);

  res.json({ eingehend, ausgehend, meineKaempfe, meinId: id });
});

// POST /api/arena/herausforderung/:id/annehmen – Kampf auflösen
router.post('/herausforderung/:id/annehmen', requireStudent, (req, res) => {
  const meinId = req.session.studentId;
  const cId    = Number(req.params.id);

  const c = db.prepare(`
    SELECT c.*,
           h.nick AS h_nick, h.xp AS h_xp,
           g.nick AS g_nick, g.xp AS g_xp
    FROM challenges c
    JOIN students h ON h.id = c.challenger_id
    JOIN students g ON g.id = c.opponent_id
    WHERE c.id = ? AND c.opponent_id = ? AND c.status = 'pending'
  `).get(cId, meinId);

  if (!c) return res.status(404).json({ error: 'Herausforderung nicht gefunden.' });

  const h_items = equippedItems(c.challenger_id);
  const g_items = equippedItems(c.opponent_id);
  const sim = kampfSimulieren(c.h_xp, c.g_xp, h_items, g_items);

  const gewinnerId  = sim.herausfordererGewinnt ? c.challenger_id : c.opponent_id;
  const verliererId = sim.herausfordererGewinnt ? c.opponent_id   : c.challenger_id;
  const gewinnerNick  = sim.herausfordererGewinnt ? c.h_nick : c.g_nick;
  const verliererNick = sim.herausfordererGewinnt ? c.g_nick : c.h_nick;

  const muenzenG = 15;
  const muenzenV = 3;

  const log = JSON.stringify({
    runden:      sim.runden,
    startHpA:    sim.startHpA, atkA: sim.atkA,
    critChanceA: sim.critChanceA, dodgeChanceA: sim.dodgeChanceA,
    startHpB:    sim.startHpB, atkB: sim.atkB,
    critChanceB: sim.critChanceB, dodgeChanceB: sim.dodgeChanceB,
    herausfordererGewinnt: sim.herausfordererGewinnt,
    h_nick: c.h_nick, g_nick: c.g_nick,
    h_xp:   c.h_xp,   g_xp:   c.g_xp,
    muenzenGewinner: muenzenG, muenzenVerlierer: muenzenV,
  });

  db.transaction(() => {
    db.prepare("UPDATE challenges SET status='completed', winner_id=?, battle_log=? WHERE id=?")
      .run(gewinnerId, log, cId);
    // Münzen vergeben statt XP
    db.prepare('UPDATE students SET coins = COALESCE(coins, 0) + ? WHERE id = ?').run(muenzenG, gewinnerId);
    db.prepare('UPDATE students SET coins = COALESCE(coins, 0) + ? WHERE id = ?').run(muenzenV, verliererId);
    db.prepare('INSERT INTO coins_log (student_id, amount, reason) VALUES (?,?,?)')
      .run(gewinnerId, muenzenG, `⚔️ Kampf gewonnen gegen ${verliererNick}`);
    db.prepare('INSERT INTO coins_log (student_id, amount, reason) VALUES (?,?,?)')
      .run(verliererId, muenzenV, `⚔️ Tapfer gekämpft gegen ${gewinnerNick}`);
  })();

  res.json({ ok: true, kampfId: cId });
});

// POST /api/arena/herausforderung/:id/ablehnen
router.post('/herausforderung/:id/ablehnen', requireStudent, (req, res) => {
  const meinId = req.session.studentId;
  const cId    = Number(req.params.id);

  const c = db.prepare(
    "SELECT id FROM challenges WHERE id=? AND opponent_id=? AND status='pending'"
  ).get(cId, meinId);
  if (!c) return res.status(404).json({ error: 'Herausforderung nicht gefunden.' });

  db.prepare("UPDATE challenges SET status='declined' WHERE id=?").run(cId);
  res.json({ ok: true });
});

// GET /api/arena/kampf/:id – Kampfergebnis/Replay-Daten
router.get('/kampf/:id', requireStudent, (req, res) => {
  const meinId = req.session.studentId;
  const cId    = Number(req.params.id);

  const c = db.prepare(`
    SELECT c.id, c.winner_id, c.battle_log, c.created_at,
           h.nick AS h_nick, h.xp AS h_xp_aktuell, h.id AS h_id,
           g.nick AS g_nick, g.xp AS g_xp_aktuell, g.id AS g_id
    FROM challenges c
    JOIN students h ON h.id = c.challenger_id
    JOIN students g ON g.id = c.opponent_id
    WHERE c.id = ? AND (c.challenger_id = ? OR c.opponent_id = ?) AND c.status = 'completed'
  `).get(cId, meinId, meinId);

  if (!c) return res.status(404).json({ error: 'Kampf nicht gefunden.' });

  const log = c.battle_log ? JSON.parse(c.battle_log) : null;

  const h_items = equippedItems(c.h_id);
  const g_items = equippedItems(c.g_id);

  res.json({
    id:        c.id,
    winner_id: c.winner_id,
    created_at: c.created_at,
    h_nick: c.h_nick, h_id: c.h_id, h_xp: c.h_xp_aktuell,
    g_nick: c.g_nick, g_id: c.g_id, g_xp: c.g_xp_aktuell,
    h_items, g_items,
    log,
    meinId,
  });
});

module.exports = router;
