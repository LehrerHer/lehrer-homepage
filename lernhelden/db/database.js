const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'lernhelden.db');
let db;

function getDB() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function initDB() {
  const database = getDB();
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  database.exec(schema);
  return database;
}

module.exports = { getDB, initDB };
