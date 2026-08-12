import { YgoCard } from '../types/ygo';

/**
 * Deliberately empty. Card identities and banlist states must come from a
 * validated remote source; the previous hand-written sample mixed several
 * passcodes with the wrong cards and is unsafe as a data fallback.
 */
export const MOCK_LOCAL_CARDS: YgoCard[] = [];
