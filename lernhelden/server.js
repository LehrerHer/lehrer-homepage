require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const { initDB } = require('./db/database');
const { seedDemoData } = require('./db/seeds');
const { requireStudent, requireAdmin } = require('./middleware/auth');

const authRouter = require('./routes/auth');
const studentsRouter = require('./routes/students');
const quizRouter = require('./routes/quiz');
const adminRouter = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

const db = initDB();
seedDemoData(db);

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
app.use('/api/admin', adminRouter);

// Seiten-Routen
const pub = p => path.join(__dirname, 'public', p);
app.get('/', (req, res) => {
  if (req.session && req.session.studentId) return res.redirect('/profil');
  res.redirect('/login');
});
app.get('/login',     (req, res) => res.sendFile(pub('login.html')));
app.get('/rangliste', (req, res) => res.sendFile(pub('rangliste.html')));
app.get('/profil',    requireStudent, (req, res) => res.sendFile(pub('profil.html')));
app.get('/quiz',      requireStudent, (req, res) => res.sendFile(pub('quiz.html')));
app.get('/quiz/:id',  requireStudent, (req, res) => res.sendFile(pub('quiz-spiel.html')));
app.get('/admin',          (req, res) => res.sendFile(pub('admin/index.html')));
app.get('/admin/dashboard',(req, res, next) => { if (req.session && req.session.adminId) return res.sendFile(pub('admin/dashboard.html')); res.redirect('/admin'); });
app.get('/admin/schueler', (req, res, next) => { if (req.session && req.session.adminId) return res.sendFile(pub('admin/schueler.html')); res.redirect('/admin'); });
app.get('/admin/quiz',     (req, res, next) => { if (req.session && req.session.adminId) return res.sendFile(pub('admin/quiz.html')); res.redirect('/admin'); });
app.get('/admin/export',   (req, res, next) => { if (req.session && req.session.adminId) return res.sendFile(pub('admin/export.html')); res.redirect('/admin'); });

app.listen(PORT, () => {
  console.log(`\n🦸 Lernhelden läuft auf http://localhost:${PORT}\n`);
  if (!process.env.SESSION_SECRET) {
    console.warn('⚠️  SESSION_SECRET nicht gesetzt – unsicher für Produktion!');
  }
  if (!process.env.ADMIN_PASSWORD_HASH) {
    console.warn('⚠️  ADMIN_PASSWORD_HASH nicht gesetzt – Standard-Passwort: "lernhelden"');
  }
});
