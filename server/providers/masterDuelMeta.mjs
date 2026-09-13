import { decodeHtml } from '../lib/html.mjs';
import { fetchText } from '../lib/http.mjs';

export const MASTER_DUEL_META_URL = 'https://www.masterduelmeta.com/tier-list';

const POWER_PATTERN = /<a[^>]+href="\/tier-list\/(deck-types|engines)\/([^"#?]+)"[^>]*>([\s\S]*?)<div class="label[^>]*>([^<]+)<\/div>\s*<\/a>[\s\S]{0,800}?<div class="power-label[^>]*>\s*Power:\s*<b>([\d.]+)<\/b>/gi;
const POPULARITY_PATTERN = /<a[^>]+href="\/tier-list\/(deck-types)\/([^"#?]+)"[^>]*>([\s\S]*?)<div class="label[^>]*>([^<]+)<\/div>\s*<\/a>(?:(?!href="\/tier-list\/|class="power-label)[\s\S]){0,800}?<span class="popRank[^>]*>\s*Popularity:\s*<strong>([\d.]+)%<\/strong>/gi;

function inferTier(power) {
  if (power >= 12) return 1;
  if (power >= 7) return 2;
  if (power >= 3) return 3;
  return 4;
}

function artworkFromAnchor(anchorHtml) {
  const sourceSet = anchorHtml.match(/\bsrcset="([^"]+)"/i)?.[1];
  const source = anchorHtml.match(/\bsrc="([^"]+)"/i)?.[1];
  const candidate = decodeHtml(sourceSet?.split(',').at(-1)?.trim().split(/\s+/)[0] || source || '');
  return candidate ? candidate.replace(/([?&]width=)\d+/i, (_, prefix) => `${prefix}640`) : undefined;
}

function createDeckReference(kind, encodedName, rawName, anchorHtml) {
  const name = decodeHtml(rawName).trim();
  const isEngine = kind === 'engines';
  return {
    name,
    kind: isEngine ? 'engine' : 'deck',
    detailUrl: new URL(`/tier-list/${kind}/${encodedName}`, MASTER_DUEL_META_URL).toString(),
    imageUrl: artworkFromAnchor(anchorHtml)
      || (isEngine ? undefined : `https://imgserv.duellinksmeta.com/v2/mdm/deck-type/${encodeURIComponent(name)}?portrait=true&width=640`),
  };
}

export function parseMasterDuelMeta(html, fetchedAt = new Date().toISOString()) {
  const powerItems = [];
  const popularityItems = [];

  for (const match of html.matchAll(POWER_PATTERN)) {
    const link = createDeckReference(match[1], match[2], match[4], match[3]);
    const value = Number(match[5]);
    powerItems.push({
      id: `mdm-power-${slugify(link.name)}`,
      name: link.name,
      format: 'master-duel',
      source: 'master-duel-meta',
      metric: 'power',
      value,
      unit: 'power',
      tier: inferTier(value),
      kind: link.kind,
      imageUrl: link.imageUrl,
      detailUrl: link.detailUrl,
    });
  }

  for (const match of html.matchAll(POPULARITY_PATTERN)) {
    const link = createDeckReference(match[1], match[2], match[4], match[3]);
    popularityItems.push({
      id: `mdm-popularity-${slugify(link.name)}`,
      name: link.name,
      format: 'master-duel',
      source: 'master-duel-meta',
      metric: 'popularity',
      value: Number(match[5]),
      unit: 'percent',
      kind: link.kind,
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
