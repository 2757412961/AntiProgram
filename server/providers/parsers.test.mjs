import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MASTER_DUEL_BANLIST_CHANGES_API_URL,
  parseMasterDuelBanlistHistory,
} from './masterDuelBanlistHistory.mjs';
import { parseMasterDuelMeta } from './masterDuelMeta.mjs';
import { parseYgoProDeckTournament } from './ygoprodeckTournament.mjs';
import { createMasterDuelBanlistHistoryService } from '../masterDuelBanlistHistoryService.mjs';

function banlistChange(cardId, cardName, from, to) {
  const change = { card: { _id: cardId, name: cardName } };
  if (from !== undefined) change.from = from;
  if (to !== undefined) change.to = to;
  return change;
}

function banlistRecord({
  id,
  effective = '2025-07-04T07:30:00.000Z',
  announced = '2025-06-20T06:00:00.000Z',
  changes,
  article,
}) {
  return {
    _id: id,
    date: effective,
    announced,
    changes,
    ...(article === undefined ? {} : { linkedArticle: article }),
  };
}

test('parseMasterDuelMeta parses power and popularity independently', () => {
  const html = `
    <a href="/tier-list/deck-types/Branded"><div class="label x">Branded</div></a><div class="power-label x">Power: <b>15.0</b></div>
    <a href="/tier-list/deck-types/Kewl%20Tune"><div class="label x">Kewl Tune</div></a><div class="power-label x">Power: <b>13.0</b></div>
    <a href="/tier-list/deck-types/Branded"><div class="label x">Branded</div></a><span class="popRank x">Popularity: <strong>10.77%</strong></span>
    <a href="/tier-list/deck-types/Kewl%20Tune"><div class="label x">Kewl Tune</div></a><span class="popRank x">Popularity: <strong>8.13%</strong></span>`;
  const result = parseMasterDuelMeta(html);
  assert.equal(result.rankings.power[0].name, 'Branded');
  assert.equal(result.rankings.power[0].tier, 1);
  assert.equal(result.rankings.popularity[1].value, 8.13);
});

test('parseYgoProDeckTournament parses event deck cards', () => {
  const card = (name, id, placement) => `<div class="p-2 deck_article-card-container"><div data-src="https://img/${id}.jpg"><span class="rounded-pill deck-type-badge text-center">Mogi Cup</span><a href="/deck/${name.toLowerCase()}-${id}" class="deck_article-card-title">${name}</a><div class="deck_article-card-stats"><i></i> ${placement} (~43 players) <i></i> 1 week ago piloted by Alice</div></div></div></div>`;
  const result = parseYgoProDeckTournament(`${card('Yummy', 1, 'Winner')}${card('Yummy', 2, 'Top 4')}`, 'ocg');
  assert.equal(result.decks.length, 2);
  assert.equal(result.rankings[0].name, 'Yummy');
  assert.equal(result.rankings[0].value, 2);
});

test('parseMasterDuelBanlistHistory merges multiple effective batches linked to one article', () => {
  const article = {
    _id: 'article-1',
    title: 'Master Duel: Forbidden / Limited List Update',
    url: '/news/june-20-2025/master-duel-forbidden-list-update/',
  };
  const result = parseMasterDuelBanlistHistory([
    banlistRecord({
      id: 'raw-main',
      article,
      effective: '2025-07-04T07:30:00.000Z',
      announced: '2025-06-20T06:00:00.000Z',
      changes: [banlistChange('card-1', 'Snake-Eye Oak', undefined, 'Forbidden')],
    }),
    banlistRecord({
      id: 'raw-unban',
      article,
      effective: '2025-06-24T07:30:00.000Z',
      announced: '2025-06-20T08:00:00.000Z',
      changes: [banlistChange('card-2', 'Time Seal', 'Forbidden', undefined)],
    }),
  ], '2025-06-20T09:00:00.000Z');

  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].id, 'article-1');
  assert.equal(result.records[0].batches.length, 2);
  assert.deepEqual(
    result.records[0].batches.map(batch => batch.effectiveDate),
    ['2025-07-04', '2025-06-24'],
  );
  assert.equal(
    result.records[0].sourceUrl,
    'https://www.masterduelmeta.com/articles/news/june-20-2025/master-duel-forbidden-list-update/',
  );
});

test('parseMasterDuelBanlistHistory preserves null and missing transition sides as null', () => {
  const result = parseMasterDuelBanlistHistory([
    banlistRecord({
      id: 'raw-null',
      changes: [
        banlistChange('card-1', 'Newly Forbidden', null, 'Forbidden'),
        banlistChange('card-2', 'No Longer Limited', 'Limited 1', undefined),
      ],
    }),
  ]);

  assert.equal(result.records[0].batches[0].changes[0].from, null);
  assert.equal(result.records[0].batches[0].changes[1].to, null);
  assert.equal(JSON.stringify(result).includes('Unlimited'), false);
});

test('parseMasterDuelBanlistHistory rejects a record with an illegal limitation status', () => {
  const valid = banlistRecord({
    id: 'raw-valid',
    changes: [banlistChange('card-1', 'Valid Card', null, 'Limited 1')],
  });
  const invalid = banlistRecord({
    id: 'raw-invalid',
    changes: [banlistChange('card-2', 'Invalid Card', 'Unlimited', 'Forbidden')],
  });

  const partial = parseMasterDuelBanlistHistory([invalid, valid]);
  assert.deepEqual(partial.records.map(record => record.id), ['raw-valid']);
  assert.match(partial.warnings[0], /不允许的禁限状态/);
  assert.throws(
    () => parseMasterDuelBanlistHistory([invalid]),
    /没有有效记录/,
  );
});

test('parseMasterDuelBanlistHistory excludes empty changes and fails closed when none remain', () => {
  const empty = banlistRecord({ id: 'raw-empty', changes: [] });
  const valid = banlistRecord({
    id: 'raw-valid',
    changes: [banlistChange('card-1', 'Valid Card', 'Limited 2', 'Limited 1')],
  });

  const partial = parseMasterDuelBanlistHistory([empty, valid]);
  assert.deepEqual(partial.records.map(record => record.id), ['raw-valid']);
  assert.match(partial.warnings[0], /changes 为空/);
  assert.throws(
    () => parseMasterDuelBanlistHistory([empty]),
    /没有有效记录/,
  );
});

test('parseMasterDuelBanlistHistory rejects duplicate card ids within one effective batch', () => {
  const duplicate = banlistRecord({
    id: 'raw-duplicate',
    changes: [
      banlistChange('card-1', 'Duplicate Card', null, 'Limited 1'),
      banlistChange('card-1', 'Duplicate Card', 'Limited 1', 'Forbidden'),
    ],
  });

  assert.throws(
    () => parseMasterDuelBanlistHistory([duplicate]),
    /重复 cardId/,
  );
});

test('parseMasterDuelBanlistHistory labels article-less records as third-party API mirror data', () => {
  const result = parseMasterDuelBanlistHistory([
    banlistRecord({
      id: 'api-only-record',
      article: null,
      effective: null,
      changes: [banlistChange('card-1', 'API Card', null, 'Limited 2')],
    }),
  ]);

  assert.deepEqual(result.source, {
    id: 'master-duel-meta',
    label: 'Master Duel Meta（第三方镜像）',
    sourceUrl: MASTER_DUEL_BANLIST_CHANGES_API_URL,
    kind: 'third-party-mirror',
  });
  assert.equal(result.records[0].sourceKind, 'api-only');
  assert.equal(result.records[0].sourceUrl, null);
  assert.equal(result.records[0].batches[0].effectiveDate, null);
});

test('master duel banlist history service caches for one TTL and cools down forced refreshes', async () => {
  let clock = 0;
  let loadCount = 0;
  const snapshot = parseMasterDuelBanlistHistory([
    banlistRecord({
      id: 'cached-record',
      changes: [banlistChange('card-1', 'Cached Card', null, 'Limited 1')],
    }),
  ]);
  const service = createMasterDuelBanlistHistoryService({
    load: async () => {
      loadCount += 1;
      return snapshot;
    },
    now: () => clock,
    cacheTtlMs: 100,
    forceRefreshCooldownMs: 50,
  });

  await service.get();
  await service.get();
  assert.equal(loadCount, 1);

  clock = 101;
  await service.get();
  assert.equal(loadCount, 2);

  await service.get({ force: true });
  assert.equal(loadCount, 3);
  const cooledDown = await service.get({ force: true });
  assert.equal(loadCount, 3);
  assert.match(cooledDown.warnings.at(-1), /冷却期/);
});
