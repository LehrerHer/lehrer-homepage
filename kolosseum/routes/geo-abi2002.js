const express = require('express');
const rateLimit = require('express-rate-limit');
const { db } = require('../db/database');

const router = express.Router();
const SECRET = process.env.GEO_ABI2002_SECRET || 'geo-abi2002-klassentreffen';
const FELDER = ['vorname', 'nachname', 'strasse', 'plz', 'wohnort', 'vorwahl', 'telefonnummer', 'email'];

function checkSecret(req, res, next) {
  if (req.headers['x-geo-abi2002-secret'] !== SECRET) {
    return res.status(403).json({ error: 'Kein Zugriff.' });
  }
  next();
}

const limiter = rateLimit({ windowMs: 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });

// GET /api/geo-abi2002 – alle Zeilen laden
router.get('/', checkSecret, (req, res) => {
  try {
    const rows = db.prepare(
      `SELECT id, vorname, nachname, strasse, plz, wohnort, vorwahl, telefonnummer, email, updated_at
       FROM geo_abi2002 ORDER BY id`
    ).all();
    res.json(rows);
  } catch (e) {
    console.error('Geo-Abi2002 GET Fehler:', e);
    res.status(500).json({ error: 'Datenbankfehler' });
  }
});

// PUT /api/geo-abi2002/:id – eine Zeile aktualisieren
router.put('/:id', checkSecret, limiter, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Ungültige ID.' });
  }

  const vorhanden = db.prepare('SELECT id FROM geo_abi2002 WHERE id = ?').get(id);
  if (!vorhanden) {
    return res.status(404).json({ error: 'Zeile nicht gefunden.' });
  }

  const werte = {};
  for (const feld of FELDER) {
    werte[feld] = String(req.body[feld] || '').trim().slice(0, 100);
  }
  if (!werte.vorname) {
    return res.status(400).json({ error: 'Vorname darf nicht leer sein.' });
  }

  try {
    db.prepare(
      `UPDATE geo_abi2002
       SET vorname = ?, nachname = ?, strasse = ?, plz = ?, wohnort = ?, vorwahl = ?, telefonnummer = ?, email = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(werte.vorname, werte.nachname, werte.strasse, werte.plz, werte.wohnort, werte.vorwahl, werte.telefonnummer, werte.email, id);
    res.json({ ok: true });
  } catch (e) {
    console.error('Geo-Abi2002 PUT Fehler:', e);
    res.status(500).json({ error: 'Datenbankfehler' });
  }
});

module.exports = router;
