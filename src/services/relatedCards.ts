import type { GameFormat, YgoCard } from '../types/ygo';
import { localizeCardsFromYgocdb } from './cardDetailService';
import { fetchRelatedCardCandidates } from './ygoApi';

export type CardRelationType =
  | 'mentions'
  | 'mentioned-by'
  | 'archetype-support'
  | 'same-archetype';

export interface RelatedCardMatch {
  card: YgoCard;
  type: CardRelationType;
  score: number;
  reason: string;
  evidence?: string;
}

export interface RelatedCardsResult {
  matches: RelatedCardMatch[];
  total: number;
}

const DEFAULT_LIMIT = 24;

function normalize(value?: string): string {
  return (value || '')
    .normalize('NFKC')
    .toLocaleLowerCase('en-US')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function isWordCharacter(value?: string): boolean {
  return Boolean(value && /[\p{L}\p{N}]/u.test(value));
}

/** 完整短语匹配，避免 Dark、Hero 这类短名称命中更长单词。 */
function containsPhrase(rawText: string | undefined, rawPhrase: string | undefined): boolean {
  const text = normalize(rawText);
  const phrase = normalize(rawPhrase);
  if (!text || phrase.length < 3) return false;

  let start = text.indexOf(phrase);
  while (start >= 0) {
    const before = start > 0 ? text[start - 1] : undefined;
    const afterIndex = start + phrase.length;
    const after = afterIndex < text.length ? text[afterIndex] : undefined;
    if (!isWordCharacter(before) && !isWordCharacter(after)) return true;
    start = text.indexOf(phrase, start + 1);
  }
  return false;
}

function uniqueNames(card: YgoCard): string[] {
  return [...new Set([card.name, card.enName, card.jpName].filter((name): name is string => Boolean(name)))]
    .sort((a, b) => b.length - a.length);
}

function mentionsAnyName(description: string | undefined, card: YgoCard): string | undefined {
  return uniqueNames(card).find(name => containsPhrase(description, name));
}

function evidenceFor(description: string | undefined, phrase?: string): string | undefined {
  if (!description || !phrase) return undefined;
  const sentence = description
    .split(/(?<=[。！？.!?])\s*|\n+/u)
    .find(part => containsPhrase(part, phrase));
  if (!sentence) return undefined;
  const clean = sentence.trim();
  return clean.length > 120 ? `${clean.slice(0, 117)}…` : clean;
}

function sameArchetype(left?: string, right?: string): boolean {
  return Boolean(left && right && normalize(left) === normalize(right));
}

/**
 * 纯规则关联分析：明确点名优先，其次是系列支援，最后才是同系列成员。
 * 属性、种族、等级相同不会单独构成关联。
 */
export function findRelatedCards(
  selectedCard: YgoCard,
  candidates: YgoCard[],
  limit = DEFAULT_LIMIT,
): RelatedCardsResult {
  const canonicalSelected = candidates.find(candidate => candidate.id === selectedCard.id);
  const selected: YgoCard = canonicalSelected
    ? { ...selectedCard, ...canonicalSelected, name: selectedCard.name }
    : selectedCard;
  const archetypes = [...new Set(candidates.map(candidate => candidate.archetype).filter((value): value is string => Boolean(value)))];
  const archetypesMentionedBySelected = new Set(
    archetypes.filter(archetype => containsPhrase(selected.desc, archetype)).map(normalize),
  );

  const matches: RelatedCardMatch[] = [];

  for (const candidate of candidates) {
    if (candidate.id === selected.id) continue;

    const selectedMention = mentionsAnyName(selected.desc, candidate);
    const candidateMention = mentionsAnyName(candidate.desc, selected);
    const sharesArchetype = sameArchetype(selected.archetype, candidate.archetype);
    const candidateSupportsSelectedArchetype = Boolean(
      selected.archetype && containsPhrase(candidate.desc, selected.archetype),
    );
    const selectedSupportsCandidateArchetype = Boolean(
      candidate.archetype && archetypesMentionedBySelected.has(normalize(candidate.archetype)),
    );
    const hasArchetypeSupport = candidateSupportsSelectedArchetype || selectedSupportsCandidateArchetype;

    if (!selectedMention && !candidateMention && !sharesArchetype && !hasArchetypeSupport) continue;

    let type: CardRelationType;
    let score: number;
    let reason: string;
    let evidence: string | undefined;

    if (selectedMention && candidateMention) {
      type = 'mentions';
      score = 110;
      reason = '两张卡的卡文互相点名';
      evidence = evidenceFor(selected.desc, selectedMention);
    } else if (selectedMention) {
      type = 'mentions';
      score = 100;
      reason = '当前卡的卡文直接提到此卡';
      evidence = evidenceFor(selected.desc, selectedMention);
    } else if (candidateMention) {
      type = 'mentioned-by';
      score = 95;
      reason = `此卡的卡文直接提到「${selectedCard.name}」`;
      evidence = evidenceFor(candidate.desc, candidateMention);
    } else if (hasArchetypeSupport) {
      type = 'archetype-support';
      score = 85;
      const archetype = candidateSupportsSelectedArchetype ? selected.archetype : candidate.archetype;
      reason = `卡文关联「${archetype}」系列`;
      evidence = candidateSupportsSelectedArchetype
        ? evidenceFor(candidate.desc, selected.archetype)
        : evidenceFor(selected.desc, candidate.archetype);
    } else {
      type = 'same-archetype';
      score = 70;
      reason = `同属「${selected.archetype}」系列`;
    }

    if (sharesArchetype && type !== 'same-archetype') score += 5;
    if (hasArchetypeSupport && type !== 'archetype-support') score += 5;

    matches.push({ card: candidate, type, score: Math.min(score, 115), reason, evidence });
  }

  matches.sort((left, right) =>
    right.score - left.score
    || left.card.name.localeCompare(right.card.name, 'zh-CN'),
  );

  return { matches: matches.slice(0, limit), total: matches.length };
}

export async function fetchRelatedCards(
  selectedCard: YgoCard,
  format: GameFormat,
  limit = DEFAULT_LIMIT,
): Promise<RelatedCardsResult> {
  const candidates = await fetchRelatedCardCandidates(format);
  return findRelatedCards(selectedCard, candidates, limit);
}

/** 关联结果已经可展示后，再异步补齐少量结果的中文资料。 */
export async function localizeRelatedCards(result: RelatedCardsResult): Promise<RelatedCardsResult> {
  const localizedCards = await localizeCardsFromYgocdb(result.matches.map(match => match.card));

  return {
    total: result.total,
    matches: result.matches.map((match, index) => ({ ...match, card: localizedCards[index] })),
  };
}
