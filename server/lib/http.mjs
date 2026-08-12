import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';

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
  const request = target.protocol === 'http:' ? httpRequest : httpsRequest;

  return new Promise((resolve, reject) => {
    const req = request(target, {
      method: 'GET',
      headers: {
        accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
        'accept-encoding': 'identity',
        'user-agent': 'AntiProgram-Deck-Plaza/1.0 (+personal deck discovery app)',
        ...headers,
      },
    }, response => {
      const status = response.statusCode || 0;
      const location = response.headers.location;
      if (status >= 300 && status < 400 && location) {
        response.resume();
        if (redirects <= 0) {
          reject(new Error(`重定向次数过多：${url}`));
          return;
        }
        fetchText(new URL(location, target).toString(), {
          headers,
          timeoutMs,
          maxBytes,
          redirects: redirects - 1,
        }).then(resolve, reject);
        return;
      }

      if (status < 200 || status >= 300) {
        response.resume();
        reject(new Error(`上游请求失败：HTTP ${status}`));
        return;
      }

      const chunks = [];
      let received = 0;
      response.on('data', chunk => {
        received += chunk.length;
        if (received > maxBytes) {
          req.destroy(new Error(`上游响应超过 ${maxBytes} 字节上限`));
          return;
        }
        chunks.push(chunk);
      });
      response.on('end', () => resolve({
        body: Buffer.concat(chunks).toString('utf8'),
        headers: response.headers,
        status,
      }));
      response.on('error', reject);
    });

    req.setTimeout(timeoutMs, () => req.destroy(new Error(`上游请求 ${timeoutMs}ms 超时`)));
    req.on('error', reject);
    req.end();
  });
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
