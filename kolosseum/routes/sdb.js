// routes/sdb.js – „Die Spur der Bohne" · Fortschritts-API
const express = require('express');
const { db } = require('../db/database');
const { requireStudent } = require('../middleware/auth');

const router = express.Router();

// GET /api/sdb/progress – gespeicherten Fortschritt der eingeloggten Person laden
router.get('/progress', requireStudent, (req, res) => {
  const row = db.prepare(
    'SELECT stempel, ampel, produkt, updated_at FROM sdb_progress WHERE student_id = ?'
  ).get(req.session.studentId);

  if (!row) {
    return res.json({ stempel: null, ampel: null, produkt: null, updated_at: null });
  }

  res.json({
    stempel:    JSON.parse(row.stempel || 'null'),
    ampel:      JSON.parse(row.ampel   || 'null'),
    produkt:    row.produkt || null,
    updated_at: row.updated_at
  });
});

// POST /api/sdb/progress – Fortschritt speichern (Upsert)
// Body: { stempel: {...}, ampel: {...}, produkt: string|null }
router.post('/progress', requireStudent, (req, res) => {
  const { stempel, ampel, produkt } = req.body;

  if (stempel !== undefined && typeof stempel !== 'object') {
    return res.status(400).json({ error: 'Ungültiges stempel-Format.' });
  }
  if (ampel !== undefined && typeof ampel !== 'object') {
    return res.status(400).json({ error: 'Ungültiges ampel-Format.' });
  }

  db.prepare(`
    INSERT INTO sdb_progress (student_id, stempel, ampel, produkt, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(student_id) DO UPDATE SET
      stempel    = excluded.stempel,
      ampel      = excluded.ampel,
      produkt    = excluded.produkt,
      updated_at = excluded.updated_at
  `).run(
    req.session.studentId,
    JSON.stringify(stempel || {}),
    JSON.stringify(ampel   || {}),
    produkt || null
  );

  res.json({ ok: true });
});

// DELETE /api/sdb/progress – Fortschritt löschen (manueller „Neu beginnen"-Reset)
router.delete('/progress', requireStudent, (req, res) => {
  db.prepare('DELETE FROM sdb_progress WHERE student_id = ?').run(req.session.studentId);
  res.json({ ok: true });
});

module.exports = router;
