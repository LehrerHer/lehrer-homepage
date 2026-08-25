/**
 * deutschclub.js – Terminübersicht für den Deutschclub (ZAP-Vorbereitung).
 *
 * GET    /api/deutschclub/status                    – öffentlich: aktueller Stand aller Reihen
 * GET    /api/deutschclub/admin/reihen               – Admin: volle Daten inkl. Verlauf & Terminausnahmen
 * POST   /api/deutschclub/reihen/:id/advance         – Admin: Stunde fand statt, Modul +1
 * PATCH  /api/deutschclub/reihen/:id/modul           – Admin: Modul manuell setzen (Korrektur/Neustart)
 * POST   /api/deutschclub/reihen/:id/verlauf         – Admin: Log-Eintrag ohne Fortschalten (z. B. "entfällt")
 * DELETE /api/deutschclub/verlauf/:eintragId         – Admin: fehlerhaften Log-Eintrag löschen
 * POST   /api/deutschclub/reihen/:id/termin-ausnahme – Admin: einzelnen Termin absagen oder verschieben
 * DELETE /api/deutschclub/reihen/:id/termin-ausnahme/:datum – Admin: Ausnahme zurücknehmen (Termin wieder planmäßig)
 *
 * Jede Reihe hat einen festen Wochentermin (Wochentag + Block, siehe deutschclub-reihen.js),
 * der ab "ersterTermin" wöchentlich bis LAUFZEIT_ENDE läuft. Der "nächste Termin" wird daraus
 * automatisch berechnet; einzelne Termine lassen sich über Ausnahmen (entfällt/verschoben)
 * korrigieren, ohne den Rhythmus der übrigen Wochen zu beeinflussen.
 *
 * Datenhaltung: eine JSON-Datei außerhalb von Git (data/deutschclub-status.json, siehe
 * .gitignore) – überlebt damit den "git reset --hard" beim automatischen Deployment.
 * Die inhaltliche Struktur der Reihen/Module/Wochentermine selbst steht fest in
 * data/deutschclub-reihen.js.
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const { requireAdmin } = require('../middleware/auth');
const { REIHEN, LAUFZEIT_ENDE } = require('../data/deutschclub-reihen');

const router = express.Router();

const DATA_PATH = path.join(__dirname, '../data/deutschclub-status.json');
const WOCHENTAGE = ['', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
const MAX_WOCHEN_SUCHE = 104; // Sicherheitsgrenze (≈ 2 Jahre), falls fast alle Termine als "entfällt" markiert sind

function leererStatus() {
  return {
    reihen: Object.fromEntries(REIHEN.map(r => [r.id, { aktuellesModul: 1, terminAusnahmen: [] }])),
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
  const status = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  // Migration: ältere Statusdateien kennen terminAusnahmen noch nicht.
  REIHEN.forEach(r => {
    if (!status.reihen[r.id]) status.reihen[r.id] = { aktuellesModul: 1, terminAusnahmen: [] };
    if (!status.reihen[r.id].terminAusnahmen) status.reihen[r.id].terminAusnahmen = [];
  });
  return status;
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

function istGueltigesDatum(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s + 'T00:00:00Z').getTime());
}

function datumPlusTage(iso, tage) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + tage);
  return d.toISOString().slice(0, 10);
}

function verlaufFuerReihe(status, reiheId) {
  return status.verlauf
    .filter(e => e.reiheId === reiheId)
    .sort((a, b) => b.datum.localeCompare(a.datum) || b.id - a.id);
}

/**
 * Berechnet den nächsten Termin einer Reihe ab (einschließlich) abDatum, unter
 * Berücksichtigung von Terminausnahmen. Gibt null zurück, wenn im Zeitraum bis
 * LAUFZEIT_ENDE kein Termin mehr stattfindet.
 */
function naechsterTermin(reihe, terminAusnahmen, abDatum) {
  const ausnahmenMap = new Map(terminAusnahmen.map(a => [a.datum, a]));

  // Erstes Wochenraster-Datum >= abDatum finden.
  const diffTage = Math.round((new Date(abDatum + 'T00:00:00Z') - new Date(reihe.ersterTermin + 'T00:00:00Z')) / 86400000);
  let raster = diffTage <= 0 ? reihe.ersterTermin : datumPlusTage(reihe.ersterTermin, Math.ceil(diffTage / 7) * 7);

  for (let i = 0; i < MAX_WOCHEN_SUCHE && raster <= LAUFZEIT_ENDE; i++) {
    const ausnahme = ausnahmenMap.get(raster);
    if (!ausnahme || ausnahme.typ !== 'entfaellt') {
      const effektivesDatum = ausnahme && ausnahme.typ === 'verschoben' ? ausnahme.neuesDatum : raster;
      if (effektivesDatum >= abDatum) {
        return {
          datum: effektivesDatum,
          block: reihe.block,
          wochentag: WOCHENTAGE[new Date(effektivesDatum + 'T00:00:00Z').getUTCDay() === 0 ? 7 : new Date(effektivesDatum + 'T00:00:00Z').getUTCDay()],
          verschoben: !!ausnahme && ausnahme.typ === 'verschoben',
          planmaessigesDatum: raster,
        };
      }
    }
    raster = datumPlusTage(raster, 7);
  }
  return null;
}

// GET /status – öffentlich, keine Auth nötig
router.get('/status', (req, res) => {
  const status = ladeStatus();
  const heuteIso = heute();
  const ansicht = REIHEN.map(reihe => {
    const stand = status.reihen[reihe.id] || { aktuellesModul: 1, terminAusnahmen: [] };
    const modul = reihe.module.find(m => m.nr === stand.aktuellesModul) || reihe.module[0];
    const letzteStunde = verlaufFuerReihe(status, reihe.id).find(e => e.typ === 'stunde');
    return {
      id: reihe.id,
      jahrgang: reihe.jahrgang,
      name: reihe.name,
      anzahlModule: reihe.module.length,
      aktuellesModul: { nr: modul.nr, titel: modul.titel, beschreibung: modul.beschreibung },
      letzteStunde: letzteStunde ? letzteStunde.datum : null,
      naechsterTermin: naechsterTermin(reihe, stand.terminAusnahmen, heuteIso),
    };
  });
  res.json(ansicht);
});

// GET /admin/reihen – Admin: volle Daten inkl. Modulliste, Verlauf & Terminausnahmen
router.get('/admin/reihen', requireAdmin, (req, res) => {
  const status = ladeStatus();
  const heuteIso = heute();
  const ansicht = REIHEN.map(reihe => {
    const stand = status.reihen[reihe.id] || { aktuellesModul: 1, terminAusnahmen: [] };
    return {
      id: reihe.id,
      jahrgang: reihe.jahrgang,
      name: reihe.name,
      module: reihe.module,
      wochentag: WOCHENTAGE[reihe.wochentag],
      block: reihe.block,
      ersterTermin: reihe.ersterTermin,
      aktuellesModul: stand.aktuellesModul,
      verlauf: verlaufFuerReihe(status, reihe.id),
      terminAusnahmen: [...stand.terminAusnahmen].sort((a, b) => a.datum.localeCompare(b.datum)),
      naechsterTermin: naechsterTermin(reihe, stand.terminAusnahmen, heuteIso),
    };
  });
  res.json(ansicht);
});

// POST /reihen/:id/advance – Stunde fand statt, Modul +1 (nach dem letzten Modul zurück zu 1)
router.post('/reihen/:id/advance', requireAdmin, (req, res) => {
  const reihe = findeReihe(req.params.id);
  if (!reihe) return res.status(404).json({ error: 'Unbekannte Reihe.' });

  const status = ladeStatus();
  const stand = status.reihen[reihe.id];
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
  status.reihen[reihe.id].aktuellesModul = modul;
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

// POST /reihen/:id/termin-ausnahme – einen planmäßigen Termin absagen oder verschieben
router.post('/reihen/:id/termin-ausnahme', requireAdmin, (req, res) => {
  const reihe = findeReihe(req.params.id);
  if (!reihe) return res.status(404).json({ error: 'Unbekannte Reihe.' });

  const { datum, typ, neuesDatum } = req.body;
  if (!istGueltigesDatum(datum)) return res.status(400).json({ error: 'Ungültiges Datum.' });
  if (typ !== 'entfaellt' && typ !== 'verschoben') return res.status(400).json({ error: 'Typ muss "entfaellt" oder "verschoben" sein.' });
  if (typ === 'verschoben' && !istGueltigesDatum(neuesDatum)) {
    return res.status(400).json({ error: 'Für "verschoben" wird ein gültiges neues Datum benötigt.' });
  }

  const status = ladeStatus();
  const stand = status.reihen[reihe.id];
  const notiz = String(req.body.notiz || '').trim().slice(0, 300);

  stand.terminAusnahmen = stand.terminAusnahmen.filter(a => a.datum !== datum);
  stand.terminAusnahmen.push(
    typ === 'verschoben' ? { datum, typ, neuesDatum, notiz } : { datum, typ, notiz }
  );
  speichereStatus(status);
  res.json({ ok: true });
});

// DELETE /reihen/:id/termin-ausnahme/:datum – Ausnahme zurücknehmen, Termin wieder planmäßig
router.delete('/reihen/:id/termin-ausnahme/:datum', requireAdmin, (req, res) => {
  const reihe = findeReihe(req.params.id);
  if (!reihe) return res.status(404).json({ error: 'Unbekannte Reihe.' });

  const status = ladeStatus();
  const stand = status.reihen[reihe.id];
  const laenge = stand.terminAusnahmen.length;
  stand.terminAusnahmen = stand.terminAusnahmen.filter(a => a.datum !== req.params.datum);
  if (stand.terminAusnahmen.length === laenge) return res.status(404).json({ error: 'Ausnahme nicht gefunden.' });
  speichereStatus(status);
  res.json({ ok: true });
});

module.exports = router;
