// src/services/cardDetailService.ts
// Service to fetch detailed card information, preferring YGOCDB for Chinese translations.
// Using global fetch in browser
import { YgoCard } from '../types/ygo';

/**
 * Fetch detailed card data from YGOCDB.
 * The API returns Chinese fields (cn_name, sc_name, etc.).
 * If the API fails, fallback to the minimal card object passed in.
 */
export async function fetchCardDetailFromYgocdb(cardId: number, fallback: Partial<YgoCard> = {}): Promise<YgoCard> {
  const url = `https://ygocdb.com/api/v0/?search=${cardId}`;
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    // YGOCDB returns { result: [{ ...cardInfo }] }
    if (data.result && Array.isArray(data.result) && data.result.length > 0) {
      const raw = data.result[0];
      const attrMap: Record<number, string> = {
        1: 'EARTH', 2: 'WATER', 4: 'FIRE', 8: 'WIND', 16: 'LIGHT', 32: 'DARK', 64: 'DIVINE'
      };
      const isSpell = raw.text?.types?.includes('魔法');
      const isTrap = raw.text?.types?.includes('陷阱');
      let type: 'monster' | 'spell' | 'trap' = 'monster';
      if (isSpell) type = 'spell';
      if (isTrap) type = 'trap';
      const name = raw.cn_name || raw.sc_name || raw.name || fallback.name || '未知卡片';
      return {
        id: raw.id,
        name,
        jpName: raw.jp_name,
        enName: raw.en_name,
        type,
        subType: raw.text?.types || (type === 'spell' ? '【魔法卡】' : type === 'trap' ? '【陷阱卡】' : '【怪兽卡】'),
        attribute: raw.data?.attribute ? attrMap[raw.data.attribute] || 'LIGHT' : undefined,
        level: raw.data?.level,
        atk: raw.data?.atk === -1 ? '?' : raw.data?.atk,
        def: raw.data?.def === -1 ? '?' : raw.data?.def,
        desc: raw.text?.desc || fallback.desc || '无效果文本',
        imageUrl: `https://cdn.233.momobako.com/ygopro/pics/${raw.id}.jpg`,
        source: 'YGOCDB',
        banlistInfo: fallback.banlistInfo || {
          masterDuel: raw.ban_md ? normalizeBanStatus(raw.ban_md) : 'Unlimited',
          ocg: raw.ban_ocg ? normalizeBanStatus(raw.ban_ocg) : 'Unlimited',
          tcg: raw.ban_tcg ? normalizeBanStatus(raw.ban_tcg) : 'Unlimited'
        }
      } as YgoCard;
    }
    throw new Error('No result data');
  } catch (e) {
    console.warn('Failed to fetch YGOCDB detail, using fallback', e);
    return {
      id: cardId,
      name: fallback.name || '未知卡片',
      jpName: fallback.jpName,
      enName: fallback.enName,
      type: fallback.type || 'monster',
      subType: fallback.subType || '【怪兽卡】',
      attribute: fallback.attribute,
      level: fallback.level,
      atk: fallback.atk,
      def: fallback.def,
      desc: fallback.desc || '无效果文本',
      imageUrl: fallback.imageUrl || `https://cdn.233.momobako.com/ygopro/pics/${cardId}.jpg`,
      source: 'YGOCDB',
      banlistInfo: fallback.banlistInfo || { masterDuel: 'Unlimited', ocg: 'Unlimited', tcg: 'Unlimited' }
    } as YgoCard;
  }
}

function normalizeBanStatus(status: string | undefined): string {
  if (!status) return 'Unlimited';
  const s = status.toLowerCase();
  if (s.includes('forbidden')) return 'Forbidden';
  if (s.includes('limited')) return 'Limited';
  if (s.includes('semi') || s.includes('semi-limited')) return 'Semi-Limited';
  return 'Unlimited';
}
