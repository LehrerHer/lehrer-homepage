// Kroatien 2026 – ARCHIVIERT (Stand 2026-11)
// Die Seite kroatien-2026.html ist offline (liegt noch in der Git-Historie).
// Die gespeicherten Daten bleiben in kv_store und sind nur noch mit Admin-Login lesbar.
// Das frühere Geheimwort-Verfahren entfällt, weil das Geheimwort im öffentlichen Repo stand.
const express = require('express');
const { db } = require('../db/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
const KV_KEY = 'kroatien_2026';

// GET /api/kroatien – archivierten Stand lesen (nur Admin)
router.get('/', requireAdmin, (req, res) => {
  const row = db.prepare('SELECT value, updated_at FROM kv_store WHERE key = ?').get(KV_KEY);
  if (!row) return res.json(null);
  try { res.json({ archiviert: true, zuletzt_geaendert: row.updated_at, daten: JSON.parse(row.value) }); }
  catch { res.json(null); }
});

module.exports = router;
