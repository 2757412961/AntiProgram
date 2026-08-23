import { decodeHtml } from '../lib/html.mjs';
import { fetchText } from '../lib/http.mjs';

const MASTER_DUEL_META_BASE = 'https://www.masterduelmeta.com';
const YGOPRODECK_BASE = 'https://ygoprodeck.com';
const VALID_FORMATS = new Set(['master-duel', 'ocg', 'tcg']);

function sumCards(cards) {
  return cards.reduce((total, card) => total + card.amount, 0);
}

function decodeScriptString(value) {
  if (!value) return '';
  try {
    if (value.startsWith('"')) return JSON.parse(value);
    return value.slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, '\\');
  } catch {
    return value.slice(1, -1);
  }
}

function cardAttribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}=(?:"([^"]*)"|'([^']*)')`, 'i'));
  return decodeHtml(match?.[1] ?? match?.[2] ?? '').trim();
}

function sectionHtml(html, sectionId) {
  const marker = new RegExp(`\\bid=(?:"${sectionId}"|'${sectionId}')`, 'i').exec(html);
  if (!marker) return '';
  const start = marker.index;
  const nextMarkers = ['main_deck', 'extra_deck', 'side_deck']
    .filter(id => id !== sectionId)
    .map(id => new RegExp(`\\bid=(?:"${id}"|'${id}')`, 'i').exec(html.slice(start + 1)))
    .filter(Boolean)
    .map(match => start + 1 + match.index)
    .filter(index => index > start);
  const end = nextMarkers.length > 0 ? Math.min(...nextMarkers) : html.length;
  return html.slice(start, end);
}

export function parseYgoProDeckClassicDeck(html, {
  name,
  format,
  sourceUrl,
  fetchedAt = new Date().toISOString(),
} = {}) {
  const parseSection = sectionId => {
    const grouped = new Map();
    const section = sectionHtml(html, sectionId);
    for (const match of section.matchAll(/<img\b[^>]*>/gi)) {
      const tag = match[0];
      const id = cardAttribute(tag, 'data-card');
      const cardName = cardAttribute(tag, 'data-cardname');
      if (!/^\d+$/.test(id) || !cardName) continue;
      const current = grouped.get(id);
      if (current) {
        current.amount += 1;
        continue;
      }
      grouped.set(id, {
        id,
        name: cardName,
        amount: 1,
        imageUrl: `https://images.ygoprodeck.com/images/cards_small/${id}.jpg`,
        detailUrl: `${YGOPRODECK_BASE}/card/?search=${id}`,
      });
    }
    return [...grouped.values()];
  };

  const main = parseSection('main_deck');
  const extra = parseSection('extra_deck');
  const side = parseSection('side_deck');
  if (main.length === 0 || sumCards(main) < 20) {
    throw new Error('YGOPRODeck 构筑页没有可用的主卡组数据');
  }

  const deckNameMatch = html.match(/\bvar\s+deckname\s*=\s*((?:"(?:\\.|[^"])*")|(?:'(?:\\.|[^'])*'))\s*;/i);
  const sampleName = decodeScriptString(deckNameMatch?.[1]) || `${name} 赛事构筑`;
  return {
    schemaVersion: 1,
    archetypeName: name,
    sampleName,
    format,
    selection: 'tournament-sample',
    selectionReason: '从该系列当前赛事样本中选取一副公开完整卡表',
    sourceLabel: 'YGOPRODeck',
    sourceUrl,
    fetchedAt,
    main,
    extra,
    side,
    counts: {
      main: sumCards(main),
      extra: sumCards(extra),
      side: sumCards(side),
    },
  };
}

export function parseMasterDuelMetaClassicDeck(deck, {
  name,
  sourceUrl,
  fetchedAt = new Date().toISOString(),
} = {}) {
  const normalize = entries => (Array.isArray(entries) ? entries : [])
    .map(entry => {
      const card = entry?.card;
      const amount = Number(entry?.amount);
      if (!card?._id || !card?.name || !Number.isInteger(amount) || amount < 1) return null;
      return {
        id: card._id,
        name: card.name,
        amount,
        rarity: card.rarity || undefined,
        imageUrl: `https://s3.duellinksmeta.com/cards/${card._id}_w200.webp`,
        detailUrl: `${MASTER_DUEL_META_BASE}/cards/${encodeURIComponent(card.name)}`,
      };
    })
    .filter(Boolean);

  const main = normalize(deck?.main);
  const extra = normalize(deck?.extra);
  const side = normalize(deck?.side);
  if (main.length === 0 || sumCards(main) < 20) {
    throw new Error('Master Duel Meta 没有返回可用的代表构筑');
  }

  return {
    schemaVersion: 1,
    archetypeName: name,
    sampleName: `${name} 代表构筑`,
    format: 'master-duel',
    selection: 'relevance',
    selectionReason: '按来源站当前相关度排序选取一副近期公开完整卡表',
    sourceLabel: 'Master Duel Meta',
    sourceUrl,
    fetchedAt,
    main,
    extra,
    side,
    counts: {
      main: sumCards(main),
      extra: sumCards(extra),
      side: sumCards(side),
    },
  };
}

function trustedYgoProDeckUrl(value) {
  let target;
  try {
    target = new URL(value);
  } catch {
    throw Object.assign(new Error('缺少有效的赛事构筑来源地址'), { statusCode: 400 });
  }
  if (target.protocol !== 'https:'
      || !['ygoprodeck.com', 'www.ygoprodeck.com'].includes(target.hostname)
      || !/^\/deck\/[a-z0-9-]+\/?$/i.test(target.pathname)) {
    throw Object.assign(new Error('赛事构筑来源地址不受信任'), { statusCode: 400 });
  }
  target.search = '';
  target.hash = '';
  return target.toString();
}

async function loadMasterDuelClassicDeck(name) {
  const sourceUrl = `${MASTER_DUEL_META_BASE}/tier-list/deck-types/${encodeURIComponent(name)}`;
  const deckTypeParams = new URLSearchParams({
    name,
    aggregate: 'aboveThresh',
    limit: '1',
  });
  const deckTypeResponse = await fetchText(`${MASTER_DUEL_META_BASE}/api/v1/deck-types?${deckTypeParams}`, {
    headers: { accept: 'application/json' },
    maxBytes: 2 * 1024 * 1024,
  });
  const deckTypePayload = JSON.parse(deckTypeResponse.body);
  const deckType = Array.isArray(deckTypePayload) ? deckTypePayload[0] : deckTypePayload;
  if (!deckType?._id) throw new Error(`Master Duel Meta 未找到 ${name} 系列`);

  const deckParams = new URLSearchParams({
    deckType: deckType._id,
    aggregate: 'sortByRelevance',
    fields: '-__v',
    limit: '1',
  });
  const deckResponse = await fetchText(`${MASTER_DUEL_META_BASE}/api/v1/top-decks?${deckParams}`, {
    headers: { accept: 'application/json' },
    maxBytes: 4 * 1024 * 1024,
  });
  const payload = JSON.parse(deckResponse.body);
  const deck = Array.isArray(payload) ? payload[0] : payload;
  if (!deck) throw new Error(`Master Duel Meta 暂无 ${name} 的公开完整卡表`);
  return parseMasterDuelMetaClassicDeck(deck, { name, sourceUrl });
}

export async function loadClassicDeck({ name, format, detailUrl } = {}) {
  const normalizedName = String(name || '').trim();
  if (!normalizedName || normalizedName.length > 120) {
    throw Object.assign(new Error('系列名称无效'), { statusCode: 400 });
  }
  if (!VALID_FORMATS.has(format)) {
    throw Object.assign(new Error(`不支持的赛制：${format || 'unknown'}`), { statusCode: 400 });
  }
  if (format === 'master-duel') return loadMasterDuelClassicDeck(normalizedName);

  const sourceUrl = trustedYgoProDeckUrl(detailUrl);
  const { body } = await fetchText(sourceUrl, { maxBytes: 6 * 1024 * 1024 });
  return parseYgoProDeckClassicDeck(body, {
    name: normalizedName,
    format,
    sourceUrl,
  });
}
