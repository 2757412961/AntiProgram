const MAX_REQUEST_BYTES = 1024 * 1024;
const MAX_RESPONSE_BYTES = 64 * 1024 * 1024;
const TIMEOUT_MS = 25_000;

function allowedRequestHeaders(request) {
  const headers = new Headers({
    accept: request.headers.get('accept') || '*/*',
    'accept-encoding': 'identity',
    'user-agent': 'AntiProgram/1.0 (+Cloudflare Worker YGO data proxy)',
  });
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);
  return headers;
}

async function limitedRequestBody(request) {
  if (request.method === 'GET' || request.method === 'HEAD') return undefined;
  const declaredSize = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredSize) && declaredSize > MAX_REQUEST_BYTES) {
    throw Object.assign(new Error('请求体过大'), { statusCode: 413 });
  }
  const body = await request.arrayBuffer();
  if (body.byteLength > MAX_REQUEST_BYTES) {
    throw Object.assign(new Error('请求体过大'), { statusCode: 413 });
  }
  return body;
}

function safeResponseHeaders(upstream, ttlSeconds) {
  const headers = new Headers(upstream.headers);
  headers.delete('connection');
  headers.delete('keep-alive');
  headers.delete('set-cookie');
  headers.delete('transfer-encoding');
  headers.set('cache-control', `public, max-age=${ttlSeconds}`);
  return headers;
}

export async function proxyUpstream(request, targetUrl, context, {
  ttlSeconds = 300,
} = {}) {
  if (!['GET', 'HEAD', 'POST'].includes(request.method)) {
    throw Object.assign(new Error('不支持的请求方法'), { statusCode: 405 });
  }

  const shouldCache = request.method === 'GET';
  const cache = caches.default;
  const cacheKey = shouldCache ? new Request(request.url, { method: 'GET' }) : null;
  if (cacheKey) {
    const cached = await cache.match(cacheKey);
    if (cached) return cached;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const body = await limitedRequestBody(request);
    const upstream = await fetch(targetUrl, {
      method: request.method,
      body,
      redirect: 'follow',
      signal: controller.signal,
      headers: allowedRequestHeaders(request),
    });
    const responseSize = Number(upstream.headers.get('content-length'));
    if (Number.isFinite(responseSize) && responseSize > MAX_RESPONSE_BYTES) {
      throw Object.assign(new Error('上游响应过大'), { statusCode: 502 });
    }

    const response = new Response(request.method === 'HEAD' ? null : upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: safeResponseHeaders(upstream, ttlSeconds),
    });
    if (cacheKey && upstream.ok) {
      context.waitUntil(cache.put(cacheKey, response.clone()));
    }
    return response;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw Object.assign(new Error('上游请求超时'), { statusCode: 504 });
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
