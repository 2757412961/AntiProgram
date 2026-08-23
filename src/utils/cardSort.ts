import { CardSortField, SortDirection, YgoCard } from '../types/ygo';

const nameCollator = new Intl.Collator(['zh-CN', 'en'], {
  numeric: true,
  sensitivity: 'base',
});

const MAIN_TYPE_ORDER: Record<YgoCard['type'], number> = {
  monster: 0,
  spell: 1,
  trap: 2,
};

const RARITY_ORDER: Record<string, number> = {
  N: 0,
  R: 1,
  SR: 2,
  UR: 3,
};

const BAN_STATUS_ORDER: Record<string, number> = {
  Forbidden: 0,
  Limited: 1,
  'Semi-Limited': 2,
  Unlimited: 3,
};

function getSubtypeOrder(card: YgoCard): number {
  const subtype = (card.subType || '').toLowerCase();

  if (card.type === 'monster') {
    if (subtype.includes('通常') || subtype.includes('normal')) return 0;
    if (subtype.includes('仪式') || subtype.includes('ritual')) return 2;
    if (subtype.includes('融合') || subtype.includes('fusion')) return 3;
    if (subtype.includes('同调') || subtype.includes('synchro')) return 4;
    if (subtype.includes('超量') || subtype.includes('xyz')) return 5;
    if (subtype.includes('灵摆') || subtype.includes('pendulum')) return 6;
    if (subtype.includes('连接') || subtype.includes('link')) return 7;
    if (subtype.includes('衍生物') || subtype.includes('token')) return 8;
    return 1; // 效果怪兽及未细分的怪兽
  }

  if (card.type === 'spell') {
    if (subtype.includes('仪式') || subtype.includes('ritual')) return 1;
    if (subtype.includes('速攻') || subtype.includes('quick')) return 2;
    if (subtype.includes('永续') || subtype.includes('continuous')) return 3;
    if (subtype.includes('装备') || subtype.includes('equip')) return 4;
    if (subtype.includes('场地') || subtype.includes('field')) return 5;
    return 0; // 通常魔法
  }

  if (subtype.includes('永续') || subtype.includes('continuous')) return 1;
  if (subtype.includes('反击') || subtype.includes('counter')) return 2;
  return 0; // 通常陷阱
}

function compareCardType(left: YgoCard, right: YgoCard): number {
  const mainTypeDifference = MAIN_TYPE_ORDER[left.type] - MAIN_TYPE_ORDER[right.type];
  if (mainTypeDifference !== 0) return mainTypeDifference;
  return getSubtypeOrder(left) - getSubtypeOrder(right);
}

function toNumber(value: number | string | undefined): number | null {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value : null;
  if (!value || value === '?') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function compareOptionalNumber(
  left: number | null,
  right: number | null,
  direction: SortDirection,
): number {
  // 无数值的魔法、陷阱及“?”怪兽始终放到列表末尾。
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return (left - right) * (direction === 'asc' ? 1 : -1);
}

function compareKnownRank(
  left: string | undefined,
  right: string | undefined,
  ranks: Record<string, number>,
  direction: SortDirection,
): number {
  const leftRank = left ? ranks[left] : undefined;
  const rightRank = right ? ranks[right] : undefined;
  return compareOptionalNumber(leftRank ?? null, rightRank ?? null, direction);
}

function compareNames(left: YgoCard, right: YgoCard): number {
  return nameCollator.compare(left.name, right.name);
}

/**
 * 对完整搜索结果做稳定排序。未知数值始终置底，避免降序时魔法、陷阱
 * 或缺少资料的卡片跑到怪兽数值列表顶部。
 */
export function sortCards(
  cards: YgoCard[],
  sortBy: CardSortField,
  direction: SortDirection,
): YgoCard[] {
  if (sortBy === 'source') return cards;

  const directionMultiplier = direction === 'asc' ? 1 : -1;
  return cards
    .map((card, index) => ({ card, index }))
    .sort((leftEntry, rightEntry) => {
      const left = leftEntry.card;
      const right = rightEntry.card;
      let difference = 0;

      switch (sortBy) {
        case 'cardType':
          difference = compareCardType(left, right) * directionMultiplier;
          break;
        case 'name':
          difference = compareNames(left, right) * directionMultiplier;
          break;
        case 'level':
          difference = compareOptionalNumber(toNumber(left.level), toNumber(right.level), direction);
          break;
        case 'atk':
          difference = compareOptionalNumber(toNumber(left.atk), toNumber(right.atk), direction);
          break;
        case 'def':
          difference = compareOptionalNumber(toNumber(left.def), toNumber(right.def), direction);
          break;
        case 'rarity':
          difference = compareKnownRank(left.rarity?.toUpperCase(), right.rarity?.toUpperCase(), RARITY_ORDER, direction);
          break;
        case 'banStatus':
          difference = compareKnownRank(left.banlistStatus, right.banlistStatus, BAN_STATUS_ORDER, direction);
          break;
        case 'id':
          difference = (left.id - right.id) * directionMultiplier;
          break;
      }

      if (difference !== 0) return difference;

      // 相同主排序值时，按卡片类型和名称稳定归组；最后保留原始顺序。
      const typeDifference = compareCardType(left, right);
      if (typeDifference !== 0) return typeDifference;
      const nameDifference = compareNames(left, right);
      if (nameDifference !== 0) return nameDifference;
      return leftEntry.index - rightEntry.index;
    })
    .map(entry => entry.card);
}
