# Cloudflare 卡片目录与服务端搜索改造方案

## 1. 文档目的

本文定义 AntiProgram 卡片主界面的下一阶段架构改造。

已经确认的产品与技术决策：

- 生产环境以 Cloudflare Workers 为主。
- 卡片搜索、筛选、排序和分页放在服务端执行。
- 用户打开首页时不再下载完整卡库。
- 卡片数据先从持久化快照读取；数据同步在后台执行。
- 本地开发必须能够完整模拟生产所使用的存储、定时任务和 Worker API。

本次改造的直接目标是消除首页首次进入时的长时间加载，同时避免把同样的问题简单转移成“从数据库下载一份巨大 JSON”。

### 当前实施状态

- 阶段 1（D1 与本地开发基础）：已于 2026-09-23 完成。
- 阶段 2 至阶段 6：尚未实施。
- `wrangler.jsonc` 中仍使用本地开发占位 D1 ID；创建生产 D1 后必须替换。
- 当前 scheduled handler 只记录一条 `skipped` 冒烟记录，不会请求第三方或更新卡库。

---

## 2. 当前问题

### 2.1 当前首页加载链路

当前默认赛制是 Master Duel。首页加载时，浏览器大致执行以下流程：

1. 请求 Master Duel 当前禁限 vector。
2. 请求带 `misc` 信息的 YGOPRODeck 全量卡库。
3. 建立 Konami ID、卡片密码、禁限状态和稀有度映射。
4. 对缺少稀有度的卡片逐张请求 YAML Yugi。
5. 筛选完整 Master Duel 卡池。
6. 按每批 100 张请求 YGOCDB，补齐整个结果集的中文名称和卡文。
7. 所有步骤完成后，React 才结束 `loading`。

首屏实际上只显示 60 张卡，但当前实现会等待完整卡池准备完毕。

### 2.2 现有实现的主要问题

- 正常页面请求直接依赖多个第三方上游的实时可用性。
- 浏览器承担了全量卡库聚合、映射和中文化职责。
- 首页响应时间由最慢的上游和最慢的批次决定。
- 刷新页面后，大量工作可能重新执行。
- 多个浏览器会重复完成相同的同步工作。
- 首页只展示少量记录，却获取完整卡库。
- 当前 `loading` 无法区分卡库、禁限表、中文化和稀有度阶段。
- Cloudflare Worker 与 Node 服务存在两套运行和缓存逻辑，容易产生行为差异。

---

## 3. 目标与非目标

### 3.1 目标

1. 首页只获取第一页数据，默认 60 张。
2. 普通用户请求不直接访问第三方卡库 API。
3. 搜索、筛选、排序和分页在 Worker + D1 中完成。
4. 数据同步失败时继续提供最近一次验证成功的数据。
5. 新快照完整验证后才切换为活动版本。
6. 前端能够感知版本变化，但不进行浏览器整页刷新。
7. 本地开发能够使用本地 D1、Cron 测试入口和确定性种子数据。
8. Node 和 Cloudflare 不再各自维护独立的卡片搜索业务逻辑。

### 3.2 非目标

以下内容不要求在第一阶段同时完成：

- 用户账户、收藏和跨设备同步。
- 卡图文件迁移到自有 R2。
- 立即移除所有旧卡片 API 代码。
- 第一次改造就引入复杂的分布式队列拓扑。
- 把卡组广场、小游戏和禁限历史同时整体重写。

---

## 4. 总体架构

```text
浏览器
  │
  │ 分页搜索 / 卡片详情 / 目录状态
  ▼
Cloudflare Worker
  ├── Cache API：短期缓存热门查询
  ├── D1：活动卡库、搜索索引、版本与同步状态
  └── R2（可选）：原始上游响应和归档快照
                         ▲
                         │ 完整验证后原子切换版本
Cron Trigger ──→ 后台同步器
                  ├── 拉取第三方数据
                  ├── 归一化与批量中文化
                  ├── 分批写入候选版本
                  ├── 校验候选版本
                  └── 激活候选版本
```

### 4.1 请求路径和同步路径必须分离

普通请求只做以下工作：

- 读取当前活动版本。
- 查询 D1。
- 返回分页结果。

普通请求不得执行以下工作：

- 下载全量 YGOPRODeck 数据。
- 全量请求 YGOCDB 中文化。
- 批量补充 YAML Yugi 稀有度。
- 重建搜索索引。
- 切换活动版本。

### 4.2 持久化产品选择

#### D1：主数据存储

D1 保存：

- 卡片结构化资料。
- 多环境禁限状态。
- Master Duel 可用性与稀有度。
- 活动数据版本。
- 搜索索引。
- 同步运行记录。

D1 是查询的唯一事实来源。页面搜索不读取 R2 或 KV 中的整份 JSON。

#### R2：可选原始快照存储

R2 可保存：

- 上游原始 JSON。
- 同步过程中的大文件。
- 已发布卡库的压缩归档。
- 故障复现所需的输入样本。

建议的对象键：

```text
raw/ygoprodeck/2026-09-23T08-00-00Z.json
raw/master-duel-vector/2026-09-23T08-00-00Z.json
snapshots/card-catalog/<version>.json.gz
```

R2 不参与常规搜索请求，因此第一阶段可以不启用。

#### Workers KV：不作为主库

KV 是最终一致性的，适合配置和缓存，不适合卡库版本切换和结构化搜索。第一阶段无需引入 KV。

#### Durable Objects：暂不引入

如果后续出现多个同步执行器竞争写入、强一致协调或高频手动刷新需求，再考虑使用 Durable Object。第一阶段使用确定性同步 ID、D1 同步记录和单一 Cron 入口即可。

---

## 5. 数据模型

### 5.1 版本表

```sql
CREATE TABLE card_catalog_versions (
  version TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('building', 'ready', 'active', 'failed')),
  source_hash TEXT,
  effective_date TEXT,
  card_count INTEGER NOT NULL DEFAULT 0,
  localized_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  validated_at TEXT,
  activated_at TEXT,
  error TEXT
);
```

版本必须是不可变的。已经激活的版本不允许继续修改卡片行。

### 5.2 活动版本表

```sql
CREATE TABLE card_catalog_state (
  catalog TEXT PRIMARY KEY,
  active_version TEXT,
  refreshing INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TEXT,
  last_success_at TEXT,
  last_error TEXT,
  FOREIGN KEY (active_version) REFERENCES card_catalog_versions(version)
);
```

初期只有一个 `catalog = 'main'`。保留 catalog 字段是为了将来拆分 OCG、TCG 或测试目录。

### 5.3 卡片表

```sql
CREATE TABLE cards (
  row_pk INTEGER PRIMARY KEY AUTOINCREMENT,
  version TEXT NOT NULL,
  id INTEGER NOT NULL,
  konami_id INTEGER,
  image_id INTEGER,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  en_name TEXT,
  jp_name TEXT,
  description TEXT NOT NULL DEFAULT '',
  archetype TEXT,
  card_type TEXT NOT NULL CHECK (card_type IN ('monster', 'spell', 'trap')),
  subtype TEXT,
  attribute TEXT,
  race TEXT,
  level INTEGER,
  atk INTEGER,
  def INTEGER,
  md_available INTEGER NOT NULL DEFAULT 0,
  md_rarity TEXT,
  md_ban_status TEXT NOT NULL DEFAULT 'Unlimited',
  ocg_ban_status TEXT NOT NULL DEFAULT 'Unlimited',
  tcg_ban_status TEXT NOT NULL DEFAULT 'Unlimited',
  source TEXT NOT NULL,
  localization_ids_json TEXT,
  UNIQUE (version, id),
  FOREIGN KEY (version) REFERENCES card_catalog_versions(version)
);
```

### 5.4 推荐索引

```sql
CREATE INDEX idx_cards_version_type
  ON cards(version, card_type);

CREATE INDEX idx_cards_version_attribute
  ON cards(version, attribute);

CREATE INDEX idx_cards_version_level
  ON cards(version, level);

CREATE INDEX idx_cards_version_race
  ON cards(version, race);

CREATE INDEX idx_cards_version_md_available
  ON cards(version, md_available);

CREATE INDEX idx_cards_version_md_ban
  ON cards(version, md_ban_status);

CREATE INDEX idx_cards_version_ocg_ban
  ON cards(version, ocg_ban_status);

CREATE INDEX idx_cards_version_tcg_ban
  ON cards(version, tcg_ban_status);

CREATE INDEX idx_cards_version_rarity
  ON cards(version, md_rarity);

CREATE INDEX idx_cards_version_name
  ON cards(version, normalized_name);
```

不要为所有列盲目创建索引。实现后使用 `EXPLAIN QUERY PLAN` 和 D1 返回的 `rows_read` 验证实际查询。

### 5.5 全文搜索

D1 支持 FTS5。名称、系列和效果文本可以建立全文索引：

```sql
CREATE VIRTUAL TABLE cards_fts USING fts5(
  name,
  en_name,
  jp_name,
  archetype,
  description,
  content='cards',
  content_rowid='row_pk',
  tokenize='trigram'
);
```

需要注意：

- trigram 对至少三个连续字符的子串搜索更有效。
- 卡名常见关键词可能只有一到两个汉字。
- 短关键词优先执行 ID 精确匹配、名称前缀匹配；必要时才做受限的包含搜索。
- 搜索框必须防抖，并限制页大小。
- FTS 索引会增加写入和存储成本，需要通过真实查询验证收益。

### 5.6 同步运行记录

```sql
CREATE TABLE card_catalog_sync_runs (
  id TEXT PRIMARY KEY,
  trigger_kind TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed', 'skipped')),
  candidate_version TEXT,
  source_hash TEXT,
  fetched_count INTEGER NOT NULL DEFAULT 0,
  localized_count INTEGER NOT NULL DEFAULT 0,
  written_count INTEGER NOT NULL DEFAULT 0,
  message TEXT,
  started_at TEXT NOT NULL,
  finished_at TEXT
);
```

---

## 6. 服务端 API

### 6.1 分页搜索

```http
GET /api/v1/cards
```

查询参数：

| 参数 | 示例 | 说明 |
| --- | --- | --- |
| `q` | `青眼` | 名称、ID、系列或卡文关键词 |
| `format` | `master-duel` | `master-duel`、`ocg`、`tcg` |
| `type` | `monster` | 主卡片类型 |
| `attribute` | `LIGHT` | 属性 |
| `level` | `8` | 星级、阶级或 Link 值 |
| `race` | `龙族` | 种族 |
| `banStatus` | `limited` | 当前赛制禁限状态 |
| `rarity` | `UR` | Master Duel 稀有度 |
| `monsterSubType` | `Effect` | 怪兽小类 |
| `spellTrapSubType` | `Quick-Play` | 魔陷小类 |
| `atkMin` / `atkMax` | `2000` | 攻击力范围 |
| `defMin` / `defMax` | `1500` | 守备力范围 |
| `sort` | `name` | 排序字段 |
| `direction` | `asc` | 排序方向 |
| `page` | `1` | 页码 |
| `pageSize` | `60` | 每页数量，最大 100 |

响应：

```json
{
  "version": "2026-09-23T08:30:00.000Z",
  "effectiveDate": "2026-09-01",
  "freshness": "fresh",
  "refreshing": false,
  "page": 1,
  "pageSize": 60,
  "total": 8421,
  "hasMore": true,
  "cards": []
}
```

规则：

- `pageSize` 默认 60，最大 100。
- 未知参数返回 400，不静默接受。
- 排序字段使用白名单映射，禁止把客户端字符串直接拼接进 SQL。
- 数字范围需要限制合法区间。
- 所有字符串参数限制长度。
- 空数据库返回明确的 503 `catalog_not_initialized`，而不是返回伪造数据。

### 6.2 卡片详情

```http
GET /api/v1/cards/:id?format=master-duel
```

返回完整卡片资料。列表接口可以省略较长字段，例如完整卡文和异画 ID 列表，以减少首页响应体积。

### 6.3 目录状态

```http
GET /api/v1/card-catalog/status?version=<client-version>
```

响应：

```json
{
  "version": "2026-09-23T08:35:12.000Z",
  "changed": true,
  "refreshing": false,
  "lastSuccessAt": "2026-09-23T08:35:12.000Z",
  "lastError": null
}
```

前端只在 `refreshing = true` 时每 3 至 5 秒轮询。版本变化后重新获取当前页，不刷新浏览器页面。

### 6.4 手动同步

```http
POST /api/v1/card-catalog/refresh
Authorization: Bearer <admin-secret>
```

要求：

- 仅供管理员和部署流程使用。
- 普通用户页面不调用。
- 使用 Cloudflare Secret 保存令牌。
- 必须有冷却和重复运行保护。
- 返回同步运行 ID，不等待完整同步结束。

### 6.5 相关卡片

当前相关卡片功能会获取完整候选卡库。第二阶段应迁移为：

```http
GET /api/v1/cards/:id/related?format=master-duel&limit=30
```

服务端根据卡文点名、系列和反向引用查询 D1。否则首页问题解决后，用户第一次打开“相关卡片”仍会触发全量加载。

---

## 7. 后台同步设计

### 7.1 触发者

后台同步由以下入口触发：

1. Cloudflare Cron Trigger：主要入口。
2. 管理员手动刷新 API：辅助入口。
3. 部署后的初始化命令：数据库为空时使用。

普通 GET 请求不触发完整同步。

### 7.2 建议刷新频率

| 数据 | 建议检查周期 |
| --- | --- |
| Master Duel 当前禁限表 | 15 至 30 分钟 |
| YGOPRODeck 基础卡库 | 6 至 12 小时 |
| 中文资料 | 每天或新卡出现时增量补齐 |
| YAML Yugi 稀有度 | 每天或缺项时补齐 |
| 卡组广场 | 保持现有各 provider 的周期 |

Cron 只负责发起或调度同步。同步器根据数据自身 TTL 和 source hash 判断是否需要实际执行。

### 7.3 同步步骤

1. 创建同步运行记录。
2. 检查是否已有同类运行正在执行。
3. 拉取 Master Duel vector 和 YGOPRODeck 基础卡库。
4. 对上游响应做大小、状态码和结构校验。
5. 生成 `source_hash`；与活动版本一致时标记 `skipped`。
6. 创建状态为 `building` 的候选版本。
7. 归一化基础卡片数据。
8. 批量补齐中文资料。
9. 对缺少的 Master Duel 稀有度做限流补齐。
10. 分批写入 D1。
11. 构建或同步全文搜索索引。
12. 执行完整性校验。
13. 将候选版本标记为 `ready`。
14. 原子更新 `card_catalog_state.active_version`。
15. 标记候选版本为 `active`。
16. 延迟清理旧版本，至少保留一个可回滚版本。

### 7.4 同步校验

候选版本至少通过以下校验才能激活：

- 卡片数量超过合理下限。
- 卡片密码唯一。
- `card_type` 只能是 monster、spell、trap。
- Master Duel vector 的 Konami ID 全部能映射。
- 禁限状态只能是允许的枚举。
- 活动卡片的图片 ID 和展示名称满足最低覆盖率。
- 中文化数量没有相对上一版本异常骤降。
- 同步写入数量与候选版本统计一致。
- 随机抽样查询和关键卡片查询成功。

任何校验失败：

- 候选版本标记为 `failed`。
- 不修改活动版本。
- 页面继续提供旧数据。
- `last_error` 和同步运行记录保存具体原因。

### 7.5 并发和请求限制

- YGOCDB 批量接口继续遵守每批 100 条。
- 外部请求设置超时、最大响应大小和重试策略。
- 稀有度补齐限制在 5 至 10 个并发。
- D1 写入按固定批次执行，不逐张发出独立调用。
- 同步过程中不把完整卡库作为一个 Workflow step 的返回值传递。
- 大型原始响应需要跨步骤保存时写入 R2，仅传递对象键。

### 7.6 Cron、Workflow 与 Queue 的实施边界

第一阶段可以先使用 Worker `scheduled()` handler 执行同步服务，以最少结构完成闭环。

满足以下任一条件后迁移到 Cloudflare Workflows：

- 同步过程需要跨多次执行恢复。
- 单次同步明显接近 Worker CPU 或子请求限制。
- 需要针对每个步骤配置独立重试。
- 需要长时间等待上游恢复。

满足以下条件后再引入 Queues：

- 中文化或稀有度补齐需要大量并行批次。
- 单一同步器无法在限制内完成。
- 需要对失败卡片单独重试。

同步服务的核心逻辑应独立于触发器，以便从 `scheduled()` 平滑迁移到 Workflow 或 Queue consumer。

---

## 8. 前端改造

### 8.1 CardSearchContext

当前上下文保存完整搜索结果。改造后需要保存分页状态：

```ts
interface CardSearchContextType {
  filters: SearchFilters;
  cards: YgoCard[];
  totalCount: number;
  page: number;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  catalogVersion: string | null;
  catalogRefreshing: boolean;
  selectedCard: YgoCard | null;
  loadMore(): Promise<void>;
  retry(): void;
}
```

行为：

- 筛选条件变化时取消旧请求。
- 新查询从第一页开始。
- “加载更多”请求下一页并追加。
- 使用 `AbortController` 取消过期请求。
- 搜索输入防抖 200 至 300ms。
- 旧请求不得覆盖新查询状态。

### 8.2 CardGrid

当前 `CardGrid` 对完整结果做 `slice()`。改造后：

- `cards` 本身就是已加载页的集合。
- 结果总数使用 `totalCount`。
- “加载更多”调用 `loadMore()`。
- 加载更多时保留现有卡片，不显示全页 loading。
- 错误状态区分首次失败与下一页失败。

### 8.3 数据源选择器

D1 卡库将聚合多个来源并保留来源字段。用户不再直接选择浏览器访问哪个第三方 API。

建议改造为只读“数据目录状态”：

- 聚合卡库。
- 当前数据版本。
- 最近成功同步时间。
- 正在同步或使用旧快照。

旧的 `YGOCDB` / `YGOPRODeck` 数据源选择可以在迁移期保留为调试开关，但不应继续作为普通用户的主要交互。

### 8.4 版本更新

- 初次响应返回目录版本和 `refreshing`。
- 仅在后台同步期间轮询状态。
- 新版本激活后，重新请求当前查询的第一页。
- 保留搜索词、筛选、排序和选中卡片 ID。
- 若已选卡片在新版本中存在，重新获取详情；不存在则清除选择。
- 不执行 `window.location.reload()`。

### 8.5 卡片详情

列表响应不需要携带完整卡文时，选中卡片后请求详情 API。详情按 ID 和版本缓存，避免重复加载。

---

## 9. Worker 路由与代码组织

建议目录结构：

```text
worker/
  index.mjs
  routes/
    cards.mjs
    cardCatalog.mjs
  catalog/
    repository.mjs
    searchQuery.mjs
    syncService.mjs
    normalize.mjs
    validate.mjs
  lib/
    cache.mjs
    proxy.mjs

migrations/
  0001_card_catalog.sql
  0002_card_search.sql

seed/
  card-catalog.sql
```

职责：

- `repository.mjs`：所有 D1 查询和写入。
- `searchQuery.mjs`：参数解析、SQL 白名单和分页。
- `normalize.mjs`：第三方数据到内部模型的纯函数转换。
- `validate.mjs`：候选版本完整性校验。
- `syncService.mjs`：同步编排，不绑定具体触发入口。
- `routes/*.mjs`：HTTP 输入输出适配。

Node 环境如果继续保留，只能调用相同的领域函数或作为有限的兼容入口，不再维护另一套独立卡片搜索实现。

---

## 10. 本地开发

### 10.1 原则

本地开发默认运行 Worker，并使用 Wrangler 提供的本地 D1 模拟。所有本地持久化状态放在：

```text
.wrangler/state
```

该目录必须加入 `.gitignore`。

### 10.2 Wrangler 配置

`wrangler.jsonc` 增加 D1 binding：

```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "antiprogram-card-catalog",
      "database_id": "<production-database-id>",
      "migrations_dir": "migrations"
    }
  ],
  "triggers": {
    "crons": ["*/30 * * * *"]
  }
}
```

生产数据库 ID 需要通过 Cloudflare 创建后填写，不能伪造。

### 10.3 npm scripts

建议增加：

```json
{
  "scripts": {
    "db:migrate:local": "wrangler d1 migrations apply DB --local --persist-to .wrangler/state",
    "db:seed:local": "wrangler d1 execute DB --local --persist-to .wrangler/state --file seed/card-catalog.sql",
    "db:migrate:remote": "wrangler d1 migrations apply DB --remote",
    "dev": "npm run build && concurrently --kill-others --names worker,client \"wrangler dev --port 8787 --persist-to .wrangler/state\" \"vite --config vite.worker.config.ts\"",
    "sync:local": "node scripts/trigger-local-sync.mjs"
  }
}
```

`scripts/trigger-local-sync.mjs` 请求：

```text
http://127.0.0.1:8787/cdn-cgi/local/scheduled
```

使用 Node 脚本而不是依赖系统是否安装 curl，保证 Windows 开发体验。

### 10.4 本地初始化

```powershell
npm install
npm run db:migrate:local
npm run db:seed:local
npm run dev
```

### 10.5 两种本地数据模式

#### 确定性种子模式

- 使用仓库中的小型测试卡库。
- 不依赖互联网。
- 用于页面、筛选、分页和测试。

#### 真实同步模式

- 启动本地 Worker。
- 执行 `npm run sync:local`。
- 请求真实上游。
- 写入本地 D1，不影响生产数据库。

开发人员必须能够显式选择何时访问真实上游，不能让每次 `npm run dev` 都自动执行完整同步。

---

## 11. Cloudflare 部署流程

### 11.1 首次部署

1. 创建 D1 数据库。
2. 将真实 `database_id` 写入 Wrangler 配置。
3. 创建管理员刷新 secret。
4. 应用远程 migrations。
5. 部署 Worker。
6. 通过受保护入口执行首次同步。
7. 确认存在活动版本。
8. 再将前端切换到新的服务端搜索 API。

建议命令：

```powershell
npx wrangler d1 create antiprogram-card-catalog
npx wrangler secret put CARD_CATALOG_ADMIN_TOKEN
npm run db:migrate:remote
npm run deploy:cloudflare
```

### 11.2 冷启动保护

远程 D1 完全为空时，首页返回初始化状态。正式切流前必须完成首次同步。

不能让第一个普通用户承担数据库初始化。

### 11.3 回滚

- 至少保留当前活动版本和前一个活动版本。
- 提供管理员回滚操作，将 `active_version` 指回旧版本。
- 回滚只修改版本指针，不重新写入卡片。
- 清理任务不得删除当前版本或唯一可回滚版本。

---

## 12. 缓存策略

### 12.1 API 响应缓存

热门搜索可使用 Cache API，缓存键必须包含：

- 活动目录版本。
- 完整规范化查询参数。
- 页码和页大小。

版本进入缓存键后，新版本激活不需要主动清除所有旧缓存；旧键会自然过期。

### 12.2 HTTP 缓存

响应提供：

```http
ETag: "<catalog-version>:<query-hash>"
Cache-Control: public, max-age=60
```

卡片详情可以使用更长缓存，因为版本化详情不可变。

### 12.3 浏览器缓存

第一阶段不要求 IndexedDB。服务端分页已经消除大部分首页开销。

后续如需离线体验，可以缓存最近访问页面和卡片详情，但不能重新恢复为浏览器持有完整主库。

---

## 13. 安全与滥用防护

- 搜索参数必须做长度、枚举和数值范围验证。
- SQL 排序字段只允许白名单映射。
- 所有 SQL 值使用绑定参数。
- `pageSize` 最大 100。
- 限制深分页，必要时迁移到 cursor pagination。
- 对搜索接口启用合理的 Cloudflare Rate Limiting。
- 管理员刷新接口必须认证。
- 管理员 token 只保存为 Cloudflare Secret。
- 第三方响应设置超时、最大字节数和重定向上限。
- 不把上游错误正文未经处理返回给客户端。

---

## 14. 可观测性

每次同步记录：

- 触发方式。
- 运行 ID。
- 候选版本。
- 每个上游的耗时和响应状态。
- 获取、中文化和写入数量。
- source hash。
- D1 批次数量。
- 校验结果。
- 激活时间。
- 失败阶段和错误摘要。

每次搜索至少可以观测：

- 请求耗时。
- 返回数量。
- D1 `rows_read` / `rows_written`。
- 是否命中 Cache API。
- 查询类型：空首页、ID、短关键词、FTS、过滤组合。

日志不能包含管理员 token 或完整第三方错误页面。

---

## 15. 测试计划

### 15.1 单元测试

- 上游数据归一化。
- 禁限状态转换。
- 查询参数校验。
- SQL 排序字段白名单。
- 短关键词和 FTS 路由选择。
- 分页边界。
- 版本完整性校验。
- source hash 稳定性。

### 15.2 Worker API 集成测试

- 空数据库返回 503。
- 种子数据库首页返回 60 条以内数据。
- 搜索、过滤、排序和分页组合。
- 卡片详情 200 / 404。
- 未知参数和非法参数返回 400。
- 管理员同步接口鉴权。
- 目录状态版本变化。
- 未知 API 路由仍返回 JSON 404。

### 15.3 同步测试

- 上游全部成功时激活新版本。
- 某个上游失败时保留旧版本。
- 候选数据数量异常时拒绝激活。
- 重复运行不会创建并发同步。
- source hash 未变化时跳过写入。
- D1 某批写入失败时不切换版本。
- 旧版本可回滚。

### 15.4 前端测试

- 首屏只请求第一页。
- 搜索输入防抖。
- 条件变化取消旧请求。
- 加载更多追加数据。
- 下一页失败不清空已有结果。
- 新目录版本激活后保持筛选条件。
- 页面不再访问全量 `cardinfo.php?misc=yes`。
- 页面不再全量调用 YGOCDB `cardset`。

---

## 16. 分阶段实施

### 阶段 0：基线与保护

- 为当前首页记录请求数量、加载时间和响应体积。
- 增加现有搜索核心行为测试。
- 保持旧实现可通过特性开关回退。

### 阶段 1：D1 与本地开发基础

- 增加 D1 binding。
- 增加 migrations。
- 增加本地 seed。
- 增加本地迁移、种子和定时触发脚本。
- `.wrangler/state` 加入 `.gitignore`。

交付标准：本地不联网也能运行分页搜索页面的 API 测试。

### 阶段 2：Worker 搜索 API

- 实现 repository。
- 实现查询参数解析和 SQL 构建。
- 实现分页搜索、详情和状态 API。
- 增加 API 集成测试。

交付标准：使用 seed 数据完成所有搜索和筛选组合。

### 阶段 3：前端分页化

- 新增 `cardCatalogApi`。
- 改造 `CardSearchContext`。
- 改造 `CardGrid` 加载更多。
- 取消完整卡库首次加载。
- 增加错误状态和请求取消。

交付标准：首页网络面板不出现全量卡库和全量中文化请求。

### 阶段 4：后台同步

- 抽取数据归一化逻辑。
- 实现候选版本写入与校验。
- 实现 Cron scheduled handler。
- 实现管理员手动同步。
- 实现活动版本切换和旧版本保留。

交付标准：同步失败不影响当前页面查询；同步成功后前端能检测新版本。

### 阶段 5：相关卡片和禁限表收口

- 将相关卡片计算移到服务端。
- 当前禁限表优先读取已验证的活动目录。
- 保留独立的禁限历史数据源。
- 移除浏览器端全量候选卡库加载。

### 阶段 6：生产优化

- Cache API 与 ETag。
- R2 原始快照。
- 查询成本分析和索引调整。
- 根据真实同步规模决定是否迁移到 Workflows / Queues。
- 清理旧浏览器端聚合代码和 Node 重复逻辑。

---

## 17. 验收标准

### 功能

- 首页、搜索、筛选、排序、分页和卡片详情功能可用。
- Master Duel、OCG、TCG 禁限筛选结果正确。
- 当前目录版本和更新时间可见。
- 同步失败时仍提供旧数据并显示状态。

### 性能目标

- 热缓存首页 API P95 小于 300ms。
- 无 Cache API 命中时，D1 首页查询 P95 小于 800ms。
- 首屏 API 响应体目标小于 500KB。
- 首页只返回不超过 60 张卡。
- 普通首页请求不产生任何第三方 API 请求。
- 首屏可交互目标小于 2 秒，不把卡图完整下载时间计入数据 API 指标。

性能数值是上线目标，需要通过 Cloudflare 真实环境测量确认，而不是仅以本地结果判定。

### 稳定性

- 同一时间最多一个相同类型同步运行。
- 不完整候选版本永远不会成为活动版本。
- 至少保留一个可回滚版本。
- 上游故障不会导致卡片搜索整体不可用。

### 本地开发

- 新开发者可以按文档完成本地 migration、seed 和启动。
- 本地资源不会写入生产 D1。
- 可以本地触发 scheduled handler。
- 测试不要求连接生产 Cloudflare 资源。

---

## 18. 风险与待确认事项

### 18.1 Cloudflare 套餐

需要确认使用 Free 还是 Paid。完整同步涉及较多外部子请求和 D1 写入，Free 计划可能要求进一步拆批或使用外部构建任务。

### 18.2 YGOCDB 批量中文化能力

需要实测 Worker 直接调用 YGOCDB `cardset` 的响应大小、限流和稳定性。同步器不能假设浏览器现有调用方式在 Worker 中必然具有相同表现。

### 18.3 中文短关键词搜索

FTS5 trigram 对少于三个字符的查询有限制。需要根据真实用户查询决定：

- 名称前缀索引是否足够。
- 是否接受两字查询的有限扫描。
- 是否建立额外的搜索词或 n-gram 表。

### 18.4 数据授权

迁移到持久化数据库会从“实时代理”变为“保存并再展示”。正式上线前需要继续确认各数据源的缓存、再发布和图片使用条件。

### 18.5 Node 入口

需要决定 Node 入口最终是：

- 完全删除；或
- 只保留静态预览和兼容 API；或
- 通过适配器连接本地 SQLite，但共享同一查询与领域逻辑。

生产以 Cloudflare 为主的前提下，不建议继续维护行为不同的完整 Node 后端。

---

## 19. 实施前最终决策

开始阶段 1 前需要确认：

1. Cloudflare 使用 Free 还是 Paid 计划。
2. 第一阶段是否保留旧数据源选择器作为调试入口。
3. 空数据库时页面显示初始化状态，还是随部署提供完整种子快照。
4. 是否允许在 D1 中持久化第三方完整中文卡文。
5. 初始上线是否要求效果文本搜索，还是先只支持卡名、ID 和系列搜索。

如果以上事项暂未决定，可以采用以下默认值推进：

- 以 Workers Paid 的资源限制设计，但不依赖付费专属业务能力。
- 普通 UI 移除第三方数据源选择，开发模式保留调试开关。
- 部署后先执行初始化同步，再开放新 API。
- D1 保存结构化卡片资料与中文卡文。
- 第一版支持卡名、ID、系列和效果文本搜索。

---

## 20. 官方能力参考

- D1 本地开发：<https://developers.cloudflare.com/d1/best-practices/local-development/>
- D1 平台限制：<https://developers.cloudflare.com/d1/platform/limits/>
- D1 SQL 与 FTS5：<https://developers.cloudflare.com/d1/sql-api/sql-statements/>
- D1 索引建议：<https://developers.cloudflare.com/d1/best-practices/use-indexes/>
- Workers 本地开发：<https://developers.cloudflare.com/workers/local-development/>
- 本地 binding 支持：<https://developers.cloudflare.com/workers/local-development/bindings-per-env/>
- Cron Triggers：<https://developers.cloudflare.com/workers/configuration/cron-triggers/>
- Workflows 本地开发：<https://developers.cloudflare.com/workflows/build/local-development/>
- Workflows 限制：<https://developers.cloudflare.com/workflows/reference/limits/>
- R2 Workers API：<https://developers.cloudflare.com/r2/get-started/workers-api/>
- Workers KV 一致性：<https://developers.cloudflare.com/kv/concepts/how-kv-works/>
