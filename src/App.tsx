import React, { useState, useEffect } from 'react';
import { DataSourceType, SearchFilters, YgoCard, CacheState } from './types/ygo';
import { fetchCards, subscribeCacheState } from './services/ygoApi';
import { Header } from './components/Header';
import { SearchBar } from './components/SearchBar';
import { CardGrid } from './components/CardGrid';
import { CardInspector } from './components/CardInspector';
import { BanlistPage } from './components/BanlistPage';
import { MinigameModal } from './components/MinigameModal';
import { MastermindGame } from './components/MastermindGame';
import './styles/main.css';

type AppPage = 'cards' | 'banlist' | 'mastermind';

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<AppPage>('cards');
  const [isMinigameOpen, setIsMinigameOpen] = useState<boolean>(false);
  const [dataSource, setDataSource] = useState<DataSourceType>('YGOCDB');
  const [filters, setFilters] = useState<SearchFilters>({
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
  });
  const [cards, setCards] = useState<YgoCard[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedCard, setSelectedCard] = useState<YgoCard | null>(null);
  const [cacheState, setCacheState] = useState<CacheState>({ status: 'idle', totalCount: 0, loadedCount: 0 });

  // 订阅全量缓存进度
  useEffect(() => {
    const unsubscribe = subscribeCacheState(setCacheState);
    return unsubscribe;
  }, []);

  // 执行搜索
  useEffect(() => {
    let isSubscribed = true;
    setLoading(true);

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
      })
      .finally(() => {
        if (isSubscribed) setLoading(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [dataSource, filters]);

  const handleSourceChange = (newSource: DataSourceType) => {
    setDataSource(newSource);
  };

  // 禁卡表专页
  if (currentPage === 'banlist') {
    return (
      <BanlistPage onClose={() => setCurrentPage('cards')} />
    );
  }

  // 珠玑妙算小游戏专页
  if (currentPage === 'mastermind') {
    return (
      <MastermindGame onClose={() => setCurrentPage('cards')} />
    );
  }

  return (
    <div className="app-container">
      <Header
        currentSource={dataSource}
        onSourceChange={handleSourceChange}
        totalCardsLoaded={cards.length}
        cacheState={cacheState}
        onOpenBanlist={() => setCurrentPage('banlist')}
        onOpenMinigame={() => setIsMinigameOpen(true)}
      />

      <main className="main-layout">
        <div className="content-area">
          <SearchBar
            filters={filters}
            onFilterChange={setFilters}
            cacheState={cacheState}
            dataSource={dataSource}
          />
          
          <CardGrid
            cards={cards}
            loading={loading}
            selectedCard={selectedCard}
            onSelectCard={setSelectedCard}
          />
        </div>

        <CardInspector card={selectedCard} />
      </main>

      <MinigameModal
        isOpen={isMinigameOpen}
        onClose={() => setIsMinigameOpen(false)}
        onStartMastermind={() => setCurrentPage('mastermind')}
      />
    </div>
  );
};

export default App;

