-- Deterministic local-only fixtures. These rows are deliberately fictional and
-- must never be imported into the production D1 database.
PRAGMA foreign_keys = ON;

INSERT INTO card_catalog_versions (
  version, status, source_hash, effective_date, card_count, localized_count,
  created_at, validated_at, activated_at, error
) VALUES (
  'local-seed-v1', 'active', 'local-fixture-only', '2026-01-01', 3, 3,
  '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z',
  '2026-01-01T00:00:00.000Z', NULL
) ON CONFLICT(version) DO UPDATE SET
  status = excluded.status,
  card_count = excluded.card_count,
  localized_count = excluded.localized_count,
  validated_at = excluded.validated_at,
  activated_at = excluded.activated_at,
  error = NULL;

DELETE FROM cards WHERE version = 'local-seed-v1';

INSERT INTO cards (
  version, id, image_id, name, normalized_name, en_name, jp_name,
  description, archetype, card_type, subtype, attribute, race, level,
  atk, def, md_available, md_rarity, md_ban_status, ocg_ban_status,
  tcg_ban_status, source, localization_ids_json
) VALUES
  (
    'local-seed-v1', 90000001, 90000001, '本地测试怪兽', '本地测试怪兽',
    'Local Test Monster', NULL, '仅用于本地分页、筛选与搜索测试。',
    '本地测试', 'monster', '【效果怪兽】', 'LIGHT', '测试族', 4,
    1800, 1200, 1, 'SR', 'Unlimited', 'Unlimited', 'Unlimited',
    'LOCAL_DB', '[]'
  ),
  (
    'local-seed-v1', 90000002, 90000002, '本地测试魔法', '本地测试魔法',
    'Local Test Spell', NULL, '仅用于本地分页、筛选与搜索测试。',
    '本地测试', 'spell', '【通常魔法】', NULL, NULL, NULL,
    NULL, NULL, 1, 'R', 'Limited', 'Unlimited', 'Unlimited',
    'LOCAL_DB', '[]'
  ),
  (
    'local-seed-v1', 90000003, 90000003, '本地测试陷阱', '本地测试陷阱',
    'Local Test Trap', NULL, '仅用于本地分页、筛选与搜索测试。',
    '本地测试', 'trap', '【通常陷阱】', NULL, NULL, NULL,
    NULL, NULL, 1, 'N', 'Unlimited', 'Limited', 'Unlimited',
    'LOCAL_DB', '[]'
  );

UPDATE card_catalog_state SET
  active_version = 'local-seed-v1',
  refreshing = 0,
  last_attempt_at = '2026-01-01T00:00:00.000Z',
  last_success_at = '2026-01-01T00:00:00.000Z',
  last_error = NULL
WHERE catalog = 'main';
