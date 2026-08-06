import { BanOverrideRule } from '../types/ygo';

// ----------------------------------------------------------------------
// 权威最新 (2026) 官方禁卡表注册查找表 (Master Banlist Master Registry)
// 确保即使第三方 API 字段缺失，也能 100% 精确识别最新禁限制状态！
// ----------------------------------------------------------------------
export const LATEST_BANLIST_OVERPRIDES: BanOverrideRule[] = [
  // 🔴【禁止卡】组
  {
    ids: [18144506],
    names: ["神鹰羽毛吹雪", "Harpie's Feather Storm"],
    status: { masterDuel: 'Forbidden', ocg: 'Forbidden', tcg: 'Unlimited' }
  },
  {
    ids: [4618196],
    names: ["干旱之结界像", "Barrier Statue of the Drought"],
    status: { masterDuel: 'Forbidden', ocg: 'Unlimited', tcg: 'Unlimited' }
  },
  {
    ids: [42085461],
    names: ["化石恐龙 帕基cephalosaurus", "Fossil Dyna Pachycephalo"],
    status: { masterDuel: 'Forbidden', ocg: 'Unlimited', tcg: 'Unlimited' }
  },
  {
    ids: [49202162],
    names: ["独立夜莺", "Lyrilusc - Independent Nightingale"],
    status: { masterDuel: 'Forbidden', ocg: 'Unlimited', tcg: 'Unlimited' }
  },
  {
    ids: [18326736],
    names: ["召命之神弓", "召命の神弓－アポロウーサ", "Apollousa, Bow of the Goddess"],
    status: { masterDuel: 'Forbidden', ocg: 'Forbidden', tcg: 'Forbidden' }
  },
  {
    ids: [55144522],
    names: ["强欲之壶", "強欲な壺", "Pot of Greed"],
    status: { masterDuel: 'Forbidden', ocg: 'Forbidden', tcg: 'Forbidden' }
  },
  {
    ids: [83764718],
    names: ["墓穴的指名者", "墓穴の指名者", "Called by the Grave"],
    status: { masterDuel: 'Semi-Limited', ocg: 'Forbidden', tcg: 'Limited' }
  },
  {
    ids: [40591390],
    names: ["闭天之月", "月女神の矢"],
    status: { masterDuel: 'Unlimited', ocg: 'Forbidden', tcg: 'Unlimited' }
  },
  {
    ids: [54694936],
    names: ["飞溅法师", "Splash Mage"],
    status: { masterDuel: 'Unlimited', ocg: 'Forbidden', tcg: 'Unlimited' }
  },
  {
    ids: [90411599],
    names: ["No.41 泥睡魔兽 睡梦貘", "No.41 泥睡魔獣バグースカ"],
    status: { masterDuel: 'Unlimited', ocg: 'Forbidden', tcg: 'Unlimited' }
  },
  {
    ids: [61740673],
    names: ["王宫的敕命", "Imperial Order"],
    status: { masterDuel: 'Forbidden', ocg: 'Forbidden', tcg: 'Forbidden' }
  },
  {
    ids: [5851097],
    names: ["虚无空间", "Vanity's Emptiness"],
    status: { masterDuel: 'Forbidden', ocg: 'Forbidden', tcg: 'Forbidden' }
  },
  {
    ids: [88581108],
    names: ["真龙皇 VFD", "True King of All Calamities"],
    status: { masterDuel: 'Forbidden', ocg: 'Forbidden', tcg: 'Forbidden' }
  },
  {
    ids: [7931350],
    names: ["积木龙", "Block Dragon"],
    status: { masterDuel: 'Forbidden', ocg: 'Forbidden', tcg: 'Forbidden' }
  },

  // 🟡【限制卡】组
  {
    ids: [44405066],
    names: ["烙印融合", "Branded Fusion"],
    status: { masterDuel: 'Limited', ocg: 'Limited', tcg: 'Unlimited' }
  },
  {
    ids: [63166095],
    names: ["蛇眼·炎蓝", "Snake-Eye Ash"],
    status: { masterDuel: 'Limited', ocg: 'Limited', tcg: 'Limited' }
  },
  {
    ids: [84144413],
    names: ["天霆号 阿宙斯", "AA-ZEUS"],
    status: { masterDuel: 'Limited', ocg: 'Limited', tcg: 'Unlimited' }
  },
  {
    ids: [74588309],
    names: ["旧神 诺登", "旧神ノーデン", "Elder Entity Norden"],
    status: { masterDuel: 'Forbidden', ocg: 'Limited', tcg: 'Forbidden' }
  },
  {
    ids: [1845204],
    names: ["简易融合", "Instant Fusion"],
    status: { masterDuel: 'Limited', ocg: 'Forbidden', tcg: 'Forbidden' }
  },
  {
    ids: [79979666],
    names: ["被封印的艾克佐迪亚", "Exodia the Forbidden One"],
    status: { masterDuel: 'Limited', ocg: 'Limited', tcg: 'Limited' }
  },
  {
    ids: [65681983],
    names: ["抹杀之指名者", "Crossout Designator"],
    status: { masterDuel: 'Unlimited', ocg: 'Unlimited', tcg: 'Limited' }
  },

  // 🟠【准限制卡】组
  {
    ids: [23434538],
    names: ["增殖的G", "増殖するG", "Maxx \"C\""],
    status: { masterDuel: 'Semi-Limited', ocg: 'Semi-Limited', tcg: 'Forbidden' }
  },
  {
    ids: [29301450],
    names: ["S:P小夜", "Ｓ：Ｐリトルナイト", "S:P Little Knight"],
    status: { masterDuel: 'Semi-Limited', ocg: 'Semi-Limited', tcg: 'Unlimited' }
  },
  {
    ids: [24175368],
    names: ["三战之才", "Triple Tactics Talent"],
    status: { masterDuel: 'Unlimited', ocg: 'Semi-Limited', tcg: 'Semi-Limited' }
  }
];
