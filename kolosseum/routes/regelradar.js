// routes/regelradar.js – RegelRadar (Rechtschreib-Diagnostik) · Ergebnis-API
// Schüler*innen speichern mit ihrem Kolosseum-Login (kein Klassencode mehr).
// Lesen/Löschen nur mit Admin-Login. Der echte Name verlässt den Server nur
// über die Admin-Endpunkte bzw. für die eigene Person (Vorbelegung).
const express = require('express');
const { db } = require('../db/database');
const { requireStudent, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const FORMATE = { diktat: 1, selbsttest: 2, selbsttest2: 2, strategie: 3, quatsch: 4 };
const KATEGORIEN = ['2', '3', '4', '5', '6', '7', '8'];
const MAX_ITEMS = 300;

function text(wert, max) {
  return typeof wert === 'string' ? wert.trim().slice(0, max) : '';
}

// SQLite speichert UTC ohne Zonenangabe → für den Browser als ISO mit „Z“
function isoZeit(sqlZeit) {
  return sqlZeit ? sqlZeit.replace(' ', 'T') + 'Z' : null;
}

function ganzzahl(wert, min, max) {
  const n = Number(wert);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}

// Prüft den Body und liefert entweder { fehler } oder { daten }
function pruefeErgebnis(body) {
  const echterName = text(body.echter_name, 80);
  if (echterName.length < 2) return { fehler: 'Bitte deinen echten Namen eingeben.' };

  const format = text(body.format, 20);
  if (!(format in FORMATE)) return { fehler: 'Unbekanntes Testformat.' };

  const variante = ganzzahl(body.variante === undefined ? 1 : body.variante, 1, 50);
  if (variante === null) return { fehler: 'Ungültige Variante.' };

  const roh = body.kategorien;
  if (!roh || typeof roh !== 'object' || Array.isArray(roh)) return { fehler: 'Kategorien fehlen.' };
  const kategorien = {};
  for (const k of Object.keys(roh)) {
    if (!KATEGORIEN.includes(k)) return { fehler: 'Unbekannte Kategorie.' };
    const richtig = ganzzahl(roh[k] && roh[k].richtig, 0, 999);
    const gesamt  = ganzzahl(roh[k] && roh[k].gesamt, 0, 999);
    if (richtig === null || gesamt === null || richtig > gesamt) return { fehler: 'Ungültige Punktzahl.' };
    kategorien[k] = { richtig, gesamt };
  }

  const itemsRoh = Array.isArray(body.items) ? body.items : [];
  if (itemsRoh.length > MAX_ITEMS) return { fehler: 'Zu viele Einzelantworten.' };
  const items = itemsRoh.map((it) => ({
    nr:      ganzzahl(it && it.nr, 0, 9999) || 0,
    satz:    text(it && it.satz, 200),
    wort:    text(it && it.wort, 100),
    eingabe: text(it && it.eingabe, 100),
    richtig: !!(it && it.richtig),
    kat:     ganzzahl(it && it.kat, 0, 99) || 0,
    format:  text(it && it.format, 20),
  }));

  return { daten: { echterName, format, stufe: FORMATE[format], variante, kategorien, items } };
}

// POST /api/regelradar/ergebnis – Ergebnis der eingeloggten Person speichern
router.post('/ergebnis', requireStudent, (req, res) => {
  const { fehler, daten } = pruefeErgebnis(req.body || {});
  if (fehler) return res.status(400).json({ error: fehler });

  const info = db.prepare(`
    INSERT INTO regelradar_ergebnisse (student_id, echter_name, stufe, format, variante, kategorien, items)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.session.studentId, daten.echterName, daten.stufe, daten.format, daten.variante,
    JSON.stringify(daten.kategorien), JSON.stringify(daten.items)
  );

  res.status(201).json({ ok: true, id: info.lastInsertRowid });
});

// GET /api/regelradar/mein-name – zuletzt eingegebener echter Name (nur eigene Person)
router.get('/mein-name', requireStudent, (req, res) => {
  const row = db.prepare(
    'SELECT echter_name FROM regelradar_ergebnisse WHERE student_id = ? ORDER BY id DESC LIMIT 1'
  ).get(req.session.studentId);
  res.json({ echterName: row ? row.echter_name : '' });
});

// GET /api/regelradar/admin/ergebnisse – alle Ergebnisse (ohne Einzelantworten)
router.get('/admin/ergebnisse', requireAdmin, (req, res) => {
  const rows = db.prepare(`
    SELECT r.id, r.student_id, s.nick, r.echter_name, r.stufe, r.format, r.variante,
           r.kategorien, r.eingereicht
    FROM regelradar_ergebnisse r
    JOIN students s ON s.id = r.student_id
    ORDER BY r.eingereicht DESC, r.id DESC
  `).all();
  res.json({
    ergebnisse: rows.map((r) => ({ ...r, eingereicht: isoZeit(r.eingereicht), kategorien: JSON.parse(r.kategorien) })),
  });
});

// GET /api/regelradar/admin/ergebnis/:id – Detail inkl. Einzelantworten
router.get('/admin/ergebnis/:id', requireAdmin, (req, res) => {
  const id = ganzzahl(req.params.id, 1, Number.MAX_SAFE_INTEGER);
  if (id === null) return res.status(400).json({ error: 'Ungültige ID.' });
  const row = db.prepare(`
    SELECT r.*, s.nick FROM regelradar_ergebnisse r
    JOIN students s ON s.id = r.student_id WHERE r.id = ?
  `).get(id);
  if (!row) return res.status(404).json({ error: 'Ergebnis nicht gefunden.' });
  res.json({ ...row, eingereicht: isoZeit(row.eingereicht), kategorien: JSON.parse(row.kategorien), items: JSON.parse(row.items || '[]') });
});

// DELETE /api/regelradar/admin/ergebnis/:id – Ergebnis löschen
router.delete('/admin/ergebnis/:id', requireAdmin, (req, res) => {
  const id = ganzzahl(req.params.id, 1, Number.MAX_SAFE_INTEGER);
  if (id === null) return res.status(400).json({ error: 'Ungültige ID.' });
  db.prepare('DELETE FROM regelradar_ergebnisse WHERE id = ?').run(id);
  res.json({ ok: true });
});

module.exports = router;
