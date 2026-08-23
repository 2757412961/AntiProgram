import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './index.mjs';

function createRuntime() {
  return {
    env: {
      DECK_PLAZA_ALLOW_REMOTE_IMAGES: '0',
      ASSETS: {
        fetch: async () => new Response('asset-response', {
          headers: { 'content-type': 'text/plain' },
        }),
      },
    },
    context: {
      waitUntil() {},
    },
  };
}

test('Worker returns source metadata without invoking an upstream request', async () => {
  const { env, context } = createRuntime();
  const response = await worker.fetch(
    new Request('https://example.test/api/v1/deck-sources'),
    env,
    context,
  );
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.sources.length, 3);
  assert.ok(body.sources.every(source => source.storage === 'cache'));
});

test('Worker delegates non-API requests to the static asset binding', async () => {
  const { env, context } = createRuntime();
  const response = await worker.fetch(
    new Request('https://example.test/'),
    env,
    context,
  );
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'asset-response');
});

test('Worker returns a JSON 404 for an unknown API route', async () => {
  const { env, context } = createRuntime();
  const response = await worker.fetch(
    new Request('https://example.test/api/unknown'),
    env,
    context,
  );
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: 'Not found' });
});

test('Worker maps the Master Duel route to its fixed upstream', async () => {
  const originalFetch = globalThis.fetch;
  const originalCaches = globalThis.caches;
  const pending = [];
  let requestedUrl = null;
  globalThis.caches = {
    default: {
      async match() { return undefined; },
      async put() {},
    },
  };
  globalThis.fetch = async input => {
    requestedUrl = String(input);
    return new Response('{"date":"test"}', {
      headers: { 'content-type': 'application/json' },
    });
  };

  try {
    const { env } = createRuntime();
    const response = await worker.fetch(
      new Request('https://example.test/api/master-duel-banlist'),
      env,
      { waitUntil(promise) { pending.push(promise); } },
    );
    assert.equal(response.status, 200);
    assert.equal(
      requestedUrl,
      'https://dawnbrandbots.github.io/yaml-yugi-limit-regulation/master-duel/current.vector.json',
    );
    assert.deepEqual(await response.json(), { date: 'test' });
    await Promise.all(pending);
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.caches = originalCaches;
  }
});
