import { loadMasterDuelBanlistHistory } from '../server/providers/masterDuelBanlistHistory.mjs';
import { buildDeckPlaza, getDeckSources } from './deckPlazaService.mjs';
import { cachedJsonResponse, jsonResponse } from './lib/cache.mjs';
import { proxyUpstream } from './lib/proxy.mjs';

function targetUrl(base, path = '', search = '') {
  return new URL(`${base}${path}${search}`);
}

async function handleApi(request, url, env, context) {
  if (url.pathname === '/api/master-duel-banlist') {
    return proxyUpstream(
      request,
      new URL('https://dawnbrandbots.github.io/yaml-yugi-limit-regulation/master-duel/current.vector.json'),
      context,
      { ttlSeconds: 300 },
    );
  }
  if (url.pathname.startsWith('/api/ygoprodeck/')) {
    const path = url.pathname.slice('/api/ygoprodeck'.length);
    return proxyUpstream(
      request,
      targetUrl('https://db.ygoprodeck.com/api/v7', path, url.search),
      context,
      { ttlSeconds: 300 },
    );
  }
  if (url.pathname === '/api/ygocdb' || url.pathname.startsWith('/api/ygocdb/')) {
    const path = url.pathname.slice('/api/ygocdb'.length) || '/';
    return proxyUpstream(
      request,
      targetUrl('https://ygocdb.com/api/v0', path, url.search),
      context,
      { ttlSeconds: 300 },
    );
  }
  if (url.pathname.startsWith('/api/yaml-yugi-cards/')) {
    const path = url.pathname.slice('/api/yaml-yugi-cards/'.length);
    return proxyUpstream(
      request,
      targetUrl(
        'https://cdn.jsdelivr.net/gh/DawnbrandBots/yaml-yugi/data/cards/',
        encodeURIComponent(path),
      ),
      context,
      { ttlSeconds: 3600 },
    );
  }
  if (url.pathname.startsWith('/chinese-card-images/')) {
    const path = url.pathname.slice('/chinese-card-images'.length);
    return proxyUpstream(
      request,
      targetUrl('https://cdn.233.momobako.com', path, url.search),
      context,
      { ttlSeconds: 86_400 },
    );
  }
  if (url.pathname.startsWith('/card-images/')) {
    const path = url.pathname.slice('/card-images'.length);
    return proxyUpstream(
      request,
      targetUrl('https://images.ygoprodeck.com', path, url.search),
      context,
      { ttlSeconds: 86_400 },
    );
  }
  if (request.method === 'GET' && url.pathname === '/api/v1/master-duel-banlist-history') {
    return cachedJsonResponse(request, context, {
      ttlSeconds: 3600,
      force: url.searchParams.get('refresh') === '1',
    }, () => loadMasterDuelBanlistHistory());
  }
  if (request.method === 'GET' && url.pathname === '/api/v1/deck-plaza') {
    const format = url.searchParams.get('format') || 'master-duel';
    const ttlSeconds = format === 'master-duel' ? 1200 : 3600;
    return cachedJsonResponse(request, context, {
      ttlSeconds,
      force: url.searchParams.get('refresh') === '1',
    }, () => buildDeckPlaza({
      format,
      metric: url.searchParams.get('metric') || undefined,
      allowRemoteImages: env.DECK_PLAZA_ALLOW_REMOTE_IMAGES === '1',
    }));
  }
  if (request.method === 'GET' && url.pathname === '/api/v1/deck-sources') {
    return jsonResponse({ sources: getDeckSources() }, 200, {
      'cache-control': 'public, max-age=300',
    });
  }
  return jsonResponse({ error: 'Not found' }, 404, { 'cache-control': 'no-store' });
}

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith('/api/')
          || url.pathname.startsWith('/card-images/')
          || url.pathname.startsWith('/chinese-card-images/')) {
        return await handleApi(request, url, env, context);
      }
      return env.ASSETS.fetch(request);
    } catch (error) {
      const status = Number(error?.statusCode) || 502;
      return jsonResponse({
        error: error instanceof Error ? error.message : '未知 Worker 错误',
      }, status, { 'cache-control': 'no-store' });
    }
  },
};
