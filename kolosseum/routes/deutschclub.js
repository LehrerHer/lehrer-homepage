/**
 * deutschclub.js – Terminübersicht für den Deutschclub (ZAP-Vorbereitung).
 *
 * GET    /api/deutschclub/status              – öffentlich: aktueller Stand aller Reihen
 * GET    /api/deutschclub/admin/reihen         – Admin: volle Daten inkl. Verlauf
 * POST   /api/deutschclub/reihen/:id/advance   – Admin: Stunde fand statt, Modul +1
 * PATCH  /api/deutschclub/reihen/:id/modul     – Admin: Modul manuell setzen (Korrektur/Neustart)
 * POST   /api/deutschclub/reihen/:id/verlauf   – Admin: Log-Eintrag ohne Fortschalten (z. B. "entfällt")
 * DELETE /api/deutschclub/verlauf/:eintragId   – Admin: fehlerhaften Log-Eintrag löschen
 *
 * Datenhaltung: eine JSON-Datei außerhalb von Git (data/deutschclub-status.json, siehe
 * .gitignore) – überlebt damit den "git reset --hard" beim automatischen Deployment.
 * Die inhaltliche Struktur der Reihen/Module selbst steht fest in data/deutschclub-reihen.js.
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const { requireAdmin } = require('../middleware/auth');
const REIHEN = require('../data/deutschclub-reihen');

const router = express.Router();

const DATA_PATH = path.join(__dirname, '../data/deutschclub-status.json');

function leererStatus() {
  return {
    reihen: Object.fromEntries(REIHEN.map(r => [r.id, { aktuellesModul: 1 }])),
    verlauf: [],
    naechsteVerlaufId: 1,
  };
}

function ladeStatus() {
  if (!fs.existsSync(DATA_PATH)) {
    const initial = leererStatus();
    speichereStatus(initial);
    return initial;
  }
  return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
}

function speichereStatus(status) {
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(status, null, 2));
}

function findeReihe(id) {
  return REIHEN.find(r => r.id === id);
}

function heute() {
  return new Date().toISOString().slice(0, 10);
}

function verlaufFuerReihe(status, reiheId) {
  return status.verlauf
    .filter(e => e.reiheId === reiheId)
    .sort((a, b) => b.datum.localeCompare(a.datum) || b.id - a.id);
}

// GET /status – öffentlich, keine Auth nötig
router.get('/status', (req, res) => {
  const status = ladeStatus();
  const ansicht = REIHEN.map(reihe => {
    const stand = status.reihen[reihe.id] || { aktuellesModul: 1 };
    const modul = reihe.module.find(m => m.nr === stand.aktuellesModul) || reihe.module[0];
    const letzteStunde = verlaufFuerReihe(status, reihe.id).find(e => e.typ === 'stunde');
    return {
      id: reihe.id,
      jahrgang: reihe.jahrgang,
      name: reihe.name,
      anzahlModule: reihe.module.length,
      aktuellesModul: { nr: modul.nr, titel: modul.titel, beschreibung: modul.beschreibung },
      letzteStunde: letzteStunde ? letzteStunde.datum : null,
    };
  });
  res.json(ansicht);
});

// GET /admin/reihen – Admin: volle Daten inkl. Modulliste und Verlauf
router.get('/admin/reihen', requireAdmin, (req, res) => {
  const status = ladeStatus();
  const ansicht = REIHEN.map(reihe => ({
    id: reihe.id,
    jahrgang: reihe.jahrgang,
    name: reihe.name,
    module: reihe.module,
    aktuellesModul: (status.reihen[reihe.id] || { aktuellesModul: 1 }).aktuellesModul,
    verlauf: verlaufFuerReihe(status, reihe.id),
  }));
  res.json(ansicht);
});

// POST /reihen/:id/advance – Stunde fand statt, Modul +1 (nach dem letzten Modul zurück zu 1)
router.post('/reihen/:id/advance', requireAdmin, (req, res) => {
  const reihe = findeReihe(req.params.id);
  if (!reihe) return res.status(404).json({ error: 'Unbekannte Reihe.' });

  const status = ladeStatus();
  const stand = status.reihen[reihe.id] || (status.reihen[reihe.id] = { aktuellesModul: 1 });
  const stattgefundenesModul = stand.aktuellesModul;

  status.verlauf.push({
    id: status.naechsteVerlaufId++,
    reiheId: reihe.id,
    datum: heute(),
    typ: 'stunde',
    modul: stattgefundenesModul,
    notiz: String(req.body.notiz || '').trim().slice(0, 300),
  });

  stand.aktuellesModul = stattgefundenesModul >= reihe.module.length ? 1 : stattgefundenesModul + 1;
  speichereStatus(status);
  res.json({ ok: true, aktuellesModul: stand.aktuellesModul });
});

// PATCH /reihen/:id/modul – Modul manuell setzen (Korrektur oder Neustart einer Reihe)
router.patch('/reihen/:id/modul', requireAdmin, (req, res) => {
  const reihe = findeReihe(req.params.id);
  if (!reihe) return res.status(404).json({ error: 'Unbekannte Reihe.' });

  const modul = Number(req.body.modul);
  if (!Number.isInteger(modul) || modul < 1 || modul > reihe.module.length) {
    return res.status(400).json({ error: `Modul muss zwischen 1 und ${reihe.module.length} liegen.` });
  }

  const status = ladeStatus();
  status.reihen[reihe.id] = { aktuellesModul: modul };
  status.verlauf.push({
    id: status.naechsteVerlaufId++,
    reiheId: reihe.id,
    datum: heute(),
    typ: 'korrektur',
    modul,
    notiz: String(req.body.notiz || '').trim().slice(0, 300),
  });
  speichereStatus(status);
  res.json({ ok: true, aktuellesModul: modul });
});

// POST /reihen/:id/verlauf – Log-Eintrag ohne Fortschalten (z. B. "entfällt, Grippewelle")
router.post('/reihen/:id/verlauf', requireAdmin, (req, res) => {
  const reihe = findeReihe(req.params.id);
  if (!reihe) return res.status(404).json({ error: 'Unbekannte Reihe.' });

  const notiz = String(req.body.notiz || '').trim().slice(0, 300);
  if (!notiz) return res.status(400).json({ error: 'Notiz erforderlich.' });

  const status = ladeStatus();
  status.verlauf.push({
    id: status.naechsteVerlaufId++,
    reiheId: reihe.id,
    datum: heute(),
    typ: 'entfaellt',
    modul: null,
    notiz,
  });
  speichereStatus(status);
  res.json({ ok: true });
});

// DELETE /verlauf/:eintragId – fehlerhaften Log-Eintrag löschen
router.delete('/verlauf/:eintragId', requireAdmin, (req, res) => {
  const eintragId = Number(req.params.eintragId);
  const status = ladeStatus();
  const laenge = status.verlauf.length;
  status.verlauf = status.verlauf.filter(e => e.id !== eintragId);
  if (status.verlauf.length === laenge) return res.status(404).json({ error: 'Eintrag nicht gefunden.' });
  speichereStatus(status);
  res.json({ ok: true });
});

module.exports = router;
