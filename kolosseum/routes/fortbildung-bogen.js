/* ============================================================
   FORTBILDUNG – anonymer Feedbackbogen (Variante 2)
   Teilnehmende füllen den Bogen „Erste Schritte mit Claude.ai“ ohne Login
   aus (Erfahrung, 7 Aussagen, 8 Module, 3 Freitexte). Gespeichert wird nur
   der Inhalt + Zeitstempel (keine IP, kein User-Agent, kein Name).
   Auslesen und Löschung nur mit Admin-Login.
   ============================================================ */

const express = require('express');
const rateLimit = require('express-rate-limit');
const { db } = require('../db/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Das Limit nutzt die IP nur flüchtig im Arbeitsspeicher (nicht in der Datenbank).
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Einsendungen. Bitte warte kurz und versuche es erneut.' }
});

const ERFAHRUNG = ['keine', 'ausprobiert', 'gelegentlich', 'regelmaessig'];
const SKALA = ['pp', 'p', 'm', 'mm']; // ++ · + · – · ––
const ANZAHL_AUSSAGEN = 7;
const ANZAHL_MODULE = 8;
const MAX_TEXT = 600;

// Liste mit fester Länge; ungültige oder fehlende Werte werden zu ''.
function skalaListe(eingabe, laenge) {
  const liste = Array.isArray(eingabe) ? eingabe : [];
  return Array.from({ length: laenge }, (_, i) => (SKALA.includes(liste[i]) ? liste[i] : ''));
}

function text(wert) {
  return String(wert || '').replace(/\r\n/g, '\n').trim().slice(0, MAX_TEXT);
}

// POST /api/fortbildung-bogen – öffentlich
router.post('/', limiter, (req, res) => {
  const b = req.body || {};
  const erfahrung = ERFAHRUNG.includes(b.erfahrung) ? b.erfahrung : '';
  const gesamt = skalaListe(b.gesamt, ANZAHL_AUSSAGEN);
  const module_ = skalaListe(b.module, ANZAHL_MODULE);
  const mitnehmen = text(b.mitnehmen);
  const gefehlt = text(b.gefehlt);
  const wunsch = text(b.wunsch);

  const leer = !erfahrung && !mitnehmen && !gefehlt && !wunsch &&
    gesamt.every(w => !w) && module_.every(w => !w);
  if (leer) return res.status(400).json({ error: 'Bitte mindestens eine Frage beantworten.' });

  try {
    db.prepare(
      `INSERT INTO fortbildung_bogen (erfahrung, gesamt, module, mitnehmen, gefehlt, wunsch)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(erfahrung, JSON.stringify(gesamt), JSON.stringify(module_), mitnehmen, gefehlt, wunsch);
    res.status(201).json({ ok: true });
  } catch (e) {
    console.error('Fortbildung-Bogen POST Fehler:', e);
    res.status(500).json({ error: 'Speichern fehlgeschlagen. Bitte später erneut versuchen.' });
  }
});

// GET /api/fortbildung-bogen – nur Admin
router.get('/', requireAdmin, (req, res) => {
  try {
    const rows = db.prepare(
      'SELECT id, erfahrung, gesamt, module, mitnehmen, gefehlt, wunsch, created_at FROM fortbildung_bogen ORDER BY id'
    ).all();
    res.json(rows.map(r => ({ ...r, gesamt: JSON.parse(r.gesamt), module: JSON.parse(r.module) })));
  } catch (e) {
    console.error('Fortbildung-Bogen GET Fehler:', e);
    res.status(500).json({ error: 'Datenbankfehler' });
  }
});

// --- Geplante Löschung: 7 Tage nach Klick, bis dahin widerrufbar ---

function faelligeLoeschungAusfuehren() {
  try {
    const zeile = db.prepare('SELECT geplant_am FROM fortbildung_bogen_loeschung WHERE id = 1').get();
    if (!zeile) return;
    const faellig = db.prepare("SELECT datetime('now') >= ? AS faellig").get(zeile.geplant_am).faellig;
    if (!faellig) return;
    db.transaction(() => {
      db.prepare('DELETE FROM fortbildung_bogen').run();
      db.prepare('DELETE FROM fortbildung_bogen_loeschung').run();
    })();
    console.log('Fortbildung-Bogen: geplante Löschung ausgeführt.');
  } catch (e) {
    console.error('Fortbildung-Bogen Löschung Fehler:', e);
  }
}
faelligeLoeschungAusfuehren();
setInterval(faelligeLoeschungAusfuehren, 60 * 60 * 1000).unref();

// GET /api/fortbildung-bogen/loeschung – nur Admin
router.get('/loeschung', requireAdmin, (req, res) => {
  faelligeLoeschungAusfuehren();
  const zeile = db.prepare('SELECT geplant_am FROM fortbildung_bogen_loeschung WHERE id = 1').get();
  res.json({ geplant_am: zeile ? zeile.geplant_am : null });
});

// POST /api/fortbildung-bogen/loeschung – nur Admin: Löschung in 7 Tagen planen
router.post('/loeschung', requireAdmin, (req, res) => {
  try {
    db.prepare(
      "INSERT OR REPLACE INTO fortbildung_bogen_loeschung (id, geplant_am) VALUES (1, datetime('now', '+7 days'))"
    ).run();
    const zeile = db.prepare('SELECT geplant_am FROM fortbildung_bogen_loeschung WHERE id = 1').get();
    res.json({ ok: true, geplant_am: zeile.geplant_am });
  } catch (e) {
    console.error('Fortbildung-Bogen Löschung planen Fehler:', e);
    res.status(500).json({ error: 'Datenbankfehler' });
  }
});

// DELETE /api/fortbildung-bogen/loeschung – nur Admin: geplante Löschung rückgängig machen
router.delete('/loeschung', requireAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM fortbildung_bogen_loeschung').run();
    res.json({ ok: true });
  } catch (e) {
    console.error('Fortbildung-Bogen Löschung abbrechen Fehler:', e);
    res.status(500).json({ error: 'Datenbankfehler' });
  }
});

module.exports = router;
