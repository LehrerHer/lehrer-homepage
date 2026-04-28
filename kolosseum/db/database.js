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
