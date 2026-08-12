import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { DataSourceType, SearchFilters, YgoCard, CacheState } from '../types/ygo';
import { fetchCards, subscribeCacheState } from '../services/ygoApi';

interface CardSearchContextType {
  dataSource: DataSourceType;
  setDataSource: (source: DataSourceType) => void;
  filters: SearchFilters;
  setFilters: React.Dispatch<React.SetStateAction<SearchFilters>>;
  cards: YgoCard[];
  loading: boolean;
  selectedCard: YgoCard | null;
  setSelectedCard: (card: YgoCard | null) => void;
  cacheState: CacheState;
}

const initialFilters: SearchFilters = {
  keyword: '',
  mainType: 'all',
  attribute: 'ALL',
  level: 'ALL',
  race: 'ALL',
  format: 'MasterDuel',
  banStatus: 'all',
  rarity: 'ALL',
  monsterSubType: 'ALL',
  spellTrapSubType: 'ALL',
  atkMin: '',
  atkMax: '',
  defMin: '',
  defMax: '',
};

const CardSearchContext = createContext<CardSearchContextType | undefined>(undefined);

export const CardSearchProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [dataSource, setDataSource] = useState<DataSourceType>('YGOCDB');
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [cards, setCards] = useState<YgoCard[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedCard, setSelectedCard] = useState<YgoCard | null>(null);
  const [cacheState, setCacheState] = useState<CacheState>({ status: 'idle', totalCount: 0, loadedCount: 0 });

  // 订阅缓存进度
  useEffect(() => {
    const unsubscribe = subscribeCacheState(setCacheState);
    return unsubscribe;
  }, []);

  // 执行搜索 fetch
  useEffect(() => {
    let isSubscribed = true;
    setLoading(true);
    setCards([]);
    setSelectedCard(null);

    fetchCards(dataSource, filters)
      .then((data) => {
        if (isSubscribed) {
          setCards(data);
          if (data.length > 0) {
            setSelectedCard(data[0]);
          } else {
            setSelectedCard(null);
          }
        }
      })
      .catch((err) => {
        console.error("加载卡片出错:", err);
        if (isSubscribed) {
          setCards([]);
          setSelectedCard(null);
        }
      })
      .finally(() => {
        if (isSubscribed) setLoading(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [dataSource, filters]);

  return (
    <CardSearchContext.Provider
      value={{
        dataSource,
        setDataSource,
        filters,
        setFilters,
        cards,
        loading,
        selectedCard,
        setSelectedCard,
        cacheState,
      }}
    >
      {children}
    </CardSearchContext.Provider>
  );
};

export const useCardSearch = (): CardSearchContextType => {
  const context = useContext(CardSearchContext);
  if (!context) {
    throw new Error('useCardSearch must be used within a CardSearchProvider');
  }
  return context;
};
