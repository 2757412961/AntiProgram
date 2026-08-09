import {
  YgoCard,
  DataSourceType,
  SearchFilters,
  GameFormat,
  BanlistPageData,
  CacheState,
  YgocdbApiItem,
  YgoProDeckApiItem
} from '../types/ygo';
import { LATEST_BANLIST_OVERPRIDES } from '../constants/banlistOverrides';
import { MOCK_LOCAL_CARDS } from '../constants/mockCards';

let cachedYgoProDeckCards: YgoCard[] | null = null;
let isFetchingYgoProDeckFull = false;

// 缓存进度状态
let cacheState: CacheState = { status: 'idle', totalCount: 0, loadedCount: 0 };
const cacheListeners: Set<(state: CacheState) => void> = new Set();

function notifyCacheListeners() {
  cacheListeners.forEach(fn => fn({ ...cacheState }));
}

/** 订阅全量缓存进度变化 */
export function subscribeCacheState(listener: (state: CacheState) => void): () => void {
  cacheListeners.add(listener);
  listener({ ...cacheState }); // 立即通知当前状态
  return () => cacheListeners.delete(listener);
}

/** 获取当前缓存状态（同步快照） */
export function getCacheState(): CacheState {
  return { ...cacheState };
}

// ---------------------------------------------------------
// 实时禁卡表：从 YGOPRODeck API 拉取当前生效的 TCG/OCG 禁卡表
// ---------------------------------------------------------

// 禁卡表缓存，按赛制分开缓存 (5 分钟 TTL)
const banlistCache: Partial<Record<GameFormat, { data: BanlistPageData; ts: number }>> = {};
const BANLIST_TTL_MS = 5 * 60 * 1000;
const MASTER_DUEL_BANLIST_BASE_URL =
  'https://dawnbrandbots.github.io/yaml-yugi-limit-regulation/master-duel';

export interface FetchBanlistOptions {
  /** 用户主动刷新时绕过 5 分钟内存缓存。 */
  forceRefresh?: boolean;
}

/**
 * 拉取实时禁卡表数据。
 * - TCG/OCG: 调用 YGOPRODeck `?banlist=1` API 实时获取
 * - MasterDuel: 使用本地 override 规则表（无公开 API）
 */
export async function fetchBanlist(
  format: GameFormat,
  options: FetchBanlistOptions = {}
): Promise<BanlistPageData> {
  const cached = banlistCache[format];
  if (!options.forceRefresh && cached && Date.now() - cached.ts < BANLIST_TTL_MS) {
    return { ...cached.data, fromCache: true };
  }

  if (format === 'MasterDuel') {
    return fetchMasterDuelBanlist();
  }

  // TCG / OCG: 使用 YGOPRODeck banlist API
  const banlistParam = format === 'TCG' ? 'tcg' : 'ocg';
  const url = `https://db.ygoprodeck.com/api/v7/cardinfo.php?banlist=${banlistParam}`;

  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    if (!json.data || !Array.isArray(json.data)) throw new Error('Invalid response');

    const allCards: YgoCard[] = json.data.map(mapYgoProDeckToYgoCard);

    const forbidden: YgoCard[] = [];
    const limited: YgoCard[] = [];
    const semiLimited: YgoCard[] = [];

    for (const card of allCards) {
      const status = format === 'TCG'
        ? (card.banlistInfo?.tcg || 'Unlimited')
        : (card.banlistInfo?.ocg || 'Unlimited');

      if (status === 'Forbidden') forbidden.push({ ...card, banlistStatus: status });
      else if (status === 'Limited') limited.push({ ...card, banlistStatus: status });
      else if (status === 'Semi-Limited') semiLimited.push({ ...card, banlistStatus: status });
    }

    const data: BanlistPageData = {
      forbidden,
      limited,
      semiLimited,
      fetchedAt: Date.now(),
      source: 'remote',
      sourceLabel: `YGOPRODeck ${format} API`,
      fromCache: false,
    };
    banlistCache[format] = { data, ts: Date.now() };
    return data;
  } catch (error) {
    // 保留可用的本地数据，同时让界面明确知道实时请求失败。
    const message = error instanceof Error ? error.message : '未知网络错误';
    return buildBanlistFromOverrides(
      format,
      `实时接口请求失败（${message}），当前展示本地备用规则，可能不是最新数据。`
    );
  }
}

/** 从每日更新的社区 JSON 拉取当前 Master Duel 卡表，并通过 YGOPRODeck 补齐卡图与密码。 */
async function fetchMasterDuelBanlist(): Promise<BanlistPageData> {
  try {
    const versionResp = await fetch(`${MASTER_DUEL_BANLIST_BASE_URL}/current.vector.json`);
    if (!versionResp.ok) throw new Error(`版本接口 HTTP ${versionResp.status}`);
    const versionData = await versionResp.json() as { date?: string };
    if (!versionData.date || !/^\d{4}-\d{2}-\d{2}$/.test(versionData.date)) {
      throw new Error('版本接口缺少有效生效日期');
    }

    const regulationResp = await fetch(
      `${MASTER_DUEL_BANLIST_BASE_URL}/${versionData.date}.name.json`
    );
    if (!regulationResp.ok) throw new Error(`卡表接口 HTTP ${regulationResp.status}`);
    const regulation = await regulationResp.json() as Record<string, number>;
    const entries = Object.entries(regulation).filter((entry): entry is [string, number] =>
      typeof entry[0] === 'string' && [0, 1, 2].includes(entry[1])
    );
    if (entries.length === 0) throw new Error('卡表接口返回空数据');

    const details = await fetchYgoProDeckCardsByNames(entries.map(([name]) => name));
    const detailByName = new Map(details.map(card => [card.name.toLowerCase(), card]));
    const forbidden: YgoCard[] = [];
    const limited: YgoCard[] = [];
    const semiLimited: YgoCard[] = [];

    for (const [name, limit] of entries) {
      const status = limit === 0 ? 'Forbidden' : limit === 1 ? 'Limited' : 'Semi-Limited';
      const detail = detailByName.get(name.toLowerCase()) || createMinimalRemoteCard(name);
      const card: YgoCard = {
        ...detail,
        banlistStatus: status,
        banlistInfo: {
          ...detail.banlistInfo,
          masterDuel: status,
        },
      };
      if (limit === 0) forbidden.push(card);
      else if (limit === 1) limited.push(card);
      else semiLimited.push(card);
    }

    const data: BanlistPageData = {
      forbidden,
      limited,
      semiLimited,
      fetchedAt: Date.now(),
      source: 'remote',
      sourceLabel: 'YAML Yugi Master Duel 自动更新数据',
      fromCache: false,
      effectiveDate: versionData.date,
    };
    banlistCache.MasterDuel = { data, ts: Date.now() };
    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知网络错误';
    return buildLocalMasterDuelBanlist(
      `Master Duel 在线卡表请求失败（${message}），当前展示项目内置备用规则。`
    );
  }
}

async function fetchYgoProDeckCardsByNames(names: string[]): Promise<YgoCard[]> {
  const batches: string[][] = [];
  for (let index = 0; index < names.length; index += 20) {
    batches.push(names.slice(index, index + 20));
  }

  const fetchBatch = async (batch: string[]): Promise<YgoCard[]> => {
    const url = `https://db.ygoprodeck.com/api/v7/cardinfo.php?name=${encodeURIComponent(batch.join('|'))}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        if (batch.length === 1) return [];
        const midpoint = Math.ceil(batch.length / 2);
        const splitResults = await Promise.all([
          fetchBatch(batch.slice(0, midpoint)),
          fetchBatch(batch.slice(midpoint)),
        ]);
        return splitResults.flat();
      }
      const payload = await response.json();
      return Array.isArray(payload.data)
        ? (payload.data as YgoProDeckApiItem[]).map(mapYgoProDeckToYgoCard)
        : [];
    } catch {
      return [];
    }
  };

  const results = await Promise.all(batches.map(fetchBatch));

  return results.flat();
}

function createMinimalRemoteCard(name: string): YgoCard {
  let hash = 0;
  for (let index = 0; index < name.length; index++) {
    hash = ((hash << 5) - hash + name.charCodeAt(index)) | 0;
  }
  return {
    id: -Math.max(1, Math.abs(hash)),
    name,
    enName: name,
    type: 'monster',
    desc: '卡牌详情暂时无法从 YGOPRODeck 获取。',
    imageUrl: 'https://images.ygoprodeck.com/images/cards/back_high.jpg',
    source: 'YGOPRODeck',
  };
}

/** 在线数据不可用时，从项目内置 override 规则构建 Master Duel 卡表。 */
function buildLocalMasterDuelBanlist(warning: string): BanlistPageData {
  const forbidden: YgoCard[] = [];
  const limited: YgoCard[] = [];
  const semiLimited: YgoCard[] = [];

  for (const rule of LATEST_BANLIST_OVERPRIDES) {
    const status = rule.status.masterDuel;
    if (status === 'Unlimited') continue;

    const id = rule.ids[0];
    const name = rule.names?.[0] || `Card #${id}`;
    const card: YgoCard = {
      id,
      name,
      type: 'monster',
      desc: '',
      imageUrl: `https://cdn.233.momobako.com/ygopro/pics/${id}.jpg`,
      source: 'LOCAL_DB',
      banlistStatus: status,
      banlistInfo: rule.status
    };

    if (status === 'Forbidden') forbidden.push(card);
    else if (status === 'Limited') limited.push(card);
    else if (status === 'Semi-Limited') semiLimited.push(card);
  }

  const data: BanlistPageData = {
    forbidden,
    limited,
    semiLimited,
    fetchedAt: Date.now(),
    source: 'local-master-duel',
    sourceLabel: '项目内置 Master Duel 规则',
    fromCache: false,
    effectiveDate: '2026-08-04',
    warning,
  };
  banlistCache['MasterDuel'] = { data, ts: Date.now() };
  return data;
}

/** 回退：从 override 规则构建任意赛制禁卡表 */
function buildBanlistFromOverrides(format: GameFormat, warning?: string): BanlistPageData {
  const forbidden: YgoCard[] = [];
  const limited: YgoCard[] = [];
  const semiLimited: YgoCard[] = [];

  for (const rule of LATEST_BANLIST_OVERPRIDES) {
    const status = format === 'MasterDuel'
      ? rule.status.masterDuel
      : format === 'OCG'
      ? rule.status.ocg
      : rule.status.tcg;
    if (status === 'Unlimited') continue;

    const id = rule.ids[0];
    const name = rule.names?.[0] || `Card #${id}`;
    const card: YgoCard = {
      id, name, type: 'monster', desc: '',
      imageUrl: `https://cdn.233.momobako.com/ygopro/pics/${id}.jpg`,
      source: 'LOCAL_DB',
      banlistStatus: status,
      banlistInfo: rule.status
    };
    if (status === 'Forbidden') forbidden.push(card);
    else if (status === 'Limited') limited.push(card);
    else if (status === 'Semi-Limited') semiLimited.push(card);
  }

  return {
    forbidden,
    limited,
    semiLimited,
    fetchedAt: Date.now(),
    source: 'local-fallback',
    sourceLabel: `${format} 本地备用规则`,
    fromCache: false,
    warning,
  };
}

// 根据卡片 ID 或名称，从全量最新禁限注册表匹配获取状态
function resolveCardBanInfo(id: number, name?: string): { masterDuel: string; ocg: string; tcg: string } | null {
  for (const rule of LATEST_BANLIST_OVERPRIDES) {
    if (rule.ids.includes(id)) return rule.status;
    if (name && rule.names) {
      if (rule.names.some(n => name.toLowerCase().includes(n.toLowerCase()))) {
        return rule.status;
      }
    }
  }
  return null;
}

// 规范化禁限状态
function normalizeBanStatus(rawStatus?: string): string {
  if (!rawStatus) return 'Unlimited';
  const str = rawStatus.toLowerCase();
  if (str.includes('banned') || str.includes('forbidden')) return 'Forbidden';
  if (str.includes('limited') && !str.includes('semi')) return 'Limited';
  if (str.includes('semi')) return 'Semi-Limited';
  return 'Unlimited';
}

// 数据转换：百鸽 (YGOCDB)
function mapYgocdbToYgoCard(item: YgocdbApiItem): YgoCard {
  const isSpell = item.text?.types?.includes('魔法');
  const isTrap = item.text?.types?.includes('陷阱');
  let type: 'monster' | 'spell' | 'trap' = 'monster';
  if (isSpell) type = 'spell';
  if (isTrap) type = 'trap';

  const attrMap: Record<number, string> = {
    1: 'EARTH', 2: 'WATER', 4: 'FIRE', 8: 'WIND', 16: 'LIGHT', 32: 'DARK', 64: 'DIVINE'
  };

  const name = item.cn_name || item.sc_name || item.name || '未知卡片';
  const matchedOverride = resolveCardBanInfo(item.id, name);

  return {
    id: item.id,
    name,
    jpName: item.jp_name,
    enName: item.en_name,
    type,
    subType: item.text?.types || (type === 'spell' ? '【魔法卡】' : type === 'trap' ? '【陷阱卡】' : '【怪兽卡】'),
    attribute: item.data?.attribute ? attrMap[item.data.attribute] || 'LIGHT' : undefined,
    level: item.data?.level,
    atk: item.data?.atk === -1 ? '?' : item.data?.atk,
    def: item.data?.def === -1 ? '?' : item.data?.def,
    desc: item.text?.desc || '无效果文本',
    imageUrl: `https://cdn.233.momobako.com/ygopro/pics/${item.id}.jpg`,
    source: 'YGOCDB',
    banlistInfo: matchedOverride || {
      masterDuel: item.ban_md ? normalizeBanStatus(item.ban_md) : 'Unlimited',
      ocg: item.ban_ocg ? normalizeBanStatus(item.ban_ocg) : 'Unlimited',
      tcg: item.ban_tcg ? normalizeBanStatus(item.ban_tcg) : 'Unlimited'
    }
  };
}

// 数据转换：YGOPRODeck
function mapYgoProDeckToYgoCard(item: YgoProDeckApiItem): YgoCard {
  const rawType = item.type?.toLowerCase() || '';
  let type: 'monster' | 'spell' | 'trap' = 'monster';
  if (rawType.includes('spell')) type = 'spell';
  if (rawType.includes('trap')) type = 'trap';

  const name = item.name;
  const matchedOverride = resolveCardBanInfo(item.id, name);
  const tcgBan = normalizeBanStatus(item.banlist_info?.ban_tcg);
  const ocgBan = normalizeBanStatus(item.banlist_info?.ban_ocg);

  return {
    id: item.id,
    name,
    enName: item.name,
    type,
    subType: `【${item.type}】`,
    attribute: item.attribute?.toUpperCase(),
    race: item.race,
    level: item.level || item.rank || item.linkval,
    atk: item.atk,
    def: item.def,
    desc: item.desc || '',
    imageUrl: item.card_images?.[0]?.image_url || `https://images.ygoprodeck.com/images/cards/${item.id}.jpg`,
    imageUrlSmall: item.card_images?.[0]?.image_url_small,
    source: 'YGOPRODeck',
    archetype: item.archetype,
    banlistInfo: matchedOverride || {
      masterDuel: ocgBan,
      ocg: ocgBan,
      tcg: tcgBan
    }
  };
}

// 获取卡牌在指定赛制格式 (MasterDuel / OCG / TCG) 下的生效禁限状态
export function getCardBanStatusForFormat(card: YgoCard, format: GameFormat): string {
  const override = resolveCardBanInfo(card.id, card.name);
  if (override) {
    if (format === 'MasterDuel') return override.masterDuel;
    if (format === 'OCG') return override.ocg;
    if (format === 'TCG') return override.tcg;
  }

  if (!card.banlistInfo) return 'Unlimited';
  if (format === 'MasterDuel') return card.banlistInfo.masterDuel || 'Unlimited';
  if (format === 'OCG') return card.banlistInfo.ocg || 'Unlimited';
  if (format === 'TCG') return card.banlistInfo.tcg || 'Unlimited';
  return 'Unlimited';
}

// 核心查询逻辑：结合环境格式与最新禁限状态筛选
export async function fetchCards(dataSource: DataSourceType, filters: SearchFilters): Promise<YgoCard[]> {
  const keyword = filters.keyword.trim();
  let rawList: YgoCard[] = [];

  if (dataSource === 'LOCAL_DB') {
    rawList = (cachedYgoProDeckCards && cachedYgoProDeckCards.length > 0) ? cachedYgoProDeckCards : MOCK_LOCAL_CARDS;
  } else if (dataSource === 'YGOCDB') {
    if (!keyword) {
      rawList = MOCK_LOCAL_CARDS;
    } else {
      try {
        const resp = await fetch(`https://ygocdb.com/api/v0/?search=${encodeURIComponent(keyword)}`);
        if (resp.ok) {
          const data = await resp.json();
          if (data.result && Array.isArray(data.result)) {
            rawList = data.result.map(mapYgocdbToYgoCard);
          }
        }
      } catch {
        rawList = MOCK_LOCAL_CARDS;
      }
    }
  } else if (dataSource === 'YGOPRODeck') {
    if (cachedYgoProDeckCards && cachedYgoProDeckCards.length > 0) {
      rawList = cachedYgoProDeckCards;
    } else {
      if (!isFetchingYgoProDeckFull) {
        isFetchingYgoProDeckFull = true;
        cacheState = { status: 'loading', totalCount: 0, loadedCount: 0 };
        notifyCacheListeners();

        fetch('https://db.ygoprodeck.com/api/v7/cardinfo.php')
          .then(res => res.json())
          .then(data => {
            if (data.data && Array.isArray(data.data)) {
              const fullCards = data.data.map(mapYgoProDeckToYgoCard);
              cachedYgoProDeckCards = fullCards;
              cacheState = { status: 'ready', totalCount: fullCards.length, loadedCount: fullCards.length };
              notifyCacheListeners();
            }
          })
          .catch(() => {
            cacheState = { status: 'error', totalCount: 0, loadedCount: 0 };
            notifyCacheListeners();
          })
          .finally(() => { isFetchingYgoProDeckFull = false; });
      }

      if (!keyword) {
        rawList = [];
      } else {
        try {
          const url = `https://db.ygoprodeck.com/api/v7/cardinfo.php?fname=${encodeURIComponent(keyword)}`;
          const resp = await fetch(url);
          if (resp.ok) {
            const data = await resp.json();
            if (data.data && Array.isArray(data.data)) {
              rawList = data.data.map(mapYgoProDeckToYgoCard);
            }
          }
        } catch {
          rawList = MOCK_LOCAL_CARDS;
        }
      }
    }
  }

  // 动态挂载该卡片在当前 GameFormat 下的生效禁限状态
  return rawList.map(card => {
    const activeBanStatus = getCardBanStatusForFormat(card, filters.format);
    return {
      ...card,
      banlistStatus: activeBanStatus
    };
  }).filter(card => filterCard(card, keyword, filters));
}

// 过滤筛选函数
function filterCard(card: YgoCard, keyword: string, filters: SearchFilters): boolean {
  if (keyword) {
    const kw = keyword.toLowerCase();
    const matchName = card.name.toLowerCase().includes(kw);
    const matchJp = card.jpName?.toLowerCase().includes(kw);
    const matchEn = card.enName?.toLowerCase().includes(kw);
    const matchDesc = card.desc.toLowerCase().includes(kw);
    const matchId = card.id.toString() === kw;
    const matchArchetype = card.archetype?.toLowerCase().includes(kw);
    if (!matchName && !matchJp && !matchEn && !matchDesc && !matchId && !matchArchetype) {
      return false;
    }
  }

  if (filters.mainType !== 'all' && card.type !== filters.mainType) return false;
  if (filters.attribute !== 'ALL' && card.attribute !== filters.attribute) return false;
  if (filters.level !== 'ALL' && card.level?.toString() !== filters.level) return false;

  // 种族筛选
  if (filters.race && filters.race !== 'ALL') {
    if (!card.race || !card.race.toLowerCase().includes(filters.race.toLowerCase())) return false;
  }

  // 禁卡表状态筛选
  if (filters.banStatus !== 'all') {
    const activeBanStatus = card.banlistStatus || 'Unlimited';
    if (filters.banStatus === 'forbidden' && activeBanStatus !== 'Forbidden') return false;
    if (filters.banStatus === 'limited' && activeBanStatus !== 'Limited') return false;
    if (filters.banStatus === 'semi-limited' && activeBanStatus !== 'Semi-Limited') return false;
    if (filters.banStatus === 'unlimited' && activeBanStatus !== 'Unlimited') return false;
  }

  // 稀有度筛选
  if (filters.rarity && filters.rarity !== 'ALL') {
    if (!card.rarity || card.rarity.toUpperCase() !== filters.rarity.toUpperCase()) return false;
  }

  // 怪兽小类筛选
  if (filters.monsterSubType && filters.monsterSubType !== 'ALL' && card.type === 'monster') {
    const sub = (card.subType || '').toLowerCase();
    const targetMap: Record<string, string[]> = {
      'Normal':    ['通常', 'normal'],
      'Effect':    ['效果', 'effect'],
      'Fusion':    ['融合', 'fusion'],
      'Synchro':   ['同调', 'synchro'],
      'Xyz':       ['超量', 'xyz'],
      'Link':      ['连接', 'link'],
      'Ritual':    ['仪式', 'ritual'],
      'Pendulum':  ['灵摆', 'pendulum'],
      'Flip':      ['反转', 'flip'],
      'Toon':      ['卡通', 'toon'],
    };
    const keywords = targetMap[filters.monsterSubType] || [filters.monsterSubType.toLowerCase()];
    if (!keywords.some(kw => sub.includes(kw))) return false;
  }

  // 魔陷小类筛选
  if (filters.spellTrapSubType && filters.spellTrapSubType !== 'ALL' && (card.type === 'spell' || card.type === 'trap')) {
    const sub = (card.subType || '').toLowerCase();
    const targetMap: Record<string, string[]> = {
      'Normal':      ['通常', 'normal'],
      'Quick-Play':  ['速攻', 'quick'],
      'Continuous':  ['永续', 'continuous'],
      'Counter':     ['反击', 'counter'],
      'Equip':       ['装备', 'equip'],
      'Field':       ['场地', 'field'],
      'Ritual':      ['仪式', 'ritual'],
    };
    const keywords = targetMap[filters.spellTrapSubType] || [filters.spellTrapSubType.toLowerCase()];
    if (!keywords.some(kw => sub.includes(kw))) return false;
  }

  // ATK / DEF 范围筛选
  if (card.type === 'monster') {
    const atk = typeof card.atk === 'number' ? card.atk : (card.atk === '?' ? null : parseInt(card.atk as string, 10));
    if (filters.atkMin !== '' && filters.atkMin !== undefined) {
      const min = parseInt(filters.atkMin, 10);
      if (!isNaN(min) && (atk === null || atk < min)) return false;
    }
    if (filters.atkMax !== '' && filters.atkMax !== undefined) {
      const max = parseInt(filters.atkMax, 10);
      if (!isNaN(max) && (atk === null || atk > max)) return false;
    }

    const def = typeof card.def === 'number' ? card.def : (card.def === '?' ? null : parseInt(card.def as string, 10));
    if (filters.defMin !== '' && filters.defMin !== undefined) {
      const min = parseInt(filters.defMin, 10);
      if (!isNaN(min) && (def === null || def < min)) return false;
    }
    if (filters.defMax !== '' && filters.defMax !== undefined) {
      const max = parseInt(filters.defMax, 10);
      if (!isNaN(max) && (def === null || def > max)) return false;
    }
  }

  return true;
}
