# AntiProgram / YGO Card Searcher

本项目使用 Node.js 运行本地 Web 服务，由同一个进程提供 Vite 页面和 API 代理。

## 开发环境启动

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

## 生产模式启动

```powershell
npm run build
npm start
```

生产模式默认地址为 <http://127.0.0.1:4173>。

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
