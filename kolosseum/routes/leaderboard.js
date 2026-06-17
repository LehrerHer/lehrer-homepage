const express = require('express');
const rateLimit = require('express-rate-limit');
const { db } = require('../db/database');
const router = express.Router();

const VALID_QUIZZES = ['stilmittel', 'literaturwissenschaft', 'rechtschreib', 'deutsch', 'erdkunde', 'fussball', 'monatsnamen'];

const limiter = rateLimit({ windowMs: 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });

// GET /api/leaderboard/alle?limit=N – neueste Einträge quer über alle Quizze
router.get('/alle', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);
  try {
    const rows = db.prepare(
      `SELECT quiz, modus, name, punkte, maximum, prozent, datum
       FROM quiz_bestenliste
       ORDER BY datum DESC
       LIMIT ?`
    ).all(limit);
    res.json(rows);
  } catch (e) {
    console.error('Leaderboard /alle Fehler:', e);
    res.status(500).json({ error: 'Datenbankfehler' });
  }
});

// GET /api/leaderboard/:quiz?modus=xxx&limit=10
// Gibt Top-Einträge zurück – öffentlich
router.get('/:quiz', (req, res) => {
  const quiz  = req.params.quiz;
  const modus = req.query.modus || null;
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);

  try {
    let rows;
    if (modus) {
      rows = db.prepare(
        `SELECT name, punkte, maximum, prozent, datum
         FROM quiz_bestenliste
         WHERE quiz = ? AND modus = ?
         ORDER BY prozent DESC, punkte DESC, datum ASC
         LIMIT ?`
      ).all(quiz, modus, limit);
    } else {
      rows = db.prepare(
        `SELECT name, punkte, maximum, prozent, datum
         FROM quiz_bestenliste
         WHERE quiz = ?
         ORDER BY prozent DESC, punkte DESC, datum ASC
         LIMIT ?`
      ).all(quiz, limit);
    }
    res.json(rows);
  } catch (e) {
    console.error('Leaderboard GET Fehler:', e);
    res.status(500).json({ error: 'Datenbankfehler' });
  }
});

// POST /api/leaderboard – Eintrag speichern
router.post('/', limiter, (req, res) => {
  const { quiz, modus, name, punkte, maximum } = req.body;

  if (!VALID_QUIZZES.some(q => String(quiz || '').startsWith(q))) {
    return res.status(400).json({ error: 'Unbekanntes Quiz.' });
  }
  if (
    typeof punkte !== 'number' || typeof maximum !== 'number' ||
    !Number.isInteger(punkte) || !Number.isInteger(maximum) ||
    punkte < 0 || maximum <= 0 || punkte > maximum
  ) {
    return res.status(400).json({ error: 'Ungültige Werte.' });
  }

  const sauberName = String(name || 'Anonym').trim().slice(0, 20) || 'Anonym';
  const prozent    = Math.round(punkte / maximum * 100);

  try {
    db.prepare(
      `INSERT INTO quiz_bestenliste (quiz, modus, name, punkte, maximum, prozent)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      String(quiz).slice(0, 60),
      modus ? String(modus).slice(0, 40) : null,
      sauberName,
      punkte, maximum, prozent
    );
    res.json({ ok: true, prozent });
  } catch (e) {
    console.error('Leaderboard POST Fehler:', e);
    res.status(500).json({ error: 'Datenbankfehler' });
  }
});

module.exports = router;
