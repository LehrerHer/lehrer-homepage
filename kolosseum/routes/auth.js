const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { db } = require('../db/database');
const { loginLimiter, registerLimiter, adminLoginLimiter } = require('../middleware/rateLimit');
const { requireStudent, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login – Email oder Nick + Passwort
router.post('/login', loginLimiter, async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Anmeldename und Passwort erforderlich.' });
  }

  const id = identifier.trim().toLowerCase();
  const student = db.prepare(
    'SELECT * FROM students WHERE LOWER(email) = ? OR LOWER(nick) = ?'
  ).get(id, id);

  if (!student) {
    return res.status(401).json({ error: 'Anmeldename oder Passwort falsch.' });
  }

  const match = await bcrypt.compare(String(password), student.pin_hash);
  if (!match) {
    return res.status(401).json({ error: 'Anmeldename oder Passwort falsch.' });
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
  const student = db.prepare(
    'SELECT id, nick, xp, created_at, last_active FROM students WHERE id = ?'
  ).get(req.session.studentId);
  if (!student) return res.status(404).json({ error: 'Nicht gefunden.' });
  res.json(student);
});

// GET /api/auth/validate-token/:token – prüft Einladungslink (ohne Registrierung)
router.get('/validate-token/:token', (req, res) => {
  const token = db.prepare(
    `SELECT id, label, expires_at, max_uses, use_count
     FROM invite_tokens
     WHERE token = ?
       AND expires_at > CURRENT_TIMESTAMP
       AND (max_uses = 0 OR use_count < max_uses)`
  ).get(req.params.token);

  if (!token) {
    return res.status(404).json({ error: 'Einladungslink ungültig oder abgelaufen.' });
  }
  res.json({ ok: true, label: token.label || null });
});

// POST /api/auth/register – Registrierung mit Einladungstoken
router.post('/register', registerLimiter, async (req, res) => {
  const { token, email, nick, password } = req.body;

  if (!token || !email || !nick || !password) {
    return res.status(400).json({ error: 'Token, E-Mail, Avatarname und Passwort erforderlich.' });
  }

  // Token prüfen und sperren (atomisch)
  const inviteRow = db.prepare(
    `SELECT id FROM invite_tokens
     WHERE token = ?
       AND expires_at > CURRENT_TIMESTAMP
       AND (max_uses = 0 OR use_count < max_uses)`
  ).get(token);

  if (!inviteRow) {
    return res.status(403).json({ error: 'Einladungslink ungültig oder abgelaufen.' });
  }

  // E-Mail-Format prüfen
  const emailLower = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower)) {
    return res.status(400).json({ error: 'Ungültige E-Mail-Adresse.' });
  }

  // Passwort: mindestens 8 Zeichen
  if (String(password).length < 8) {
    return res.status(400).json({ error: 'Passwort muss mindestens 8 Zeichen haben.' });
  }

  // Avatarname: 2–20 Zeichen
  const nickClean = nick.trim();
  if (nickClean.length < 2 || nickClean.length > 20) {
    return res.status(400).json({ error: 'Avatarname muss 2–20 Zeichen lang sein.' });
  }

  // Eindeutigkeit prüfen
  if (db.prepare('SELECT id FROM students WHERE email = ?').get(emailLower)) {
    return res.status(409).json({ error: 'Diese E-Mail-Adresse ist bereits registriert.' });
  }
  if (db.prepare('SELECT id FROM students WHERE LOWER(nick) = ?').get(nickClean.toLowerCase())) {
    return res.status(409).json({ error: 'Dieser Avatarname ist bereits vergeben.' });
  }

  const pin_hash = await bcrypt.hash(String(password), 10);

  const register = db.transaction(() => {
    const { lastInsertRowid: studentId } = db.prepare(
      'INSERT INTO students (nick, pin_hash, email) VALUES (?, ?, ?)'
    ).run(nickClean, pin_hash, emailLower);

    db.prepare(
      'UPDATE invite_tokens SET use_count = use_count + 1 WHERE id = ?'
    ).run(inviteRow.id);

    return studentId;
  });

  const studentId = register();

  db.prepare(
    'INSERT OR IGNORE INTO student_badges (student_id, badge_id) VALUES (?, ?)'
  ).run(studentId, 'first_day');

  req.session.studentId = studentId;
  req.session.nick = nickClean;

  res.status(201).json({ ok: true, nick: nickClean, redirect: '/profil.html' });
});

// POST /api/auth/admin/login
router.post('/admin/login', adminLoginLimiter, async (req, res) => {
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
