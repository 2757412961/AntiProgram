# AntiProgram / YGO Card Searcher

生产环境以 Cloudflare Worker + Static Assets 为主。本地开发默认使用 Wrangler 模拟 Worker 和 D1；旧 Node.js 服务仍作为兼容入口保留。

## 本地开发（Cloudflare Worker + D1）

推荐使用 Node.js `22.22.2`。首次启动先安装依赖、应用本地 D1 migration，并写入确定性测试种子：

```powershell
nvm use 22.22.2
npm install
npm run db:setup:local
npm run dev
```

浏览器访问 <http://127.0.0.1:3000>。Vite 会把 API 和图片请求转发到运行在 `127.0.0.1:8787` 的本地 Worker。D1 等本地 binding 数据保存在 `.wrangler/state`，不会写入生产环境。

本地测试 Cloudflare Cron wiring：

```powershell
npm run sync:local
```

阶段 1 的 scheduled handler 只向本地 D1 写入一条 `skipped` 运行记录，用来验证 Cron 与数据库连接；完整卡库同步会在后续阶段启用。

> 完成首次初始化后，日常启动只需运行 `npm run dev`。不要使用 `npm run dev:client` 启动完整应用，因为它不提供 Worker API。

## 兼容 Node 模式

需要验证旧 Node 服务时运行：

```powershell
npm run dev:node
```

终端会显示：

```text
Vite + Deck Plaza API listening on http://127.0.0.1:3000
```

### 生产模式 Node 启动

```powershell
npm run build
npm start
```

生产模式默认地址为 <http://127.0.0.1:4173>。

### 部署到 Cloudflare

`wrangler.jsonc` 中的 D1 `database_id` 当前是本地开发占位值。首次部署必须先创建远程数据库，并把 Wrangler 输出的真实 ID 写入配置：

```powershell
npx wrangler d1 create antiprogram-card-catalog
npm run db:migrate:remote
```

上线前先验证 Worker 能成功打包：

```powershell
npm test
npm run check:worker
```

首次从本机部署需要登录 Cloudflare：

```powershell
npx wrangler login
npm run deploy:cloudflare
```

也可以在 Cloudflare Dashboard 的 **Workers & Pages > Create application > Import a repository** 中连接 GitHub。构建命令填写 `npm run build`，部署命令填写 `npx wrangler deploy`，生产分支选择 `main`。Worker 名称必须与 `wrangler.jsonc` 中的 `antiprogram-ygo-card-searcher` 一致。

Cloudflare 使用 `dist` 提供静态页面，并由 `worker/index.mjs` 处理 `/api/*`、`/card-images/*` 和 `/chinese-card-images/*`。D1 migration 位于 `migrations/`；本地专用种子位于 `seed/`，不得导入生产数据库。

## 常见问题

### `Master Duel 当前卡表接口 HTTP 502`

这表示本地页面和服务端已经启动，但服务端无法访问远程禁卡表数据源：

可在 PowerShell 中直接检查远程数据源：

```powershell
Invoke-WebRequest "https://dawnbrandbots.github.io/yaml-yugi-limit-regulation/master-duel/current.vector.json" -UseBasicParsing 
```

如果该命令也失败，请检查网络、代理、防火墙或 VPN，并确保允许访问 `dawnbrandbots.github.io:443`。如果远程地址可以访问，再检查本地代理接口：

```powershell
Invoke-WebRequest "http://127.0.0.1:3000/api/master-duel-banlist" -UseBasicParsing
```

本页有意不使用本地备用禁卡表，避免把过期数据显示成当前规则。因此远程数据源不可访问时会明确显示错误，而不是静默降级。

### SQLite 警告

Node.js 可能输出 `ExperimentalWarning: SQLite is an experimental feature`。这是 Node.js 的功能状态提示，不是启动失败，也不会导致禁卡表接口返回 502。
