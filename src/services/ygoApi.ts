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
import { localizeCardsFromYgocdb } from './cardDetailService';

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
const YGOPRODECK_ALL_CARDS_WITH_MISC_URL =
  'https://db.ygoprodeck.com/api/v7/cardinfo.php?misc=yes';
const MASTER_DUEL_VECTOR_URL = import.meta.env.DEV
  ? '/api/master-duel-banlist'
  : `${MASTER_DUEL_BANLIST_BASE_URL}/current.vector.json`;
const MASTER_DUEL_CARD_METADATA_URL = import.meta.env.DEV
  ? '/api/ygoprodeck/cardinfo.php?misc=yes'
  : YGOPRODECK_ALL_CARDS_WITH_MISC_URL;
const YAML_YUGI_CARD_BASE_URL = import.meta.env.DEV
  ? '/api/yaml-yugi-cards'
  : 'https://cdn.jsdelivr.net/gh/DawnbrandBots/yaml-yugi/data/cards';

interface MasterDuelVectorResponse {
  date: string;
  regulation: Record<string, number>;
}

interface MasterDuelSnapshot {
  date: string;
  fetchedAt: number;
  regulation: Array<[number, 0 | 1 | 2]>;
  cardsByKonamiId: Map<number, YgoCard>;
  statusByPasscode: Map<number, string>;
  rarityByPasscode: Map<number, string>;
  availablePasscodes: Set<number>;
}

let masterDuelSnapshot: MasterDuelSnapshot | null = null;
let masterDuelSnapshotRequest: Promise<MasterDuelSnapshot> | null = null;

function normalizeMasterDuelRarity(rawRarity?: string): string | undefined {
  if (!rawRarity) return undefined;
  const normalized = rawRarity.trim().toLowerCase();
  if (normalized === 'n' || normalized === 'normal' || normalized === 'common') return 'N';
  if (normalized === 'r' || normalized === 'rare') return 'R';
  if (normalized === 'sr' || normalized === 'super rare') return 'SR';
  if (normalized === 'ur' || normalized === 'ultra rare') return 'UR';
  return undefined;
}

async function fetchYamlYugiMasterDuelRarity(cardId: number): Promise<string | undefined> {
  try {
    const response = await fetch(`${YAML_YUGI_CARD_BASE_URL}/${cardId}.json`);
    if (!response.ok) return undefined;
    const payload = await response.json() as { master_duel_rarity?: string };
    return normalizeMasterDuelRarity(payload.master_duel_rarity);
  } catch {
    return undefined;
  }
}

export interface FetchBanlistOptions {
  /** 用户主动刷新时绕过 5 分钟内存缓存。 */
  forceRefresh?: boolean;
}

/**
 * 拉取实时禁卡表数据。
 * - TCG/OCG: 调用 YGOPRODeck `?banlist=1` API 实时获取
 * - MasterDuel: YAML Yugi 当前生效 vector + YGOPRODeck Konami ID 元数据
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
    return fetchMasterDuelBanlist(options.forceRefresh);
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

    const [localizedForbidden, localizedLimited, localizedSemiLimited] = await Promise.all([
      localizeCardsFromYgocdb(forbidden),
      localizeCardsFromYgocdb(limited),
      localizeCardsFromYgocdb(semiLimited),
    ]);

    const data: BanlistPageData = {
      forbidden: localizedForbidden,
      limited: localizedLimited,
      semiLimited: localizedSemiLimited,
      fetchedAt: Date.now(),
      source: 'remote',
      sourceLabel: `YGOPRODeck ${format} API`,
      fromCache: false,
    };
    banlistCache[format] = { data, ts: Date.now() };
    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知网络错误';
    throw new Error(`${format} 实时禁卡表接口请求失败（${message}）；未使用手写备用规则。`);
  }
}

/**
 * 读取并严格校验当前 Master Duel 禁限表。
 * vector 的键是 Konami 卡库 ID，不是卡片密码；展示元数据必须按该 ID 一一映射。
 */
async function loadMasterDuelSnapshot(): Promise<MasterDuelSnapshot> {
  const [vectorResponse, cardsResponse] = await Promise.all([
    fetch(MASTER_DUEL_VECTOR_URL, { cache: 'no-store' }),
    fetch(MASTER_DUEL_CARD_METADATA_URL, { cache: 'no-store' }),
  ]);

  if (!vectorResponse.ok) throw new Error(`Master Duel 当前卡表接口 HTTP ${vectorResponse.status}`);
  if (!cardsResponse.ok) throw new Error(`卡片元数据接口 HTTP ${cardsResponse.status}`);

  const vector = await vectorResponse.json() as Partial<MasterDuelVectorResponse>;
  const cardPayload = await cardsResponse.json() as { data?: YgoProDeckApiItem[] };
  if (!vector.date || !/^\d{4}-\d{2}-\d{2}$/.test(vector.date)) {
    throw new Error('Master Duel 当前卡表缺少有效生效日期');
  }
  if (!vector.regulation || typeof vector.regulation !== 'object' || Array.isArray(vector.regulation)) {
    throw new Error('Master Duel 当前卡表缺少 regulation 对象');
  }
  if (!Array.isArray(cardPayload.data) || cardPayload.data.length === 0) {
    throw new Error('卡片元数据接口返回空数据');
  }

  const rawEntries = Object.entries(vector.regulation);
  if (rawEntries.length === 0) throw new Error('Master Duel 当前卡表为空');
  for (const [rawId, limit] of rawEntries) {
    if (!/^\d+$/.test(rawId) || !Number.isInteger(limit) || ![0, 1, 2].includes(limit)) {
      throw new Error(`Master Duel 当前卡表包含无效条目：${rawId}`);
    }
  }
  const regulation = rawEntries.map(([rawId, limit]) =>
    [Number(rawId), limit as 0 | 1 | 2] as [number, 0 | 1 | 2]
  );

  const cardsByKonamiId = new Map<number, YgoCard>();
  const duplicateKonamiIds = new Set<number>();
  const availablePasscodes = new Set<number>();
  const rarityByPasscode = new Map<number, string>();
  const allCards = cardPayload.data.map(item => {
    const card = mapYgoProDeckToYgoCard(item);
    for (const misc of item.misc_info || []) {
      if (misc.formats?.some(format => format.toLowerCase() === 'master duel')) {
        availablePasscodes.add(card.id);
      }
      const rarity = normalizeMasterDuelRarity(misc.md_rarity);
      if (rarity) rarityByPasscode.set(card.id, rarity);
      if (Number.isInteger(misc.konami_id)) {
        const konamiId = misc.konami_id!;
        if (cardsByKonamiId.has(konamiId)) duplicateKonamiIds.add(konamiId);
        else cardsByKonamiId.set(konamiId, card);
      }
    }
    return card;
  });

  const missingIds = regulation
    .map(([konamiId]) => konamiId)
    .filter(konamiId => !cardsByKonamiId.has(konamiId));
  const ambiguousIds = regulation
    .map(([konamiId]) => konamiId)
    .filter(konamiId => duplicateKonamiIds.has(konamiId));
  if (missingIds.length > 0 || ambiguousIds.length > 0) {
    throw new Error(
      `Master Duel 卡表映射不完整：缺失 ${missingIds.length}，重复 ${ambiguousIds.length}`
    );
  }

  const statusByPasscode = new Map<number, string>();
  for (const [konamiId, limit] of regulation) {
    const card = cardsByKonamiId.get(konamiId)!;
    const status = limit === 0 ? 'Forbidden' : limit === 1 ? 'Limited' : 'Semi-Limited';
    statusByPasscode.set(card.id, status);
    // 当前生效规则比卡库的 formats 标签更新得更快时，以规则记录证明该卡属于 MD 数据域。
    availablePasscodes.add(card.id);
  }

  // YGOPRODeck 的 MD formats/rarity 更新可能略有延迟。只为其缺项查询 YAML Yugi
  // 单卡记录中的 master_duel_rarity；两边都未提供时保持未知，绝不猜测。
  const missingRarityPasscodes = [...availablePasscodes]
    .filter(passcode => !rarityByPasscode.has(passcode));
  const rarityFallbacks = await Promise.all(missingRarityPasscodes.map(async passcode => ({
    passcode,
    rarity: await fetchYamlYugiMasterDuelRarity(passcode),
  })));
  for (const { passcode, rarity } of rarityFallbacks) {
    if (rarity) rarityByPasscode.set(passcode, rarity);
  }

  cachedYgoProDeckCards = allCards;
  cacheState = { status: 'ready', totalCount: allCards.length, loadedCount: allCards.length };
  notifyCacheListeners();
  masterDuelSnapshot = {
    date: vector.date,
    fetchedAt: Date.now(),
    regulation,
    cardsByKonamiId,
    statusByPasscode,
    rarityByPasscode,
    availablePasscodes,
  };
  return masterDuelSnapshot;
}

async function getMasterDuelSnapshot(forceRefresh = false): Promise<MasterDuelSnapshot> {
  if (!forceRefresh && masterDuelSnapshot && Date.now() - masterDuelSnapshot.fetchedAt < BANLIST_TTL_MS) {
    return masterDuelSnapshot;
  }
  if (masterDuelSnapshotRequest) return masterDuelSnapshotRequest;

  masterDuelSnapshotRequest = loadMasterDuelSnapshot().finally(() => {
    masterDuelSnapshotRequest = null;
  });
  return masterDuelSnapshotRequest;
}

async function fetchMasterDuelBanlist(forceRefresh = false): Promise<BanlistPageData> {
  const snapshot = await getMasterDuelSnapshot(forceRefresh);

  const forbidden: YgoCard[] = [];
  const limited: YgoCard[] = [];
  const semiLimited: YgoCard[] = [];

  for (const [konamiId, limit] of snapshot.regulation) {
    const detail = snapshot.cardsByKonamiId.get(konamiId);
    if (!detail) throw new Error(`Master Duel 卡表无法映射 Konami ID ${konamiId}`);
    const status = limit === 0 ? 'Forbidden' : limit === 1 ? 'Limited' : 'Semi-Limited';
    const card: YgoCard = {
      ...detail,
      rarity: snapshot.rarityByPasscode.get(detail.id),
      banlistStatus: status,
      banlistInfo: { ...detail.banlistInfo, masterDuel: status },
    };
    if (limit === 0) forbidden.push(card);
    else if (limit === 1) limited.push(card);
    else semiLimited.push(card);
  }

  if (forbidden.length + limited.length + semiLimited.length !== snapshot.regulation.length) {
    throw new Error('Master Duel 卡表分类数量校验失败');
  }

  const [localizedForbidden, localizedLimited, localizedSemiLimited] = await Promise.all([
    localizeCardsFromYgocdb(forbidden),
    localizeCardsFromYgocdb(limited),
    localizeCardsFromYgocdb(semiLimited),
  ]);
  const data: BanlistPageData = {
    forbidden: localizedForbidden,
    limited: localizedLimited,
    semiLimited: localizedSemiLimited,
    fetchedAt: snapshot.fetchedAt,
    source: 'remote',
    sourceLabel: 'YAML Yugi 当前生效 Master Duel vector（YGOPRODeck 元数据映射）',
    fromCache: false,
    effectiveDate: snapshot.date,
  };
  banlistCache.MasterDuel = { data, ts: Date.now() };
  return data;
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
    localizationIds: item.card_images
      ?.map(image => image.id)
      .filter((id): id is number => Number.isInteger(id) && id !== item.id),
    source: 'YGOPRODeck',
    archetype: item.archetype,
    banlistInfo: matchedOverride || {
      ocg: ocgBan,
      tcg: tcgBan
    }
  };
}

// 获取卡牌在指定赛制格式 (MasterDuel / OCG / TCG) 下的生效禁限状态
export function getCardBanStatusForFormat(card: YgoCard, format: GameFormat): string {
  if (format === 'MasterDuel' && masterDuelSnapshot) {
    return masterDuelSnapshot.statusByPasscode.get(card.id) || 'Unlimited';
  }

  const override = resolveCardBanInfo(card.id, card.name);
  if (override) {
    if (format === 'MasterDuel') return override.masterDuel;
    if (format === 'OCG') return override.ocg;
    if (format === 'TCG') return override.tcg;
  }

  if (!card.banlistInfo) return 'Unlimited';
  if (format === 'MasterDuel') return 'Unlimited';
  if (format === 'OCG') return card.banlistInfo.ocg || 'Unlimited';
  if (format === 'TCG') return card.banlistInfo.tcg || 'Unlimited';
  return 'Unlimited';
}

// 核心查询逻辑：结合环境格式与最新禁限状态筛选
export async function fetchCards(dataSource: DataSourceType, filters: SearchFilters): Promise<YgoCard[]> {
  const keyword = filters.keyword.trim();
  let rawList: YgoCard[] = [];

  // Master Duel 状态只来自当前生效 vector。先确保状态快照和卡池均已严格校验，
  // 不再把 OCG 状态或手写 override 当作 Master Duel 状态。
  if (filters.format === 'MasterDuel') {
    await getMasterDuelSnapshot();
  }

  if (dataSource === 'LOCAL_DB') {
    rawList = (cachedYgoProDeckCards && cachedYgoProDeckCards.length > 0) ? cachedYgoProDeckCards : MOCK_LOCAL_CARDS;
  } else if (dataSource === 'YGOCDB') {
    if (!keyword) {
      rawList = (cachedYgoProDeckCards && cachedYgoProDeckCards.length > 0)
        ? cachedYgoProDeckCards
        : MOCK_LOCAL_CARDS;
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
        rawList = (cachedYgoProDeckCards && cachedYgoProDeckCards.length > 0)
          ? cachedYgoProDeckCards
          : MOCK_LOCAL_CARDS;
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
  const filteredCards = rawList.filter(card =>
    filters.format !== 'MasterDuel' || masterDuelSnapshot!.availablePasscodes.has(card.id)
  ).map(card => {
    const activeBanStatus = getCardBanStatusForFormat(card, filters.format);
    const masterDuelRarity = filters.format === 'MasterDuel'
      ? masterDuelSnapshot!.rarityByPasscode.get(card.id)
      : undefined;
    return {
      ...card,
      rarity: masterDuelRarity || card.rarity,
      banlistStatus: activeBanStatus,
      banlistInfo: filters.format === 'MasterDuel'
        ? { ...card.banlistInfo, masterDuel: activeBanStatus }
        : card.banlistInfo,
    };
  }).filter(card => filterCard(card, keyword, filters));

  return localizeCardsFromYgocdb(filteredCards);
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
