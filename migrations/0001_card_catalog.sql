PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS card_catalog_versions (
  version TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('building', 'ready', 'active', 'failed')),
  source_hash TEXT,
  effective_date TEXT,
  card_count INTEGER NOT NULL DEFAULT 0,
  localized_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  validated_at TEXT,
  activated_at TEXT,
  error TEXT
);

CREATE TABLE IF NOT EXISTS card_catalog_state (
  catalog TEXT PRIMARY KEY,
  active_version TEXT,
  refreshing INTEGER NOT NULL DEFAULT 0 CHECK (refreshing IN (0, 1)),
  last_attempt_at TEXT,
  last_success_at TEXT,
  last_error TEXT,
  FOREIGN KEY (active_version) REFERENCES card_catalog_versions(version)
);

CREATE TABLE IF NOT EXISTS cards (
  row_pk INTEGER PRIMARY KEY AUTOINCREMENT,
  version TEXT NOT NULL,
  id INTEGER NOT NULL,
  konami_id INTEGER,
  image_id INTEGER,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  en_name TEXT,
  jp_name TEXT,
  description TEXT NOT NULL DEFAULT '',
  archetype TEXT,
  card_type TEXT NOT NULL CHECK (card_type IN ('monster', 'spell', 'trap')),
  subtype TEXT,
  attribute TEXT,
  race TEXT,
  level INTEGER,
  atk INTEGER,
  def INTEGER,
  md_available INTEGER NOT NULL DEFAULT 0 CHECK (md_available IN (0, 1)),
  md_rarity TEXT CHECK (md_rarity IS NULL OR md_rarity IN ('N', 'R', 'SR', 'UR')),
  md_ban_status TEXT NOT NULL DEFAULT 'Unlimited',
  ocg_ban_status TEXT NOT NULL DEFAULT 'Unlimited',
  tcg_ban_status TEXT NOT NULL DEFAULT 'Unlimited',
  source TEXT NOT NULL,
  localization_ids_json TEXT,
  UNIQUE (version, id),
  FOREIGN KEY (version) REFERENCES card_catalog_versions(version) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cards_version_type ON cards(version, card_type);
CREATE INDEX IF NOT EXISTS idx_cards_version_attribute ON cards(version, attribute);
CREATE INDEX IF NOT EXISTS idx_cards_version_level ON cards(version, level);
CREATE INDEX IF NOT EXISTS idx_cards_version_race ON cards(version, race);
CREATE INDEX IF NOT EXISTS idx_cards_version_md_available ON cards(version, md_available);
CREATE INDEX IF NOT EXISTS idx_cards_version_md_ban ON cards(version, md_ban_status);
CREATE INDEX IF NOT EXISTS idx_cards_version_ocg_ban ON cards(version, ocg_ban_status);
CREATE INDEX IF NOT EXISTS idx_cards_version_tcg_ban ON cards(version, tcg_ban_status);
CREATE INDEX IF NOT EXISTS idx_cards_version_rarity ON cards(version, md_rarity);
CREATE INDEX IF NOT EXISTS idx_cards_version_name ON cards(version, normalized_name);

CREATE VIRTUAL TABLE IF NOT EXISTS cards_fts USING fts5(
  version UNINDEXED,
  name,
  en_name,
  jp_name,
  archetype,
  description,
  content='cards',
  content_rowid='row_pk',
  tokenize='trigram'
);

CREATE TRIGGER IF NOT EXISTS cards_fts_after_insert
AFTER INSERT ON cards BEGIN
  INSERT INTO cards_fts(
    rowid, version, name, en_name, jp_name, archetype, description
  ) VALUES (
    new.row_pk, new.version, new.name, new.en_name, new.jp_name,
    new.archetype, new.description
  );
END;

CREATE TRIGGER IF NOT EXISTS cards_fts_after_delete
AFTER DELETE ON cards BEGIN
  INSERT INTO cards_fts(
    cards_fts, rowid, version, name, en_name, jp_name, archetype, description
  ) VALUES (
    'delete', old.row_pk, old.version, old.name, old.en_name, old.jp_name,
    old.archetype, old.description
  );
END;

CREATE TRIGGER IF NOT EXISTS cards_fts_after_update
AFTER UPDATE ON cards BEGIN
  INSERT INTO cards_fts(
    cards_fts, rowid, version, name, en_name, jp_name, archetype, description
  ) VALUES (
    'delete', old.row_pk, old.version, old.name, old.en_name, old.jp_name,
    old.archetype, old.description
  );
  INSERT INTO cards_fts(
    rowid, version, name, en_name, jp_name, archetype, description
  ) VALUES (
    new.row_pk, new.version, new.name, new.en_name, new.jp_name,
    new.archetype, new.description
  );
END;

CREATE TABLE IF NOT EXISTS card_catalog_sync_runs (
  id TEXT PRIMARY KEY,
  trigger_kind TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed', 'skipped')),
  candidate_version TEXT,
  source_hash TEXT,
  fetched_count INTEGER NOT NULL DEFAULT 0,
  localized_count INTEGER NOT NULL DEFAULT 0,
  written_count INTEGER NOT NULL DEFAULT 0,
  message TEXT,
  started_at TEXT NOT NULL,
  finished_at TEXT
);

INSERT OR IGNORE INTO card_catalog_state (
  catalog, active_version, refreshing, last_attempt_at, last_success_at, last_error
) VALUES ('main', NULL, 0, NULL, NULL, NULL);
