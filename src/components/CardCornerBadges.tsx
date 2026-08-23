import React from 'react';
import { AlertTriangle, Ban, ShieldCheck } from 'lucide-react';

interface CardCornerBadgesProps {
  banStatus?: string;
  rarity?: string;
  compact?: boolean;
}

const RARITY_COLOR: Record<string, string> = {
  N: '#94a3b8',
  R: '#60a5fa',
  SR: '#fbbf24',
  UR: '#c084fc',
};

const BAN_BADGES = {
  Forbidden: {
    label: '禁卡 0',
    compactLabel: '禁 0',
    background: 'linear-gradient(135deg, #dc2626, #991b1b)',
    Icon: Ban,
  },
  Limited: {
    label: '限 1',
    compactLabel: '限 1',
    background: 'linear-gradient(135deg, #ea580c, #c2410c)',
    Icon: AlertTriangle,
  },
  'Semi-Limited': {
    label: '限 2',
    compactLabel: '限 2',
    background: 'linear-gradient(135deg, #d97706, #b45309)',
    Icon: ShieldCheck,
  },
} as const;

export const CardCornerBadges: React.FC<CardCornerBadgesProps> = ({
  banStatus,
  rarity,
  compact = false,
}) => {
  const banBadge = banStatus && banStatus in BAN_BADGES
    ? BAN_BADGES[banStatus as keyof typeof BAN_BADGES]
    : undefined;
  const normalizedRarity = rarity?.toUpperCase();
  const rarityAccent = normalizedRarity
    ? RARITY_COLOR[normalizedRarity] || '#94a3b8'
    : '#94a3b8';

  return (
    <>
      {banBadge && (
        <div
          style={{
            position: 'absolute',
            top: compact ? '4px' : '6px',
            left: compact ? '4px' : '6px',
            zIndex: 15,
            padding: compact ? '2px 4px' : '3px 8px',
            borderRadius: compact ? '5px' : '6px',
            fontSize: compact ? '0.58rem' : '0.75rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: compact ? '2px' : '4px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.85)',
            border: '1px solid rgba(255,255,255,0.2)',
            background: banBadge.background,
            color: '#fff',
            whiteSpace: 'nowrap',
          }}
          title={`在当前环境为：${banStatus}`}
        >
          <banBadge.Icon size={compact ? 10 : 14} aria-hidden="true" />
          <span>{compact ? banBadge.compactLabel : banBadge.label}</span>
        </div>
      )}

      {normalizedRarity && (
        <div
          style={{
            position: 'absolute',
            bottom: compact ? '4px' : '6px',
            left: compact ? '4px' : '6px',
            zIndex: 15,
            minWidth: compact ? undefined : '28px',
            padding: compact ? '2px 5px' : '3px 6px',
            borderRadius: compact ? '5px' : '6px',
            background: 'rgba(2,6,23,0.9)',
            border: `1px solid ${rarityAccent}`,
            color: rarityAccent,
            boxShadow: `0 0 10px ${rarityAccent}55`,
            fontSize: compact ? '0.62rem' : '0.72rem',
            fontWeight: 900,
            textAlign: 'center',
          }}
          title={`Master Duel 稀有度：${normalizedRarity}`}
        >
          {normalizedRarity}
        </div>
      )}
    </>
  );
};
