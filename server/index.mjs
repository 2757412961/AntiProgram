import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';
import { sendJson } from './lib/http.mjs';

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
const envPath = join(rootDir, '.env');
if (existsSync(envPath)) loadEnvFile(envPath);
const { getDeckPlaza, getDeckSources } = await import('./deckPlazaService.mjs');
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
