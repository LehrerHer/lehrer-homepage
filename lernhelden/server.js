require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const { initDB, pool } = require('./db/database');
const { seedDemoData } = require('./db/seeds');
const { requireStudent, requireAdmin } = require('./middleware/auth');
const authRouter = require('./routes/auth');
const studentsRouter = require('./routes/students');
const quizRouter = require('./routes/quiz');
const worksheetsRouter = require('./routes/worksheets');
const adminRouter = require('./routes/admin');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'lernhelden-dev-secret-bitte-aendern',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
}));

app.use('/api/auth', authRouter);
app.use('/api/students', studentsRouter);
app.use('/api/quiz', quizRouter);
app.use('/api/arbeitsblatt', worksheetsRouter);
app.use('/api/admin', adminRouter);

const pub = p => path.join(__dirname, 'public', p);
app.get('/', (req, res) => {
  if (req.session && req.session.studentId) return res.redirect('/profil');
  res.redirect('/login');
});
app.get('/login',            (req, res) => res.sendFile(pub('login.html')));
app.get('/rangliste',        (req, res) => res.sendFile(pub('rangliste.html')));
app.get('/profil',           requireStudent, (req, res) => res.sendFile(pub('profil.html')));
app.get('/quiz',             requireStudent, (req, res) => res.sendFile(pub('quiz.html')));
app.get('/quiz/:id',         requireStudent, (req, res) => res.sendFile(pub('quiz-spiel.html')));
app.get('/arbeitsblatt',     requireStudent, (req, res) => res.sendFile(pub('arbeitsblatt.html')));
app.get('/arbeitsblatt/:id', requireStudent, (req, res) => res.sendFile(pub('arbeitsblatt-spiel.html')));
app.get('/inhalte.json', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const { rows } = await pool.query('SELECT * FROM materials ORDER BY datum DESC, created_at DESC');
    res.json({
      materialien: rows.map(m => ({
        id: String(m.id),
        titel: m.titel,
        beschreibung: m.beschreibung || '',
        icon: m.icon || '📄',
        url: m.url || '',
        seite: m.seite || 'allgemein',
        datum: m.datum ? String(m.datum).split('T')[0] : '',
      })),
    });
  } catch { res.json({ materialien: [] }); }
});

app.get('/admin',            (req, res) => res.sendFile(pub('admin/index.html')));
app.get('/admin/dashboard',  (req, res) => { if (req.session?.adminId) return res.sendFile(pub('admin/dashboard.html')); res.redirect('/admin'); });
app.get('/admin/schueler',   (req, res) => { if (req.session?.adminId) return res.sendFile(pub('admin/schueler.html')); res.redirect('/admin'); });
app.get('/admin/quiz',       (req, res) => { if (req.session?.adminId) return res.sendFile(pub('admin/quiz.html'));      res.redirect('/admin'); });
app.get('/admin/export',        (req, res) => { if (req.session?.adminId) return res.sendFile(pub('admin/export.html'));       res.redirect('/admin'); });
app.get('/admin/materialien',   (req, res) => { if (req.session?.adminId) return res.sendFile(pub('admin/materialien.html')); res.redirect('/admin'); });

async function main() {
  try {
    await initDB();
    await seedDemoData();
    app.listen(PORT, () => {
      console.log(`\n🏛️  Lerngladiatoren läuft auf http://localhost:${PORT}\n`);
      if (!process.env.SESSION_SECRET)      console.warn('⚠️  SESSION_SECRET nicht gesetzt – unsicher für Produktion!');
      if (!process.env.ADMIN_PASSWORD_HASH) console.warn('⚠️  ADMIN_PASSWORD_HASH nicht gesetzt – Standard-Passwort: "lernhelden"');
    });
  } catch (err) {
    console.error('❌ Startup-Fehler:', err.message);
    process.exit(1);
  }
}

main();
