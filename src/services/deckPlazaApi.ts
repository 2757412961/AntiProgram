import {
  DeckPlazaFormat,
  DeckPlazaMetric,
  DeckPlazaResponse,
} from '../types/deckPlaza';

const API_BASE = (import.meta.env.VITE_DECK_PLAZA_API_BASE || '').replace(/\/$/, '');

interface FetchDeckPlazaOptions {
  format: DeckPlazaFormat;
  metric: DeckPlazaMetric;
  forceRefresh?: boolean;
  signal?: AbortSignal;
}

export async function fetchDeckPlaza({
  format,
  metric,
  forceRefresh = false,
  signal,
}: FetchDeckPlazaOptions): Promise<DeckPlazaResponse> {
  const params = new URLSearchParams({ format, metric });
  if (forceRefresh) params.set('refresh', '1');
  const response = await fetch(`${API_BASE}/api/v1/deck-plaza?${params}`, {
    signal,
    headers: { accept: 'application/json' },
  });
  const payload = await response.json().catch(() => null) as DeckPlazaResponse | { error?: string } | null;
  if (!response.ok) {
    const message = payload && 'error' in payload && payload.error
      ? payload.error
      : `卡组广场接口请求失败：HTTP ${response.status}`;
    throw new Error(message);
  }
  if (!payload || !('rankings' in payload) || !Array.isArray(payload.rankings)) {
    throw new Error('卡组广场接口返回了无效数据');
  }
  return payload;
}
