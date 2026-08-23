# AntiProgram / YGO Card Searcher

本项目同时支持两套运行方式：本地 Node.js 服务，以及 Cloudflare Worker + Static Assets。两套入口共用 React 前端、API 路径和数据解析逻辑。

## Node

### 开发环境 Node 启动

推荐使用 Node.js `22.22.2`。在 PowerShell 中进入项目目录后运行：

```powershell
nvm use 22.22.2
npm install
npm run dev
```

终端出现以下内容即表示启动成功：

```text
Vite + Deck Plaza API listening on http://127.0.0.1:3000
```

> 日常启动只需运行 `npm run dev`。`npm install` 仅在首次使用或依赖发生变化后需要执行。不要使用 `npm run dev:client` 启动完整应用，因为该命令只启动前端，不提供本项目的服务端 API。

### 生产模式 Node 启动

```powershell
npm run build
npm start
```

生产模式默认地址为 <http://127.0.0.1:4173>。

## Cloudflare

### Cloudflare Worker 本地模式

首次运行前安装依赖，然后启动 Worker 本地模拟器与 Vite 页面：

```powershell
npm install
npm run dev:worker
```

浏览器仍访问 <http://127.0.0.1:3000>。Vite 会把 API 请求转发给运行在 `127.0.0.1:8787` 的本地 Worker；修改 Worker 文件会自动重载，修改前端文件会由 Vite 热更新。

两种本地模式可以按需选择：

```text
npm run dev         Node 服务模式
npm run dev:worker  Cloudflare Worker 模式
```

二者默认都占用前端端口 `3000`，不要在同一个终端会话中同时启动。如果需要对照测试，可让 Node 服务使用其他端口：

```powershell
$env:PORT=3001
npm run dev
```

### 部署到 Cloudflare

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

Cloudflare 使用 `dist` 提供静态页面，并由 `worker/index.mjs` 处理 `/api/*`、`/card-images/*` 和 `/chinese-card-images/*`。API 聚合结果使用 Cloudflare Cache API，本地 Node 模式仍可继续使用内存或 SQLite。

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
