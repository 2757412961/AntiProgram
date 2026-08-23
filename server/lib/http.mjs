const MAX_REDIRECTS = 4;
const DEFAULT_TIMEOUT_MS = 12_000;
const DEFAULT_MAX_BYTES = 4 * 1024 * 1024;

export async function fetchText(url, options = {}) {
  const {
    headers = {},
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxBytes = DEFAULT_MAX_BYTES,
    redirects = MAX_REDIRECTS,
  } = options;
  const target = new URL(url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(target, {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
        'accept-encoding': 'identity',
        'user-agent': 'AntiProgram-Deck-Plaza/1.0 (+personal deck discovery app)',
        ...headers,
      },
    });

    const location = response.headers.get('location');
    if (response.status >= 300 && response.status < 400 && location) {
      if (redirects <= 0) throw new Error(`重定向次数过多：${url}`);
      return fetchText(new URL(location, target).toString(), {
        headers,
        timeoutMs,
        maxBytes,
        redirects: redirects - 1,
      });
    }
    if (!response.ok) throw new Error(`上游请求失败：HTTP ${response.status}`);
    if (!response.body) return {
      body: '',
      headers: Object.fromEntries(response.headers),
      status: response.status,
    };

    const reader = response.body.getReader();
    const chunks = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > maxBytes) {
        await reader.cancel();
        throw new Error(`上游响应超过 ${maxBytes} 字节上限`);
      }
      chunks.push(value);
    }

    const payload = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) {
      payload.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return {
      body: new TextDecoder().decode(payload),
      headers: Object.fromEntries(response.headers),
      status: response.status,
    };
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error(`上游请求 ${timeoutMs}ms 超时`);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function sendJson(response, status, body, extraHeaders = {}) {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...extraHeaders,
  });
  response.end(payload);
}
