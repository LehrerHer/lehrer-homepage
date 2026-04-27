require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');

const { db, SQLiteSessionStore } = require('./db/database');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const store = new SQLiteSessionStore(session);
app.use(session({
  store,
  secret: process.env.SESSION_SECRET || 'dev-secret-bitte-aendern',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
}));

// Routes
app.use('/api/auth', authRoutes);

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
