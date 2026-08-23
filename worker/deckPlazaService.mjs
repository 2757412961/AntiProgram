import { masterDuelMetaProvider } from '../server/providers/masterDuelMeta.mjs';
import { createYgoProDeckTournamentProvider } from '../server/providers/ygoprodeckTournament.mjs';

const providers = [
  masterDuelMetaProvider,
  createYgoProDeckTournamentProvider('ocg'),
  createYgoProDeckTournamentProvider('tcg'),
];

function providerMetadata(provider, snapshot, error = null) {
  return {
    id: provider.sourceId || provider.id,
    instanceId: provider.id,
    label: provider.label,
    format: provider.format,
    sourceUrl: provider.sourceUrl,
    methods: provider.methods,
    methodology: provider.methodology,
    fetchedAt: snapshot?.fetchedAt || null,
    lastAttemptAt: snapshot?.fetchedAt || null,
    freshness: snapshot ? 'fresh' : 'unavailable',
    error,
    persisted: Boolean(snapshot),
    storage: 'cache',
  };
}

export async function buildDeckPlaza({
  format = 'master-duel',
  metric,
} = {}) {
  const selected = providers.filter(provider => provider.format === format);
  if (selected.length === 0) {
    throw Object.assign(new Error(`不支持的赛制：${format}`), { statusCode: 400 });
  }

  const results = await Promise.allSettled(selected.map(provider => provider.load()));
  const warnings = [];
  const rankings = [];
  const decks = [];
  const sources = [];

  results.forEach((result, index) => {
    const provider = selected[index];
    if (result.status === 'rejected') {
      const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
      warnings.push(`${provider.label}：${message}`);
      sources.push(providerMetadata(provider, null, message));
      return;
    }

    const data = result.value;
    sources.push(providerMetadata(provider, data));
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
    schemaVersion: 2,
    format,
    metric: format === 'master-duel'
      ? (metric === 'popularity' ? 'popularity' : 'power')
      : 'top-count',
    generatedAt: new Date().toISOString(),
    rankings,
    decks,
    sources,
    warnings,
  };
}

export function getDeckSources() {
  return providers.map(provider => providerMetadata(provider, null));
}
