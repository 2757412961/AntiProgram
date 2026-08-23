import React, { useState } from 'react';
import { YgoCard } from '../types/ygo';
import { getChineseCardBackUrl, getChineseCardImageUrl } from '../services/cardDetailService';
import { CardCornerBadges } from './CardCornerBadges';

interface CardItemProps {
  card: YgoCard;
  isSelected: boolean;
  onSelect: (card: YgoCard) => void;
  priority?: boolean;
}

export const CardItem: React.FC<CardItemProps> = ({ card, isSelected, onSelect, priority = false }) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imageVariant, setImageVariant] = useState<'sc' | 'back'>('sc');
  const imageUrl = imageVariant === 'back'
    ? getChineseCardBackUrl()
    : getChineseCardImageUrl(card.imageId || card.id, imageVariant, 'half');

  // 获得生效禁限状态
  const banStatus = card.banlistStatus || 'Unlimited';

  // 根据禁限状态定制卡牌外框与边框样式 (限制卡用橙色，准限制用金黄色)
  const getBanBorderClass = () => {
    if (banStatus === 'Forbidden') return 'card-item-forbidden';
    if (banStatus === 'Limited') return 'card-item-limited';
    if (banStatus === 'Semi-Limited') return 'card-item-semi-limited';
    return '';
  };

  return (
    <div
      className={`card-item ${getBanBorderClass()} ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(card)}
      style={{
        borderColor: isSelected
          ? 'var(--accent-cyan)'
          : banStatus === 'Forbidden'
          ? '#ef4444'
          : banStatus === 'Limited'
          ? '#f97316' // 限制卡：橙色
          : banStatus === 'Semi-Limited'
          ? '#f59e0b' // 准限制卡：黄色
          : undefined,
        boxShadow: isSelected
          ? '0 0 18px rgba(6, 182, 212, 0.6)'
          : banStatus === 'Forbidden'
          ? '0 0 12px rgba(239, 68, 68, 0.45)'
          : banStatus === 'Limited'
          ? '0 0 10px rgba(249, 115, 22, 0.45)'
          : banStatus === 'Semi-Limited'
          ? '0 0 8px rgba(245, 158, 11, 0.35)'
          : undefined
      }}
    >
      <div className="card-img-wrapper">
        {!imgLoaded && imageVariant !== 'back' && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: '#666' }}>加载中...</span>
          </div>
        )}

        {/* 🔴 禁止卡半透明暗色黑红遮罩 */}
        {banStatus === 'Forbidden' && (
          <div style={{
            position: 'absolute',
            inset: 0,
            zIndex: 8,
            background: 'rgba(15, 0, 0, 0.35)',
            backdropFilter: 'grayscale(0.3)'
          }} />
        )}

        <CardCornerBadges banStatus={banStatus} rarity={card.rarity} />

        <img
          src={imageUrl}
          alt={card.name}
          className="card-img"
          onLoad={() => setImgLoaded(true)}
          onError={() => {
            setImgLoaded(false);
            setImageVariant('back');
          }}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
        />
      </div>

      <div className="card-info">
        <div className="card-title" title={card.name}>{card.name}</div>
        
        <div className="card-meta-row">
          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
            {card.type === 'spell' ? '魔法' : card.type === 'trap' ? '陷阱' : `${card.level ? `★${card.level}` : '怪兽'}`}
          </span>

          {card.attribute && (
            <span className={`attribute-tag attr-${card.attribute}`}>
              {card.attribute}
            </span>
          )}
        </div>

        {card.type === 'monster' && (
          <div className="atk-def-row">
            <span>ATK/ {card.atk ?? '?'}</span>
            <span>DEF/ {card.def ?? '?'}</span>
          </div>
        )}
      </div>
    </div>
  );
};
