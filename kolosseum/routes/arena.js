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

const MAX_ANGRIFFE_PRO_TAG = 4;
const MUENZEN_BASIS = 15; // Münzen bei gleich starkem Gegner

// Münzen für einen erfolgreichen Angriff: skaliert mit der relativen Stärke
// des Gegners (gleiche log-Skalierung wie die Kampfstats). Gleich starker
// Gegner -> 15 Münzen. Schwächere Gegner geben weniger, ab der Hälfte der
// eigenen Stärke nichts mehr. Stärkere Gegner geben mehr (gedeckelt).
function muenzenFuerSieg(eigeneXp, gegnerXp) {
  const eigeneStaerke = Math.max(Math.pow(Math.max(eigeneXp, 0), 0.35), 1);
  const gegnerStaerke = Math.max(Math.pow(Math.max(gegnerXp, 0), 0.35), 1);
  const verhaeltnis = gegnerStaerke / eigeneStaerke;

  if (verhaeltnis <= 0.5) return 0; // Gegner zu schwach – keine Münzen

  if (verhaeltnis < 1) {
    return Math.round(MUENZEN_BASIS * (verhaeltnis - 0.5) / 0.5);
  }
  return Math.round(MUENZEN_BASIS * Math.min(verhaeltnis, 3)); // gedeckelt bei 45
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

// POST /api/arena/herausforderung – Gegner sofort angreifen (Kampf wird direkt berechnet)
router.post('/herausforderung', requireStudent, (req, res) => {
  const meinId   = req.session.studentId;
  const gegnerId = Number(req.body.gegnerId);

  if (!gegnerId || isNaN(gegnerId)) return res.status(400).json({ error: 'Ungültige Gegner-ID.' });
  if (gegnerId === meinId)           return res.status(400).json({ error: 'Du kannst dich nicht selbst angreifen.' });

  const angreifer = db.prepare('SELECT id, nick, xp FROM students WHERE id = ?').get(meinId);
  const gegner    = db.prepare('SELECT id, nick, xp FROM students WHERE id = ?').get(gegnerId);
  if (!gegner) return res.status(404).json({ error: 'Gladiator nicht gefunden.' });

  const heute = db.prepare(
    "SELECT COUNT(*) AS n FROM challenges WHERE challenger_id = ? AND date(created_at) = date('now')"
  ).get(meinId);
  if (heute.n >= MAX_ANGRIFFE_PRO_TAG) {
    return res.status(429).json({ error: `Du hast dein Tageslimit von ${MAX_ANGRIFFE_PRO_TAG} Angriffen erreicht. Versuch's morgen wieder!` });
  }

  const h_items = equippedItems(meinId);
  const g_items = equippedItems(gegnerId);
  const sim = kampfSimulieren(angreifer.xp, gegner.xp, h_items, g_items);

  const angreiferGewinnt = sim.herausfordererGewinnt;
  const gewinnerId = angreiferGewinnt ? meinId : gegnerId;
  const muenzenAngreifer = angreiferGewinnt ? muenzenFuerSieg(angreifer.xp, gegner.xp) : 0;

  const log = JSON.stringify({
    runden:      sim.runden,
    startHpA:    sim.startHpA, atkA: sim.atkA,
    critChanceA: sim.critChanceA, dodgeChanceA: sim.dodgeChanceA,
    startHpB:    sim.startHpB, atkB: sim.atkB,
    critChanceB: sim.critChanceB, dodgeChanceB: sim.dodgeChanceB,
    herausfordererGewinnt: sim.herausfordererGewinnt,
    h_nick: angreifer.nick, g_nick: gegner.nick,
    h_xp:   angreifer.xp,   g_xp:   gegner.xp,
    muenzenAngreifer,
  });

  const kampfId = db.transaction(() => {
    const r = db.prepare(
      "INSERT INTO challenges (challenger_id, opponent_id, status, winner_id, battle_log) VALUES (?, ?, 'completed', ?, ?)"
    ).run(meinId, gegnerId, gewinnerId, log);
    if (muenzenAngreifer > 0) {
      db.prepare('UPDATE students SET coins = COALESCE(coins, 0) + ? WHERE id = ?').run(muenzenAngreifer, meinId);
      db.prepare('INSERT INTO coins_log (student_id, amount, reason) VALUES (?,?,?)')
        .run(meinId, muenzenAngreifer, `⚔️ Angriff auf ${gegner.nick} erfolgreich`);
    }
    return r.lastInsertRowid;
  })();

  res.json({ ok: true, kampfId, gegnerNick: gegner.nick, gewonnen: angreiferGewinnt, muenzen: muenzenAngreifer });
});

// GET /api/arena/uebersicht – Tageslimit + letzte Kämpfe laden
router.get('/uebersicht', requireStudent, (req, res) => {
  const id = req.session.studentId;

  const heute = db.prepare(
    "SELECT COUNT(*) AS n FROM challenges WHERE challenger_id = ? AND date(created_at) = date('now')"
  ).get(id);

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

  res.json({
    angriffeHeute: heute.n,
    angriffeUebrig: Math.max(0, MAX_ANGRIFFE_PRO_TAG - heute.n),
    maxAngriffeProTag: MAX_ANGRIFFE_PRO_TAG,
    meineKaempfe,
    meinId: id,
  });
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
