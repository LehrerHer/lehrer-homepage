const express = require('express');
const { db } = require('../db/database');

const router = express.Router();
const KV_KEY = 'kroatien_2026';
const SECRET = process.env.KROATIEN_SECRET || 'kroatien-sommer-2026';

function checkSecret(req, res, next) {
  if (req.headers['x-kroatien-secret'] !== SECRET) {
    return res.status(403).json({ error: 'Kein Zugriff.' });
  }
  next();
}

// GET /api/kroatien – aktuellen Stand laden
router.get('/', checkSecret, (req, res) => {
  const row = db.prepare('SELECT value FROM kv_store WHERE key = ?').get(KV_KEY);
  if (!row) return res.json(null);
  try { res.json(JSON.parse(row.value)); }
  catch { res.json(null); }
});

// PUT /api/kroatien – Stand speichern
router.put('/', checkSecret, (req, res) => {
  const data = req.body;
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'Ungültige Daten.' });
  }
  db.prepare(
    'INSERT OR REPLACE INTO kv_store (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)'
  ).run(KV_KEY, JSON.stringify(data));
  res.json({ ok: true });
});

module.exports = router;
