import React from 'react';
import { DataSourceType, CacheState } from '../types/ygo';
import { ShieldCheck, ShieldAlert, Gamepad2 } from 'lucide-react';
import { DataSourceSelector } from './DataSourceSelector';

interface HeaderProps {
  currentSource: DataSourceType;
  onSourceChange: (source: DataSourceType) => void;
  totalCardsLoaded: number;
  cacheState: CacheState;
  onOpenBanlist: () => void;
  onOpenMinigame: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentSource,
  onSourceChange,
  totalCardsLoaded,
  cacheState,
  onOpenBanlist,
  onOpenMinigame,
}) => {
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
        currentSource={currentSource}
        onSourceChange={onSourceChange}
        cacheState={cacheState}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* 禁卡表入口按钮 */}
        <button
          onClick={onOpenBanlist}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.48rem 1.05rem',
            background: 'linear-gradient(135deg, rgba(239,68,68,0.18), rgba(236,72,153,0.12))',
            border: '1px solid rgba(239,68,68,0.45)',
            borderRadius: '8px',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.85rem',
            transition: 'all 0.2s ease',
            boxShadow: '0 0 14px rgba(239,68,68,0.2)',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.boxShadow = '0 0 22px rgba(239,68,68,0.45)';
            (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, rgba(239,68,68,0.28), rgba(236,72,153,0.18))';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.boxShadow = '0 0 14px rgba(239,68,68,0.2)';
            (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, rgba(239,68,68,0.18), rgba(236,72,153,0.12))';
          }}
          title="查看当前生效的 TCG / OCG / MasterDuel 实时禁卡表"
        >
          <ShieldAlert size={16} color="#f87171" />
          <span>禁卡表</span>
        </button>

        {/* 小游戏入口按钮 */}
        <button
          onClick={onOpenMinigame}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.48rem 1.05rem',
            background: 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(236,72,153,0.2))',
            border: '1px solid rgba(139,92,246,0.5)',
            borderRadius: '8px',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '0.85rem',
            transition: 'all 0.2s ease',
            boxShadow: '0 0 14px rgba(139,92,246,0.25)',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.boxShadow = '0 0 22px rgba(139,92,246,0.5)';
            (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, rgba(139,92,246,0.38), rgba(236,72,153,0.3))';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.boxShadow = '0 0 14px rgba(139,92,246,0.25)';
            (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(236,72,153,0.2))';
          }}
          title="打开游戏王小游戏入口中心"
        >
          <Gamepad2 size={16} color="#c4b5fd" />
          <span>小游戏</span>
        </button>
      </div>

      <div className="logo-area" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <ShieldCheck size={16} color="var(--accent-cyan)" />
        <span>当前加载: <strong style={{ color: '#fff' }}>{totalCardsLoaded}</strong> 张卡片</span>
      </div>
    </header>
  );
};

