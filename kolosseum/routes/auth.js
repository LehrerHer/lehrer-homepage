const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../db/database');
const { loginLimiter } = require('../middleware/rateLimit');
const { requireStudent, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  const { nick, pin } = req.body;

  if (!nick || !pin) {
    return res.status(400).json({ error: 'Spitzname und PIN erforderlich.' });
  }

  const student = db.prepare('SELECT * FROM students WHERE nick = ?').get(nick.trim());
  if (!student) {
    return res.status(401).json({ error: 'Spitzname oder PIN falsch.' });
  }

  const match = await bcrypt.compare(String(pin), student.pin_hash);
  if (!match) {
    return res.status(401).json({ error: 'Spitzname oder PIN falsch.' });
  }

  db.prepare('UPDATE students SET last_active = CURRENT_TIMESTAMP WHERE id = ?').run(student.id);

  req.session.studentId = student.id;
  req.session.nick = student.nick;

  res.json({ ok: true, nick: student.nick, redirect: '/profil.html' });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true, redirect: '/login.html' });
  });
});

// GET /api/auth/me
router.get('/me', requireStudent, (req, res) => {
  const student = db.prepare('SELECT id, nick, xp, created_at, last_active FROM students WHERE id = ?').get(req.session.studentId);
  if (!student) return res.status(404).json({ error: 'Nicht gefunden.' });
  res.json(student);
});

// POST /api/auth/register – Selbstregistrierung mit Schul-E-Mail
router.post('/register', loginLimiter, async (req, res) => {
  const { email, nick, pin } = req.body;

  if (!email || !nick || !pin) {
    return res.status(400).json({ error: 'E-Mail, Spitzname und PIN erforderlich.' });
  }

  // E-Mail-Format prüfen
  const emailLower = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower)) {
    return res.status(400).json({ error: 'Ungültige E-Mail-Adresse.' });
  }

  // Domain gegen Allowlist prüfen
  const allowed = (process.env.ALLOWED_DOMAINS || 'obsspelle.de')
    .split(',').map(d => d.trim().toLowerCase()).filter(Boolean);
  const domain = emailLower.split('@')[1];
  if (!allowed.includes(domain)) {
    return res.status(403).json({
      error: `Registrierung nur mit Schuladresse möglich (z. B. @${allowed[0]}).`,
    });
  }

  // PIN-Format prüfen
  if (!/^\d{4}$/.test(String(pin))) {
    return res.status(400).json({ error: 'PIN muss genau 4 Ziffern haben.' });
  }

  // Spitzname: nur erlaubte Zeichen, 2–20 Zeichen
  const nickClean = nick.trim();
  if (nickClean.length < 2 || nickClean.length > 20) {
    return res.status(400).json({ error: 'Spitzname muss 2–20 Zeichen lang sein.' });
  }

  // Eindeutigkeit prüfen
  if (db.prepare('SELECT id FROM students WHERE email = ?').get(emailLower)) {
    return res.status(409).json({ error: 'Diese E-Mail-Adresse ist bereits registriert.' });
  }
  if (db.prepare('SELECT id FROM students WHERE nick = ?').get(nickClean)) {
    return res.status(409).json({ error: 'Dieser Spitzname ist bereits vergeben.' });
  }

  const pin_hash = await bcrypt.hash(String(pin), 10);
  const { lastInsertRowid: studentId } = db.prepare(
    'INSERT INTO students (nick, pin_hash, email) VALUES (?, ?, ?)'
  ).run(nickClean, pin_hash, emailLower);

  // Erster-Tag-Badge
  db.prepare('INSERT OR IGNORE INTO student_badges (student_id, badge_id) VALUES (?, ?)').run(studentId, 'first_day');

  req.session.studentId = studentId;
  req.session.nick = nickClean;

  res.status(201).json({ ok: true, nick: nickClean, redirect: '/profil.html' });
});

// POST /api/auth/admin/login
router.post('/admin/login', loginLimiter, async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Passwort erforderlich.' });

  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!hash) return res.status(500).json({ error: 'Admin-Passwort nicht konfiguriert.' });

  const match = await bcrypt.compare(password, hash);
  if (!match) return res.status(401).json({ error: 'Falsches Passwort.' });

  req.session.isAdmin = true;
  res.json({ ok: true, redirect: '/admin/dashboard.html' });
});

// POST /api/auth/admin/logout
router.post('/admin/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true, redirect: '/admin/index.html' });
  });
});

// GET /api/auth/admin/check
router.get('/admin/check', requireAdmin, (req, res) => {
  res.json({ ok: true });
});

module.exports = router;
