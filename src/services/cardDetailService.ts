// src/services/cardDetailService.ts
// Service to fetch detailed card information, preferring YGOCDB for Chinese translations.
// Using global fetch in browser
import { YgoCard } from '../types/ygo';
import { getMainCardTypeFromYgoType } from '../utils/cardMetadata';

interface YgocdbCardDetail {
  id: number;
  cid?: number;
  cn_name?: string;
  sc_name?: string;
  md_name?: string;
  data?: {
    type?: number;
    attribute?: number;
    level?: number;
    atk?: number;
    def?: number;
  };
  text?: {
    name?: string;
    sc_name?: string;
    md_name?: string;
    types?: string;
    desc?: string;
  };
}

const YGOCDB_API_BASE = '/api/ygocdb';
const CHINESE_IMAGE_BASE = '/chinese-card-images';
const chineseCardCache = new Map<number, YgocdbCardDetail | null>();

function containsChinese(value?: string): boolean {
  return Boolean(value && /[\u3400-\u9fff]/u.test(value));
}

function getVerifiedChineseName(raw: YgocdbCardDetail): string | undefined {
  const names = [
    raw.md_name,
    raw.sc_name,
    raw.cn_name,
    raw.text?.md_name,
    raw.text?.sc_name,
    raw.text?.name,
  ];
  // Master Duel 字段偶尔保留日/英文字母标题；用户界面优先采用同一记录内
  // 已由百鸽提供的简体中文名。只有 NEX、TGX300 这类确无汉字名的卡才保留原名。
  return names.find(containsChinese) || names.find(Boolean);
}

export function getChineseCardImageUrl(
  cardId: number,
  variant: 'sc' | 'ygopro' = 'sc',
  size: 'full' | 'half' | 'thumb2' = 'full'
): string {
  const suffix = size === 'full' ? '' : `!${size}`;
  return `${CHINESE_IMAGE_BASE}/ygoimg/${variant}/${cardId}.webp${suffix}`;
}

export function getChineseCardBackUrl(): string {
  return '/card-images/images/cards/back_high.jpg';
}

function applyChineseDetail(card: YgoCard, raw: YgocdbCardDetail): YgoCard {
  // 中文化只替换展示字段。若百鸽提供结构化类型位则用其校验，
  // 否则保留上游 YGOPRODeck/搜索结果已经确认的类型。
  const type = getMainCardTypeFromYgoType(raw.data?.type) ?? card.type;
  return {
    ...card,
    name: getVerifiedChineseName(raw) || `中文名暂缺（${card.id}）`,
    type,
    subType: raw.text?.types || card.subType,
    desc: raw.text?.desc || card.desc,
    imageId: raw.id,
    imageUrl: getChineseCardImageUrl(raw.id, 'sc', 'full'),
    imageUrlSmall: getChineseCardImageUrl(raw.id, 'sc', 'half'),
  };
}

function localizeFromCache(card: YgoCard): YgoCard | null {
  const detail = [card.id, ...(card.localizationIds || [])]
    .map(id => chineseCardCache.get(id))
    .find((candidate): candidate is YgocdbCardDetail => Boolean(candidate));
  return detail ? applyChineseDetail(card, detail) : null;
}

async function fetchVerifiedChineseCard(card: YgoCard): Promise<YgoCard | null> {
  const candidateIds = [card.id, ...(card.localizationIds || [])];
  for (const id of candidateIds) {
    const cached = chineseCardCache.get(id);
    if (cached) return applyChineseDetail(card, cached);
    if (cached === null) continue;

    try {
      const response = await fetch(`${YGOCDB_API_BASE}/card/${id}?show=all`);
      if (response.status === 404) {
        chineseCardCache.set(id, null);
        continue;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const detail = await response.json() as YgocdbCardDetail;
      if (!detail?.id) throw new Error('接口未返回卡片记录');
      chineseCardCache.set(id, detail);
      return applyChineseDetail(card, detail);
    } catch (error) {
      console.warn(`百鸽单卡中文数据加载失败：${id}`, error);
    }
  }
  return null;
}

/** 按密码批量补齐 Master Duel 中文名称与中文卡文，每批遵守百鸽 100 条上限。 */
export async function localizeCardsFromYgocdb(cards: YgoCard[]): Promise<YgoCard[]> {
  const lookupIds = [...new Set(cards.flatMap(card => [card.id, ...(card.localizationIds || [])]))];
  const missingIds = lookupIds
    .filter(id => !chineseCardCache.has(id));

  const batches: number[][] = [];
  for (let offset = 0; offset < missingIds.length; offset += 100) {
    batches.push(missingIds.slice(offset, offset + 100));
  }
  const loadBatch = async (ids: number[]) => {
    try {
      const response = await fetch(`${YGOCDB_API_BASE}/cardset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!response.ok) {
        if (ids.length > 1) {
          const midpoint = Math.ceil(ids.length / 2);
          await Promise.all([
            loadBatch(ids.slice(0, midpoint)),
            loadBatch(ids.slice(midpoint)),
          ]);
          return;
        }

        const id = ids[0];
        const directResponse = await fetch(`${YGOCDB_API_BASE}/card/${id}?show=all`);
        if (directResponse.status === 404) {
          chineseCardCache.set(id, null);
          return;
        }
        if (!directResponse.ok) throw new Error(`单卡 HTTP ${directResponse.status}`);
        const directDetail = await directResponse.json() as YgocdbCardDetail;
        chineseCardCache.set(id, directDetail?.id ? directDetail : null);
        return;
      }
      const payload = await response.json() as Record<string, YgocdbCardDetail>;
      for (const id of ids) chineseCardCache.set(id, payload[String(id)] || null);
    } catch (error) {
      console.warn('百鸽批量中文数据加载失败', error);
      // 网络错误不写入负缓存，下一次刷新仍可重试。
    }
  };
  // 限制并发，避免一次性向公共接口发送过多请求。
  for (let offset = 0; offset < batches.length; offset += 6) {
    await Promise.all(batches.slice(offset, offset + 6).map(loadBatch));
  }

  return cards.map(card => {
    const localized = localizeFromCache(card);
    return localized || {
      ...card,
      name: `中文名暂缺（${card.id}）`,
      imageUrl: getChineseCardBackUrl(),
      imageUrlSmall: getChineseCardBackUrl(),
    };
  });
}

/**
 * Fetch detailed card data from YGOCDB.
 * The API returns Chinese fields (cn_name, sc_name, etc.).
 * If the API fails, fallback to the minimal card object passed in.
 */
export async function fetchCardDetailFromYgocdb(cardId: number, fallback: Partial<YgoCard> = {}): Promise<YgoCard> {
  const fallbackCard: YgoCard = {
    id: cardId,
    name: fallback.name || `中文名暂缺（${cardId}）`,
    type: fallback.type || 'monster',
    desc: fallback.desc || '无效果文本',
    imageUrl: fallback.imageUrl || getChineseCardBackUrl(),
    ...fallback,
  } as YgoCard;
  try {
    const localized = await fetchVerifiedChineseCard(fallbackCard);
    const detailId = localized?.imageId || cardId;
    const raw = [detailId, cardId, ...(fallback.localizationIds || [])]
      .map(id => chineseCardCache.get(id))
      .find((candidate): candidate is YgocdbCardDetail => Boolean(candidate));
    if (raw && localized) {
      const attrMap: Record<number, string> = {
        1: 'EARTH', 2: 'WATER', 4: 'FIRE', 8: 'WIND', 16: 'LIGHT', 32: 'DARK', 64: 'DIVINE'
      };
      const type = getMainCardTypeFromYgoType(raw.data?.type) ?? localized.type;
      return {
        ...localized,
        id: cardId,
        jpName: fallback.jpName,
        enName: fallback.enName,
        type,
        subType: raw.text?.types || (type === 'spell' ? '【魔法卡】' : type === 'trap' ? '【陷阱卡】' : '【怪兽卡】'),
        attribute: raw.data?.attribute ? attrMap[raw.data.attribute] || 'LIGHT' : undefined,
        level: raw.data?.level,
        atk: raw.data?.atk === -1 ? '?' : raw.data?.atk,
        def: raw.data?.def === -1 ? '?' : raw.data?.def,
        desc: raw.text?.desc || fallback.desc || '无效果文本',
        imageId: detailId,
        localizationIds: fallback.localizationIds,
        imageUrl: getChineseCardImageUrl(detailId, 'sc', 'full'),
        imageUrlSmall: getChineseCardImageUrl(detailId, 'sc', 'half'),
        source: 'YGOCDB',
        rarity: fallback.rarity,
        banlistStatus: fallback.banlistStatus,
        // 详情接口只补充展示字段；禁限状态始终沿用已经过当前规则校验的卡片。
        // YGOCDB 的 ban_md 不作为当前 Master Duel 权威来源。
        banlistInfo: fallback.banlistInfo || {
          ocg: 'Unlimited',
          tcg: 'Unlimited'
        }
      } as YgoCard;
    }
    throw new Error('No verified Chinese result data');
  } catch (e) {
    console.warn('Failed to fetch YGOCDB detail, using fallback', e);
    return {
      id: cardId,
      name: `中文名暂缺（${cardId}）`,
      jpName: fallback.jpName,
      enName: fallback.enName,
      type: fallback.type || 'monster',
      subType: fallback.subType || '【怪兽卡】',
      attribute: fallback.attribute,
      level: fallback.level,
      atk: fallback.atk,
      def: fallback.def,
      desc: fallback.desc || '无效果文本',
      imageUrl: getChineseCardBackUrl(),
      imageUrlSmall: getChineseCardBackUrl(),
      source: 'YGOCDB',
      rarity: fallback.rarity,
      banlistStatus: fallback.banlistStatus,
      banlistInfo: fallback.banlistInfo || { ocg: 'Unlimited', tcg: 'Unlimited' }
    } as YgoCard;
  }
}
