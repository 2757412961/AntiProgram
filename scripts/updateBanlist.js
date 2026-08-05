// scripts/updateBanlist.js
// Fetch banlist JSON from community source and store into SQLite DB
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const Database = require('better-sqlite3');

// URL can be overridden by env var
const BANLIST_URL = process.env.BANLIST_JSON_URL || 'https://raw.githubusercontent.com/username/banlist/master/banlist.json';
// DB file location
const DB_PATH = path.resolve(__dirname, '../src/data/banlist.db');

async function main() {
  console.log('Fetching banlist from', BANLIST_URL);
  const resp = await fetch(BANLIST_URL);
  if (!resp.ok) throw new Error('Failed to fetch banlist: ' + resp.status);
  const data = await resp.json();
  // Expected format: { tcg: [...], ocg: [...], masterDuel: [...] }
  const { tcg = [], ocg = [], masterDuel = [] } = data;

  // Normalize to array of records { cardId, masterDuel, ocg, tcg }
  const records = [];
  const ids = new Set();
  [...tcg, ...ocg, ...masterDuel].forEach(card => ids.add(card.id));
  ids.forEach(id => {
    const md = masterDuel.find(c => c.id === id);
    const oc = ocg.find(c => c.id === id);
    const tg = tcg.find(c => c.id === id);
    records.push({
      cardId: id,
      masterDuel: md ? md.status : 'Unlimited',
      ocg: oc ? oc.status : 'Unlimited',
      tcg: tg ? tg.status : 'Unlimited'
    });
  });

  // Ensure data directory exists
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const db = new Database(DB_PATH);
  db.exec(`CREATE TABLE IF NOT EXISTS banlist (
    card_id INTEGER PRIMARY KEY,
    master_duel TEXT,
    ocg TEXT,
    tcg TEXT
  );`);
  const insert = db.prepare(`INSERT OR REPLACE INTO banlist (card_id, master_duel, ocg, tcg) VALUES (?, ?, ?, ?);`);
  const insertMany = db.transaction((rows) => {
    for (const r of rows) insert.run(r.cardId, r.masterDuel, r.ocg, r.tcg);
  });
  insertMany(records);

  // metadata table for last fetch timestamp
  db.exec(`CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT);`);
  const upMeta = db.prepare(`INSERT OR REPLACE INTO metadata (key, value) VALUES ('lastFetched', ?);`);
  upMeta.run(new Date().toISOString());

  db.close();
  console.log('Banlist updated, records:', records.length);
}

main().catch(err => {
  console.error('Error updating banlist:', err);
  process.exit(1);
});
