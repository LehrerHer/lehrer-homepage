/* ============================================================
   FORTBILDUNG – anonyme Abschluss-Rückmeldungen
   Teilnehmende reichen ohne Login drei kurze Texte ein. Gespeichert wird
   nur Text + Zeitstempel (keine IP, kein User-Agent, kein Name).
   Auslesen nur mit Admin-Login.
   ============================================================ */

const express = require('express');
const rateLimit = require('express-rate-limit');
const { db } = require('../db/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Das Limit nutzt die IP nur flüchtig im Arbeitsspeicher (nicht in der Datenbank).
// 30 Teilnehmende im selben WLAN teilen sich meist eine IP – daher großzügig.
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Einsendungen. Bitte warte kurz und versuche es erneut.' }
});

const MAX = { gefallen: 600, aendern: 600, naechster_schritt: 300 };

function bereinigen(wert, max) {
  return String(wert || '').replace(/\r\n/g, '\n').trim().slice(0, max);
}

// POST /api/fortbildung – öffentlich
router.post('/', limiter, (req, res) => {
  const werte = {};
  for (const feld of Object.keys(MAX)) {
    werte[feld] = bereinigen(req.body?.[feld], MAX[feld]);
  }
  if (!werte.gefallen && !werte.aendern && !werte.naechster_schritt) {
    return res.status(400).json({ error: 'Bitte mindestens ein Feld ausfüllen.' });
  }

  try {
    db.prepare(
      'INSERT INTO fortbildung_feedback (gefallen, aendern, naechster_schritt) VALUES (?, ?, ?)'
    ).run(werte.gefallen, werte.aendern, werte.naechster_schritt);
    res.status(201).json({ ok: true });
  } catch (e) {
    console.error('Fortbildung POST Fehler:', e);
    res.status(500).json({ error: 'Speichern fehlgeschlagen. Bitte später erneut versuchen.' });
  }
});

// GET /api/fortbildung – nur Admin
router.get('/', requireAdmin, (req, res) => {
  try {
    const rows = db.prepare(
      'SELECT id, gefallen, aendern, naechster_schritt, created_at FROM fortbildung_feedback ORDER BY id'
    ).all();
    res.json(rows);
  } catch (e) {
    console.error('Fortbildung GET Fehler:', e);
    res.status(500).json({ error: 'Datenbankfehler' });
  }
});

// --- Geplante Löschung: 7 Tage nach Klick, bis dahin widerrufbar ---

// Löscht alle Einsendungen, sobald der geplante Zeitpunkt erreicht ist.
function faelligeLoeschungAusfuehren() {
  try {
    const zeile = db.prepare("SELECT geplant_am FROM fortbildung_loeschung WHERE id = 1").get();
    if (!zeile) return;
    const faellig = db.prepare("SELECT datetime('now') >= ? AS faellig").get(zeile.geplant_am).faellig;
    if (!faellig) return;
    db.transaction(() => {
      db.prepare('DELETE FROM fortbildung_feedback').run();
      db.prepare('DELETE FROM fortbildung_loeschung').run();
    })();
    console.log('Fortbildung: geplante Löschung ausgeführt.');
  } catch (e) {
    console.error('Fortbildung Löschung Fehler:', e);
  }
}
faelligeLoeschungAusfuehren();
setInterval(faelligeLoeschungAusfuehren, 60 * 60 * 1000).unref();

// GET /api/fortbildung/loeschung – nur Admin: geplanter Zeitpunkt (oder null)
router.get('/loeschung', requireAdmin, (req, res) => {
  faelligeLoeschungAusfuehren();
  const zeile = db.prepare('SELECT geplant_am FROM fortbildung_loeschung WHERE id = 1').get();
  res.json({ geplant_am: zeile ? zeile.geplant_am : null });
});

// POST /api/fortbildung/loeschung – nur Admin: Löschung in 7 Tagen planen
router.post('/loeschung', requireAdmin, (req, res) => {
  try {
    db.prepare(
      "INSERT OR REPLACE INTO fortbildung_loeschung (id, geplant_am) VALUES (1, datetime('now', '+7 days'))"
    ).run();
    const zeile = db.prepare('SELECT geplant_am FROM fortbildung_loeschung WHERE id = 1').get();
    res.json({ ok: true, geplant_am: zeile.geplant_am });
  } catch (e) {
    console.error('Fortbildung Löschung planen Fehler:', e);
    res.status(500).json({ error: 'Datenbankfehler' });
  }
});

// DELETE /api/fortbildung/loeschung – nur Admin: geplante Löschung rückgängig machen
router.delete('/loeschung', requireAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM fortbildung_loeschung').run();
    res.json({ ok: true });
  } catch (e) {
    console.error('Fortbildung Löschung abbrechen Fehler:', e);
    res.status(500).json({ error: 'Datenbankfehler' });
  }
});

module.exports = router;
