import React, { useState } from 'react';
import { CardSearchProvider } from './context/CardSearchContext';
import { Header } from './components/Header';
import { SearchBar } from './components/SearchBar';
import { CardGrid } from './components/CardGrid';
import { CardInspector } from './components/CardInspector';
import { BanlistPage } from './components/BanlistPage';
import { MinigameModal } from './components/MinigameModal';
import { MastermindGame } from './components/MastermindGame';
import { TankBattleGame } from './components/TankBattleGame';
import './styles/main.css';

type AppPage = 'cards' | 'banlist' | 'mastermind' | 'tank';

const MainAppContent: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<AppPage>('cards');
  const [isMinigameOpen, setIsMinigameOpen] = useState<boolean>(false);

  if (currentPage === 'banlist') {
    return <BanlistPage onClose={() => setCurrentPage('cards')} />;
  }

  if (currentPage === 'mastermind') {
    return <MastermindGame onClose={() => setCurrentPage('cards')} />;
  }

  if (currentPage === 'tank') {
    return <TankBattleGame onClose={() => setCurrentPage('cards')} />;
  }

  return (
    <div className="app-container">
      <Header
        onOpenBanlist={() => setCurrentPage('banlist')}
        onOpenMinigame={() => setIsMinigameOpen(true)}
      />

      <main className="main-layout">
        <div className="content-area">
          <SearchBar />
          <CardGrid />
        </div>

        <CardInspector />
      </main>

      <MinigameModal
        isOpen={isMinigameOpen}
        onClose={() => setIsMinigameOpen(false)}
        onStartMastermind={() => setCurrentPage('mastermind')}
        onStartTank={() => setCurrentPage('tank')}
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
