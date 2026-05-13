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
