export type DataSourceType = 'YGOCDB' | 'YGOPRODeck' | 'LOCAL_DB';
export type GameFormat = 'MasterDuel' | 'OCG' | 'TCG';
export type BanStatusFilter = 'all' | 'forbidden' | 'limited' | 'semi-limited' | 'unlimited';
export type CardMainType = 'all' | 'monster' | 'spell' | 'trap';

export interface CardBanlistInfo {
  masterDuel?: string; // 'Forbidden' | 'Limited' | 'Semi-Limited' | 'Unlimited'
  ocg?: string;        // 'Forbidden' | 'Limited' | 'Semi-Limited' | 'Unlimited'
  tcg?: string;        // 'Forbidden' | 'Limited' | 'Semi-Limited' | 'Unlimited'
}

export interface YgoCard {
  id: number;
  name: string;
  jpName?: string;
  enName?: string;
  type: 'monster' | 'spell' | 'trap';
  subType?: string;
  attribute?: string;
  race?: string;
  level?: number;
  atk?: number | string;
  def?: number | string;
  desc: string;
  imageUrl: string;
  imageUrlSmall?: string;
  source: DataSourceType;
  rarity?: string;
  banlistStatus?: string; // 当前对应选定环境的禁限状态
  banlistInfo?: CardBanlistInfo;
  archetype?: string;
}

export interface SearchFilters {
  keyword: string;
  mainType: CardMainType;
  attribute: string;      // 'ALL' | 'LIGHT' | 'DARK' | 'WATER' | 'FIRE' | 'EARTH' | 'WIND' | 'DIVINE'
  level: string;          // 'ALL' | '1' .. '13'
  race: string;           // 'ALL' | '龙族' | '战士族' | ...
  format: GameFormat;
  banStatus: BanStatusFilter;
  // ── 高级筛选 ──────────────────────────────
  rarity: string;          // 'ALL' | 'N' | 'R' | 'SR' | 'UR'
  monsterSubType: string;  // 'ALL' | 'Normal' | 'Effect' | 'Fusion' | 'Synchro' | 'Xyz' | 'Link' | 'Ritual' | 'Pendulum' | 'Flip' | 'Toon'
  spellTrapSubType: string;// 'ALL' | 'Normal' | 'Quick-Play' | 'Continuous' | 'Counter' | 'Equip' | 'Field' | 'Ritual'
  atkMin: string;          // '' | 数字字符串
  atkMax: string;
  defMin: string;
  defMax: string;
}

export interface DataSourceOption {
  id: DataSourceType;
  name: string;
  badge: string;
  desc: string;
  isOnline: boolean;
  speed: string;
}

export interface BanlistHistoryItem {
  id: string;
  format: GameFormat;
  versionTitle: string;
  effectiveDate: string;
  notes?: string;
  changes: {
    newForbidden: { id: number; name: string; type: string }[];
    newLimited: { id: number; name: string; type: string }[];
    newSemiLimited: { id: number; name: string; type: string }[];
    newUnlimited: { id: number; name: string; type: string }[];
  };
}

/** 实时禁卡表分区数据 */
export interface BanlistPageData {
  forbidden: YgoCard[];
  limited: YgoCard[];
  semiLimited: YgoCard[];
  fetchedAt?: number; // 拉取时间戳 (ms)
}

/** 全量卡库缓存状态 */
export interface CacheState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  totalCount: number;
  loadedCount: number;
}
