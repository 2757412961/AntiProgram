import { decodeHtml, stripTags } from '../lib/html.mjs';
import { fetchText } from '../lib/http.mjs';

export const ROAD_OF_THE_KING_URL = 'https://roadoftheking.com/';
export const ROAD_OF_THE_KING_POSTS_API_URL =
  'https://roadoftheking.com/wp-json/wp/v2/posts?categories=3&per_page=20&_fields=id,date,link,slug,title,content';

function placementWeight(placement) {
  if (/^1st$/i.test(placement)) return 4;
  if (/^2nd$/i.test(placement)) return 3;
  if (/^3rd|^4th|3\s*[-–]\s*4th/i.test(placement)) return 2;
  if (/5\s*[-–]\s*8th|top\s*8/i.test(placement)) return 1;
  return 0.5;
}

function tableCells(rowHtml) {
  return [...rowHtml.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)]
    .map(match => stripTags(match[1]).replace(/\s+/g, ' ').trim());
}

function isOcgTournamentPost(post, html, title) {
  if (/master duel|duel links/i.test(title)) return false;
  return /\bOCG\b|Asia English/i.test(title)
    && /\bwas held\b/i.test(stripTags(html))
    && /<table\b/i.test(html);
}

export function parseRoadOfTheKingPosts(payload, fetchedAt = new Date().toISOString()) {
  if (!Array.isArray(payload)) throw new Error('Road of the King 响应不是数组');
  const decks = [];

  payload.forEach(post => {
    const title = decodeHtml(String(post?.title?.rendered || '')).trim();
    const html = String(post?.content?.rendered || '');
    const detailUrl = String(post?.link || '');
    if (!title || !/^https:\/\/roadoftheking\.com\//i.test(detailUrl)) return;
    if (!isOcgTournamentPost(post, html, title)) return;

    const playerCountMatch = stripTags(html).match(/had\s+([\d,]+)\s+participants/i);
    const playerCount = playerCountMatch
      ? Number(playerCountMatch[1].replaceAll(',', ''))
      : undefined;
    const publishedDate = typeof post?.date === 'string' ? post.date.slice(0, 10) : undefined;

    for (const row of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const cells = tableCells(row[1]);
      if (cells.length < 3) continue;
      const placement = cells[0];
      if (!/^(?:1st|2nd|3rd|4th|3\s*[-–]\s*4th|5\s*[-–]\s*8th|9\s*[-–]\s*16th|Top\s*\d+)$/i.test(placement)) continue;
      const pilot = cells[1];
      const name = cells[2];
      if (!name || name.length > 120) continue;
      decks.push({
        id: `rotk-${post.id}-${decks.length + 1}`,
        name,
        format: 'ocg',
        source: 'road-of-the-king',
        metric: 'tournament-result',
        event: title,
        placement,
        playerCount,
        relativeDate: publishedDate,
        pilot: pilot || undefined,
        detailUrl,
        weight: placementWeight(placement),
      });
    }
  });

  if (decks.length < 2) {
    throw new Error(`Road of the King 页面结构校验失败（解析到 ${decks.length} 副 OCG 上位卡组）`);
  }

  const counts = new Map();
  for (const deck of decks) {
    const current = counts.get(deck.name) || { name: deck.name, count: 0, score: 0, detailUrl: deck.detailUrl };
    current.count += 1;
    current.score += deck.weight;
    counts.set(deck.name, current);
  }
  const rankings = [...counts.values()]
    .sort((a, b) => b.score - a.score || b.count - a.count || a.name.localeCompare(b.name))
    .map((entry, index) => ({
      id: `rotk-ocg-${encodeURIComponent(entry.name.toLowerCase())}`,
      name: entry.name,
      format: 'ocg',
      source: 'road-of-the-king',
      metric: 'top-count',
      value: entry.count,
      unit: 'decks',
      score: entry.score,
      rank: index + 1,
      detailUrl: entry.detailUrl,
    }));

  return { fetchedAt, decks, rankings };
}

export const roadOfTheKingOcgProvider = {
  id: 'road-of-the-king-ocg',
  sourceId: 'road-of-the-king',
  label: 'Road of the King OCG 赛事',
  format: 'ocg',
  sourceUrl: ROAD_OF_THE_KING_URL,
  methods: ['top-count', 'tournament-result'],
  methodology: {
    'top-count': '近期公开 OCG / Asia English 赛事文章中明确列出的上位卡组次数',
    'tournament-result': 'Road of the King 公开赛事表格中的名次、选手、卡组类型和参赛规模',
  },
  refreshIntervalMs: 6 * 60 * 60 * 1000,
  async load() {
    const fetchedAt = new Date().toISOString();
    const { body } = await fetchText(ROAD_OF_THE_KING_POSTS_API_URL, {
      headers: { accept: 'application/json' },
      maxBytes: 8 * 1024 * 1024,
    });
    let payload;
    try {
      payload = JSON.parse(body);
    } catch {
      throw new Error('Road of the King 返回的不是有效 JSON');
    }
    return parseRoadOfTheKingPosts(payload, fetchedAt);
  },
};
