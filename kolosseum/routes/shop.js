const express = require('express');
const { db } = require('../db/database');
const { requireStudent } = require('../middleware/auth');
const { SHOP_ITEMS } = require('../db/shop-items');

const router = express.Router();

// GET /api/shop/items – alle Items mit Kauf- und Ausrüstungsstatus
router.get('/items', requireStudent, (req, res) => {
  const sid = req.session.studentId;

  const student = db.prepare('SELECT COALESCE(coins, 0) AS coins FROM students WHERE id = ?').get(sid);
  const myItems = db.prepare('SELECT item_id, equipped FROM student_items WHERE student_id = ?').all(sid);
  const myMap   = new Map(myItems.map(r => [r.item_id, r.equipped]));

  const items = SHOP_ITEMS.map(item => ({
    ...item,
    gekauft:    myMap.has(item.id),
    ausgerüstet: myMap.get(item.id) === 1,
  }));

  res.json({ items, coins: student ? student.coins : 0 });
});

// POST /api/shop/kaufen – Item kaufen
router.post('/kaufen', requireStudent, (req, res) => {
  const sid    = req.session.studentId;
  const itemId = String(req.body.itemId || '');

  const item = SHOP_ITEMS.find(i => i.id === itemId);
  if (!item) return res.status(404).json({ error: 'Item nicht gefunden.' });

  const student = db.prepare('SELECT COALESCE(coins, 0) AS coins FROM students WHERE id = ?').get(sid);
  if (!student) return res.status(404).json({ error: 'Schüler nicht gefunden.' });

  if (student.coins < item.preis) {
    return res.status(402).json({ error: 'Nicht genug Münzen.' });
  }

  const bereits = db.prepare('SELECT id FROM student_items WHERE student_id = ? AND item_id = ?').get(sid, itemId);
  if (bereits) return res.status(409).json({ error: 'Item bereits besessen.' });

  db.transaction(() => {
    db.prepare('UPDATE students SET coins = COALESCE(coins, 0) - ? WHERE id = ?').run(item.preis, sid);
    db.prepare('INSERT INTO student_items (student_id, item_id, equipped) VALUES (?, ?, 0)').run(sid, itemId);
    db.prepare('INSERT INTO coins_log (student_id, amount, reason) VALUES (?, ?, ?)').run(sid, -item.preis, `🏪 Gekauft: ${item.emoji} ${item.name}`);
  })();

  const neuerStand = db.prepare('SELECT COALESCE(coins, 0) AS coins FROM students WHERE id = ?').get(sid);
  res.json({ ok: true, coins: neuerStand.coins });
});

// POST /api/shop/ausrüsten – Item anlegen oder ablegen (Toggle)
router.post('/ausrüsten', requireStudent, (req, res) => {
  const sid    = req.session.studentId;
  const itemId = String(req.body.itemId || '');

  const item = SHOP_ITEMS.find(i => i.id === itemId);
  if (!item) return res.status(404).json({ error: 'Item nicht gefunden.' });

  const studentItem = db.prepare('SELECT equipped FROM student_items WHERE student_id = ? AND item_id = ?').get(sid, itemId);
  if (!studentItem) return res.status(403).json({ error: 'Item nicht besessen.' });

  const wirdAngelegt = studentItem.equipped !== 1;

  db.transaction(() => {
    if (wirdAngelegt) {
      // Anderen Item desselben Typs ablegen
      const gleicherTyp = SHOP_ITEMS.filter(i => i.type === item.type).map(i => i.id);
      db.prepare(
        `UPDATE student_items SET equipped = 0 WHERE student_id = ? AND item_id IN (${gleicherTyp.map(() => '?').join(',')})`
      ).run(sid, ...gleicherTyp);
    }
    db.prepare('UPDATE student_items SET equipped = ? WHERE student_id = ? AND item_id = ?')
      .run(wirdAngelegt ? 1 : 0, sid, itemId);
  })();

  res.json({ ok: true, ausgerüstet: wirdAngelegt });
});

// GET /api/shop/meine-items – eigene Items (für Profil)
router.get('/meine-items', requireStudent, (req, res) => {
  const sid = req.session.studentId;
  const rows = db.prepare('SELECT item_id, equipped, purchased_at FROM student_items WHERE student_id = ? ORDER BY purchased_at ASC').all(sid);

  const items = rows.map(r => {
    const def = SHOP_ITEMS.find(i => i.id === r.item_id);
    return def ? { ...def, ausgerüstet: r.equipped === 1, purchased_at: r.purchased_at } : null;
  }).filter(Boolean);

  res.json({ items });
});

// GET /api/shop/coins-log – Münz-Verlauf (für Profil)
router.get('/coins-log', requireStudent, (req, res) => {
  const sid = req.session.studentId;
  const log = db.prepare(
    'SELECT amount, reason, created_at FROM coins_log WHERE student_id = ? ORDER BY created_at DESC LIMIT 10'
  ).all(sid);
  res.json({ log });
});

// GET /api/shop/ausruestung/:id – ausgerüstete Items eines Schülers (öffentlich lesbar für Rangliste etc.)
router.get('/ausruestung/:id', requireStudent, (req, res) => {
  const targetId = Number(req.params.id);
  const rows = db.prepare('SELECT item_id FROM student_items WHERE student_id = ? AND equipped = 1').all(targetId);
  res.json({ items: rows.map(r => r.item_id) });
});

module.exports = router;
