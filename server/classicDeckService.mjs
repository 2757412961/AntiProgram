import { loadClassicDeck } from './providers/classicDeck.mjs';

const CACHE_TTL_MS = 30 * 60 * 1000;
const cache = new Map();

export async function getClassicDeck({ name, format, detailUrl } = {}) {
  const key = JSON.stringify([format, String(name || '').trim(), detailUrl || '']);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.data;
  if (cached?.inflight) return cached.inflight;

  const inflight = loadClassicDeck({ name, format, detailUrl })
    .then(data => {
      cache.set(key, { data, fetchedAt: Date.now(), inflight: null });
      return data;
    })
    .catch(error => {
      cache.delete(key);
      throw error;
    });
  cache.set(key, { data: cached?.data || null, fetchedAt: cached?.fetchedAt || 0, inflight });
  return inflight;
}
