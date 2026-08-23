import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';
import { sendJson } from './lib/http.mjs';
import { proxyUpstream } from './lib/upstreamProxy.mjs';

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
const envPath = join(rootDir, '.env');
if (existsSync(envPath)) loadEnvFile(envPath);
const { getDeckPlaza, getDeckSources } = await import('./deckPlazaService.mjs');
const { getClassicDeck } = await import('./classicDeckService.mjs');
const { getMasterDuelBanlistHistory } = await import('./masterDuelBanlistHistoryService.mjs');
const distDir = join(rootDir, 'dist');
const isProduction = process.env.NODE_ENV === 'production' || process.argv.includes('--production');
const port = Number(process.env.PORT || (isProduction ? 4173 : 3000));
const host = process.env.HOST || '127.0.0.1';
const vite = isProduction ? null : await import('vite').then(({ createServer: createViteServer }) =>
  createViteServer({
    root: rootDir,
    mode: 'middleware',
    // The app HTTP server owns the port. Letting Vite open a separate HMR
    // websocket listener here races with server.listen() on the same port.
    server: { middlewareMode: true, hmr: false },
    appType: 'spa',
  })
);

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

async function apiHandler(request, response, url) {
  if (url.pathname === '/api/master-duel-banlist') {
    await proxyUpstream(
      request,
      response,
      'https://dawnbrandbots.github.io/yaml-yugi-limit-regulation/master-duel/current.vector.json',
    );
    return true;
  }
  if (url.pathname.startsWith('/api/ygoprodeck/')) {
    const path = url.pathname.slice('/api/ygoprodeck'.length);
    await proxyUpstream(request, response, `https://db.ygoprodeck.com/api/v7${path}${url.search}`);
    return true;
  }
  if (url.pathname === '/api/ygocdb' || url.pathname.startsWith('/api/ygocdb/')) {
    const path = url.pathname.slice('/api/ygocdb'.length) || '/';
    await proxyUpstream(request, response, `https://ygocdb.com/api/v0${path}${url.search}`);
    return true;
  }
  if (url.pathname.startsWith('/api/yaml-yugi-cards/')) {
    const path = url.pathname.slice('/api/yaml-yugi-cards/'.length);
    await proxyUpstream(
      request,
      response,
      `https://cdn.jsdelivr.net/gh/DawnbrandBots/yaml-yugi/data/cards/${encodeURIComponent(path)}`,
    );
    return true;
  }
  if (url.pathname.startsWith('/chinese-card-images/')) {
    const path = url.pathname.slice('/chinese-card-images'.length);
    await proxyUpstream(request, response, `https://cdn.233.momobako.com${path}${url.search}`);
    return true;
  }
  if (url.pathname.startsWith('/card-images/')) {
    const path = url.pathname.slice('/card-images'.length);
    await proxyUpstream(request, response, `https://images.ygoprodeck.com${path}${url.search}`);
    return true;
  }
  if (request.method === 'GET' && url.pathname === '/api/v1/master-duel-banlist-history') {
    const data = await getMasterDuelBanlistHistory({
      force: url.searchParams.get('refresh') === '1',
    });
    sendJson(response, 200, data);
    return true;
  }
  if (request.method === 'GET' && url.pathname === '/api/v1/deck-plaza') {
    const data = await getDeckPlaza({
      format: url.searchParams.get('format') || 'master-duel',
      metric: url.searchParams.get('metric') || undefined,
      force: url.searchParams.get('refresh') === '1',
    });
    sendJson(response, 200, data);
    return true;
  }
  if (request.method === 'GET' && url.pathname === '/api/v1/deck-plaza/classic-build') {
    const data = await getClassicDeck({
      name: url.searchParams.get('name') || '',
      format: url.searchParams.get('format') || '',
      detailUrl: url.searchParams.get('detailUrl') || undefined,
    });
    sendJson(response, 200, data, { 'cache-control': 'private, max-age=300' });
    return true;
  }
  if (request.method === 'GET' && url.pathname === '/api/v1/deck-sources') {
    sendJson(response, 200, { sources: getDeckSources() });
    return true;
  }
  return false;
}

function serveStatic(response, pathname) {
  const requestPath = pathname === '/' ? '/index.html' : decodeURIComponent(pathname);
  const normalizedPath = normalize(requestPath).replace(/^([/\\])+/, '');
  let filePath = resolve(distDir, normalizedPath);
  if (!filePath.startsWith(`${distDir}${sep}`) && filePath !== distDir) return false;
  if (!existsSync(filePath) || !statSync(filePath).isFile()) filePath = join(distDir, 'index.html');
  if (!existsSync(filePath)) return false;
  response.writeHead(200, {
    'content-type': contentTypes[extname(filePath)] || 'application/octet-stream',
    'cache-control': filePath.endsWith('index.html') ? 'no-cache' : 'public, max-age=31536000, immutable',
  });
  createReadStream(filePath).pipe(response);
  return true;
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  try {
    if (await apiHandler(request, response, url)) return;
    if (isProduction && serveStatic(response, url.pathname)) return;
    if (vite) {
      vite.middlewares(request, response, error => {
        if (error) sendJson(response, 500, { error: error.message });
        else sendJson(response, 404, { error: 'Not found' });
      });
      return;
    }
    sendJson(response, 404, { error: 'Not found' });
  } catch (error) {
    const status = Number(error?.statusCode) || 502;
    sendJson(response, status, { error: error instanceof Error ? error.message : '未知服务端错误' });
  }
});

server.listen(port, host, () => {
  console.log(`${isProduction ? 'App' : 'Vite + Deck Plaza API'} listening on http://${host}:${port}`);
});
