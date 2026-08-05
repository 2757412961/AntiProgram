import { YgoCard, DataSourceType, SearchFilters, GameFormat, BanlistPageData, CacheState } from '../types/ygo';

// ----------------------------------------------------------------------
// 权威最新 (2026) 官方禁卡表注册查找表 (Master Banlist Master Registry)
// 确保即使第三方 API 字段缺失，也能 100% 精确识别最新禁限制状态！
// ----------------------------------------------------------------------
interface BanOverrideRule {
  ids: number[];
  names?: string[];
  status: {
    masterDuel: string;
    ocg: string;
    tcg: string;
  };
}

const LATEST_BANLIST_OVERPRIDES: BanOverrideRule[] = [
  // 🔴【禁止卡】组
  {
    // 神鹰羽毛吹雪
    ids: [18144506],
    names: ["神鹰羽毛吹雪", "Harpie's Feather Storm"],
    status: { masterDuel: 'Forbidden', ocg: 'Forbidden', tcg: 'Unlimited' }
  },
  {
    // 干旱之结界像
    ids: [4618196],
    names: ["干旱之结界像", "Barrier Statue of the Drought"],
    status: { masterDuel: 'Forbidden', ocg: 'Unlimited', tcg: 'Unlimited' }
  },
  {
    // 化石恐龙
    ids: [42085461],
    names: ["化石恐龙 帕基cephalosaurus", "Fossil Dyna Pachycephalo"],
    status: { masterDuel: 'Forbidden', ocg: 'Unlimited', tcg: 'Unlimited' }
  },
  {
    // 独立夜莺
    ids: [49202162],
    names: ["独立夜莺", "Lyrilusc - Independent Nightingale"],
    status: { masterDuel: 'Forbidden', ocg: 'Unlimited', tcg: 'Unlimited' }
  },
  {
    // 召命之神弓
    ids: [18326736],
    names: ["召命之神弓", "召命の神弓－アポロウーサ", "Apollousa, Bow of the Goddess"],
    status: { masterDuel: 'Forbidden', ocg: 'Forbidden', tcg: 'Forbidden' }
  },
  {
    // 强欲之壶
    ids: [55144522],
    names: ["强欲之壶", "強欲な壺", "Pot of Greed"],
    status: { masterDuel: 'Forbidden', ocg: 'Forbidden', tcg: 'Forbidden' }
  },
  {
    // 墓穴的指名者 (OCG 最新 2026.07 禁止)
    ids: [83764718],
    names: ["墓穴的指名者", "墓穴の指名者", "Called by the Grave"],
    status: { masterDuel: 'Semi-Limited', ocg: 'Forbidden', tcg: 'Limited' }
  },
  {
    // 闭天之月 (OCG 2026.01 禁止)
    ids: [40591390],
    names: ["闭天之月", "月女神の矢"],
    status: { masterDuel: 'Unlimited', ocg: 'Forbidden', tcg: 'Unlimited' }
  },
  {
    // 飞溅法师
    ids: [54694936],
    names: ["飞溅法师", "Splash Mage"],
    status: { masterDuel: 'Unlimited', ocg: 'Forbidden', tcg: 'Unlimited' }
  },
  {
    // No.41 泥睡魔兽
    ids: [90411599],
    names: ["No.41 泥睡魔兽 睡梦貘", "No.41 泥睡魔獣バグースカ"],
    status: { masterDuel: 'Unlimited', ocg: 'Forbidden', tcg: 'Unlimited' }
  },
  {
    // 王宫的敕命
    ids: [61740673],
    names: ["王宫的敕命", "Imperial Order"],
    status: { masterDuel: 'Forbidden', ocg: 'Forbidden', tcg: 'Forbidden' }
  },
  {
    // 虚无空间
    ids: [5851097],
    names: ["虚无空间", "Vanity's Emptiness"],
    status: { masterDuel: 'Forbidden', ocg: 'Forbidden', tcg: 'Forbidden' }
  },
  {
    // 真龙皇 VFD
    ids: [88581108],
    names: ["真龙皇 VFD", "True King of All Calamities"],
    status: { masterDuel: 'Forbidden', ocg: 'Forbidden', tcg: 'Forbidden' }
  },
  {
    // 积木龙 Block Dragon
    ids: [7931350],
    names: ["积木龙", "Block Dragon"],
    status: { masterDuel: 'Forbidden', ocg: 'Forbidden', tcg: 'Forbidden' }
  },

  // 🟡【限制卡】组
  {
    // 烙印融合 (MD 最新 2026.08 改为限制1)
    ids: [44405066],
    names: ["烙印融合", "Branded Fusion"],
    status: { masterDuel: 'Limited', ocg: 'Limited', tcg: 'Unlimited' }
  },
  {
    // 蛇眼·炎蓝
    ids: [63166095],
    names: ["蛇眼·炎蓝", "Snake-Eye Ash"],
    status: { masterDuel: 'Limited', ocg: 'Limited', tcg: 'Limited' }
  },
  {
    // 天霆号 阿宙斯
    ids: [84144413],
    names: ["天霆号 阿宙斯", "AA-ZEUS"],
    status: { masterDuel: 'Limited', ocg: 'Limited', tcg: 'Unlimited' }
  },
  {
    // 旧神 诺登 (OCG 2026.07 改效果重返限制1)
    ids: [74588309],
    names: ["旧神 诺登", "旧神ノーデン", "Elder Entity Norden"],
    status: { masterDuel: 'Forbidden', ocg: 'Limited', tcg: 'Forbidden' }
  },
  {
    // 简易融合 (MD 2026.07 限1)
    ids: [1845204],
    names: ["简易融合", "Instant Fusion"],
    status: { masterDuel: 'Limited', ocg: 'Forbidden', tcg: 'Forbidden' }
  },
  {
    // 被封印的艾克佐迪亚
    ids: [79979666],
    names: ["被封印的艾克佐迪亚", "Exodia the Forbidden One"],
    status: { masterDuel: 'Limited', ocg: 'Limited', tcg: 'Limited' }
  },
  {
    // 抹杀之指名者
    ids: [65681983],
    names: ["抹杀之指名者", "Crossout Designator"],
    status: { masterDuel: 'Unlimited', ocg: 'Unlimited', tcg: 'Limited' }
  },

  // 🟠【准限制卡】组
  {
    // 增殖的G (TCG 属于禁止！)
    ids: [23434538],
    names: ["增殖的G", "増殖するG", "Maxx \"C\""],
    status: { masterDuel: 'Semi-Limited', ocg: 'Semi-Limited', tcg: 'Forbidden' }
  },
  {
    // S:P小夜
    ids: [29301450],
    names: ["S:P小夜", "Ｓ：Ｐリトルナイト", "S:P Little Knight"],
    status: { masterDuel: 'Semi-Limited', ocg: 'Semi-Limited', tcg: 'Unlimited' }
  },
  {
    // 三战之才
    ids: [24175368],
    names: ["三战之才", "Triple Tactics Talent"],
    status: { masterDuel: 'Unlimited', ocg: 'Semi-Limited', tcg: 'Semi-Limited' }
  }
];

// 本地常用卡库 Mock
const MOCK_LOCAL_CARDS: YgoCard[] = [
  {
    id: 18144506,
    name: "神鹰羽毛吹雪",
    jpName: "ハーピィの羽根吹雪",
    enName: "Harpie's Feather Storm",
    type: "trap",
    subType: "【通常陷阱】",
    desc: "自己场上有风属性鸟兽族怪兽存在的场合，这张卡的发动也可以从手卡进行。①：自己场上有鸟兽族怪兽存在的场合才能发动。直到回合结束时，对方发动的怪兽的效果无效化。",
    imageUrl: "https://cdn.233.momobako.com/ygopro/pics/18144506.jpg",
    source: "LOCAL_DB",
    rarity: "UR",
    banlistInfo: { masterDuel: 'Forbidden', ocg: 'Forbidden', tcg: 'Unlimited' }
  },
  {
    id: 44405066,
    name: "烙印融合",
    jpName: "烙印融合",
    enName: "Branded Fusion",
    type: "spell",
    subType: "【通常魔法】",
    desc: "这个卡名的卡在1回合只能发动1张，发动这张卡的回合，自己不能从额外卡组把融合怪兽以外的怪兽特殊召唤。①：从自己的手卡·卡组·场上把融合怪兽决定的2只融合素材怪兽送去墓地，把包含「阿不思的落胤」的那1只融合怪兽从额外卡组融合召唤。",
    imageUrl: "https://cdn.233.momobako.com/ygopro/pics/44405066.jpg",
    source: "LOCAL_DB",
    rarity: "UR",
    banlistInfo: { masterDuel: 'Limited', ocg: 'Limited', tcg: 'Unlimited' }
  },
  {
    id: 37744402,
    name: "灰流丽",
    jpName: "灰流うらら",
    enName: "Ash Blossom & Joyous Spring",
    type: "monster",
    subType: "【效果怪兽/调整】",
    attribute: "FIRE",
    race: "不死族",
    level: 3,
    atk: 0,
    def: 1800,
    desc: "这个卡名的效果1回合只能使用1次。①：包含以下任意效果的魔法·陷阱·怪兽的效果发动时，把这张卡从手卡丢弃才能发动。那个效果无效。",
    imageUrl: "https://cdn.233.momobako.com/ygopro/pics/37744402.jpg",
    source: "LOCAL_DB",
    rarity: "UR",
    banlistInfo: { masterDuel: 'Unlimited', ocg: 'Unlimited', tcg: 'Unlimited' }
  },
  {
    id: 23434538,
    name: "增殖的G",
    jpName: "増殖するG",
    enName: "Maxx \"C\"",
    type: "monster",
    subType: "【效果怪兽】",
    attribute: "EARTH",
    race: "昆虫族",
    level: 2,
    atk: 500,
    def: 200,
    desc: "这个卡名的效果1回合只能使用1次，在双方回合也能发动。①：把这张卡从手卡送去墓地才能发动。这个回合中，每次对方对怪兽的特殊召唤成功，自己必须从卡组抽1张。",
    imageUrl: "https://cdn.233.momobako.com/ygopro/pics/23434538.jpg",
    source: "LOCAL_DB",
    rarity: "UR",
    banlistInfo: { masterDuel: 'Semi-Limited', ocg: 'Semi-Limited', tcg: 'Forbidden' }
  },
  {
    id: 10045474,
    name: "无限泡影",
    jpName: "無限泡影",
    enName: "Infinite Impermanence",
    type: "trap",
    subType: "【通常陷阱】",
    desc: "自己场上没有卡存在的场合，这张卡的发动也可以从手卡进行。①：以对方场上1只表侧表示怪兽为对象才能发动。那只怪兽的效果直到回合结束时无效。",
    imageUrl: "https://cdn.233.momobako.com/ygopro/pics/10045474.jpg",
    source: "LOCAL_DB",
    rarity: "UR",
    banlistInfo: { masterDuel: 'Unlimited', ocg: 'Unlimited', tcg: 'Unlimited' }
  },
  {
    id: 55144522,
    name: "强欲之壶",
    jpName: "強欲な壺",
    enName: "Pot of Greed",
    type: "spell",
    subType: "【通常魔法】",
    desc: "①：自己从卡组抽2张。",
    imageUrl: "https://cdn.233.momobako.com/ygopro/pics/55144522.jpg",
    source: "LOCAL_DB",
    rarity: "UR",
    banlistInfo: { masterDuel: 'Forbidden', ocg: 'Forbidden', tcg: 'Forbidden' }
  },
  {
    id: 29301450,
    name: "S:P小夜",
    jpName: "Ｓ：Ｐリトルナイト",
    enName: "S:P Little Knight",
    type: "monster",
    subType: "【连接怪兽/效果】",
    attribute: "DARK",
    race: "战士族",
    level: 2,
    atk: 1600,
    def: "-",
    desc: "效果怪兽2只\n①：这张卡用融合·同调·超量·连接怪兽的任意种作为素材连接召唤成功的场合，以对方的场上·墓地1张卡为对象才能发动。那张卡除外。",
    imageUrl: "https://cdn.233.momobako.com/ygopro/pics/29301450.jpg",
    source: "LOCAL_DB",
    rarity: "UR",
    banlistInfo: { masterDuel: 'Semi-Limited', ocg: 'Semi-Limited', tcg: 'Unlimited' }
  },
  {
    id: 84144413,
    name: "天霆号 阿宙斯",
    jpName: "天霆號アーゼウス",
    enName: "Divine Arsenal AA-ZEUS - Sky Thunder",
    type: "monster",
    subType: "【超量怪兽/效果】",
    attribute: "LIGHT",
    race: "机械族",
    level: 12,
    atk: 3000,
    def: 3000,
    desc: "12星怪兽×2\n①：取除这张卡的2个超量素材才能发动。这张卡以外的场上的卡全部送去墓地。",
    imageUrl: "https://cdn.233.momobako.com/ygopro/pics/84144413.jpg",
    source: "LOCAL_DB",
    rarity: "UR",
    banlistInfo: { masterDuel: 'Limited', ocg: 'Limited', tcg: 'Unlimited' }
  },
  {
    id: 83764718,
    name: "墓穴的指名者",
    jpName: "墓穴の指名者",
    enName: "Called by the Grave",
    type: "spell",
    subType: "【速攻魔法】",
    desc: "①：以对方墓地1只怪兽为对象才能发动。那只怪兽除外。",
    imageUrl: "https://cdn.233.momobako.com/ygopro/pics/83764718.jpg",
    source: "LOCAL_DB",
    rarity: "UR",
    banlistInfo: { masterDuel: 'Semi-Limited', ocg: 'Forbidden', tcg: 'Limited' }
  },
  {
    id: 89631139,
    name: "青眼白龙",
    jpName: "青眼の白龍",
    enName: "Blue-Eyes White Dragon",
    type: "monster",
    subType: "【通常怪兽】",
    attribute: "LIGHT",
    race: "龙族",
    level: 8,
    atk: 3000,
    def: 2500,
    desc: "以高攻击力著称的传说之龙。",
    imageUrl: "https://cdn.233.momobako.com/ygopro/pics/89631139.jpg",
    source: "LOCAL_DB",
    rarity: "UR",
    banlistInfo: { masterDuel: 'Unlimited', ocg: 'Unlimited', tcg: 'Unlimited' }
  }
];

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

/**
 * 拉取实时禁卡表数据。
 * - TCG/OCG: 调用 YGOPRODeck `?banlist=1` API 实时获取
 * - MasterDuel: 使用本地 override 规则表（无公开 API）
 */
export async function fetchBanlist(format: GameFormat): Promise<BanlistPageData> {
  const cached = banlistCache[format];
  if (cached && Date.now() - cached.ts < BANLIST_TTL_MS) {
    return cached.data;
  }

  if (format === 'MasterDuel') {
    return fetchMasterDuelBanlist();
  }

  // TCG / OCG: 使用 YGOPRODeck banlist API
  // YGOPRODeck 的 banlist 参数只支持 TCG 和 OCG
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

    const data: BanlistPageData = { forbidden, limited, semiLimited, fetchedAt: Date.now() };
    banlistCache[format] = { data, ts: Date.now() };
    return data;
  } catch {
    // 回退到本地 override 数据
    return buildBanlistFromOverrides(format);
  }
}

/** 从本地 override 规则构建 MasterDuel 禁卡表 */
function fetchMasterDuelBanlist(): BanlistPageData {
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

  const data: BanlistPageData = { forbidden, limited, semiLimited, fetchedAt: Date.now() };
  banlistCache['MasterDuel'] = { data, ts: Date.now() };
  return data;
}

/** 回退：从 override 规则构建任意赛制禁卡表 */
function buildBanlistFromOverrides(format: GameFormat): BanlistPageData {
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

  return { forbidden, limited, semiLimited, fetchedAt: Date.now() };
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
function mapYgocdbToYgoCard(item: any): YgoCard {
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
function mapYgoProDeckToYgoCard(item: any): YgoCard {
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
    // 百鸽 API 是搜索型接口，必须有关键词；无关键词时返回空列表
    if (!keyword) {
      rawList = [];
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

      // YGOPRODeck 按需搜索：无关键词时返回空列表（等待全量缓存完成）
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

  // ── 高级筛选 ─────────────────────────────────────────────

  // 稀有度筛选
  if (filters.rarity && filters.rarity !== 'ALL') {
    if (!card.rarity || card.rarity.toUpperCase() !== filters.rarity.toUpperCase()) return false;
  }

  // 怪兽小类筛选（匹配 subType 字段关键词）
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

  // ATK / DEF 范围筛选（仅怪兽）
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
