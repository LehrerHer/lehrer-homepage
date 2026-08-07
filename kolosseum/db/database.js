const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || './db/kolosseum.db';
const resolvedPath = path.resolve(dbPath);

const dir = path.dirname(resolvedPath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(resolvedPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

// Migration: email-Spalte nachrüsten falls noch nicht vorhanden
const cols = db.prepare("PRAGMA table_info(students)").all().map(c => c.name);
if (!cols.includes('email')) {
  db.exec('ALTER TABLE students ADD COLUMN email TEXT');
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_students_email ON students(email) WHERE email IS NOT NULL');
}
if (!cols.includes('avatar_config')) {
  db.exec('ALTER TABLE students ADD COLUMN avatar_config TEXT');
}

// Migration: invite_tokens-Tabelle (wird durch schema.sql CREATE IF NOT EXISTS angelegt,
// aber der Index muss separat sichergestellt werden)
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_invite_tokens_token ON invite_tokens(token)');

// Migration: battle_log-Spalte für Kampf-Replay-Daten
const challengeCols = db.prepare('PRAGMA table_info(challenges)').all().map(c => c.name);
if (!challengeCols.includes('battle_log')) {
  db.exec('ALTER TABLE challenges ADD COLUMN battle_log TEXT');
}

// Migration: worksheet_completions
db.exec(`
  CREATE TABLE IF NOT EXISTS worksheet_completions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id   INTEGER NOT NULL,
    worksheet_id TEXT    NOT NULL,
    xp_earned    INTEGER NOT NULL DEFAULT 0,
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, worksheet_id),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
  )
`);

// Migration: Münzsystem
const studentCols = db.prepare('PRAGMA table_info(students)').all().map(c => c.name);
if (!studentCols.includes('coins')) {
  db.exec('ALTER TABLE students ADD COLUMN coins INTEGER DEFAULT 0');
}
if (!studentCols.includes('is_admin')) {
  db.exec('ALTER TABLE students ADD COLUMN is_admin INTEGER DEFAULT 0');
}

// Münz-Log und Shop-Inventar (per CREATE IF NOT EXISTS in schema.sql angelegt,
// aber hier nochmals abgesichert)
db.exec(`
  CREATE TABLE IF NOT EXISTS coins_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    amount     INTEGER NOT NULL,
    reason     TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS student_items (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id   INTEGER NOT NULL,
    item_id      TEXT    NOT NULL,
    equipped     INTEGER DEFAULT 0,
    purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, item_id),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
  );
`);

// Kroatien-Packliste: einfacher Key-Value-Speicher
db.exec(`
  CREATE TABLE IF NOT EXISTS kv_store (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Spur der Bohne: Lernfortschritt (Ampel-Einschätzung, Stationsstempel, Produktwahl)
db.exec(`
  CREATE TABLE IF NOT EXISTS sdb_progress (
    student_id INTEGER PRIMARY KEY,
    stempel    TEXT    NOT NULL DEFAULT '{}',
    ampel      TEXT    NOT NULL DEFAULT '{}',
    produkt    TEXT,
    updated_at TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
  )
`);

// Feedback-Notizen: Lernbegleiter diktiert Text über eine Lernzeit, Claude teilt ihn
// nach Lernpartner:in auf und ordnet jedem Abschnitt eine Kategorie zu (siehe CLAUDE.md-Briefing)
db.exec(`
  CREATE TABLE IF NOT EXISTS feedback_groups (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS feedback_students (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name  TEXT NOT NULL,
    group_id   INTEGER REFERENCES feedback_groups(id) ON DELETE SET NULL
  );
  CREATE TABLE IF NOT EXISTS feedback_raw_inputs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    full_text  TEXT NOT NULL,
    group_id   INTEGER REFERENCES feedback_groups(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS feedback_notes (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id   INTEGER NOT NULL REFERENCES feedback_students(id) ON DELETE CASCADE,
    group_id     INTEGER REFERENCES feedback_groups(id) ON DELETE SET NULL,
    date         TEXT NOT NULL,
    text         TEXT NOT NULL,
    raw_input_id INTEGER REFERENCES feedback_raw_inputs(id) ON DELETE SET NULL,
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_feedback_notes_student ON feedback_notes(student_id);
  CREATE INDEX IF NOT EXISTS idx_feedback_students_group ON feedback_students(group_id);
`);

// Migration: Kategorie pro Notiz-Abschnitt (Fachlich/Sozial/Verhalten/Verbindlichkeit)
const feedbackNotesCols = db.prepare('PRAGMA table_info(feedback_notes)').all().map(c => c.name);
if (!feedbackNotesCols.includes('category')) {
  db.exec('ALTER TABLE feedback_notes ADD COLUMN category TEXT');
}

// Feedback-Notizen: Abschnitte mit unklarer oder mehrdeutiger Namenszuordnung landen hier
// statt automatisch (und ggf. falsch) einer Person zugeordnet zu werden – Auflösung durch
// den Lernbegleiter über POST /api/feedback/pending/:id/resolve.
db.exec(`
  CREATE TABLE IF NOT EXISTS feedback_pending_notes (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id              INTEGER REFERENCES feedback_groups(id) ON DELETE CASCADE,
    date                  TEXT NOT NULL,
    text                  TEXT NOT NULL,
    category              TEXT,
    mentioned_name        TEXT,
    candidate_student_ids TEXT NOT NULL DEFAULT '[]',
    raw_input_id          INTEGER REFERENCES feedback_raw_inputs(id) ON DELETE SET NULL,
    created_at            TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_feedback_pending_group ON feedback_pending_notes(group_id);
`);

// Geo Abijahrgang 2002: Kontaktliste fürs Klassentreffen – kein Login,
// Zugriff nur über Geheimlink + Shared-Secret-Header (siehe routes/geo-abi2002.js)
db.exec(`
  CREATE TABLE IF NOT EXISTS geo_abi2002 (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    vorname       TEXT NOT NULL,
    nachname      TEXT NOT NULL DEFAULT '',
    maedchenname  TEXT NOT NULL DEFAULT '',
    strasse       TEXT NOT NULL DEFAULT '',
    plz           TEXT NOT NULL DEFAULT '',
    wohnort       TEXT NOT NULL DEFAULT '',
    telefonnummer TEXT NOT NULL DEFAULT '',
    email         TEXT NOT NULL DEFAULT '',
    gruppe        TEXT NOT NULL DEFAULT 'mitglied',
    updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Migration: Mädchenname-Spalte nachrüsten + Vorwahl in Telefonnummer zusammenführen
// (betrifft die bereits live geseedete Tabelle aus der ersten Version dieser Seite)
const geoAbiCols = db.prepare('PRAGMA table_info(geo_abi2002)').all().map(c => c.name);
if (!geoAbiCols.includes('maedchenname')) {
  db.exec("ALTER TABLE geo_abi2002 ADD COLUMN maedchenname TEXT NOT NULL DEFAULT ''");
}
if (!geoAbiCols.includes('gruppe')) {
  db.exec("ALTER TABLE geo_abi2002 ADD COLUMN gruppe TEXT NOT NULL DEFAULT 'mitglied'");
}
if (geoAbiCols.includes('vorwahl')) {
  const zeilenMitVorwahl = db.prepare("SELECT id, vorwahl, telefonnummer FROM geo_abi2002 WHERE vorwahl != ''").all();
  const updateTel = db.prepare('UPDATE geo_abi2002 SET telefonnummer = ? WHERE id = ?');
  zeilenMitVorwahl.forEach((z) => {
    updateTel.run([z.vorwahl, z.telefonnummer].filter(Boolean).join(' ').trim(), z.id);
  });
  try {
    db.exec('ALTER TABLE geo_abi2002 DROP COLUMN vorwahl');
  } catch (e) {
    console.error('Konnte vorwahl-Spalte nicht entfernen (ältere SQLite-Version?):', e);
  }
}

if (db.prepare('SELECT COUNT(*) AS n FROM geo_abi2002').get().n === 0) {
  const geoAbiStartliste = [
    'Nina', 'Yvonne', 'Anna', 'Angela', 'Geeske', 'Helle', 'Vanessa', 'Julian',
    'Wiebke', 'Alexander', 'Robert', 'Anna-Carina', 'Katja', 'Thomas', 'Gesche',
    'Matthias', 'Niklas', 'Anne-Catharine', 'Ann-Kathrien', 'Daniel', 'Adrian',
    'Meike', 'Jan Thomas', 'Sonja', 'Jenny', 'Christoph', 'Anja', 'Anna-Lea',
    'Christiane',
    { vorname: 'Imke', nachname: 'zur Lage', strasse: 'Carl-von-Ossietzky Str.', plz: '49082', wohnort: 'Osnabrück', telefonnummer: '0176 24725996', email: 'imkezurlage@gmail.com' },
    'Janna', 'Janina', 'Pascal', 'Lena', 'Christina', 'Cornelia', 'Jule-Fee',
    'Jeremy', 'Nikola', 'Verena', 'Bea', 'Verena', 'Alexandra', 'Jens', 'Rene',
    'Kirsten', 'Kristina', 'Stefan', 'Linus', 'Jona', 'Mathias', 'Michiko',
    'Jan', 'Ayla', 'Sebastian',
  ];
  const insertGeoAbiZeile = db.prepare(
    `INSERT INTO geo_abi2002 (vorname, nachname, maedchenname, strasse, plz, wohnort, telefonnummer, email)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const geoAbiSeed = db.transaction((eintraege) => {
    eintraege.forEach((e) => {
      if (typeof e === 'string') {
        insertGeoAbiZeile.run(e, '', '', '', '', '', '', '');
      } else {
        insertGeoAbiZeile.run(e.vorname, e.nachname || '', e.maedchenname || '', e.strasse || '', e.plz || '', e.wohnort || '', e.telefonnummer || '', e.email || '');
      }
    });
  });
  geoAbiSeed(geoAbiStartliste);
}

// "Assoziierte": ehemalige Jahrgangsmitglieder, die die Schule gewechselt oder sich für
// etwas Vernünftiges statt Abi entschieden haben – 10 freie Plätze zum Selbst-Eintragen.
if (db.prepare("SELECT COUNT(*) AS n FROM geo_abi2002 WHERE gruppe = 'assoziiert'").get().n === 0) {
  const insertAssoziiert = db.prepare("INSERT INTO geo_abi2002 (vorname, gruppe) VALUES ('', 'assoziiert')");
  const assoziierteSeed = db.transaction(() => {
    for (let i = 0; i < 10; i++) insertAssoziiert.run();
  });
  assoziierteSeed();
}

// Session-Store für express-session auf Basis von better-sqlite3
class SQLiteSessionStore {
  constructor(session) {
    this.Store = session.Store;
    Object.setPrototypeOf(SQLiteSessionStore.prototype, this.Store.prototype);

    setInterval(() => {
      db.prepare('DELETE FROM sessions WHERE expired < ?').run(new Date().toISOString());
    }, 3_600_000).unref();
  }

  get(sid, cb) {
    const row = db.prepare(
      'SELECT sess FROM sessions WHERE sid = ? AND expired > ?'
    ).get(sid, new Date().toISOString());
    if (!row) return cb(null, null);
    try { cb(null, JSON.parse(row.sess)); } catch (e) { cb(e); }
  }

  set(sid, sess, cb) {
    const expires = sess.cookie?.expires
      ? new Date(sess.cookie.expires).toISOString()
      : new Date(Date.now() + 86_400_000).toISOString();
    db.prepare(
      'INSERT OR REPLACE INTO sessions (sid, sess, expired) VALUES (?, ?, ?)'
    ).run(sid, JSON.stringify(sess), expires);
    cb(null);
  }

  destroy(sid, cb) {
    db.prepare('DELETE FROM sessions WHERE sid = ?').run(sid);
    cb(null);
  }

  touch(sid, sess, cb) {
    this.set(sid, sess, cb);
  }
}

module.exports = { db, SQLiteSessionStore };
