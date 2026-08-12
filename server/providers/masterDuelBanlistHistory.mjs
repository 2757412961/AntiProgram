import { fetchText } from '../lib/http.mjs';

export const MASTER_DUEL_BANLIST_CHANGES_API_URL =
  'https://www.masterduelmeta.com/api/v1/banlist-changes?sort=-date';

const MASTER_DUEL_META_ORIGIN = 'https://www.masterduelmeta.com';
const ALLOWED_STATUSES = new Set(['Forbidden', 'Limited 1', 'Limited 2', null]);
const ISO_DATE_TIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requireNonEmptyString(value, path) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${path} 必须是非空字符串`);
  }
  return value;
}

function dateOnlyFromIso(value, path) {
  const text = requireNonEmptyString(value, path);
  const match = text.match(ISO_DATE_TIME_PATTERN);
  if (!match || !Number.isFinite(Date.parse(text))) {
    throw new Error(`${path} 必须是有效的 ISO 日期时间`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year
    || check.getUTCMonth() !== month - 1
    || check.getUTCDate() !== day
  ) {
    throw new Error(`${path} 包含无效的日历日期`);
  }

  // Deliberately truncate the source ISO date. Do not convert time zones.
  return text.slice(0, 10);
}

function optionalDateOnlyFromIso(value, path) {
  if (value === undefined || value === null) return null;
  return dateOnlyFromIso(value, path);
}

function limitationStatus(value, path) {
  // The upstream API omits one side of a transition when it has no listed
  // limitation. Preserve that absence as null; never label it "Unlimited".
  const normalized = value === undefined ? null : value;
  if (!ALLOWED_STATUSES.has(normalized)) {
    throw new Error(`${path} 包含不允许的禁限状态`);
  }
  return normalized;
}

function articleUrl(value, path) {
  const text = requireNonEmptyString(value, path);
  let parsed;
  try {
    parsed = new URL(text, MASTER_DUEL_META_ORIGIN);
  } catch {
    throw new Error(`${path} 不是有效 URL`);
  }
  if (parsed.origin !== MASTER_DUEL_META_ORIGIN || parsed.protocol !== 'https:') {
    throw new Error(`${path} 必须指向 Master Duel Meta`);
  }

  // API article slugs are currently returned as /news/... while the public
  // website serves them under /articles/news/....
  if (!parsed.pathname.startsWith('/articles/')) {
    parsed.pathname = `/articles${parsed.pathname.startsWith('/') ? '' : '/'}${parsed.pathname}`;
  }
  return parsed.toString();
}

function parseChange(value, path) {
  if (!isPlainObject(value)) throw new Error(`${path} 必须是对象`);
  if (!isPlainObject(value.card)) throw new Error(`${path}.card 必须是对象`);

  const from = limitationStatus(value.from, `${path}.from`);
  const to = limitationStatus(value.to, `${path}.to`);
  if (from === null && to === null) {
    throw new Error(`${path} 缺少可验证的 from/to 状态`);
  }
  if (from === to) {
    throw new Error(`${path} 的 from/to 状态相同`);
  }

  return {
    cardId: requireNonEmptyString(value.card._id, `${path}.card._id`),
    cardName: requireNonEmptyString(value.card.name, `${path}.card.name`),
    from,
    to,
  };
}

function parseRawRecord(value, index) {
  const path = `响应[${index}]`;
  if (!isPlainObject(value)) throw new Error(`${path} 必须是对象`);

  const rawId = requireNonEmptyString(value._id, `${path}._id`);
  if (!Array.isArray(value.changes)) throw new Error(`${path}.changes 必须是数组`);
  if (value.changes.length === 0) return { excluded: true, rawId };

  const changes = value.changes.map((change, changeIndex) =>
    parseChange(change, `${path}.changes[${changeIndex}]`));
  const cardIds = new Set();
  for (const change of changes) {
    if (cardIds.has(change.cardId)) {
      throw new Error(`${path}.changes 包含重复 cardId：${change.cardId}`);
    }
    cardIds.add(change.cardId);
  }

  const linkedArticle = value.linkedArticle;
  let article = null;
  if (linkedArticle !== undefined && linkedArticle !== null) {
    if (!isPlainObject(linkedArticle)) throw new Error(`${path}.linkedArticle 必须是对象或 null`);
    article = {
      id: requireNonEmptyString(linkedArticle._id, `${path}.linkedArticle._id`),
      title: requireNonEmptyString(linkedArticle.title, `${path}.linkedArticle.title`),
      sourceUrl: articleUrl(linkedArticle.url, `${path}.linkedArticle.url`),
    };
  }

  return {
    excluded: false,
    rawId,
    groupId: article?.id || rawId,
    announcedAt: dateOnlyFromIso(value.announced, `${path}.announced`),
    effectiveDate: optionalDateOnlyFromIso(value.date, `${path}.date`),
    title: article?.title || 'Master Duel Meta API 禁限变更记录',
    sourceUrl: article?.sourceUrl || null,
    sourceKind: article ? 'article' : 'api-only',
    changes,
  };
}

function sameGroupMetadata(group, record) {
  return group.announcedAt === record.announcedAt
    && group.title === record.title
    && group.sourceUrl === record.sourceUrl
    && group.sourceKind === record.sourceKind;
}

function sortDateDescending(a, b) {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return b.localeCompare(a);
}

function validationError(message) {
  return Object.assign(new Error(message), { statusCode: 502 });
}

export function parseMasterDuelBanlistHistory(
  payload,
  generatedAt = new Date().toISOString(),
) {
  if (!Array.isArray(payload)) {
    throw validationError('Master Duel Meta 禁限表响应必须是数组');
  }

  const warnings = [];
  const parsedRecords = [];
  payload.forEach((value, index) => {
    try {
      const record = parseRawRecord(value, index);
      if (record.excluded) {
        warnings.push(`Master Duel Meta 记录 ${record.rawId} 的 changes 为空，已排除`);
      } else {
        parsedRecords.push(record);
      }
    } catch (error) {
      warnings.push(`Master Duel Meta 记录 ${index} 校验失败，已拒绝：${error.message}`);
    }
  });

  const groups = new Map();
  const rejectedGroups = new Set();
  for (const record of parsedRecords) {
    if (rejectedGroups.has(record.groupId)) continue;
    const group = groups.get(record.groupId);
    if (!group) {
      groups.set(record.groupId, {
        id: record.groupId,
        announcedAt: record.announcedAt,
        title: record.title,
        sourceUrl: record.sourceUrl,
        sourceKind: record.sourceKind,
        batches: [{ effectiveDate: record.effectiveDate, changes: record.changes }],
      });
      continue;
    }

    if (!sameGroupMetadata(group, record)) {
      groups.delete(record.groupId);
      rejectedGroups.add(record.groupId);
      warnings.push(`Master Duel Meta 归并组 ${record.groupId} 元数据冲突，整组已拒绝`);
      continue;
    }

    const existingBatch = group.batches.find(batch => batch.effectiveDate === record.effectiveDate);
    if (existingBatch) {
      const existingCardIds = new Set(existingBatch.changes.map(change => change.cardId));
      const duplicate = record.changes.find(change => existingCardIds.has(change.cardId));
      if (duplicate) {
        groups.delete(record.groupId);
        rejectedGroups.add(record.groupId);
        warnings.push(
          `Master Duel Meta 归并组 ${record.groupId} 的同一生效批次包含重复 cardId ${duplicate.cardId}，整组已拒绝`,
        );
        continue;
      }
      existingBatch.changes.push(...record.changes);
    } else {
      group.batches.push({ effectiveDate: record.effectiveDate, changes: record.changes });
    }
  }

  const records = [...groups.values()]
    .map(record => ({
      ...record,
      batches: record.batches.sort((a, b) =>
        sortDateDescending(a.effectiveDate, b.effectiveDate)),
    }))
    .sort((a, b) =>
      b.announcedAt.localeCompare(a.announcedAt) || a.id.localeCompare(b.id));

  if (records.length === 0) {
    const detail = warnings.length > 0 ? `：${warnings.join('；')}` : '';
    throw validationError(`Master Duel Meta 禁限表响应没有有效记录${detail}`);
  }

  return {
    generatedAt,
    source: {
      id: 'master-duel-meta',
      label: 'Master Duel Meta（第三方镜像）',
      sourceUrl: MASTER_DUEL_BANLIST_CHANGES_API_URL,
      kind: 'third-party-mirror',
    },
    records,
    warnings,
  };
}

export async function loadMasterDuelBanlistHistory() {
  const generatedAt = new Date().toISOString();
  const { body } = await fetchText(MASTER_DUEL_BANLIST_CHANGES_API_URL, {
    headers: { accept: 'application/json' },
  });

  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    throw validationError('Master Duel Meta 禁限表响应不是有效 JSON');
  }
  return parseMasterDuelBanlistHistory(payload, generatedAt);
}
