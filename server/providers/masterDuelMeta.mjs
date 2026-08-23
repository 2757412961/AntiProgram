import { decodeHtml } from '../lib/html.mjs';
import { fetchText } from '../lib/http.mjs';

export const MASTER_DUEL_META_URL = 'https://www.masterduelmeta.com/tier-list';
const ALLOW_REMOTE_IMAGES = typeof process !== 'undefined'
  && process.env?.DECK_PLAZA_ALLOW_REMOTE_IMAGES === '1';

const POWER_PATTERN = /<a[^>]+href="\/tier-list\/deck-types\/([^"#?]+)"[\s\S]*?<div class="label[^>]*>([^<]+)<\/div>\s*<\/a>[\s\S]{0,800}?<div class="power-label[^>]*>\s*Power:\s*<b>([\d.]+)<\/b>/gi;
const POPULARITY_PATTERN = /<a[^>]+href="\/tier-list\/deck-types\/([^"#?]+)"[\s\S]*?<div class="label[^>]*>([^<]+)<\/div>\s*<\/a>[\s\S]{0,800}?<span class="popRank[^>]*>\s*Popularity:\s*<strong>([\d.]+)%<\/strong>/gi;

function inferTier(power) {
  if (power >= 12) return 1;
  if (power >= 7) return 2;
  if (power >= 3) return 3;
  return 4;
}

function createDeckReference(encodedName, rawName) {
  const name = decodeHtml(rawName).trim();
  return {
    name,
    detailUrl: new URL(`/tier-list/deck-types/${encodedName}`, MASTER_DUEL_META_URL).toString(),
    imageUrl: ALLOW_REMOTE_IMAGES
      ? `https://imgserv.duellinksmeta.com/v2/mdm/deck-type/${encodeURIComponent(name)}?portrait=true&width=420`
      : undefined,
  };
}

export function parseMasterDuelMeta(html, fetchedAt = new Date().toISOString()) {
  const powerItems = [];
  const popularityItems = [];

  for (const match of html.matchAll(POWER_PATTERN)) {
    const link = createDeckReference(match[1], match[2]);
    const value = Number(match[3]);
    powerItems.push({
      id: `mdm-power-${slugify(link.name)}`,
      name: link.name,
      format: 'master-duel',
      source: 'master-duel-meta',
      metric: 'power',
      value,
      unit: 'power',
      tier: inferTier(value),
      imageUrl: link.imageUrl,
      detailUrl: link.detailUrl,
    });
  }

  for (const match of html.matchAll(POPULARITY_PATTERN)) {
    const link = createDeckReference(match[1], match[2]);
    popularityItems.push({
      id: `mdm-popularity-${slugify(link.name)}`,
      name: link.name,
      format: 'master-duel',
      source: 'master-duel-meta',
      metric: 'popularity',
      value: Number(match[3]),
      unit: 'percent',
      imageUrl: link.imageUrl,
      detailUrl: link.detailUrl,
    });
  }

  powerItems.sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
  popularityItems.sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
  powerItems.forEach((item, index) => { item.rank = index + 1; });
  popularityItems.forEach((item, index) => { item.rank = index + 1; });

  if (powerItems.length < 2 || popularityItems.length < 2) {
    throw new Error(`Master Duel Meta 页面结构校验失败（强度 ${powerItems.length}，热度 ${popularityItems.length}）`);
  }

  return {
    fetchedAt,
    rankings: {
      power: powerItems,
      popularity: popularityItems,
    },
  };
}

function slugify(value) {
  return encodeURIComponent(value.toLowerCase().replace(/\s+/g, '-'));
}

export const masterDuelMetaProvider = {
  id: 'master-duel-meta',
  label: 'Master Duel Meta',
  format: 'master-duel',
  sourceUrl: MASTER_DUEL_META_URL,
  methods: ['power', 'popularity'],
  methodology: {
    power: '最近 100 副社区赛事上位卡组计算的 Power 排名',
    popularity: '最近两周收录卡组中的卡组类型占比（排除自定义赛制活动）',
  },
  refreshIntervalMs: 20 * 60 * 1000,
  async load() {
    const fetchedAt = new Date().toISOString();
    const { body } = await fetchText(MASTER_DUEL_META_URL);
    return parseMasterDuelMeta(body, fetchedAt);
  },
};
