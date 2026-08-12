import { decodeHtml, stripTags } from '../lib/html.mjs';
import { fetchText } from '../lib/http.mjs';

const BASE_URL = 'https://ygoprodeck.com';
const ALLOW_REMOTE_IMAGES = process.env.DECK_PLAZA_ALLOW_REMOTE_IMAGES === '1';
const FORMATS = {
  ocg: {
    category: 'Tournament Meta Decks OCG',
    label: 'YGOPRODeck OCG 赛事卡组',
  },
  tcg: {
    category: 'Tournament Meta Decks',
    label: 'YGOPRODeck TCG 赛事卡组',
  },
};

function getSourceUrl(format) {
  return `${BASE_URL}/category/format/${encodeURIComponent(FORMATS[format].category)}`;
}

const CARD_PATTERN = /<div class="p-2 deck_article-card-container"[\s\S]*?data-src="([^"]+)"[\s\S]*?<span class="rounded-pill deck-type-badge text-center">([\s\S]*?)<\/span>[\s\S]*?<a href="([^"]+)"[^>]*deck_article-card-title[^>]*>([\s\S]*?)<\/a>[\s\S]*?<div class="deck_article-card-stats">([\s\S]*?)<\/div>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi;

function placementWeight(placement) {
  if (/winner|1st/i.test(placement)) return 4;
  if (/runner-up|2nd/i.test(placement)) return 3;
  if (/top\s*4|3rd|4th/i.test(placement)) return 2;
  if (/top\s*8/i.test(placement)) return 1;
  return 0.5;
}

export function parseYgoProDeckTournament(html, format, fetchedAt = new Date().toISOString()) {
  const decks = [];
  for (const match of html.matchAll(CARD_PATTERN)) {
    const stats = stripTags(match[5]);
    const placementMatch = stats.match(/(Winner|Runner-Up|Top\s*\d+|\d+(?:st|nd|rd|th))/i);
    const playersMatch = stats.match(/~?([\d,]+)\s+players/i);
    const ageMatch = stats.match(/(\d+\s+(?:minute|hour|day|week|month)s?\s+ago)/i);
    const pilotMatch = stats.match(/piloted by\s+(.+)$/i);
    const detailUrl = new URL(decodeHtml(match[3]), BASE_URL).toString();
    const idMatch = detailUrl.match(/-(\d+)\/?$/);
    decks.push({
      id: `ygoprodeck-${idMatch?.[1] || encodeURIComponent(detailUrl)}`,
      name: stripTags(match[4]),
      format,
      source: 'ygoprodeck-tournaments',
      metric: 'tournament-result',
      event: stripTags(match[2]),
      placement: placementMatch?.[1] || '上位',
      playerCount: playersMatch ? Number(playersMatch[1].replaceAll(',', '')) : undefined,
      relativeDate: ageMatch?.[1],
      pilot: pilotMatch?.[1]?.trim(),
      imageUrl: ALLOW_REMOTE_IMAGES ? decodeHtml(match[1]) : undefined,
      detailUrl,
      weight: placementWeight(placementMatch?.[1] || ''),
    });
  }

  if (decks.length < 2) {
    throw new Error(`YGOPRODeck ${format.toUpperCase()} 页面结构校验失败（解析到 ${decks.length} 副卡组）`);
  }

  const counts = new Map();
  for (const deck of decks) {
    const current = counts.get(deck.name) || { name: deck.name, count: 0, score: 0, imageUrl: deck.imageUrl };
    current.count += 1;
    current.score += deck.weight;
    counts.set(deck.name, current);
  }
  const rankings = [...counts.values()]
    .sort((a, b) => b.score - a.score || b.count - a.count || a.name.localeCompare(b.name))
    .map((entry, index) => ({
      id: `ygoprodeck-${format}-${encodeURIComponent(entry.name.toLowerCase())}`,
      name: entry.name,
      format,
      source: 'ygoprodeck-tournaments',
      metric: 'top-count',
      value: entry.count,
      unit: 'decks',
      score: entry.score,
      rank: index + 1,
      imageUrl: entry.imageUrl,
      detailUrl: decks.find(deck => deck.name === entry.name)?.detailUrl,
    }));

  return { fetchedAt, decks, rankings };
}

export function createYgoProDeckTournamentProvider(format) {
  const config = FORMATS[format];
  if (!config) throw new Error(`不支持的 YGOPRODeck 赛制：${format}`);
  return {
    id: `ygoprodeck-tournaments-${format}`,
    sourceId: 'ygoprodeck-tournaments',
    label: config.label,
    format,
    sourceUrl: getSourceUrl(format),
    methods: ['top-count', 'tournament-result'],
    methodology: {
      'top-count': '当前抓取批次中同名赛事上位卡组的出现次数',
      'tournament-result': 'YGOPRODeck 收录的最新赛事卡表与名次',
    },
    refreshIntervalMs: 60 * 60 * 1000,
    async load() {
      const fetchedAt = new Date().toISOString();
      const { body } = await fetchText(getSourceUrl(format));
      return parseYgoProDeckTournament(body, format, fetchedAt);
    },
  };
}
