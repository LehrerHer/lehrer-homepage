const express = require('express');
const { db } = require('../db/database');
const { requireStudent } = require('../middleware/auth');
const { BADGE_DEFINITIONS, checkAndAwardBadges } = require('../db/badges');

const router = express.Router();

// Registry aller verfügbaren Arbeitsblätter (wird manuell gepflegt)
const WORKSHEET_REGISTRY = [
  { id: 'rechenblatt-klasse45',       title: 'Rechenblatt Klasse 4/5',            url: 'https://lehrer-herrmann.de/materialien/mathe_rechenblatt_klasse45_2026-05.html', xp: 20 },
  { id: 'rechenblatt-1000',           title: 'Rechenblatt bis 1000',               url: 'https://lehrer-herrmann.de/materialien/rechenblatt_klasse2_bis1000.html',        xp: 20 },
  { id: 'deutsch-drama-ppp-jg10',     title: 'Drama – Einführung (Jahrgang 10)',   url: 'https://lehrer-herrmann.de/materialien/deutsch_drama-ppp_jg10_2026-05.html',    xp: 25 },
  { id: 'geschichte-prag-stunde1',    title: 'Geschichte Prags – Stunde 1',        url: 'https://lehrer-herrmann.de/materialien/geschichte_prag_stunde1_2026-05.html',   xp: 25 },
  { id: 'geschichte-prag-stunde2',    title: 'Geschichte Prags – Stunde 2',        url: 'https://lehrer-herrmann.de/materialien/geschichte_prag_stunde2_2026-05.html',   xp: 25 },
  { id: 'geschichte-ab1-prag-stunde1', title: 'Geschichte Prags – AB 1 Stunde 1', url: 'https://lehrer-herrmann.de/materialien/geschichte_ab1_prag_stunde1_2026-05.html', xp: 25 },
];

// Registry der statischen Quizze mit ihren Seiten-URLs
const EXTERN_QUIZ_REGISTRY = [
  { slug: 'stilmittel',            title: 'Stilmittel-Quiz',           url: 'https://lehrer-herrmann.de/stilmittel-quiz.html' },
  { slug: 'literaturwissenschaft', title: 'Literaturwissenschaft-Quiz', url: 'https://lehrer-herrmann.de/literaturwissenschaft_quiz_v2.html' },
  { slug: 'rechtschreibung',       title: 'Rechtschreib-Quiz',          url: 'https://lehrer-herrmann.de/rechtschreibquiz.html' },
  { slug: 'lernquiz-jahrgang5',    title: 'Lernquiz Jahrgang 5',        url: 'https://lehrer-herrmann.de/lernquiz_jahrgang5.html' },
  { slug: 'das-parfum',            title: 'Das Parfum',                  url: 'https://lehrer-herrmann.de/deutsch-das-parfum.html' },
  { slug: 'theaterprojekt-9',      title: 'Theaterprojekt Jahrgang 9',  url: 'https://lehrer-herrmann.de/deutsch-theaterprojekt.html' },
];

// GET /api/students/profile
router.get('/profile', requireStudent, (req, res) => {
  const studentId = req.session.studentId;

  const student = db.prepare(
    'SELECT id, nick, xp, created_at, last_active FROM students WHERE id = ?'
  ).get(studentId);

  if (!student) return res.status(404).json({ error: 'Profil nicht gefunden.' });

  // Prüft auf neu verdiente Badges (z.B. nach manuellem XP-Update durch Admin)
  const newBadgeIds = checkAndAwardBadges(studentId);

  const earnedRows = db.prepare(
    'SELECT badge_id, earned_at FROM student_badges WHERE student_id = ? ORDER BY earned_at ASC'
  ).all(studentId);

  const earnedMap = new Map(earnedRows.map((r) => [r.badge_id, r.earned_at]));

  const badges = BADGE_DEFINITIONS.map(({ id, emoji, name, desc }) => ({
    id,
    emoji,
    name,
    desc,
    earned: earnedMap.has(id),
    earnedAt: earnedMap.get(id) || null,
    isNew: newBadgeIds.includes(id),
  }));

  const xpLog = db.prepare(
    `SELECT amount, reason, created_at
     FROM xp_log
     WHERE student_id = ?
     ORDER BY created_at DESC
     LIMIT 10`
  ).all(studentId);

  res.json({ student, badges, xpLog });
});

// GET /api/students/avatar – eigene Avatar-Konfig lesen
router.get('/avatar', requireStudent, (req, res) => {
  const row = db.prepare('SELECT avatar_config FROM students WHERE id = ?').get(req.session.studentId);
  if (!row) return res.status(404).json({ error: 'Nicht gefunden.' });
  res.json({ avatarConfig: row.avatar_config ? JSON.parse(row.avatar_config) : null });
});

// PATCH /api/students/avatar – Avatar-Konfig speichern
router.patch('/avatar', requireStudent, (req, res) => {
  const allowed = new Set(['classId', 'raceId', 'genderId', 'skinId', 'hairColorId', 'accessoryId', 'name']);
  const input = req.body;
  if (typeof input !== 'object' || input === null) return res.status(400).json({ error: 'Ungültige Daten.' });
  const sanitized = {};
  for (const key of allowed) {
    if (key in input) sanitized[key] = String(input[key]).slice(0, 40);
  }
  db.prepare('UPDATE students SET avatar_config = ? WHERE id = ?')
    .run(JSON.stringify(sanitized), req.session.studentId);
  res.json({ ok: true });
});

// GET /api/students/xp-potenzial – Übersicht aller XP-Quellen mit Abschluss-Status
router.get('/xp-potenzial', requireStudent, (req, res) => {
  const sid = req.session.studentId;

  // ── Arbeitsblätter ──────────────────────────────────────────────────────
  const wsRows = db.prepare(
    'SELECT worksheet_id, xp_earned FROM worksheet_completions WHERE student_id = ?'
  ).all(sid);
  const wsMap = new Map(wsRows.map(r => [r.worksheet_id, r.xp_earned]));

  const arbeitsblätter = WORKSHEET_REGISTRY.map(w => ({
    id: w.id,
    title: w.title,
    url: w.url,
    maxXp: w.xp,
    abgeschlossen: wsMap.has(w.id),
    verdientXp: wsMap.get(w.id) || 0,
  }));

  // ── Externe Quizze ──────────────────────────────────────────────────────
  const extRows = db.prepare(`
    SELECT quiz_slug,
           MAX(xp_earned) AS beste_xp,
           MAX(total)     AS fragenanzahl
    FROM external_quiz_results
    WHERE student_id = ?
    GROUP BY quiz_slug
  `).all(sid);
  const extMap = new Map(extRows.map(r => [r.quiz_slug, r]));

  const externeQuizze = EXTERN_QUIZ_REGISTRY.map(q => {
    const row = extMap.get(q.slug);
    const maxXp = row ? 15 * row.fragenanzahl : null;
    return {
      slug: q.slug,
      title: q.title,
      url: q.url,
      gespielt: !!row,
      besteXp: row ? row.beste_xp : 0,
      maxXp,
      verbesserbar: row ? row.beste_xp < maxXp : false,
    };
  });

  // ── Arena-Quizze ────────────────────────────────────────────────────────
  const quizze = db.prepare(`
    SELECT q.id, q.title, q.subject,
           COALESCE(SUM(qu.xp_value), 0) AS max_xp
    FROM quizzes q
    LEFT JOIN questions qu ON qu.quiz_id = q.id
    GROUP BY q.id
    ORDER BY q.id ASC
  `).all();

  const arenaRows = db.prepare(
    'SELECT quiz_id, MAX(xp_earned) AS beste_xp FROM quiz_results WHERE student_id = ? GROUP BY quiz_id'
  ).all(sid);
  const arenaMap = new Map(arenaRows.map(r => [r.quiz_id, r.beste_xp]));

  const arenaQuizze = quizze.map(q => ({
    id: q.id,
    title: q.title,
    subject: q.subject,
    maxXp: q.max_xp,
    besteXp: arenaMap.get(q.id) || 0,
    gespielt: arenaMap.has(q.id),
  }));

  res.json({ arbeitsblätter, externeQuizze, arenaQuizze });
});

// GET /api/students/rangliste – Top-Schüler nach XP
router.get('/rangliste', requireStudent, (req, res) => {
  const students = db.prepare(`
    SELECT s.id, s.nick, s.xp, COALESCE(s.coins, 0) AS coins,
           COUNT(sb.badge_id) AS badge_count,
           (SELECT si.item_id FROM student_items si
            WHERE si.student_id = s.id AND si.equipped = 1
              AND si.item_id LIKE 'titel%'
            LIMIT 1) AS equip_titel
    FROM students s
    LEFT JOIN student_badges sb ON sb.student_id = s.id
    GROUP BY s.id
    ORDER BY s.xp DESC, s.nick ASC
    LIMIT 50
  `).all();

  res.json(students);
});

module.exports = router;
