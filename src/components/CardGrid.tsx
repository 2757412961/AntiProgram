import React, { useState, useEffect } from 'react';
import { YgoCard } from '../types/ygo';
import { CardItem } from './CardItem';
import { AlertCircle, ChevronDown } from 'lucide-react';

interface CardGridProps {
  cards: YgoCard[];
  loading: boolean;
  selectedCard: YgoCard | null;
  onSelectCard: (card: YgoCard) => void;
}

const PAGE_SIZE = 60; // 每次增量渲染 60 张

export const CardGrid: React.FC<CardGridProps> = ({ cards, loading, selectedCard, onSelectCard }) => {
  const [displayCount, setDisplayCount] = useState<number>(PAGE_SIZE);

  // 当搜索结果发生变化时重置显示数量
  useEffect(() => {
    setDisplayCount(PAGE_SIZE);
  }, [cards]);

  if (loading) {
    return (
      <div className="state-box">
        <div className="spinner"></div>
        <p>正在检索全量游戏王卡牌数据库...</p>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="state-box">
        <AlertCircle size={40} color="var(--accent-pink)" />
        <h3>未找到匹配卡片</h3>
        <p style={{ fontSize: '0.85rem' }}>请尝试在搜索框输入其他关键词（如：灰流丽 / 龙 / 青眼 / 英雄 / 手坑）</p>
      </div>
    );
  }

  const visibleCards = cards.slice(0, displayCount);
  const hasMore = displayCount < cards.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="card-grid-header">
        <div className="result-count">
          卡库搜索完成：共计 <span>{cards.length}</span> 张匹配卡牌（已渲染前 {visibleCards.length} 张）
        </div>
      </div>

      <div className="card-grid">
        {visibleCards.map((card, index) => (
          <CardItem
            key={`${card.source}-${card.id}-${index}`}
            card={card}
            isSelected={selectedCard?.id === card.id}
            onSelect={onSelectCard}
          />
        ))}
      </div>

      {hasMore && (
        <div style={{ display: 'flex', justifyContent: 'center', margin: '1.5rem 0' }}>
          <button
            className="action-btn"
            onClick={() => setDisplayCount(prev => prev + PAGE_SIZE)}
            style={{
              padding: '0.8rem 2rem',
              fontSize: '0.9rem',
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(139, 92, 246, 0.2))',
              border: '1px solid var(--accent-cyan)',
              color: '#fff',
              maxWidth: '300px'
            }}
          >
            <span>加载更多卡牌 ({cards.length - displayCount} 张剩余)</span>
            <ChevronDown size={18} />
          </button>
        </div>
      )}
    </div>
  );
};
