export type DeckPlazaFormat = 'master-duel' | 'ocg' | 'tcg';
export type DeckPlazaMetric = 'power' | 'popularity' | 'top-count';

export interface DeckRanking {
  id: string;
  name: string;
  format: DeckPlazaFormat;
  source: string;
  metric: DeckPlazaMetric;
  value: number;
  unit: 'power' | 'percent' | 'decks';
  rank: number;
  tier?: number;
  score?: number;
  imageUrl?: string;
  detailUrl?: string;
}

export interface TournamentDeck {
  id: string;
  name: string;
  format: DeckPlazaFormat;
  source: string;
  metric: 'tournament-result';
  event: string;
  placement: string;
  playerCount?: number;
  relativeDate?: string;
  pilot?: string;
  imageUrl?: string;
  detailUrl: string;
  weight: number;
}

export interface DeckSourceStatus {
  id: string;
  instanceId: string;
  label: string;
  format: DeckPlazaFormat;
  sourceUrl: string;
  methods: string[];
  methodology: Record<string, string>;
  fetchedAt: string | null;
  lastAttemptAt: string | null;
  freshness: 'fresh' | 'stale' | 'unavailable';
  error: string | null;
  persisted: boolean;
  storage: 'memory' | 'sqlite' | 'cache';
}

export interface DeckPlazaResponse {
  schemaVersion: 2;
  format: DeckPlazaFormat;
  metric: DeckPlazaMetric;
  generatedAt: string;
  rankings: DeckRanking[];
  decks: TournamentDeck[];
  sources: DeckSourceStatus[];
  warnings: string[];
}

export interface ClassicDeckCard {
  id: string;
  name: string;
  amount: number;
  rarity?: string;
  imageUrl: string;
  detailUrl: string;
}

export interface ClassicDeckBuild {
  schemaVersion: 1;
  archetypeName: string;
  sampleName: string;
  format: DeckPlazaFormat;
  selection: 'relevance' | 'tournament-sample';
  selectionReason: string;
  sourceLabel: string;
  sourceUrl: string;
  fetchedAt: string;
  main: ClassicDeckCard[];
  extra: ClassicDeckCard[];
  side: ClassicDeckCard[];
  counts: {
    main: number;
    extra: number;
    side: number;
  };
}
