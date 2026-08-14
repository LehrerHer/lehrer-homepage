// routes/ki-werkstatt.js – KI-Werkstatt · Fortschritts-API (Modul A)
const express = require('express');
const { db } = require('../db/database');
const { requireStudent } = require('../middleware/auth');

const router = express.Router();

// GET /api/ki-werkstatt/progress – Fortschritt der eingeloggten Person laden
router.get('/progress', requireStudent, (req, res) => {
  const row = db.prepare(
    'SELECT modul_a_status, modul_a_started_at, modul_a_completed_at FROM ki_werkstatt_progress WHERE student_id = ?'
  ).get(req.session.studentId);

  if (!row) {
    return res.json({ modulAStatus: 'offen', modulAStartedAt: null, modulACompletedAt: null });
  }

  res.json({
    modulAStatus: row.modul_a_status,
    modulAStartedAt: row.modul_a_started_at,
    modulACompletedAt: row.modul_a_completed_at,
  });
});

// POST /api/ki-werkstatt/modul-a/start – Status auf "in_bearbeitung" setzen.
// Idempotent und lässt einen bereits erreichten "abgeschlossen"-Status unangetastet.
router.post('/modul-a/start', requireStudent, (req, res) => {
  db.prepare(`
    INSERT INTO ki_werkstatt_progress (student_id, modul_a_status, modul_a_started_at, updated_at)
    VALUES (?, 'in_bearbeitung', datetime('now'), datetime('now'))
    ON CONFLICT(student_id) DO UPDATE SET
      modul_a_status     = CASE WHEN modul_a_status = 'abgeschlossen' THEN modul_a_status ELSE 'in_bearbeitung' END,
      modul_a_started_at = COALESCE(modul_a_started_at, excluded.modul_a_started_at),
      updated_at         = excluded.updated_at
  `).run(req.session.studentId);
  res.json({ ok: true });
});

// POST /api/ki-werkstatt/modul-a/abschliessen – Modul A als abgeschlossen markieren (Upsert)
router.post('/modul-a/abschliessen', requireStudent, (req, res) => {
  db.prepare(`
    INSERT INTO ki_werkstatt_progress (student_id, modul_a_status, modul_a_started_at, modul_a_completed_at, updated_at)
    VALUES (?, 'abgeschlossen', datetime('now'), datetime('now'), datetime('now'))
    ON CONFLICT(student_id) DO UPDATE SET
      modul_a_status       = 'abgeschlossen',
      modul_a_started_at   = COALESCE(modul_a_started_at, excluded.modul_a_started_at),
      modul_a_completed_at = excluded.modul_a_completed_at,
      updated_at           = excluded.updated_at
  `).run(req.session.studentId);
  res.json({ ok: true });
});

module.exports = router;
