import { masterDuelMetaProvider } from './providers/masterDuelMeta.mjs';
import { createYgoProDeckTournamentProvider } from './providers/ygoprodeckTournament.mjs';
import { createSnapshotRepository } from './storage/snapshotRepository.mjs';

const providers = [
  masterDuelMetaProvider,
  createYgoProDeckTournamentProvider('ocg'),
  createYgoProDeckTournamentProvider('tcg'),
];
const repository = await createSnapshotRepository();
const MANUAL_REFRESH_COOLDOWN_MS = 5 * 60 * 1000;
const ALLOW_REMOTE_IMAGES = process.env.DECK_PLAZA_ALLOW_REMOTE_IMAGES === '1';

function sanitizeSnapshot(snapshot) {
  if (!snapshot || ALLOW_REMOTE_IMAGES) return snapshot;
  const withoutImage = ({ imageUrl: _imageUrl, ...item }) => item;
  return {
    ...snapshot,
    rankings: Array.isArray(snapshot.rankings)
      ? snapshot.rankings.map(withoutImage)
      : Object.fromEntries(Object.entries(snapshot.rankings || {}).map(
        ([metric, rankings]) => [metric, rankings.map(withoutImage)],
      )),
    decks: snapshot.decks?.map(withoutImage),
  };
}

const states = new Map(providers.map(provider => [provider.id, {
  data: null,
  error: null,
  inflight: null,
  lastAttemptAt: null,
  lastForcedAt: null,
  hydrated: false,
  persisted: false,
}]));

async function hydrateProvider(provider, state) {
  if (state.hydrated) return;
  state.hydrated = true;
  const snapshot = await repository.load(provider.id);
  if (snapshot) {
    state.data = sanitizeSnapshot(snapshot);
    state.persisted = repository.mode === 'sqlite';
  }
}

async function refreshProvider(provider, force = false) {
  const state = states.get(provider.id);
  await hydrateProvider(provider, state);
  const fetchedAt = state.data?.fetchedAt ? Date.parse(state.data.fetchedAt) : 0;
  const lastForcedAt = state.lastForcedAt ? Date.parse(state.lastForcedAt) : 0;
  if (force && state.data && Date.now() - lastForcedAt < MANUAL_REFRESH_COOLDOWN_MS) return state.data;
  if (!force && state.data && Date.now() - fetchedAt < provider.refreshIntervalMs) return state.data;
  if (state.inflight) return state.inflight;

  const startedAt = new Date().toISOString();
  if (force) state.lastForcedAt = startedAt;
  state.lastAttemptAt = startedAt;
  state.inflight = provider.load()
    .then(async data => {
      state.data = sanitizeSnapshot(data);
      state.error = null;
      await repository.save(provider.id, data);
      state.persisted = repository.mode === 'sqlite';
      await repository.recordRun?.(provider.id, 'success', null, startedAt, new Date().toISOString());
      return data;
    })
    .catch(async error => {
      state.error = error instanceof Error ? error.message : String(error);
      await repository.recordRun?.(provider.id, 'error', state.error, startedAt, new Date().toISOString());
      if (state.data) return state.data;
      throw error;
    })
    .finally(() => { state.inflight = null; });
  return state.inflight;
}

function providerMetadata(provider, state) {
  const age = state.data?.fetchedAt ? Date.now() - Date.parse(state.data.fetchedAt) : Number.POSITIVE_INFINITY;
  return {
    id: provider.sourceId || provider.id,
    instanceId: provider.id,
    label: provider.label,
    format: provider.format,
    sourceUrl: provider.sourceUrl,
    methods: provider.methods,
    methodology: provider.methodology,
    fetchedAt: state.data?.fetchedAt || null,
    lastAttemptAt: state.lastAttemptAt,
    freshness: state.data && age <= provider.refreshIntervalMs ? 'fresh' : state.data ? 'stale' : 'unavailable',
    error: state.error,
    persisted: state.persisted,
    storage: repository.mode,
  };
}

export async function getDeckPlaza({ format = 'master-duel', metric, force = false } = {}) {
  const selected = providers.filter(provider => provider.format === format);
  if (selected.length === 0) throw Object.assign(new Error(`不支持的赛制：${format}`), { statusCode: 400 });

  const results = await Promise.allSettled(selected.map(provider => refreshProvider(provider, force)));
  const warnings = [];
  const rankings = [];
  const decks = [];

  results.forEach((result, index) => {
    const provider = selected[index];
    if (result.status === 'rejected') {
      warnings.push(`${provider.label}：${result.reason instanceof Error ? result.reason.message : String(result.reason)}`);
      return;
    }
    const data = result.value;
    if (provider.id === 'master-duel-meta') {
      const selectedMetric = metric === 'popularity' ? 'popularity' : 'power';
      rankings.push(...data.rankings[selectedMetric]);
    } else {
      rankings.push(...data.rankings);
      decks.push(...data.decks);
    }
  });

  if (rankings.length === 0 && decks.length === 0 && warnings.length > 0) {
    throw Object.assign(new Error(warnings.join('；')), { statusCode: 502 });
  }

  return {
    format,
    metric: format === 'master-duel' ? (metric === 'popularity' ? 'popularity' : 'power') : 'top-count',
    generatedAt: new Date().toISOString(),
    rankings,
    decks,
    sources: selected.map(provider => providerMetadata(provider, states.get(provider.id))),
    warnings,
  };
}

export function getDeckSources() {
  return providers.map(provider => providerMetadata(provider, states.get(provider.id)));
}
