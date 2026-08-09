import React, { useState, useEffect, useCallback } from 'react';
import { YgoCard, GameFormat, BanlistPageData } from '../types/ygo';
import { fetchBanlist } from '../services/ygoApi';
import { CardInspector } from './CardInspector';
import { BanlistHistoryModal } from './BanlistHistoryModal';
import {
  X, ShieldAlert, Award, RefreshCw, Search, ChevronDown, ChevronRight,
  AlertTriangle, Ban, Shield, History
} from 'lucide-react';

interface BanlistPageProps {
  onClose: () => void;
}

const FORMAT_TABS: { key: GameFormat; label: string; color: string; note?: string }[] = [
  { key: 'TCG', label: 'TCG 赛制', color: '#3b82f6', note: '实时 API' },
  { key: 'OCG', label: 'OCG 赛制', color: '#10b981', note: '实时 API' },
  { key: 'MasterDuel', label: 'Master Duel', color: '#f59e0b', note: '自动更新' },
];

type SectionKey = 'forbidden' | 'limited' | 'semiLimited';

interface SectionConfig {
  key: SectionKey;
  label: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
  glow: string;
  countLabel: string;
}

const SECTIONS: SectionConfig[] = [
  {
    key: 'forbidden',
    label: '禁止卡',
    icon: <Ban size={16} />,
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.3)',
    glow: 'rgba(239,68,68,0.35)',
    countLabel: '禁止卡',
  },
  {
    key: 'limited',
    label: '限制卡',
    icon: <AlertTriangle size={16} />,
    color: '#f97316',
    bg: 'rgba(249,115,22,0.08)',
    border: 'rgba(249,115,22,0.3)',
    glow: 'rgba(249,115,22,0.3)',
    countLabel: '限制卡',
  },
  {
    key: 'semiLimited',
    label: '准限制卡',
    icon: <Shield size={16} />,
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.3)',
    glow: 'rgba(245,158,11,0.25)',
    countLabel: '准限制卡',
  },
];

const BanlistCardThumb: React.FC<{
  card: YgoCard;
  isSelected: boolean;
  section: SectionConfig;
  onClick: (card: YgoCard) => void;
}> = ({ card, isSelected, section, onClick }) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  return (
    <div
      onClick={() => onClick(card)}
      title={`${card.name}\n${section.countLabel}`}
      style={{
        position: 'relative',
        width: '80px',
        height: '116px',
        borderRadius: '6px',
        overflow: 'hidden',
        cursor: 'pointer',
        border: isSelected ? `2px solid #06b6d4` : `2px solid ${section.border}`,
        boxShadow: isSelected
          ? '0 0 18px rgba(6,182,212,0.7)'
          : `0 0 8px ${section.glow}`,
        transition: 'all 0.2s ease',
        flexShrink: 0,
      }}
    >
      {/* Loading skeleton */}
      {!imgLoaded && !imgError && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
          animation: 'pulse 1.5s infinite',
        }} />
      )}
      <img
        src={imgError ? 'https://images.ygoprodeck.com/images/cards/back_high.jpg' : (card.imageUrlSmall || card.imageUrl)}
        alt={card.name}
        loading="lazy"
        onLoad={() => setImgLoaded(true)}
        onError={() => setImgError(true)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: imgLoaded || imgError ? 'block' : 'none',
        }}
      />
      {/* Hover overlay with name */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)',
        padding: '4px 3px 3px',
        fontSize: '0.58rem',
        color: '#e2e8f0',
        fontWeight: 600,
        lineHeight: 1.2,
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
      }}>
        {card.name}
      </div>
    </div>
  );
};

const BanlistSection: React.FC<{
  section: SectionConfig;
  cards: YgoCard[];
  searchTerm: string;
  selectedCard: YgoCard | null;
  onCardClick: (card: YgoCard) => void;
}> = ({ section, cards, searchTerm, selectedCard, onCardClick }) => {
  const [collapsed, setCollapsed] = useState(false);

  const filtered = searchTerm
    ? cards.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.enName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.id.toString().includes(searchTerm)
      )
    : cards;

  return (
    <div style={{
      marginBottom: '1.5rem',
      border: `1px solid ${section.border}`,
      borderRadius: '12px',
      overflow: 'hidden',
      background: section.bg,
    }}>
      {/* Section header */}
      <div
        onClick={() => setCollapsed(p => !p)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          padding: '0.75rem 1rem',
          cursor: 'pointer',
          background: `linear-gradient(90deg, ${section.bg}, transparent)`,
          borderBottom: collapsed ? 'none' : `1px solid ${section.border}`,
          userSelect: 'none',
        }}
      >
        <span style={{ color: section.color }}>{section.icon}</span>
        <span style={{ fontWeight: 700, color: section.color, fontSize: '0.95rem' }}>
          {section.label}
        </span>
        <span style={{
          background: section.color,
          color: '#000',
          fontSize: '0.7rem',
          fontWeight: 800,
          padding: '2px 8px',
          borderRadius: '99px',
        }}>
          {filtered.length} 张
        </span>
        <span style={{ marginLeft: 'auto', color: section.color, opacity: 0.7 }}>
          {collapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
        </span>
      </div>

      {/* Card grid */}
      {!collapsed && (
        <div style={{
          padding: '0.75rem 1rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}>
          {filtered.length === 0 ? (
            <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem', padding: '0.5rem 0' }}>
              无匹配卡片
            </span>
          ) : (
            filtered.map(card => (
              <BanlistCardThumb
                key={card.id}
                card={card}
                section={section}
                isSelected={selectedCard?.id === card.id}
                onClick={onCardClick}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export const BanlistPage: React.FC<BanlistPageProps> = ({ onClose }) => {
  const [format, setFormat] = useState<GameFormat>('TCG');
  const [banlistData, setBanlistData] = useState<BanlistPageData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<YgoCard | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastFetch, setLastFetch] = useState<number | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const loadBanlist = useCallback(async (fmt: GameFormat, forceRefresh = false) => {
    setLoading(true);
    setError(null);
    setBanlistData(null);
    setSelectedCard(null);
    try {
      const data = await fetchBanlist(fmt, { forceRefresh });
      setBanlistData(data);
      setLastFetch(data.fetchedAt || Date.now());
    } catch {
      setError('加载禁卡表失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBanlist(format);
  }, [format, loadBanlist]);

  const totalCount = banlistData
    ? banlistData.forbidden.length + banlistData.limited.length + banlistData.semiLimited.length
    : 0;

  const activeFormat = FORMAT_TABS.find(f => f.key === format)!;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 200,
      background: 'var(--bg-base)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '0.75rem 1.5rem',
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-color)',
        flexShrink: 0,
        flexWrap: 'wrap',
      }}>
        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <ShieldAlert size={22} color="var(--accent-pink)" />
          <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#fff' }}>
            实时禁卡表
          </span>
          {lastFetch && (
            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
              {banlistData?.fromCache ? '缓存于' : '请求于'} {new Date(lastFetch).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        {/* Format tabs */}
        <div style={{
          display: 'flex',
          gap: '0.4rem',
          background: 'rgba(0,0,0,0.4)',
          padding: '4px',
          borderRadius: '10px',
        }}>
          {FORMAT_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFormat(tab.key)}
              style={{
                padding: '0.4rem 1rem',
                borderRadius: '7px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.83rem',
                transition: 'all 0.2s ease',
                background: format === tab.key
                  ? `linear-gradient(135deg, ${tab.color}33, ${tab.color}22)`
                  : 'transparent',
                color: format === tab.key ? tab.color : 'var(--text-muted)',
                boxShadow: format === tab.key ? `0 0 12px ${tab.color}44` : 'none',
                outline: format === tab.key ? `1px solid ${tab.color}55` : 'none',
              }}
            >
              {tab.label}
              {tab.note && (
                <span style={{
                  marginLeft: '0.4rem',
                  fontSize: '0.65rem',
                  opacity: 0.65,
                  fontWeight: 400,
                }}>
                  ({tab.note})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{
          position: 'relative',
          flex: '1',
          minWidth: '200px',
          maxWidth: '320px',
        }}>
          <Search size={15} style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
          <input
            type="text"
            placeholder="在禁卡表中搜索卡名..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '0.45rem 0.75rem 0.45rem 2.2rem',
              color: '#fff',
              fontSize: '0.85rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Total count badge */}
        {!loading && banlistData && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            background: 'rgba(255,255,255,0.05)',
            padding: '0.35rem 0.75rem',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
          }}>
            <Award size={14} color={activeFormat.color} />
            <span>
              共 <strong style={{ color: '#fff' }}>{totalCount}</strong> 张受限制卡
            </span>
          </div>
        )}

        <button
          onClick={() => setHistoryOpen(true)}
          title="按年份和月份查看各赛制的历史改订"
          style={{
            background: 'rgba(245,158,11,0.1)',
            border: '1px solid rgba(245,158,11,0.35)',
            color: '#fbbf24',
            padding: '0.4rem 0.75rem',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.8rem',
          }}
        >
          <History size={14} />
          <span>历史月表</span>
        </button>

        {/* Refresh */}
        <button
          onClick={() => loadBanlist(format, true)}
          disabled={loading}
          title="绕过缓存并请求最新禁卡表"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid var(--border-color)',
            color: loading ? 'var(--text-dim)' : 'var(--text-muted)',
            padding: '0.4rem 0.75rem',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.8rem',
            transition: 'all 0.2s ease',
          }}
        >
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          <span>刷新</span>
        </button>

        {/* Close */}
        <button
          onClick={onClose}
          style={{
            marginLeft: 'auto',
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            color: '#f87171',
            padding: '0.4rem 0.85rem',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontWeight: 600,
            fontSize: '0.85rem',
            transition: 'all 0.2s ease',
          }}
        >
          <X size={16} />
          <span>返回查卡</span>
        </button>
      </div>

      {/* Main content: scrollable list + inspector */}
      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
      }}>
        {/* Left: ban list sections */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1.25rem 1.5rem',
        }}>
          {banlistData && !loading && (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.65rem',
              marginBottom: '1rem',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              background: banlistData.warning ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.08)',
              border: `1px solid ${banlistData.warning ? 'rgba(245,158,11,0.35)' : 'rgba(16,185,129,0.25)'}`,
              color: banlistData.warning ? '#fcd34d' : '#6ee7b7',
              fontSize: '0.8rem',
              lineHeight: 1.5,
            }}>
              {banlistData.warning ? <AlertTriangle size={17} /> : <Shield size={17} />}
              <div>
                <strong>数据来源：{banlistData.sourceLabel}</strong>
                {banlistData.effectiveDate && <span> · 规则生效日：{banlistData.effectiveDate}</span>}
                {banlistData.warning && <div>{banlistData.warning}</div>}
              </div>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: '1px solid var(--border-color)',
                  background: 'rgba(255,255,255,0.03)',
                }}>
                  <div style={{
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    gap: '0.6rem',
                    alignItems: 'center',
                  }}>
                    <div style={{ width: '80px', height: '20px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', animation: 'pulse 1.5s infinite' }} />
                    <div style={{ width: '40px', height: '20px', borderRadius: '99px', background: 'rgba(255,255,255,0.05)', animation: 'pulse 1.5s infinite' }} />
                  </div>
                  <div style={{ padding: '0.75rem 1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {Array.from({ length: i === 1 ? 18 : i === 2 ? 10 : 6 }).map((_, j) => (
                      <div key={j} style={{
                        width: '80px', height: '116px', borderRadius: '6px',
                        background: 'rgba(255,255,255,0.06)',
                        animation: 'pulse 1.5s infinite',
                        animationDelay: `${j * 0.04}s`,
                      }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              height: '60%',
              color: '#f87171',
            }}>
              <AlertTriangle size={48} />
              <p style={{ fontSize: '1rem' }}>{error}</p>
              <button
                onClick={() => loadBanlist(format, true)}
                style={{
                  background: 'rgba(239,68,68,0.15)',
                  border: '1px solid rgba(239,68,68,0.4)',
                  color: '#f87171',
                  padding: '0.5rem 1.5rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                重试
              </button>
            </div>
          )}

          {/* Data */}
          {banlistData && !loading && SECTIONS.map(section => (
            <BanlistSection
              key={section.key}
              section={section}
              cards={banlistData[section.key]}
              searchTerm={searchTerm}
              selectedCard={selectedCard}
              onCardClick={setSelectedCard}
            />
          ))}
        </div>

        {/* Right: card inspector */}
        <div style={{
          width: '320px',
          flexShrink: 0,
          borderLeft: '1px solid var(--border-color)',
          overflowY: 'auto',
        }}>
          <CardInspector card={selectedCard} />
        </div>
      </div>

      <BanlistHistoryModal
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        currentFormat={format}
        onSelectCardKeyword={(keyword) => {
          setSearchTerm(keyword);
          setSelectedCard(null);
        }}
      />

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
