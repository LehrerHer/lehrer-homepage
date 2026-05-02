-- Schüler (nur Spitzname in Haupttabelle)
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nick TEXT UNIQUE NOT NULL,
  pin_hash TEXT NOT NULL,
  xp INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_active DATETIME
);

-- Klarname-Zuordnung (nur im Admin sichtbar)
CREATE TABLE IF NOT EXISTS student_names (
  student_id INTEGER PRIMARY KEY,
  real_name TEXT NOT NULL,
  class TEXT,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- Badge-Vergaben
CREATE TABLE IF NOT EXISTS student_badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  badge_id TEXT NOT NULL,
  earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, badge_id),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- XP-Log
CREATE TABLE IF NOT EXISTS xp_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT,
  quiz_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- Quizze
CREATE TABLE IF NOT EXISTS quizzes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  subject TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Fragen
CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quiz_id INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  options TEXT NOT NULL,
  correct_index INTEGER NOT NULL,
  xp_value INTEGER DEFAULT 15,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

-- Quiz-Ergebnisse
CREATE TABLE IF NOT EXISTS quiz_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  quiz_id INTEGER NOT NULL,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  xp_earned INTEGER NOT NULL,
  attempt_number INTEGER DEFAULT 1,
  completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

-- Vorbereitung Wettkämpfe (Architektur – noch nicht aktiv)
CREATE TABLE IF NOT EXISTS challenges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  challenger_id INTEGER NOT NULL,
  opponent_id INTEGER NOT NULL,
  quiz_id INTEGER,
  status TEXT DEFAULT 'pending',
  winner_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (challenger_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (opponent_id) REFERENCES students(id) ON DELETE CASCADE
);

-- Ergebnisse der externen (statischen) Quizze
CREATE TABLE IF NOT EXISTS external_quiz_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  quiz_slug TEXT NOT NULL,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- Schüler*innenblog
CREATE TABLE IF NOT EXISTS blog_beitraege (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  titel        TEXT NOT NULL,
  autor        TEXT NOT NULL,
  klasse       TEXT NOT NULL,
  fach         TEXT NOT NULL,
  beschreibung TEXT,
  datei_url    TEXT,
  datei_typ    TEXT,
  genehmigt    INTEGER NOT NULL DEFAULT 0,
  datum        DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Quiz-Bestenliste (Stilmittel, Literaturwissenschaft, Rechtschreibung)
CREATE TABLE IF NOT EXISTS quiz_bestenliste (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  quiz    TEXT NOT NULL,
  modus   TEXT,
  name    TEXT NOT NULL,
  punkte  INTEGER NOT NULL,
  maximum INTEGER NOT NULL,
  prozent INTEGER NOT NULL,
  datum   DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_quiz_bl ON quiz_bestenliste(quiz, modus);

-- Sessions (eigener Store via better-sqlite3)
CREATE TABLE IF NOT EXISTS sessions (
  sid TEXT PRIMARY KEY,
  sess TEXT NOT NULL,
  expired DATETIME NOT NULL
);

-- Einladungslinks für Registrierung (nur mit gültigem Token möglich)
CREATE TABLE IF NOT EXISTS invite_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT UNIQUE NOT NULL,
  label TEXT,
  expires_at DATETIME NOT NULL,
  max_uses INTEGER DEFAULT 1,
  use_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
