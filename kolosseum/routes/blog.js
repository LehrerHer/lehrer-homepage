const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const rateLimit = require('express-rate-limit');
const { db }  = require('../db/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// ── Upload-Verzeichnis sicherstellen ────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'blog');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ── Multer: Speicherstrategie ───────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename:    (_req, file, cb) => {
    const ext    = path.extname(file.originalname).toLowerCase();
    const random = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    cb(null, random + ext);
  }
});

const ERLAUBTE_TYPEN = ['image/jpeg','image/png','image/webp','image/gif',
                        'application/pdf','text/plain','text/html',
                        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const MAX_GROESSE = 10 * 1024 * 1024; // 10 MB

class DateiTypFehler extends Error {}

const upload = multer({
  storage,
  limits: { fileSize: MAX_GROESSE },
  fileFilter: (_req, file, cb) => {
    if (ERLAUBTE_TYPEN.includes(file.mimetype)) return cb(null, true);
    cb(new DateiTypFehler('Dateityp nicht erlaubt (erlaubt: PDF, JPG, PNG, WebP, GIF, TXT, DOCX, HTML)'));
  }
});

function dateiTyp(mimetype) {
  if (!mimetype) return 'sonstige';
  if (mimetype === 'text/html') return 'html';
  if (mimetype.startsWith('image/')) return 'bild';
  if (mimetype === 'application/pdf') return 'pdf';
  if (mimetype.startsWith('text/')) return 'text';
  return 'sonstige';
}

const submitLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false });

// ── GET /api/blog – genehmigte Beiträge (öffentlich) ───────────────
router.get('/', (req, res) => {
  const limit = req.query.limit ? Math.min(parseInt(req.query.limit) || 50, 200) : 200;
  try {
    const rows = db.prepare(
      `SELECT id, titel, autor, klasse, fach, beschreibung, datei_url, datei_typ, datum
       FROM blog_beitraege
       WHERE genehmigt = 1
       ORDER BY datum DESC
       LIMIT ?`
    ).all(limit);
    res.json(rows);
  } catch (e) {
    console.error('Blog GET Fehler:', e);
    res.status(500).json({ error: 'Datenbankfehler' });
  }
});

// ── POST /api/blog/einreichen – Beitrag einreichen (Datei-Upload) ───
router.post('/einreichen', submitLimiter, upload.single('datei'), (req, res) => {
  const { titel, autor, klasse, fach, beschreibung } = req.body;

  if (!titel || !autor || !klasse || !fach) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(400).json({ error: 'Pflichtfelder fehlen.' });
  }

  let dateiUrl  = null;
  let dateiTypArt = null;

  if (req.file) {
    dateiUrl    = `/uploads/blog/${req.file.filename}`;
    dateiTypArt = dateiTyp(req.file.mimetype);
  }

  try {
    db.prepare(
      `INSERT INTO blog_beitraege (titel, autor, klasse, fach, beschreibung, datei_url, datei_typ, genehmigt)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`
    ).run(
      String(titel).trim().slice(0, 200),
      String(autor).trim().slice(0, 60),
      String(klasse).trim().slice(0, 10),
      String(fach).trim().slice(0, 60),
      beschreibung ? String(beschreibung).trim().slice(0, 1000) : null,
      dateiUrl,
      dateiTypArt
    );
    res.json({ ok: true, nachricht: 'Beitrag eingereicht – wird nach Prüfung veröffentlicht.' });
  } catch (e) {
    console.error('Blog POST Fehler:', e);
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'Datenbankfehler' });
  }
});

// ── Admin-Routen ────────────────────────────────────────────────────

// GET /api/blog/admin – alle Beiträge inkl. nicht genehmigter
router.get('/admin', requireAdmin, (req, res) => {
  try {
    const rows = db.prepare(
      `SELECT * FROM blog_beitraege ORDER BY datum DESC`
    ).all();
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Datenbankfehler' });
  }
});

// POST /api/blog/:id/genehmigen – Beitrag genehmigen
router.post('/:id/genehmigen', requireAdmin, (req, res) => {
  try {
    db.prepare(`UPDATE blog_beitraege SET genehmigt = 1 WHERE id = ?`).run(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Datenbankfehler' });
  }
});

// DELETE /api/blog/:id – Beitrag löschen
router.delete('/:id', requireAdmin, (req, res) => {
  try {
    const row = db.prepare(`SELECT datei_url FROM blog_beitraege WHERE id = ?`).get(req.params.id);
    if (row?.datei_url) {
      const filePath = path.join(__dirname, '..', row.datei_url.replace(/^\//, ''));
      fs.unlink(filePath, () => {});
    }
    db.prepare(`DELETE FROM blog_beitraege WHERE id = ?`).run(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Datenbankfehler' });
  }
});

// ── Fehlerbehandlung für den Datei-Upload ───────────────────────────
// (Multer/fileFilter-Fehler wie "Dateityp nicht erlaubt" oder "Datei zu groß"
// landen sonst als generischer 500-Fehler statt einer verständlichen Meldung.)
router.use((err, req, res, next) => {
  if (req.file) fs.unlink(req.file.path, () => {});

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Die Datei ist zu groß (maximal 10 MB).' });
    }
    return res.status(400).json({ error: 'Fehler beim Datei-Upload: ' + err.message });
  }
  if (err instanceof DateiTypFehler) {
    return res.status(400).json({ error: err.message });
  }

  console.error('Blog-Upload Fehler:', err);
  res.status(500).json({ error: 'Unerwarteter Server-Fehler.' });
});

module.exports = router;
