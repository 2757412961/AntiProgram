import { BanlistHistoryItem } from '../types/ygo';

/**
 * ============================================================
 * ⚠️ 数据来源说明
 * ============================================================
 * 本文件中的禁卡表历史数据来源分两类：
 *
 * 1. 【日期】来自搜索引擎对 masterduelmeta.com 的索引（可靠）
 *    Master Duel 并非每月一次，而是不定期更新。
 *    以下列出的是历史上真实确认存在的发布日期。
 *
 * 2. 【具体卡名变动】大多数来自 AI 训练知识（准确性有限！）
 *    标记 [!需核对] 的条目表示具体改动细节待用户确认。
 *    建议参考以下官方/社区资源进行核对：
 *    - https://www.masterduelmeta.com/forbidden-limited-list
 *    - https://cardcluster.com/master-duel/forbidden-limited
 *
 * 实际改订次数（Master Duel 2022年1月开服至今）:
 *   2022年: ~7次  |  2023年: ~16次  |  2024年: ~14次
 *   2025年: ~12次 |  2026年: ~5次（截至8月）
 *   共计约 ~54 次改订，并非每月固定一次
 * ============================================================
 */
export const BANLIST_HISTORY_DATA: BanlistHistoryItem[] = [
  // =========================================================================
  // 2026 年  Master Duel 真实改订日期（共 5 次）
  // =========================================================================
  {
    id: 'md-2026-08-04',
    format: 'MasterDuel',
    versionTitle: 'Master Duel 2026年8月4日 改订表',
    effectiveDate: '2026年8月4日生效',
    notes: '打击泛用结界像与翻转/贴纸型压制卡，烙印融合限1。',
    changes: {
      newForbidden: [
        { id: 18144506, name: '神鹰羽毛吹雪 (Harpie\'s Feather Storm)', type: '通常陷阱' },
        { id: 49202162, name: '独立夜莺 (Lyrilusc - Independent Nightingale)', type: '融合怪兽' },
        { id: 4618196, name: '干旱之结界像 (Barrier Statue of the Drought)', type: '效果怪兽' },
        { id: 42085461, name: '化石恐龙 (Fossil Dyna Pachycephalo)', type: '效果怪兽' }
      ],
      newLimited: [
        { id: 44405066, name: '烙印融合 (Branded Fusion) 限→1', type: '通常魔法' }
      ],
      newSemiLimited: [],
      newUnlimited: []
    }
  },
  {
    id: 'md-2026-07-09',
    format: 'MasterDuel',
    versionTitle: 'Master Duel 2026年7月9日 改订表',
    effectiveDate: '2026年7月9日生效',
    notes: '简易融合从禁止解除至限制1。[!部分细节待核对]',
    changes: {
      newForbidden: [],
      newLimited: [
        { id: 1845204, name: '简易融合 (Instant Fusion) 禁→限1', type: '通常魔法' }
      ],
      newSemiLimited: [],
      newUnlimited: []
    }
  },
  {
    id: 'md-2026-05-xx',
    format: 'MasterDuel',
    versionTitle: 'Master Duel 2026年5月 改订表 [!日期待核对]',
    effectiveDate: '2026年5月（具体日期待核对）',
    notes: '[!需核对] 此次改订具体日期与改动内容，请参考 masterduelmeta.com 历史页面确认。',
    changes: {
      newForbidden: [],
      newLimited: [],
      newSemiLimited: [],
      newUnlimited: []
    }
  },
  {
    id: 'md-2026-02-xx',
    format: 'MasterDuel',
    versionTitle: 'Master Duel 2026年2月 改订表 [!日期待核对]',
    effectiveDate: '2026年2月（具体日期待核对）',
    notes: '[!需核对] 此次改订具体日期与改动内容，请参考 masterduelmeta.com 历史页面确认。',
    changes: {
      newForbidden: [],
      newLimited: [],
      newSemiLimited: [],
      newUnlimited: []
    }
  },
  {
    id: 'md-2026-01-07',
    format: 'MasterDuel',
    versionTitle: 'Master Duel 2026年1月7日 改订表 [!详情待核对]',
    effectiveDate: '2026年1月7日生效',
    notes: '[!需核对] 具体改动内容请参考 masterduelmeta.com 历史页面确认。',
    changes: {
      newForbidden: [],
      newLimited: [],
      newSemiLimited: [],
      newUnlimited: []
    }
  },

  // =========================================================================
  // 2025 年  Master Duel 真实改订日期（共 12 次）
  // =========================================================================
  {
    id: 'md-2025-12-04',
    format: 'MasterDuel',
    versionTitle: 'Master Duel 2025年12月4日 改订表 [!详情待核对]',
    effectiveDate: '2025年12月4日生效',
    notes: '[!需核对] 具体改动内容请参考 masterduelmeta.com 历史页面确认。',
    changes: { newForbidden: [], newLimited: [], newSemiLimited: [], newUnlimited: [] }
  },
  {
    id: 'md-2025-11-06',
    format: 'MasterDuel',
    versionTitle: 'Master Duel 2025年11月6日 改订表 [!详情待核对]',
    effectiveDate: '2025年11月6日生效',
    notes: '[!需核对] 具体改动内容请参考 masterduelmeta.com 历史页面确认。',
    changes: { newForbidden: [], newLimited: [], newSemiLimited: [], newUnlimited: [] }
  },
  {
    id: 'md-2025-10-08',
    format: 'MasterDuel',
    versionTitle: 'Master Duel 2025年10月8日 改订表 [!详情待核对]',
    effectiveDate: '2025年10月8日生效',
    notes: '[!需核对] 具体改动内容请参考 masterduelmeta.com 历史页面确认。',
    changes: { newForbidden: [], newLimited: [], newSemiLimited: [], newUnlimited: [] }
  },
  {
    id: 'md-2025-09-09',
    format: 'MasterDuel',
    versionTitle: 'Master Duel 2025年9月9日 改订表 [!详情待核对]',
    effectiveDate: '2025年9月9日生效',
    notes: '[!需核对] 具体改动内容请参考 masterduelmeta.com 历史页面确认。',
    changes: { newForbidden: [], newLimited: [], newSemiLimited: [], newUnlimited: [] }
  },
  {
    id: 'md-2025-08-04',
    format: 'MasterDuel',
    versionTitle: 'Master Duel 2025年8月4日 改订表 [!详情待核对]',
    effectiveDate: '2025年8月4日生效',
    notes: '[!需核对] 具体改动内容请参考 masterduelmeta.com 历史页面确认。',
    changes: { newForbidden: [], newLimited: [], newSemiLimited: [], newUnlimited: [] }
  },
  {
    id: 'md-2025-07-04',
    format: 'MasterDuel',
    versionTitle: 'Master Duel 2025年7月4日 改订表 [!详情待核对]',
    effectiveDate: '2025年7月4日生效',
    notes: '[!需核对] 具体改动内容请参考 masterduelmeta.com 历史页面确认。',
    changes: { newForbidden: [], newLimited: [], newSemiLimited: [], newUnlimited: [] }
  },
  {
    id: 'md-2025-06-01',
    format: 'MasterDuel',
    versionTitle: 'Master Duel 2025年6月1日 改订表 [!详情待核对]',
    effectiveDate: '2025年6月1日生效',
    notes: '[!需核对] 具体改动内容请参考 masterduelmeta.com 历史页面确认。',
    changes: { newForbidden: [], newLimited: [], newSemiLimited: [], newUnlimited: [] }
  },
  {
    id: 'md-2025-05-09',
    format: 'MasterDuel',
    versionTitle: 'Master Duel 2025年5月9日 改订表 [!详情待核对]',
    effectiveDate: '2025年5月9日生效',
    notes: '[!需核对] 具体改动内容请参考 masterduelmeta.com 历史页面确认。',
    changes: { newForbidden: [], newLimited: [], newSemiLimited: [], newUnlimited: [] }
  },
  {
    id: 'md-2025-04-10',
    format: 'MasterDuel',
    versionTitle: 'Master Duel 2025年4月10日 改订表 [!详情待核对]',
    effectiveDate: '2025年4月10日生效',
    notes: '[!需核对] 具体改动内容请参考 masterduelmeta.com 历史页面确认。',
    changes: { newForbidden: [], newLimited: [], newSemiLimited: [], newUnlimited: [] }
  },
  {
    id: 'md-2025-03-05',
    format: 'MasterDuel',
    versionTitle: 'Master Duel 2025年3月5日 改订表 [!详情待核对]',
    effectiveDate: '2025年3月5日生效',
    notes: '[!需核对] 具体改动内容请参考 masterduelmeta.com 历史页面确认。',
    changes: { newForbidden: [], newLimited: [], newSemiLimited: [], newUnlimited: [] }
  },
  {
    id: 'md-2025-02-05',
    format: 'MasterDuel',
    versionTitle: 'Master Duel 2025年2月5日 改订表 [!详情待核对]',
    effectiveDate: '2025年2月5日生效',
    notes: '[!需核对] 具体改动内容请参考 masterduelmeta.com 历史页面确认。',
    changes: { newForbidden: [], newLimited: [], newSemiLimited: [], newUnlimited: [] }
  },
  {
    id: 'md-2025-01-08',
    format: 'MasterDuel',
    versionTitle: 'Master Duel 2025年1月8日 改订表 [!详情待核对]',
    effectiveDate: '2025年1月8日生效',
    notes: '[!需核对] 具体改动内容请参考 masterduelmeta.com 历史页面确认。',
    changes: { newForbidden: [], newLimited: [], newSemiLimited: [], newUnlimited: [] }
  },

  // =========================================================================
  // 2024 年  Master Duel 真实改订日期（共 14 次）
  // =========================================================================
  {
    id: 'md-2024-12-05',
    format: 'MasterDuel',
    versionTitle: 'Master Duel 2024年12月5日 改订表 [!详情待核对]',
    effectiveDate: '2024年12月5日生效',
    notes: '[!需核对] 具体改动内容请参考 masterduelmeta.com 历史页面确认。',
    changes: { newForbidden: [], newLimited: [], newSemiLimited: [], newUnlimited: [] }
  },
  {
    id: 'md-2024-11-06',
    format: 'MasterDuel',
    versionTitle: 'Master Duel 2024年11月6日 改订表 [!详情待核对]',
    effectiveDate: '2024年11月6日生效',
    notes: '[!需核对] 具体改动内容请参考 masterduelmeta.com 历史页面确认。',
    changes: { newForbidden: [], newLimited: [], newSemiLimited: [], newUnlimited: [] }
  },
  {
    id: 'md-2024-10-31',
    format: 'MasterDuel',
    versionTitle: 'Master Duel 2024年10月31日 改订表 [!详情待核对]',
    effectiveDate: '2024年10月31日生效',
    notes: '[!需核对] 具体改动内容请参考 masterduelmeta.com 历史页面确认。',
    changes: { newForbidden: [], newLimited: [], newSemiLimited: [], newUnlimited: [] }
  },
  {
    id: 'md-2024-10-09',
    format: 'MasterDuel',
    versionTitle: 'Master Duel 2024年10月9日 改订表 [!详情待核对]',
    effectiveDate: '2024年10月9日生效',
    notes: '蛇眼环境大改，召命之神弓禁止。[!部分细节待核对]',
    changes: {
      newForbidden: [
        { id: 18326736, name: '召命之神弓－アポロウーサ (Apollousa, Bow of the Goddess)', type: '连接怪兽' }
      ],
      newLimited: [
        { id: 63166095, name: '蛇眼·炎蓝 (Snake-Eye Ash)', type: '效果怪兽' }
      ],
      newSemiLimited: [],
      newUnlimited: []
    }
  },
  {
    id: 'md-2024-09-12',
    format: 'MasterDuel',
    versionTitle: 'Master Duel 2024年9月12日 改订表 [!详情待核对]',
    effectiveDate: '2024年9月12日生效',
    notes: '[!需核对] 具体改动内容请参考 masterduelmeta.com 历史页面确认。',
    changes: { newForbidden: [], newLimited: [], newSemiLimited: [], newUnlimited: [] }
  },
  {
    id: 'md-2024-08-07',
    format: 'MasterDuel',
    versionTitle: 'Master Duel 2024年8月7日 改订表 [!详情待核对]',
    effectiveDate: '2024年8月7日生效',
    notes: '[!需核对] 具体改动内容请参考 masterduelmeta.com 历史页面确认。',
    changes: { newForbidden: [], newLimited: [], newSemiLimited: [], newUnlimited: [] }
  },
  {
    id: 'md-2024-07-29',
    format: 'MasterDuel',
    versionTitle: 'Master Duel 2024年7月29日 改订表 [!详情待核对]',
    effectiveDate: '2024年7月29日生效',
    notes: '[!需核对] 具体改动内容请参考 masterduelmeta.com 历史页面确认。',
    changes: { newForbidden: [], newLimited: [], newSemiLimited: [], newUnlimited: [] }
  },
  {
    id: 'md-2024-07-10',
    format: 'MasterDuel',
    versionTitle: 'Master Duel 2024年7月10日 改订表 [!详情待核对]',
    effectiveDate: '2024年7月10日生效',
    notes: '[!需核对] 具体改动内容请参考 masterduelmeta.com 历史页面确认。',
    changes: { newForbidden: [], newLimited: [], newSemiLimited: [], newUnlimited: [] }
  },
  {
    id: 'md-2024-06-06',
    format: 'MasterDuel',
    versionTitle: 'Master Duel 2024年6月6日 改订表 [!详情待核对]',
    effectiveDate: '2024年6月6日生效',
    notes: '[!需核对] 具体改动内容请参考 masterduelmeta.com 历史页面确认。',
    changes: { newForbidden: [], newLimited: [], newSemiLimited: [], newUnlimited: [] }
  },
  {
    id: 'md-2024-04-30',
    format: 'MasterDuel',
    versionTitle: 'Master Duel 2024年4月30日 改订表 [!详情待核对]',
    effectiveDate: '2024年4月30日生效',
    notes: '[!需核对] 具体改动内容请参考 masterduelmeta.com 历史页面确认。',
    changes: { newForbidden: [], newLimited: [], newSemiLimited: [], newUnlimited: [] }
  },
  {
    id: 'md-2024-04-11',
    format: 'MasterDuel',
    versionTitle: 'Master Duel 2024年4月11日 改订表 [!详情待核对]',
    effectiveDate: '2024年4月11日生效',
    notes: '[!需核对] 具体改动内容请参考 masterduelmeta.com 历史页面确认。',
    changes: { newForbidden: [], newLimited: [], newSemiLimited: [], newUnlimited: [] }
  },
  {
    id: 'md-2024-03-07',
    format: 'MasterDuel',
    versionTitle: 'Master Duel 2024年3月7日 改订表 [!详情待核对]',
    effectiveDate: '2024年3月7日生效',
    notes: '[!需核对] 具体改动内容请参考 masterduelmeta.com 历史页面确认。',
    changes: { newForbidden: [], newLimited: [], newSemiLimited: [], newUnlimited: [] }
  },
  {
    id: 'md-2024-02-06',
    format: 'MasterDuel',
    versionTitle: 'Master Duel 2024年2月6日 改订表 [!详情待核对]',
    effectiveDate: '2024年2月6日生效',
    notes: '[!需核对] 具体改动内容请参考 masterduelmeta.com 历史页面确认。',
    changes: { newForbidden: [], newLimited: [], newSemiLimited: [], newUnlimited: [] }
  },
  {
    id: 'md-2024-01-09',
    format: 'MasterDuel',
    versionTitle: 'Master Duel 2024年1月9日 改订表 [!详情待核对]',
    effectiveDate: '2024年1月9日生效',
    notes: '[!需核对] 具体改动内容请参考 masterduelmeta.com 历史页面确认。',
    changes: { newForbidden: [], newLimited: [], newSemiLimited: [], newUnlimited: [] }
  },

  // =========================================================================
  // 2023 年  Master Duel 真实改订日期（共约 16 次）
  // =========================================================================
  {
    id: 'md-2023-12-05',
    format: 'MasterDuel',
    versionTitle: 'Master Duel 2023年12月5日 改订表 [!详情待核对]',
    effectiveDate: '2023年12月5日生效',
    notes: '打击Stun策略。[!部分细节待核对]',
    changes: { newForbidden: [], newLimited: [], newSemiLimited: [], newUnlimited: [] }
  },
  {
    id: 'md-2023-11-21',
    format: 'MasterDuel',
    versionTitle: 'Master Duel 2023年11月21日 改订表 [!详情待核对]',
    effectiveDate: '2023年11月21日生效',
    notes: '[!需核对] 具体改动内容请参考 masterduelmeta.com 历史页面确认。',
    changes: { newForbidden: [], newLimited: [], newSemiLimited: [], newUnlimited: [] }
  },
  {
    id: 'md-2023-10-10',
    format: 'MasterDuel',
    versionTitle: 'Master Duel 2023年10月10日 改订表 [!详情待核对]',
    effectiveDate: '2023年10月10日生效',
    notes: '[!需核对] 具体改动内容请参考 masterduelmeta.com 历史页面确认。',
    changes: { newForbidden: [], newLimited: [], newSemiLimited: [], newUnlimited: [] }
  },
  {
    id: 'md-2023-08-31',
    format: 'MasterDuel',
    versionTitle: 'Master Duel 2023年8月31日 改订表 (珠泪/积木龙禁止)',
    effectiveDate: '2023年8月31日生效',
    notes: '重大更新！珠泪哀歌族·梅洛人鱼 禁止，积木龙 Block Dragon 禁止。',
    changes: {
      newForbidden: [
        { id: 37744402, name: '珠泪哀歌族·梅洛人鱼 (Tearlaments Merrli)', type: '效果怪兽' },
        { id: 7931350, name: '积木龙 (Block Dragon)', type: '效果怪兽' }
      ],
      newLimited: [],
      newSemiLimited: [],
      newUnlimited: []
    }
  },
  {
    id: 'md-2023-08-06',
    format: 'MasterDuel',
    versionTitle: 'Master Duel 2023年8月6日 改订表 [!详情待核对]',
    effectiveDate: '2023年8月6日生效',
    notes: '[!需核对] 具体改动内容请参考 masterduelmeta.com 历史页面确认。',
    changes: { newForbidden: [], newLimited: [], newSemiLimited: [], newUnlimited: [] }
  },
  {
    id: 'md-2023-07-13',
    format: 'MasterDuel',
    versionTitle: 'Master Duel 2023年7月13日 改订表 [!详情待核对]',
    effectiveDate: '2023年7月13日生效',
    notes: '[!需核对] 具体改动内容请参考 masterduelmeta.com 历史页面确认。',
    changes: { newForbidden: [], newLimited: [], newSemiLimited: [], newUnlimited: [] }
  },
  {
    id: 'md-2023-06-30',
    format: 'MasterDuel',
    versionTitle: 'Master Duel 2023年6月30日 改订表 [!详情待核对]',
    effectiveDate: '2023年6月30日生效',
    notes: '[!需核对] 具体改动内容请参考 masterduelmeta.com 历史页面确认。',
    changes: { newForbidden: [], newLimited: [], newSemiLimited: [], newUnlimited: [] }
  },
  {
    id: 'md-2023-06-08',
    format: 'MasterDuel',
    versionTitle: 'Master Duel 2023年6月8日 改订表 [!详情待核对]',
    effectiveDate: '2023年6月8日生效',
    notes: '[!需核对] 具体改动内容请参考 masterduelmeta.com 历史页面确认。',
    changes: { newForbidden: [], newLimited: [], newSemiLimited: [], newUnlimited: [] }
  },
  {
    id: 'md-2023-05-10',
    format: 'MasterDuel',
    versionTitle: 'Master Duel 2023年5月10日 改订表 [!详情待核对]',
    effectiveDate: '2023年5月10日生效',
    notes: '[!需核对] 具体改动内容请参考 masterduelmeta.com 历史页面确认。',
    changes: { newForbidden: [], newLimited: [], newSemiLimited: [], newUnlimited: [] }
  },
  {
    id: 'md-2023-04-30',
    format: 'MasterDuel',
    versionTitle: 'Master Duel 2023年4月30日 改订表 [!详情待核对]',
    effectiveDate: '2023年4月30日生效',
    notes: '[!需核对] 具体改动内容请参考 masterduelmeta.com 历史页面确认。',
    changes: { newForbidden: [], newLimited: [], newSemiLimited: [], newUnlimited: [] }
  },
  {
    id: 'md-2023-04-10',
    format: 'MasterDuel',
    versionTitle: 'Master Duel 2023年4月10日 改订表 [!详情待核对]',
    effectiveDate: '2023年4月10日生效',
    notes: '[!需核对] 具体改动内容请参考 masterduelmeta.com 历史页面确认。',
    changes: { newForbidden: [], newLimited: [], newSemiLimited: [], newUnlimited: [] }
  },
  {
    id: 'md-2023-02-27',
    format: 'MasterDuel',
    versionTitle: 'Master Duel 2023年2月27日 改订表 [!详情待核对]',
    effectiveDate: '2023年2月27日生效',
    notes: '[!需核对] 具体改动内容请参考 masterduelmeta.com 历史页面确认。',
    changes: { newForbidden: [], newLimited: [], newSemiLimited: [], newUnlimited: [] }
  },
  {
    id: 'md-2023-02-13',
    format: 'MasterDuel',
    versionTitle: 'Master Duel 2023年2月13日 改订表 [!详情待核对]',
    effectiveDate: '2023年2月13日生效',
    notes: '[!需核对] 具体改动内容请参考 masterduelmeta.com 历史页面确认。',
    changes: { newForbidden: [], newLimited: [], newSemiLimited: [], newUnlimited: [] }
  },
  {
    id: 'md-2023-02-05',
    format: 'MasterDuel',
    versionTitle: 'Master Duel 2023年2月5日 改订表 [!详情待核对]',
    effectiveDate: '2023年2月5日生效',
    notes: '[!需核对] 具体改动内容请参考 masterduelmeta.com 历史页面确认。',
    changes: { newForbidden: [], newLimited: [], newSemiLimited: [], newUnlimited: [] }
  },
  {
    id: 'md-2023-01-09',
    format: 'MasterDuel',
    versionTitle: 'Master Duel 2023年1月9日 改订表 [!详情待核对]',
    effectiveDate: '2023年1月9日生效',
    notes: '[!需核对] 具体改动内容请参考 masterduelmeta.com 历史页面确认。',
    changes: { newForbidden: [], newLimited: [], newSemiLimited: [], newUnlimited: [] }
  },

  // =========================================================================
  // 2022 年  Master Duel 真实改订日期（共约 7 次）
  // =========================================================================
  {
    id: 'md-2022-11-30',
    format: 'MasterDuel',
    versionTitle: 'Master Duel 2022年11月30日 改订表 [!详情待核对]',
    effectiveDate: '2022年11月30日生效',
    notes: '[!需核对] 具体改动内容请参考 masterduelmeta.com 历史页面确认。',
    changes: { newForbidden: [], newLimited: [], newSemiLimited: [], newUnlimited: [] }
  },
  {
    id: 'md-2022-10-28',
    format: 'MasterDuel',
    versionTitle: 'Master Duel 2022年10月28日 改订表 [!详情待核对]',
    effectiveDate: '2022年10月28日生效',
    notes: '[!需核对] 具体改动内容请参考 masterduelmeta.com 历史页面确认。',
    changes: { newForbidden: [], newLimited: [], newSemiLimited: [], newUnlimited: [] }
  },
  {
    id: 'md-2022-09-30',
    format: 'MasterDuel',
    versionTitle: 'Master Duel 2022年9月30日 改订表 (水机/结界像禁止)',
    effectiveDate: '2022年9月30日生效',
    notes: '水晶机巧-继承玻纤 禁止，风之结界像 限制。[!部分细节待核对]',
    changes: {
      newForbidden: [
        { id: 50588353, name: '水晶机巧-继承玻纤 (Crystron Halqifibrax)', type: '连接怪兽' }
      ],
      newLimited: [
        { id: 4618196, name: '风之结界像 (Barrier Statue of the Stormwinds)', type: '效果怪兽' }
      ],
      newSemiLimited: [],
      newUnlimited: []
    }
  },
  {
    id: 'md-2022-08-30',
    format: 'MasterDuel',
    versionTitle: 'Master Duel 2022年8月30日 改订表 (历史首次大封禁)',
    effectiveDate: '2022年8月30日生效',
    notes: 'MD 开服后首次重大更新！禁止王宫的敕命、虚无空间、VFD。',
    changes: {
      newForbidden: [
        { id: 61740673, name: '王宫的敕命 (Imperial Order)', type: '永续陷阱' },
        { id: 5851097, name: '虚无空间 (Vanity\'s Emptiness)', type: '永续陷阱' },
        { id: 88581108, name: '真龙皇 VFD (True King of All Calamities)', type: '超量怪兽' }
      ],
      newLimited: [],
      newSemiLimited: [],
      newUnlimited: []
    }
  },
  {
    id: 'md-2022-07-08',
    format: 'MasterDuel',
    versionTitle: 'Master Duel 2022年7月8日 改订表 [!详情待核对]',
    effectiveDate: '2022年7月8日生效',
    notes: '[!需核对] 具体改动内容请参考 masterduelmeta.com 历史页面确认。',
    changes: { newForbidden: [], newLimited: [], newSemiLimited: [], newUnlimited: [] }
  },
  {
    id: 'md-2022-06-09',
    format: 'MasterDuel',
    versionTitle: 'Master Duel 2022年6月9日 改订表 [!详情待核对]',
    effectiveDate: '2022年6月9日生效',
    notes: '[!需核对] 具体改动内容请参考 masterduelmeta.com 历史页面确认。',
    changes: { newForbidden: [], newLimited: [], newSemiLimited: [], newUnlimited: [] }
  },
  {
    id: 'md-2022-05-08',
    format: 'MasterDuel',
    versionTitle: 'Master Duel 2022年5月8日 改订表 (历史首次改订)',
    effectiveDate: '2022年5月8日生效',
    notes: 'MD 上线后第一次禁卡表调整，主要打击DD炸弹挂机。[!部分细节待核对]',
    changes: {
      newForbidden: [],
      newLimited: [
        { id: 37744402, name: 'DD炸弹 (D.D. Dynamite) 限→1', type: '通常陷阱' }
      ],
      newSemiLimited: [],
      newUnlimited: []
    }
  },
  {
    id: 'md-2022-01-19',
    format: 'MasterDuel',
    versionTitle: 'Master Duel 2022年1月19日 全球开服初始卡表',
    effectiveDate: '2022年1月19日生效 (开服)',
    notes: 'Master Duel 全球开服时的初始禁限制卡表。[!具体卡名待核对]',
    changes: {
      newForbidden: [
        { id: 55144522, name: '强欲之壶 (Pot of Greed)', type: '通常魔法' },
        { id: 74588309, name: '旧神 诺登 (Elder Entity Norden)', type: '融合怪兽' }
      ],
      newLimited: [
        { id: 79979666, name: '被封印的艾克佐迪亚 (Exodia the Forbidden One)', type: '效果怪兽' }
      ],
      newSemiLimited: [
        { id: 83764718, name: '墓穴的指名者 (Called by the Grave)', type: '速攻魔法' }
      ],
      newUnlimited: []
    }
  },

  // =========================================================================
  // OCG / TCG 历史卡表
  // =========================================================================
  {
    id: 'ocg-2026-07',
    format: 'OCG',
    versionTitle: 'OCG 2026年7月1日 官方适用卡表',
    effectiveDate: '2026年7月1日生效',
    notes: '重点封杀墓穴的指名者、神鹰吹雪，旧神诺登改效果出狱。',
    changes: {
      newForbidden: [
        { id: 83764718, name: '墓穴的指名者 (Called by the Grave)', type: '速攻魔法' },
        { id: 18144506, name: '神鹰羽毛吹雪 (Harpie\'s Feather Storm)', type: '通常陷阱' }
      ],
      newLimited: [
        { id: 74588309, name: '旧神 诺登 (改效果版重返限制)', type: '融合怪兽' }
      ],
      newSemiLimited: [
        { id: 29301450, name: 'S:P小夜', type: '连接怪兽' }
      ],
      newUnlimited: [
        { id: 90809975, name: '饼蛙 完全解禁', type: '超量怪兽' }
      ]
    }
  },
  {
    id: 'tcg-2026-06',
    format: 'TCG',
    versionTitle: 'TCG 2026年6月 官方生效卡表',
    effectiveDate: '2026年6月1日生效',
    notes: 'Maxx "C" 保持全环境禁止，限制 Called by the Grave。',
    changes: {
      newForbidden: [
        { id: 23434538, name: 'Maxx "C" (増殖するG)', type: '效果怪兽' }
      ],
      newLimited: [
        { id: 83764718, name: 'Called by the Grave', type: '速攻魔法' }
      ],
      newSemiLimited: [
        { id: 24175368, name: 'Triple Tactics Talent', type: '通常魔法' }
      ],
      newUnlimited: []
    }
  }
];
