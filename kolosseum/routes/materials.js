const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { db }  = require('../db/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
const UPLOAD_DIR = path.join(__dirname, '../uploads/materials');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

db.exec(`
  CREATE TABLE IF NOT EXISTS materials (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    titel       TEXT NOT NULL,
    fach        TEXT NOT NULL,
    typ         TEXT NOT NULL,
    datei_name  TEXT NOT NULL,
    datei_url   TEXT NOT NULL,
    datei_typ   TEXT NOT NULL,
    erstellt_am DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

const VALID_FAECHER = [
  'Deutsch','Geschichte','Wirtschaft/Politik','Informatik','Werte & Normen',
  'Mathematik','Englisch','Sport','Biologie','Chemie','Physik','Musik',
  'Erdkunde','Gestaltendes Werken','AGs & Projekte',
];
const VALID_TYPEN = ['Arbeitsblatt','Material','Quiz'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.bin';
    cb(null, Date.now() + '-' + Math.random().toString(36).slice(2) + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ALLOWED = [
      'application/pdf',
      'text/html','application/xhtml+xml',
      'image/jpeg','image/png','image/webp',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/zip','application/x-zip-compressed',
    ];
    if (ALLOWED.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Dateityp nicht erlaubt (erlaubt: PDF, HTML, Bild, DOCX, ZIP).'));
  },
});

// POST /api/materials/upload – Admin only
router.post('/upload', requireAdmin, (req, res) => {
  upload.single('datei')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'Keine Datei hochgeladen.' });

    const { titel, fach, typ } = req.body;
    if (!VALID_FAECHER.includes(fach)) return res.status(400).json({ error: 'Ungültiges Fach.' });
    if (!VALID_TYPEN.includes(typ))    return res.status(400).json({ error: 'Ungültiger Typ.' });

    const name = (typeof titel === 'string' && titel.trim()) ? titel.trim() : req.file.originalname;
    const url  = '/uploads/materials/' + req.file.filename;

    const row = db.prepare(
      'INSERT INTO materials (titel, fach, typ, datei_name, datei_url, datei_typ) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(name, fach, typ, req.file.originalname, url, req.file.mimetype);

    res.json({ id: row.lastInsertRowid, titel: name, fach, typ, url });
  });
});

// GET /api/materials – öffentlich
router.get('/', (req, res) => {
  const { fach, typ } = req.query;
  let sql = 'SELECT * FROM materials WHERE 1=1';
  const params = [];
  if (fach) { sql += ' AND fach = ?'; params.push(fach); }
  if (typ)  { sql += ' AND typ = ?';  params.push(typ);  }
  sql += ' ORDER BY erstellt_am DESC';
  res.json(db.prepare(sql).all(...params));
});

// DELETE /api/materials/:id – Admin only
router.delete('/:id', requireAdmin, (req, res) => {
  const row = db.prepare('SELECT * FROM materials WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Nicht gefunden.' });

  const file = path.join(UPLOAD_DIR, path.basename(row.datei_url));
  if (fs.existsSync(file)) fs.unlinkSync(file);

  db.prepare('DELETE FROM materials WHERE id = ?').run(row.id);
  res.json({ ok: true });
});

module.exports = router;
