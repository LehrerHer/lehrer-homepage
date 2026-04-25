-- Schüler (nur Spitzname in Haupttabelle)
CREATE TABLE IF NOT EXISTS students (
  id        BIGSERIAL PRIMARY KEY,
  nick      TEXT UNIQUE NOT NULL,
  pin_hash  TEXT NOT NULL,
  xp        INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ DEFAULT NOW()
);

-- Klarname-Zuordnung (nur im Admin sichtbar)
CREATE TABLE IF NOT EXISTS student_names (
  student_id BIGINT PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  real_name  TEXT NOT NULL DEFAULT '',
  class      TEXT,
  note       TEXT
);

-- Badge-Vergaben
CREATE TABLE IF NOT EXISTS student_badges (
  student_id BIGINT REFERENCES students(id) ON DELETE CASCADE,
  badge_id   TEXT NOT NULL,
  earned_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (student_id, badge_id)
);

-- XP-Log
CREATE TABLE IF NOT EXISTS xp_log (
  id         BIGSERIAL PRIMARY KEY,
  student_id BIGINT REFERENCES students(id) ON DELETE CASCADE,
  amount     INTEGER NOT NULL,
  reason     TEXT,
  quiz_id    BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Streak-Tracking
CREATE TABLE IF NOT EXISTS streaks (
  student_id      BIGINT PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  current_streak  INTEGER DEFAULT 1,
  last_active_date DATE NOT NULL,
  longest_streak  INTEGER DEFAULT 1
);

-- Quizzes & Arbeitsblätter (type: 'quiz' | 'arbeitsblatt')
CREATE TABLE IF NOT EXISTS quizzes (
  id          BIGSERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  subject     TEXT,
  type        TEXT DEFAULT 'quiz',
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Fragen
CREATE TABLE IF NOT EXISTS questions (
  id            BIGSERIAL PRIMARY KEY,
  quiz_id       BIGINT REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  options       TEXT NOT NULL,
  correct_index INTEGER NOT NULL DEFAULT 0,
  xp_value      INTEGER DEFAULT 15
);

-- Quiz-Ergebnisse
CREATE TABLE IF NOT EXISTS quiz_results (
  id             BIGSERIAL PRIMARY KEY,
  student_id     BIGINT REFERENCES students(id) ON DELETE CASCADE,
  quiz_id        BIGINT REFERENCES quizzes(id) ON DELETE CASCADE,
  score          INTEGER NOT NULL,
  total          INTEGER NOT NULL,
  xp_earned      INTEGER DEFAULT 0,
  attempt_number INTEGER DEFAULT 1,
  completed_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Materialien für die Homepage
CREATE TABLE IF NOT EXISTS materials (
  id           BIGSERIAL PRIMARY KEY,
  titel        TEXT NOT NULL,
  beschreibung TEXT DEFAULT '',
  icon         TEXT DEFAULT '📄',
  url          TEXT,
  seite        TEXT DEFAULT 'allgemein',
  datum        DATE DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Vorbereitung für zukünftige Wettkämpfe
CREATE TABLE IF NOT EXISTS challenges (
  id             BIGSERIAL PRIMARY KEY,
  challenger_id  BIGINT REFERENCES students(id) ON DELETE CASCADE,
  opponent_id    BIGINT REFERENCES students(id) ON DELETE CASCADE,
  quiz_id        BIGINT REFERENCES quizzes(id),
  status         TEXT DEFAULT 'pending',
  winner_id      BIGINT REFERENCES students(id),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
