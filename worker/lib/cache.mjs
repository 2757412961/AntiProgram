const REFRESHED_AT_HEADER = 'x-antiprogram-refreshed-at';

function cacheKeyFor(request) {
  const url = new URL(request.url);
  url.searchParams.delete('refresh');
  return new Request(url.toString(), { method: 'GET' });
}

export function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...headers,
    },
  });
}

export async function cachedJsonResponse(request, context, {
  ttlSeconds,
  force = false,
  forceCooldownSeconds = 300,
}, load) {
  const cache = caches.default;
  const cacheKey = cacheKeyFor(request);
  const cached = await cache.match(cacheKey);
  if (cached && !force) return cached;

  if (cached && force) {
    const refreshedAt = Date.parse(cached.headers.get(REFRESHED_AT_HEADER) || '');
    if (Number.isFinite(refreshedAt)
        && Date.now() - refreshedAt < forceCooldownSeconds * 1000) {
      return cached;
    }
  }

  try {
    const body = await load();
    const response = jsonResponse(body, 200, {
      'cache-control': `public, max-age=${ttlSeconds}`,
      [REFRESHED_AT_HEADER]: new Date().toISOString(),
    });
    context.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch (error) {
    if (cached) return cached;
    throw error;
  }
}
