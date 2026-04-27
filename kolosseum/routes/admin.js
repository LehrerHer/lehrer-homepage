const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../db/database');
const { requireAdmin } = require('../middleware/auth');
const { BADGE_DEFINITIONS, awardBadge, checkAndAwardBadges } = require('../db/badges');

const router = express.Router();

router.use(requireAdmin);

// GET /api/admin/stats
router.get('/stats', (req, res) => {
  const totalStudents  = db.prepare('SELECT COUNT(*) as c FROM students').get().c;
  const totalXP        = db.prepare('SELECT COALESCE(SUM(xp),0) as t FROM students').get().t;
  const totalBadges    = db.prepare('SELECT COUNT(*) as c FROM student_badges').get().c;
  const recentActivity = db.prepare(`
    SELECT s.nick, x.amount, x.reason, x.created_at
    FROM xp_log x JOIN students s ON s.id = x.student_id
    ORDER BY x.created_at DESC LIMIT 10
  `).all();
  res.json({ totalStudents, totalXP, totalBadges, recentActivity });
});

// GET /api/admin/students
router.get('/students', (req, res) => {
  const students = db.prepare(`
    SELECT s.id, s.nick, s.xp, s.created_at, s.last_active,
           sn.real_name, sn.class
    FROM students s
    LEFT JOIN student_names sn ON sn.student_id = s.id
    ORDER BY s.xp DESC
  `).all();

  const badgeRows = db.prepare('SELECT student_id, badge_id FROM student_badges').all();
  const badgeMap  = {};
  badgeRows.forEach(({ student_id, badge_id }) => {
    (badgeMap[student_id] ??= []).push(badge_id);
  });

  res.json(students.map(s => ({ ...s, badges: badgeMap[s.id] ?? [] })));
});

// POST /api/admin/students
router.post('/students', async (req, res) => {
  const { nick, pin, real_name, class: klasse } = req.body;
  if (!nick || !pin)              return res.status(400).json({ error: 'Spitzname und PIN erforderlich.' });
  if (!/^\d{4}$/.test(String(pin))) return res.status(400).json({ error: 'PIN muss genau 4 Ziffern haben.' });

  const exists = db.prepare('SELECT id FROM students WHERE nick = ?').get(nick.trim());
  if (exists) return res.status(409).json({ error: 'Spitzname bereits vergeben.' });

  const pin_hash = await bcrypt.hash(String(pin), 10);
  const { lastInsertRowid: studentId } = db.prepare(
    'INSERT INTO students (nick, pin_hash) VALUES (?, ?)'
  ).run(nick.trim(), pin_hash);

  if (real_name?.trim()) {
    db.prepare('INSERT INTO student_names (student_id, real_name, class) VALUES (?, ?, ?)')
      .run(studentId, real_name.trim(), klasse?.trim() || null);
  }

  awardBadge(studentId, 'first_day');
  res.status(201).json({ id: studentId, nick: nick.trim() });
});

// PATCH /api/admin/students/:id/xp
router.patch('/students/:id/xp', (req, res) => {
  const id     = Number(req.params.id);
  const amount = Number(req.body.amount);
  const reason = req.body.reason?.trim() || 'Manuelle Anpassung durch Lehrer';

  if (!amount || isNaN(amount)) return res.status(400).json({ error: 'Ungültiger XP-Betrag.' });

  const student = db.prepare('SELECT id, xp FROM students WHERE id = ?').get(id);
  if (!student) return res.status(404).json({ error: 'Schüler nicht gefunden.' });

  const newXP = Math.max(0, student.xp + amount);
  db.prepare('UPDATE students SET xp = ? WHERE id = ?').run(newXP, id);
  db.prepare('INSERT INTO xp_log (student_id, amount, reason) VALUES (?, ?, ?)').run(id, amount, reason);
  checkAndAwardBadges(id);

  res.json({ ok: true, newXP });
});

// POST /api/admin/students/:id/badges
router.post('/students/:id/badges', (req, res) => {
  const id       = Number(req.params.id);
  const { badge_id } = req.body;
  if (!badge_id) return res.status(400).json({ error: 'badge_id fehlt.' });
  if (!BADGE_DEFINITIONS.find(b => b.id === badge_id))
    return res.status(400).json({ error: 'Unbekanntes Badge.' });

  const isNew = awardBadge(id, badge_id);
  res.json({ ok: true, isNew });
});

// DELETE /api/admin/students/:id
router.delete('/students/:id', (req, res) => {
  db.prepare('DELETE FROM students WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// GET /api/admin/export  (CSV mit BOM für Excel)
router.get('/export', (req, res) => {
  const LEVEL_NAMES = [
    { name: 'Lehrling', xp: 0 }, { name: 'Entdecker', xp: 100 },
    { name: 'Kämpfer',  xp: 250 }, { name: 'Held',    xp: 500 },
    { name: 'Ritter',   xp: 900 }, { name: 'Champion', xp: 1400 },
    { name: 'Legende',  xp: 2000 },
  ];
  const getLevel = xp => [...LEVEL_NAMES].reverse().find(l => xp >= l.xp)?.name ?? 'Lehrling';

  const students = db.prepare(`
    SELECT s.id, s.nick, s.xp, s.created_at, s.last_active, sn.real_name, sn.class
    FROM students s LEFT JOIN student_names sn ON sn.student_id = s.id
    ORDER BY s.xp DESC
  `).all();

  const badgeRows = db.prepare('SELECT student_id, badge_id FROM student_badges').all();
  const badgeMap  = {};
  badgeRows.forEach(({ student_id, badge_id }) => (badgeMap[student_id] ??= []).push(badge_id));

  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [
    ['Spitzname', 'Klarname', 'Klasse', 'XP', 'Level', 'Abzeichen', 'Registriert', 'Zuletzt aktiv'],
    ...students.map(s => [
      s.nick, s.real_name ?? '', s.class ?? '', s.xp, getLevel(s.xp),
      (badgeMap[s.id] ?? []).join('; '),
      s.created_at?.slice(0, 10) ?? '', s.last_active?.slice(0, 10) ?? '',
    ]),
  ];

  const csv = rows.map(r => r.map(esc).join(',')).join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="kolosseum-export.csv"');
  res.send('﻿' + csv);
});

module.exports = router;
