const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { db }  = require('../db/database');
const { requireAdmin, requireStudent } = require('../middleware/auth');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'leseabenteuer');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename:    (_req, file, cb) => {
    const ext    = path.extname(file.originalname).toLowerCase();
    const random = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    cb(null, random + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') return cb(null, true);
    cb(new Error('Nur PDF-Dateien erlaubt'));
  }
});

// Tabelle beim Start anlegen / sicherstellen
db.exec(`
  CREATE TABLE IF NOT EXISTS leseabenteuer_materialien (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    titel        TEXT    NOT NULL,
    beschreibung TEXT,
    datei_name   TEXT    NOT NULL,
    datei_url    TEXT    NOT NULL,
    kategorie    TEXT    NOT NULL DEFAULT 'abenteuer',
    erstellt_am  DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// GET /api/leseabenteuer/materialien – eingeloggte Schüler
router.get('/materialien', requireStudent, (req, res) => {
  const rows = db.prepare(`
    SELECT id, titel, beschreibung, datei_url, kategorie, erstellt_am
    FROM leseabenteuer_materialien
    ORDER BY erstellt_am DESC
  `).all();
  res.json(rows);
});

// POST /api/leseabenteuer/materialien – nur Admin
router.post('/materialien', requireAdmin, upload.single('datei'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Keine Datei hochgeladen.' });

  const { titel, beschreibung, kategorie } = req.body;
  if (!titel?.trim()) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Titel ist erforderlich.' });
  }

  const dateiUrl = '/uploads/leseabenteuer/' + req.file.filename;
  const { lastInsertRowid } = db.prepare(`
    INSERT INTO leseabenteuer_materialien (titel, beschreibung, datei_name, datei_url, kategorie)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    titel.trim(),
    beschreibung?.trim() || null,
    req.file.originalname,
    dateiUrl,
    ['abenteuer', 'text', 'arbeitsblatt'].includes(kategorie) ? kategorie : 'abenteuer'
  );

  res.status(201).json({ id: lastInsertRowid, datei_url: dateiUrl });
});

// DELETE /api/leseabenteuer/materialien/:id – nur Admin
router.delete('/materialien/:id', requireAdmin, (req, res) => {
  const row = db.prepare('SELECT datei_url FROM leseabenteuer_materialien WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Nicht gefunden.' });

  const filePath = path.join(UPLOAD_DIR, path.basename(row.datei_url));
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  db.prepare('DELETE FROM leseabenteuer_materialien WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
