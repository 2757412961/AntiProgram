export type MasterDuelLimit = 'Forbidden' | 'Limited 1' | 'Limited 2';

export interface MasterDuelBanlistChange {
  cardId: string;
  cardName: string;
  /** null means the mirror did not provide a value. It must not be inferred. */
  from: MasterDuelLimit | null;
  /** null means the mirror did not provide a value. It must not be inferred. */
  to: MasterDuelLimit | null;
}

export interface MasterDuelBanlistBatch {
  /** null means the mirror did not provide a separate effective date. */
  effectiveDate: string | null;
  changes: MasterDuelBanlistChange[];
}

export interface MasterDuelBanlistHistoryRecord {
  id: string;
  announcedAt: string;
  title: string;
  sourceUrl: string | null;
  sourceKind: 'article' | 'api-only';
  batches: MasterDuelBanlistBatch[];
}

export interface MasterDuelBanlistHistoryResponse {
  generatedAt: string;
  source: {
    id: 'master-duel-meta';
    label: string;
    sourceUrl: string;
    kind: 'third-party-mirror';
  };
  records: MasterDuelBanlistHistoryRecord[];
  warnings: string[];
}
