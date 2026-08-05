import React, { useState } from 'react';
import { YgoCard } from '../types/ygo';
import { Ban, AlertTriangle, ShieldCheck } from 'lucide-react';

interface CardItemProps {
  card: YgoCard;
  isSelected: boolean;
  onSelect: (card: YgoCard) => void;
}

export const CardItem: React.FC<CardItemProps> = ({ card, isSelected, onSelect }) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const fallbackImg = "https://images.ygoprodeck.com/images/cards/back_high.jpg";

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
        {!imgLoaded && !imgError && (
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

        {/* 特殊禁限图案角标 (禁止 🔴 / 限制 🟠 橙色 / 准限制 🟡 黄色) */}
        {banStatus !== 'Unlimited' && (
          <div
            style={{
              position: 'absolute',
              top: '6px',
              right: '6px',
              zIndex: 15,
              padding: '3px 8px',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.85)',
              border: '1px solid rgba(255,255,255,0.2)',
              background: banStatus === 'Forbidden'
                ? 'linear-gradient(135deg, #dc2626, #991b1b)'
                : banStatus === 'Limited'
                ? 'linear-gradient(135deg, #ea580c, #c2410c)' // 限制卡：深橙色
                : 'linear-gradient(135deg, #d97706, #b45309)', // 准限制：金黄色
              color: '#fff'
            }}
            title={`在当前环境为: ${banStatus}`}
          >
            {banStatus === 'Forbidden' && (
              <>
                <Ban size={14} color="#fff" />
                <span>🚫 禁卡 0</span>
              </>
            )}
            {banStatus === 'Limited' && (
              <>
                <AlertTriangle size={13} color="#fff" />
                <span>❶ 限1</span>
              </>
            )}
            {banStatus === 'Semi-Limited' && (
              <>
                <ShieldCheck size={13} color="#fff" />
                <span>❷ 限2</span>
              </>
            )}
          </div>
        )}

        <img
          src={imgError ? fallbackImg : card.imageUrl}
          alt={card.name}
          className="card-img"
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgError(true)}
          loading="lazy"
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
