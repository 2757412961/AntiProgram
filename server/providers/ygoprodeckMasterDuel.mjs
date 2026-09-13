import { fetchText } from '../lib/http.mjs';

export const YGOPRODECK_MASTER_DUEL_URL = 'https://ygoprodeck.com/master-duel/';
export const YGOPRODECK_MASTER_DUEL_TIER_API_URL =
  'https://ygoprodeck.com/api/master-duel/tier-list.php?tier=RANK';

function requireFinite(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`YGOPRODeck Master Duel 字段 ${field} 无效`);
  return number;
}

export function parseYgoProDeckMasterDuel(payload, fetchedAt = new Date().toISOString()) {
  if (!Array.isArray(payload)) throw new Error('YGOPRODeck Master Duel 响应不是数组');

  const rankings = payload.map((entry, index) => {
    const name = String(entry?.archetype_name || '').trim();
    const cardId = Number(entry?.id);
    if (!name || !Number.isInteger(cardId) || cardId <= 0) {
      throw new Error(`YGOPRODeck Master Duel 第 ${index + 1} 条记录缺少系列名或封面卡 ID`);
    }
    const tier = requireFinite(entry.tier, 'tier');
    const season = requireFinite(entry.season, 'season');
    const winRate = requireFinite(entry.win_ratio, 'win_ratio') * 100;
    const duelCount = requireFinite(entry.duel_count, 'duel_count');
    const score = requireFinite(entry.rank_weighted_score, 'rank_weighted_score');
    return {
      id: `ygoprodeck-md-rank-${season}-${encodeURIComponent(name.toLowerCase())}`,
      name,
      format: 'master-duel',
      source: 'ygoprodeck-master-duel',
      metric: 'weighted-score',
      value: score,
      unit: 'score',
      score,
      rank: index + 1,
      tier,
      season,
      winRate,
      wins: requireFinite(entry.win_count, 'win_count'),
      losses: requireFinite(entry.loss_count, 'loss_count'),
      duelCount,
      imageUrl: `https://images.ygoprodeck.com/images/cards_cropped/${cardId}.jpg`,
      detailUrl: `${YGOPRODECK_MASTER_DUEL_URL}tier/RANK/${season}/${encodeURIComponent(name)}/`,
    };
  });

  rankings.sort((a, b) => b.score - a.score || b.winRate - a.winRate || a.name.localeCompare(b.name));
  rankings.forEach((item, index) => { item.rank = index + 1; });
  if (rankings.length < 2) {
    throw new Error(`YGOPRODeck Master Duel 数据校验失败（解析到 ${rankings.length} 个系列）`);
  }
  return { fetchedAt, rankings };
}

export const ygoprodeckMasterDuelProvider = {
  id: 'ygoprodeck-master-duel',
  label: 'YGOPRODeck Master Duel 排位统计',
  format: 'master-duel',
  sourceUrl: YGOPRODECK_MASTER_DUEL_URL,
  methods: ['weighted-score', 'win-rate'],
  methodology: {
    'weighted-score': 'YGOPRODeck Companion 当前赛季钻石及以上、至少 10 场对局的系列加权分',
    'win-rate': 'YGOPRODeck Companion 当前赛季样本中的胜局占比与对局数',
  },
  refreshIntervalMs: 6 * 60 * 60 * 1000,
  async load() {
    const fetchedAt = new Date().toISOString();
    const { body } = await fetchText(YGOPRODECK_MASTER_DUEL_TIER_API_URL, {
      headers: {
        accept: 'application/json',
        referer: YGOPRODECK_MASTER_DUEL_URL,
      },
    });
    let payload;
    try {
      payload = JSON.parse(body);
    } catch {
      throw new Error('YGOPRODeck Master Duel 返回的不是有效 JSON');
    }
    return parseYgoProDeckMasterDuel(payload, fetchedAt);
  },
};
