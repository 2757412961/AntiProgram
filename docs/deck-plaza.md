# 卡组广场数据架构

卡组广场不让浏览器直接请求或抓取第三方站点。`server/` 负责采集、结构校验、归一化、缓存及可选持久化，React 前端只消费本站 API。

## 当前数据源

| 环境 | 来源 | 接入方式 | 刷新间隔 | 口径 |
| --- | --- | --- | --- | --- |
| Master Duel | Master Duel Meta Tier List | 服务端 HTML 解析 | 20 分钟 | Power：最近 100 副社区赛事上位卡组；Popularity：最近两周收录卡组占比 |
| OCG | YGOPRODeck Tournament Meta Decks OCG | 服务端 HTML 解析 | 60 分钟 | 最新赛事卡表、名次、赛事规模和同名卡组上位数 |
| TCG | YGOPRODeck Tournament Meta Decks | 服务端 HTML 解析 | 60 分钟 | 最新赛事卡表、名次、赛事规模和同名卡组上位数 |

YGOPRODeck 的公开 v7 API 用于卡片元数据、禁限状态和 ID 归一化，但其公开文档没有赛事卡组排名接口。因此卡组广场只抓取其公开分类页，并保留来源链接；不要把内部接口当作稳定契约。

Untapped.gg 的统计来自其 Companion 用户遥测，且部分数据涉及账户或付费权限。当前不抓取该来源；拿到正式 API 或授权后再增加 provider。

### 数据源边界与扩展顺序

- **YGOPRODeck v7 API** 是正式公开的卡片资料接口，不提供公开的卡组排名接口。遵守其 20 请求/秒限制，卡片资料应缓存，图片不应持续热链。
- **Master Duel Meta** 页面存在站内 JSON 接口，但没有公开 API 文档、速率契约或再发布授权。当前使用公开 Tier List HTML，并对解析数量做校验；商业上线前应联系站方取得展示授权。
- **Road of the King** 提供 RSS 与 WordPress REST API，适合后续补充 OCG/TCG 的赛事名次、选手和卡组类型。文章正文、图片卡表与 OCR 结果不应直接镜像。
- **YGOPRODeck Tournament** 还有未文档化的页面内部接口。获得许可后可以换成 provider，现阶段不把它视为稳定 API。
- **Untapped.gg** 的条款不允许未经书面许可抓取和公开再展示，connector 保持禁用。

所有来源都只保存必要的结构化事实、图片地址与原始链接，不复制文章正文。卡组广场直接展示来源提供的远程配图；正式部署前应确认相应来源的图片使用条款，或将图片地址替换为自己的合规缓存。

## 本站 API

```http
GET /api/v1/deck-plaza?format=master-duel&metric=power
GET /api/v1/deck-plaza?format=master-duel&metric=popularity
GET /api/v1/deck-plaza?format=ocg
GET /api/v1/deck-plaza?format=tcg
GET /api/v1/deck-sources
```

`refresh=1` 会请求手动同步，但服务端对每个来源设置了 5 分钟冷却，并用 single-flight 合并并发请求。上游失败时，若存在上次成功快照则继续返回旧快照并标记 `stale`；没有快照时返回 502。

响应中的 `rankings` 是卡组类型排名，`decks` 是具体赛事卡表，两者不会混成一个实体。`sources` 始终包含统计口径、来源 URL、抓取时间、新鲜度和持久化状态。

## 缓存与入库

默认使用进程内缓存：

```env
DECK_PLAZA_STORAGE=memory
```

支持 `node:sqlite` 的 Node.js（建议 22.13+）可开启 SQLite：

```env
DECK_PLAZA_STORAGE=sqlite
DECK_PLAZA_SQLITE_PATH=data/deck-plaza.sqlite
```

SQLite 会保存每个 provider 最近一次成功的归一化快照，并在 `deck_source_sync_runs` 记录同步结果。数据库文件已加入 `.gitignore`。

## 运行

```sh
npm run dev
npm run build
npm start
```

开发模式由同一个 Node 进程挂载 Vite 中间件和 `/api/v1`；生产模式由该进程提供 `dist/` 静态文件与聚合 API。若前端与 API 分开部署，可设置 `VITE_DECK_PLAZA_API_BASE`。

本地默认监听 `127.0.0.1`。容器部署时显式设置 `HOST=0.0.0.0`，并建议由同域反向代理暴露服务，避免额外的跨域配置。
