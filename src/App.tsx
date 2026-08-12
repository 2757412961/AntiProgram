import React, { useState } from 'react';
import { CardSearchProvider } from './context/CardSearchContext';
import { Header } from './components/Header';
import { PrimarySidebar } from './components/PrimarySidebar';
import { SearchBar } from './components/SearchBar';
import { CardGrid } from './components/CardGrid';
import { CardInspector } from './components/CardInspector';
import { BanlistPage } from './components/BanlistPage';
import { BanlistHistoryModal } from './components/BanlistHistoryModal';
import { MinigameModal } from './components/MinigameModal';
import { MastermindGame } from './components/MastermindGame';
import { TankBattleGame } from './components/TankBattleGame';
import { DeckPlazaPage } from './components/DeckPlazaPage';
import { useCardSearch } from './context/CardSearchContext';
import './styles/main.css';

export type PrimaryView = 'cards' | 'deck-plaza';
type FullPage = 'banlist' | 'mastermind' | 'tank' | null;

const MainAppContent: React.FC = () => {
  const [primaryView, setPrimaryView] = useState<PrimaryView>('cards');
  const [fullPage, setFullPage] = useState<FullPage>(null);
  const [isMinigameOpen, setIsMinigameOpen] = useState<boolean>(false);
  const [isBanlistHistoryOpen, setIsBanlistHistoryOpen] = useState(false);
  const { setDataSource, setFilters, setSelectedCard } = useCardSearch();

  if (fullPage === 'banlist') {
    return <BanlistPage onClose={() => setFullPage(null)} />;
  }

  if (fullPage === 'mastermind') {
    return <MastermindGame onClose={() => setFullPage(null)} />;
  }

  if (fullPage === 'tank') {
    return <TankBattleGame onClose={() => setFullPage(null)} />;
  }

  return (
    <div className="app-container">
      <Header
        activeView={primaryView}
        onOpenBanlist={() => setFullPage('banlist')}
        onOpenBanlistHistory={() => setIsBanlistHistoryOpen(true)}
        onOpenMinigame={() => setIsMinigameOpen(true)}
      />

      <div className="app-workspace">
        <PrimarySidebar activeView={primaryView} onViewChange={setPrimaryView} />
        <div className="app-primary-content">
          {primaryView === 'cards' ? (
            <main className="main-layout">
              <div className="content-area">
                <SearchBar />
                <CardGrid />
              </div>

              <CardInspector />
            </main>
          ) : (
            <DeckPlazaPage />
          )}
        </div>
      </div>

      <MinigameModal
        isOpen={isMinigameOpen}
        onClose={() => setIsMinigameOpen(false)}
        onStartMastermind={() => setFullPage('mastermind')}
        onStartTank={() => setFullPage('tank')}
      />

      <BanlistHistoryModal
        isOpen={isBanlistHistoryOpen}
        onClose={() => setIsBanlistHistoryOpen(false)}
        onSelectCardKeyword={(keyword) => {
          setPrimaryView('cards');
          // Announcement mirror card names are English, so use the matching
          // remote card database instead of guessing a localized alias.
          setDataSource('YGOPRODeck');
          setFilters(previous => ({
            ...previous,
            keyword,
            format: 'MasterDuel',
          }));
          setSelectedCard(null);
        }}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <CardSearchProvider>
      <MainAppContent />
    </CardSearchProvider>
  );
};

export default App;
