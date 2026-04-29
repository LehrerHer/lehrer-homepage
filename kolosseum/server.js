require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');

const { db, SQLiteSessionStore } = require('./db/database');
const authRoutes     = require('./routes/auth');
const studentRoutes  = require('./routes/students');
const adminRoutes    = require('./routes/admin');
const quizRoutes     = require('./routes/quiz');
const externalRoutes   = require('./routes/external');
const publicRoutes     = require('./routes/public');
const leaderboardRoutes = require('./routes/leaderboard');
const blogRoutes        = require('./routes/blog');
const aiFeedbackRoutes  = require('./routes/ai-feedback');

const app = express();
const PORT = process.env.PORT || 3000;

// Render (und andere Reverse-Proxies) leiten HTTPS-Requests weiter
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);

// CORS für lehrer-herrmann.de – erlaubt cross-origin Fetches von den statischen Quizzen
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin === 'https://lehrer-herrmann.de') {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
// Hochgeladene Blog-Dateien statisch ausliefern
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const store = new SQLiteSessionStore(session);
app.use(session({
  store,
  secret: process.env.SESSION_SECRET || 'dev-secret-bitte-aendern',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    // SameSite=none nötig damit cross-origin Requests von lehrer-herrmann.de den Cookie mitsenden
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
}));

// Routes
app.use('/api/auth',     authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/admin',    adminRoutes);
app.use('/api/quizzes',  quizRoutes);
app.use('/api/external',    externalRoutes);
app.use('/api/public',      publicRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/blog',        blogRoutes);
app.use('/api/ai-feedback', aiFeedbackRoutes);

// SPA-Catch: alle nicht-API-Routen geben die jeweilige HTML-Datei zurück
// (oder leiten zu login weiter)
app.get('/', (req, res) => {
  if (req.session.studentId) return res.redirect('/profil.html');
  res.redirect('/login.html');
});

app.listen(PORT, () => {
  console.log(`Lernkolosseum läuft auf http://localhost:${PORT}`);
});

module.exports = app;
