import React from 'react';
import { ShieldCheck, ShieldAlert, Gamepad2 } from 'lucide-react';
import { DataSourceSelector } from './DataSourceSelector';
import { useCardSearch } from '../context/CardSearchContext';

interface HeaderProps {
  onOpenBanlist: () => void;
  onOpenMinigame: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenBanlist,
  onOpenMinigame,
}) => {
  const { dataSource, setDataSource, cards, cacheState } = useCardSearch();

  return (
    <header className="main-header">
      <div className="logo-area">
        <div className="logo-icon">YGO</div>
        <div className="logo-text">
          <h1>游戏王极速查卡器</h1>
          <span>YGO Fast Card Searcher • 多数据源模式</span>
        </div>
      </div>

      {/* 数据源选择器 (卡片式下拉) */}
      <DataSourceSelector
        currentSource={dataSource}
        onSourceChange={setDataSource}
        cacheState={cacheState}
      />

      <div className="header-actions">
        {/* 禁卡表入口按钮 */}
        <button
          onClick={onOpenBanlist}
          className="btn-header-banlist"
          title="查看当前生效的 TCG / OCG / MasterDuel 实时禁卡表"
        >
          <ShieldAlert size={16} color="#f87171" />
          <span>禁卡表</span>
        </button>

        {/* 小游戏入口按钮 */}
        <button
          onClick={onOpenMinigame}
          className="btn-header-minigame"
          title="打开游戏王小游戏入口中心"
        >
          <Gamepad2 size={16} color="#c4b5fd" />
          <span>小游戏</span>
        </button>
      </div>

      <div className="logo-area" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <ShieldCheck size={16} color="var(--accent-cyan)" />
        <span>当前加载: <strong style={{ color: '#fff' }}>{cards.length}</strong> 张卡片</span>
      </div>
    </header>
  );
};
