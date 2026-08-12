const MAX_REQUEST_BYTES = 1024 * 1024;
const MAX_RESPONSE_BYTES = 64 * 1024 * 1024;
const TIMEOUT_MS = 25_000;

async function readRequestBody(request) {
  if (request.method === 'GET' || request.method === 'HEAD') return undefined;
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_REQUEST_BYTES) {
      throw Object.assign(new Error('请求体过大'), { statusCode: 413 });
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function proxyUpstream(request, response, targetUrl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const body = await readRequestBody(request);
    const upstream = await fetch(targetUrl, {
      method: request.method,
      body,
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        accept: request.headers.accept || '*/*',
        'accept-encoding': 'identity',
        ...(request.headers['content-type'] ? { 'content-type': request.headers['content-type'] } : {}),
        'user-agent': 'AntiProgram/1.0 (+local YGO data proxy)',
      },
    });
    const payload = Buffer.from(await upstream.arrayBuffer());
    if (payload.length > MAX_RESPONSE_BYTES) {
      throw Object.assign(new Error('上游响应过大'), { statusCode: 502 });
    }
    response.writeHead(upstream.status, {
      'content-type': upstream.headers.get('content-type') || 'application/octet-stream',
      'cache-control': upstream.headers.get('cache-control') || 'public, max-age=300',
      ...(upstream.headers.get('etag') ? { etag: upstream.headers.get('etag') } : {}),
    });
    response.end(payload);
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw Object.assign(new Error('上游请求超时'), { statusCode: 504 });
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
