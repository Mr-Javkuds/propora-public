import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export function openDatabase(filename) {
  if (filename !== ':memory:') mkdirSync(path.dirname(filename), { recursive: true });
  const database = new DatabaseSync(filename);
  database.exec(`
    PRAGMA busy_timeout=5000;
    PRAGMA journal_mode=WAL;
    PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY,value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,role TEXT NOT NULL CHECK(role IN ('pencari','pemilik')),password_hash TEXT NOT NULL,salt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS listings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,owner_id TEXT REFERENCES users(id),name TEXT NOT NULL,address TEXT NOT NULL,
      price INTEGER NOT NULL CHECK(price>0),latitude REAL NOT NULL,longitude REAL NOT NULL,area REAL NOT NULL CHECK(area>0),
      image TEXT NOT NULL,facilities TEXT NOT NULL DEFAULT '[]',description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL CHECK(status IN ('draft','available','reserved','rented')),demo_json TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS listing_analyses (
      listing_id INTEGER PRIMARY KEY REFERENCES listings(id),model_version TEXT NOT NULL,input_fingerprint TEXT NOT NULL,
      analyzed_at TEXT NOT NULL,result_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS favorites (user_id TEXT NOT NULL REFERENCES users(id),listing_id INTEGER NOT NULL REFERENCES listings(id),PRIMARY KEY(user_id,listing_id));
    CREATE TABLE IF NOT EXISTS wizard_drafts (user_id TEXT PRIMARY KEY REFERENCES users(id),data TEXT NOT NULL,updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS surveys (
      id TEXT PRIMARY KEY,listing_id INTEGER NOT NULL REFERENCES listings(id),seeker_id TEXT NOT NULL REFERENCES users(id),
      date TEXT NOT NULL,time TEXT NOT NULL,visitors INTEGER NOT NULL CHECK(visitors BETWEEN 1 AND 20),note TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending','confirmed','rejected','cancelled')),owner_note TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL,updated_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS one_pending_survey ON surveys(listing_id,seeker_id) WHERE status='pending';
    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,listing_id INTEGER NOT NULL REFERENCES listings(id),seeker_id TEXT NOT NULL REFERENCES users(id),tenant_json TEXT NOT NULL,
      start_date TEXT NOT NULL,duration INTEGER NOT NULL CHECK(duration BETWEEN 1 AND 10),offer INTEGER NOT NULL CHECK(offer>0),proposal TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending','approved','rejected','withdrawn')),owner_note TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL,updated_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS one_open_application ON applications(listing_id,seeker_id) WHERE status IN ('pending','approved');
    CREATE UNIQUE INDEX IF NOT EXISTS one_approved_application ON applications(listing_id) WHERE status='approved';
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,listing_id INTEGER NOT NULL REFERENCES listings(id),seeker_id TEXT NOT NULL REFERENCES users(id),
      sender_id TEXT NOT NULL REFERENCES users(id),text TEXT NOT NULL,created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS messages_thread ON messages(listing_id,seeker_id,id);
  `);
  database.prepare("INSERT OR IGNORE INTO app_meta VALUES ('data_revision',?)").run(randomUUID());
  return database;
}

export function storeAnalysis(database, listingId, analysis) {
  database.prepare(`INSERT INTO listing_analyses VALUES (?,?,?,?,?) ON CONFLICT(listing_id) DO UPDATE SET
    model_version=excluded.model_version,input_fingerprint=excluded.input_fingerprint,analyzed_at=excluded.analyzed_at,result_json=excluded.result_json`)
    .run(listingId, analysis.modelVersion, analysis.inputFingerprint, analysis.analyzedAt, JSON.stringify(analysis));
}
