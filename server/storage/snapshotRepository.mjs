import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

class MemorySnapshotRepository {
  mode = 'memory';
  snapshots = new Map();

  async load(providerId) {
    return this.snapshots.get(providerId) || null;
  }

  async save(providerId, payload) {
    this.snapshots.set(providerId, payload);
  }
}

class SqliteSnapshotRepository {
  mode = 'sqlite';

  constructor(database, filePath) {
    this.database = database;
    this.filePath = filePath;
    database.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS deck_source_snapshots (
        provider_id TEXT PRIMARY KEY,
        fetched_at TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS deck_source_sync_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        provider_id TEXT NOT NULL,
        status TEXT NOT NULL,
        message TEXT,
        started_at TEXT NOT NULL,
        finished_at TEXT NOT NULL
      );
    `);
    this.selectStatement = database.prepare(
      'SELECT payload_json FROM deck_source_snapshots WHERE provider_id = ?'
    );
    this.upsertStatement = database.prepare(`
      INSERT INTO deck_source_snapshots (provider_id, fetched_at, payload_json, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(provider_id) DO UPDATE SET
        fetched_at = excluded.fetched_at,
        payload_json = excluded.payload_json,
        updated_at = excluded.updated_at
    `);
    this.syncStatement = database.prepare(`
      INSERT INTO deck_source_sync_runs
        (provider_id, status, message, started_at, finished_at)
      VALUES (?, ?, ?, ?, ?)
    `);
  }

  async load(providerId) {
    const row = this.selectStatement.get(providerId);
    if (!row?.payload_json) return null;
    try {
      return JSON.parse(row.payload_json);
    } catch {
      return null;
    }
  }

  async save(providerId, payload) {
    const now = new Date().toISOString();
    this.upsertStatement.run(providerId, payload.fetchedAt || now, JSON.stringify(payload), now);
  }

  async recordRun(providerId, status, message, startedAt, finishedAt) {
    this.syncStatement.run(providerId, status, message || null, startedAt, finishedAt);
  }
}

export async function createSnapshotRepository() {
  const mode = (process.env.DECK_PLAZA_STORAGE || 'memory').toLowerCase();
  if (mode !== 'sqlite') return new MemorySnapshotRepository();

  let sqlite;
  try {
    sqlite = await import('node:sqlite');
  } catch {
    throw new Error('DECK_PLAZA_STORAGE=sqlite 需要支持 node:sqlite 的 Node.js 版本（建议 Node 22.13+）');
  }
  const filePath = resolve(process.env.DECK_PLAZA_SQLITE_PATH || 'data/deck-plaza.sqlite');
  mkdirSync(dirname(filePath), { recursive: true });
  const database = new sqlite.DatabaseSync(filePath);
  return new SqliteSnapshotRepository(database, filePath);
}
