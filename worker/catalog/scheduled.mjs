function scheduledRunId(controller) {
  const scheduledAt = Number(controller?.scheduledTime) || Date.now();
  return `catalog-scheduled-${new Date(scheduledAt).toISOString()}`;
}

/**
 * Phase 1 scheduling smoke test. The real catalog synchronization pipeline is
 * introduced in phase 4; until then this records a skipped run so local and
 * production Cron wiring can be verified without touching upstream services.
 */
export async function recordScheduledCatalogRun(controller, env) {
  if (!env?.DB) {
    console.warn('Card catalog scheduled event skipped: D1 binding DB is unavailable.');
    return;
  }

  const runId = scheduledRunId(controller);
  const now = new Date().toISOString();
  await env.DB.prepare(`
    INSERT OR IGNORE INTO card_catalog_sync_runs (
      id,
      trigger_kind,
      status,
      message,
      started_at,
      finished_at
    ) VALUES (?, 'cron', 'skipped', ?, ?, ?)
  `).bind(
    runId,
    '阶段 1 仅验证 Cron 与 D1；完整目录同步尚未启用。',
    now,
    now,
  ).run();
}
