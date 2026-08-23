import { YgoCard } from '../types/ygo';

const TYPE_MONSTER = 0x1;
const TYPE_SPELL = 0x2;
const TYPE_TRAP = 0x4;

/** 从百鸽/YGOPro 的结构化类型位读取卡片大类。 */
export function getMainCardTypeFromYgoType(typeCode?: number): YgoCard['type'] | undefined {
  if (!Number.isInteger(typeCode)) return undefined;
  if ((typeCode! & TYPE_MONSTER) !== 0) return 'monster';
  if ((typeCode! & TYPE_SPELL) !== 0) return 'spell';
  if ((typeCode! & TYPE_TRAP) !== 0) return 'trap';
  return undefined;
}

/** 从 YGOPRODeck 的结构化 `item.type` 字段读取卡片大类。 */
export function getMainCardTypeFromYgoProDeckType(rawType?: string): YgoCard['type'] | undefined {
  const normalized = rawType?.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized.includes('monster')) return 'monster';
  if (normalized === 'spell card') return 'spell';
  if (normalized === 'trap card') return 'trap';
  return undefined;
}

/**
 * 仅在数值元数据缺失时，从百鸽类型字段的明确首段兜底。
 * 锚定开头可避免把“魔法师族”误判为魔法卡。
 */
export function getMainCardTypeFromYgocdbHeader(types?: string): YgoCard['type'] | undefined {
  const header = types?.trim().match(/^[\[【](怪兽|魔法|陷阱)(?=[|｜\]】])/u)?.[1];
  if (header === '怪兽') return 'monster';
  if (header === '魔法') return 'spell';
  if (header === '陷阱') return 'trap';
  return undefined;
}
