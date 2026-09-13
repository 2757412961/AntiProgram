import { getChineseCardImageUrl, localizeCardsFromYgocdb } from './cardDetailService';
import { YgoCard, YgoProDeckApiItem } from '../types/ygo';
import { getMainCardTypeFromYgoProDeckType } from '../utils/cardMetadata';

export interface BanlistHistoryCardMetadata {
  chineseName?: string;
  englishName: string;
  imageUrl?: string;
  rarity?: string;
}

let cardDatabaseRequest: Promise<YgoProDeckApiItem[]> | null = null;

function normalizedName(value: string): string {
  return value
    .normalize('NFKD')
    .toLocaleLowerCase('en')
    .replace(/[\u2018\u2019\u201c\u201d]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

function normalizeMasterDuelRarity(value?: string): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'n' || normalized === 'normal' || normalized === 'common') return 'N';
  if (normalized === 'r' || normalized === 'rare') return 'R';
  if (normalized === 'sr' || normalized === 'super rare') return 'SR';
  if (normalized === 'ur' || normalized === 'ultra rare') return 'UR';
  return undefined;
}

async function loadCardDatabase(): Promise<YgoProDeckApiItem[]> {
  if (!cardDatabaseRequest) {
    // `misc=yes` is required for YGOPRODeck to include Master Duel rarity data.
    cardDatabaseRequest = fetch('/api/ygoprodeck/cardinfo.php?misc=yes')
      .then(async response => {
        if (!response.ok) throw new Error(`卡片元数据接口 HTTP ${response.status}`);
        const payload = await response.json() as { data?: YgoProDeckApiItem[] };
        if (!Array.isArray(payload.data) || payload.data.length === 0) {
          throw new Error('卡片元数据接口返回空数据');
        }
        return payload.data;
      })
      .catch(error => {
        cardDatabaseRequest = null;
        throw error;
      });
  }
  return cardDatabaseRequest;
}

function toLocalizationCandidate(item: YgoProDeckApiItem): YgoCard {
  const type = getMainCardTypeFromYgoProDeckType(item.type) ?? 'monster';
  return {
    id: item.id,
    name: item.name,
    enName: item.name,
    type,
    subType: item.type ? `【${item.type}】` : undefined,
    desc: item.desc || '',
    imageUrl: item.card_images?.[0]?.image_url || '',
    imageUrlSmall: item.card_images?.[0]?.image_url_small,
    localizationIds: item.card_images
      ?.map(image => image.id)
      .filter((id): id is number => Number.isInteger(id) && id !== item.id),
    source: 'YGOPRODeck',
  };
}

/** Match mirror English names to passcodes, then batch-load Chinese metadata. */
export async function loadBanlistHistoryCardMetadata(
  englishNames: string[],
): Promise<Map<string, BanlistHistoryCardMetadata>> {
  const requestedNames = [...new Set(englishNames.map(name => name.trim()).filter(Boolean))];
  if (requestedNames.length === 0) return new Map();

  const requestedByKey = new Map(requestedNames.map(name => [normalizedName(name), name]));
  const database = await loadCardDatabase();
  const candidatesByKey = new Map<string, YgoProDeckApiItem>();
  for (const item of database) {
    const key = normalizedName(item.name);
    if (requestedByKey.has(key) && !candidatesByKey.has(key)) candidatesByKey.set(key, item);
  }

  const localizedCards = await localizeCardsFromYgocdb(
    [...candidatesByKey.values()].map(toLocalizationCandidate),
  );
  const localizedById = new Map(localizedCards.map(card => [card.id, card]));
  const result = new Map<string, BanlistHistoryCardMetadata>();

  for (const [key, item] of candidatesByKey) {
    const localized = localizedById.get(item.id);
    const hasChineseName = Boolean(localized && /[\u3400-\u9fff]/u.test(localized.name));
    const imageId = localized?.imageId || item.id;
    result.set(key, {
      englishName: item.name,
      chineseName: hasChineseName ? localized!.name : undefined,
      imageUrl: hasChineseName
        ? getChineseCardImageUrl(imageId, 'sc', 'thumb2')
        : item.card_images?.[0]?.image_url_small,
      rarity: item.misc_info
        ?.map(info => normalizeMasterDuelRarity(info.md_rarity))
        .find((rarity): rarity is string => Boolean(rarity)),
    });
  }

  return result;
}

export function getBanlistHistoryCardMetadata(
  metadata: Map<string, BanlistHistoryCardMetadata>,
  englishName: string,
): BanlistHistoryCardMetadata | undefined {
  return metadata.get(normalizedName(englishName));
}

export function getMasterDuelMetaCardImageUrl(cardId: string): string {
  return `https://s3.duellinksmeta.com/cards/${encodeURIComponent(cardId)}_w200.webp`;
}
