import { loadMasterDuelBanlistHistory } from './providers/masterDuelBanlistHistory.mjs';

export const MASTER_DUEL_BANLIST_CACHE_TTL_MS = 60 * 60 * 1000;
export const MASTER_DUEL_BANLIST_FORCE_REFRESH_COOLDOWN_MS = 5 * 60 * 1000;

function withWarning(snapshot, warning) {
  return {
    ...snapshot,
    warnings: [...snapshot.warnings, warning],
  };
}

export function createMasterDuelBanlistHistoryService({
  load = loadMasterDuelBanlistHistory,
  now = () => Date.now(),
  cacheTtlMs = MASTER_DUEL_BANLIST_CACHE_TTL_MS,
  forceRefreshCooldownMs = MASTER_DUEL_BANLIST_FORCE_REFRESH_COOLDOWN_MS,
} = {}) {
  let cache = null;
  let cachedAt = 0;
  let inflight = null;
  let lastForcedAt = null;

  async function refresh(force) {
    const currentTime = now();
    if (
      cache
      && force
      && lastForcedAt !== null
      && currentTime - lastForcedAt < forceRefreshCooldownMs
    ) {
      return withWarning(
        cache,
        '强制刷新处于冷却期，返回最近一次校验成功的第三方镜像快照',
      );
    }
    if (cache && !force && currentTime - cachedAt < cacheTtlMs) return cache;
    if (inflight) return inflight;

    if (force) lastForcedAt = currentTime;
    inflight = load()
      .then(snapshot => {
        if (!snapshot || !Array.isArray(snapshot.records) || snapshot.records.length === 0) {
          throw Object.assign(
            new Error('Master Duel 禁限表镜像没有有效记录'),
            { statusCode: 502 },
          );
        }
        cache = snapshot;
        cachedAt = now();
        return cache;
      })
      .catch(error => {
        if (cache) {
          const message = error instanceof Error ? error.message : String(error);
          return withWarning(
            cache,
            `第三方镜像刷新失败，返回最近一次校验成功的缓存：${message}`,
          );
        }
        throw Object.assign(
          error instanceof Error ? error : new Error(String(error)),
          { statusCode: Number(error?.statusCode) || 502 },
        );
      })
      .finally(() => {
        inflight = null;
      });
    return inflight;
  }

  return {
    get({ force = false } = {}) {
      return refresh(force);
    },
  };
}

const service = createMasterDuelBanlistHistoryService();

export function getMasterDuelBanlistHistory(options) {
  return service.get(options);
}
