import {
  MasterDuelBanlistBatch,
  MasterDuelBanlistChange,
  MasterDuelBanlistHistoryRecord,
  MasterDuelBanlistHistoryResponse,
  MasterDuelLimit,
} from '../types/banlistHistory';

const API_BASE = (import.meta.env.VITE_DECK_PLAZA_API_BASE || '').replace(/\/$/, '');
const ALLOWED_LIMITS = new Set<MasterDuelLimit>(['Forbidden', 'Limited 1', 'Limited 2']);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function parseLimit(value: unknown, path: string): MasterDuelLimit | null {
  if (value === null) return null;
  if (typeof value === 'string' && ALLOWED_LIMITS.has(value as MasterDuelLimit)) {
    return value as MasterDuelLimit;
  }
  throw new Error(`${path} 含有未知禁限状态`);
}

function parseChange(value: unknown, path: string): MasterDuelBanlistChange {
  if (!isObject(value)) throw new Error(`${path} 不是对象`);
  if (typeof value.cardId !== 'string' || value.cardId.trim() === '') {
    throw new Error(`${path}.cardId 无效`);
  }
  if (typeof value.cardName !== 'string' || value.cardName.trim() === '') {
    throw new Error(`${path}.cardName 无效`);
  }
  const from = parseLimit(value.from, `${path}.from`);
  const to = parseLimit(value.to, `${path}.to`);
  if (from === to) throw new Error(`${path} 的前后状态相同`);
  return { cardId: value.cardId, cardName: value.cardName.trim(), from, to };
}

function parseBatch(value: unknown, path: string): MasterDuelBanlistBatch {
  if (!isObject(value)) throw new Error(`${path} 不是对象`);
  if (value.effectiveDate !== null && !isDate(value.effectiveDate)) {
    throw new Error(`${path}.effectiveDate 无效`);
  }
  if (!Array.isArray(value.changes) || value.changes.length === 0) {
    throw new Error(`${path}.changes 为空`);
  }
  return {
    effectiveDate: value.effectiveDate,
    changes: value.changes.map((change, index) => parseChange(change, `${path}.changes[${index}]`)),
  };
}

function parseRecord(value: unknown, path: string): MasterDuelBanlistHistoryRecord {
  if (!isObject(value)) throw new Error(`${path} 不是对象`);
  if (typeof value.id !== 'string' || value.id.trim() === '') throw new Error(`${path}.id 无效`);
  if (!isTimestamp(value.announcedAt)) throw new Error(`${path}.announcedAt 无效`);
  if (typeof value.title !== 'string' || value.title.trim() === '') throw new Error(`${path}.title 无效`);
  if (value.sourceUrl !== null && (typeof value.sourceUrl !== 'string' || !/^https:\/\//.test(value.sourceUrl))) {
    throw new Error(`${path}.sourceUrl 无效`);
  }
  if (value.sourceKind !== 'article' && value.sourceKind !== 'api-only') {
    throw new Error(`${path}.sourceKind 无效`);
  }
  if (!Array.isArray(value.batches) || value.batches.length === 0) {
    throw new Error(`${path}.batches 为空`);
  }
  return {
    id: value.id,
    announcedAt: value.announcedAt,
    title: value.title.trim(),
    sourceUrl: value.sourceUrl,
    sourceKind: value.sourceKind,
    batches: value.batches.map((batch, index) => parseBatch(batch, `${path}.batches[${index}]`)),
  };
}

function parseResponse(value: unknown): MasterDuelBanlistHistoryResponse {
  if (!isObject(value)) throw new Error('接口返回值不是对象');
  if (!isTimestamp(value.generatedAt)) throw new Error('接口缺少有效同步时间');
  if (!isObject(value.source)
      || value.source.id !== 'master-duel-meta'
      || value.source.kind !== 'third-party-mirror'
      || typeof value.source.label !== 'string'
      || typeof value.source.sourceUrl !== 'string') {
    throw new Error('接口缺少可验证的数据源说明');
  }
  if (!Array.isArray(value.records) || value.records.length === 0) {
    throw new Error('接口没有返回任何已校验记录');
  }
  if (!Array.isArray(value.warnings) || value.warnings.some(item => typeof item !== 'string')) {
    throw new Error('接口 warnings 字段无效');
  }
  return {
    generatedAt: value.generatedAt,
    source: {
      id: 'master-duel-meta',
      label: value.source.label,
      sourceUrl: value.source.sourceUrl,
      kind: 'third-party-mirror',
    },
    records: value.records.map((record, index) => parseRecord(record, `records[${index}]`)),
    warnings: value.warnings,
  };
}

export async function fetchMasterDuelBanlistHistory(
  forceRefresh = false,
  signal?: AbortSignal,
): Promise<MasterDuelBanlistHistoryResponse> {
  const query = forceRefresh ? '?refresh=1' : '';
  const response = await fetch(`${API_BASE}/api/v1/master-duel-banlist-history${query}`, {
    signal,
    headers: { accept: 'application/json' },
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = isObject(payload) && typeof payload.error === 'string'
      ? payload.error
      : `HTTP ${response.status}`;
    throw new Error(detail);
  }
  return parseResponse(payload);
}
