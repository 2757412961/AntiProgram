export type DataSourceType = 'YGOCDB' | 'YGOPRODeck' | 'LOCAL_DB';
export type GameFormat = 'MasterDuel' | 'OCG' | 'TCG';
export type BanStatusFilter = 'all' | 'forbidden' | 'limited' | 'semi-limited' | 'unlimited';
export type CardMainType = 'all' | 'monster' | 'spell' | 'trap';
export type CardSortField =
  | 'cardType'
  | 'name'
  | 'level'
  | 'atk'
  | 'def'
  | 'rarity'
  | 'banStatus'
  | 'id'
  | 'source';
export type SortDirection = 'asc' | 'desc';

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
  /** 中文数据库实际采用的卡图密码；异画密码可能与规则/卡池密码不同。 */
  imageId?: number;
  /** 用于匹配中文数据库的同卡异画密码。 */
  localizationIds?: number[];
  source: DataSourceType;
  rarity?: string;
  banlistStatus?: string; // 当前对应选定环境的禁限状态
  banlistInfo?: CardBanlistInfo;
  archetype?: string;
}

export interface SearchFilters {
  keyword: string;
  sortBy: CardSortField;
  sortDirection: SortDirection;
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

/** 实时禁卡表分区数据 */
export interface BanlistPageData {
  forbidden: YgoCard[];
  limited: YgoCard[];
  semiLimited: YgoCard[];
  fetchedAt?: number; // 拉取时间戳 (ms)
  source: 'remote' | 'local-fallback' | 'local-master-duel';
  sourceLabel: string;
  fromCache?: boolean;
  warning?: string;
  effectiveDate?: string;
}

/** 全量卡库缓存状态 */
export interface CacheState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  totalCount: number;
  loadedCount: number;
}

export interface BanOverrideRule {
  ids: number[];
  names?: string[];
  status: {
    masterDuel: string;
    ocg: string;
    tcg: string;
  };
}

export interface YgocdbApiItem {
  id: number;
  name?: string;
  cn_name?: string;
  sc_name?: string;
  jp_name?: string;
  en_name?: string;
  text?: {
    types?: string;
    desc?: string;
  };
  data?: {
    attribute?: number;
    level?: number;
    atk?: number;
    def?: number;
  };
  ban_md?: string;
  ban_ocg?: string;
  ban_tcg?: string;
}

export interface YgoProDeckApiItem {
  id: number;
  name: string;
  type?: string;
  attribute?: string;
  race?: string;
  level?: number;
  rank?: number;
  linkval?: number;
  atk?: number;
  def?: number;
  desc?: string;
  archetype?: string;
  card_images?: Array<{
    id?: number;
    image_url: string;
    image_url_small?: string;
  }>;
  banlist_info?: {
    ban_tcg?: string;
    ban_ocg?: string;
  };
  misc_info?: Array<{
    formats?: string[];
    konami_id?: number;
    md_rarity?: string;
  }>;
}

