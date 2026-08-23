import React, { useEffect, useRef } from 'react';
import { DataSourceType, DataSourceOption, CacheState } from '../types/ygo';
import { Zap, Globe, CheckCircle, Wifi, ChevronDown } from 'lucide-react';

interface DataSourceSelectorProps {
  currentSource: DataSourceType;
  onSourceChange: (source: DataSourceType) => void;
  cacheState: CacheState;
}

const DATA_SOURCES: (DataSourceOption & { icon: React.ReactNode; accentColor: string })[] = [
  {
    id: 'YGOCDB',
    name: '百鸽中文 API',
    badge: '推荐',
    desc: '官方中文效果文言 · 233妈妈盒 CDN · 响应极快',
    isOnline: true,
    speed: '~120ms',
    icon: <Zap size={18} />,
    accentColor: '#f59e0b',
  },
  {
    id: 'YGOPRODeck',
    name: 'YGOPRODeck v7',
    badge: '13,000+ 卡',
    desc: '全球全量英文卡库 · 支持后台全量缓存',
    isOnline: true,
    speed: '~300ms',
    icon: <Globe size={18} />,
    accentColor: '#3b82f6',
  },
];

export const DataSourceSelector: React.FC<DataSourceSelectorProps> = ({
  currentSource,
  onSourceChange,
  cacheState,
}) => {
  const [open, setOpen] = React.useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const currentDs = DATA_SOURCES.find(d => d.id === currentSource)!;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(p => !p)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.45rem 0.9rem',
          background: open
            ? `rgba(${hexToRgb(currentDs.accentColor)}, 0.15)`
            : 'rgba(255,255,255,0.06)',
          border: `1px solid ${open ? currentDs.accentColor + '55' : 'var(--border-color)'}`,
          borderRadius: '8px',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '0.85rem',
          fontWeight: 600,
          transition: 'all 0.2s ease',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ color: currentDs.accentColor }}>{currentDs.icon}</span>
        <span>{currentDs.name}</span>
        <span style={{
          background: currentDs.accentColor,
          color: '#000',
          fontSize: '0.65rem',
          fontWeight: 800,
          padding: '1px 6px',
          borderRadius: '99px',
        }}>
          {currentDs.badge}
        </span>
        <ChevronDown size={14} style={{
          color: 'var(--text-dim)',
          transform: open ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.2s ease',
        }} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          left: 0,
          zIndex: 300,
          width: '320px',
          background: '#161b2e',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          overflow: 'hidden',
          backdropFilter: 'blur(16px)',
        }}>
          <div style={{
            padding: '0.5rem 0.75rem',
            fontSize: '0.72rem',
            color: 'var(--text-dim)',
            borderBottom: '1px solid var(--border-color)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            fontWeight: 700,
          }}>
            选择数据源
          </div>

          {DATA_SOURCES.map(ds => {
            const isActive = currentSource === ds.id;
            const isCaching = ds.id === 'YGOPRODeck' && cacheState.status === 'loading';
            const isCached = ds.id === 'YGOPRODeck' && cacheState.status === 'ready';

            return (
              <div
                key={ds.id}
                onClick={() => { onSourceChange(ds.id); setOpen(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.85rem',
                  padding: '0.85rem 1rem',
                  cursor: 'pointer',
                  background: isActive
                    ? `linear-gradient(90deg, ${ds.accentColor}18, transparent)`
                    : 'transparent',
                  borderLeft: isActive ? `3px solid ${ds.accentColor}` : '3px solid transparent',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
                }}
                onMouseLeave={e => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                {/* Icon */}
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: `${ds.accentColor}22`,
                  border: `1px solid ${ds.accentColor}44`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: ds.accentColor,
                  flexShrink: 0,
                }}>
                  {ds.icon}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: isActive ? ds.accentColor : '#fff' }}>
                      {ds.name}
                    </span>
                    <span style={{
                      background: ds.accentColor,
                      color: '#000',
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      padding: '1px 5px',
                      borderRadius: '99px',
                    }}>
                      {ds.badge}
                    </span>
                    {isActive && <CheckCircle size={14} color={ds.accentColor} />}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.3rem', lineHeight: 1.4 }}>
                    {ds.desc}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.72rem' }}>
                    <Wifi size={12} color="#10b981" />
                    <span style={{ color: 'var(--text-dim)' }}>响应约 {ds.speed}</span>

                    {/* Cache status for YGOPRODeck */}
                    {ds.id === 'YGOPRODeck' && (
                      <span style={{
                        marginLeft: '0.25rem',
                        color: isCached ? '#10b981' : isCaching ? '#f59e0b' : 'var(--text-dim)',
                        fontWeight: 600,
                      }}>
                        {isCaching && '· 后台缓存中...'}
                        {isCached && `· 已缓存 ${cacheState.totalCount.toLocaleString()} 张`}
                        {cacheState.status === 'error' && ds.id === 'YGOPRODeck' && '· 缓存失败'}
                      </span>
                    )}
                  </div>

                  {/* Cache progress bar */}
                  {isCaching && (
                    <div style={{
                      marginTop: '0.4rem',
                      height: '3px',
                      background: 'rgba(255,255,255,0.1)',
                      borderRadius: '99px',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%',
                        width: '40%',
                        background: `linear-gradient(90deg, ${ds.accentColor}, ${ds.accentColor}88)`,
                        borderRadius: '99px',
                        animation: 'cacheSlide 1.5s ease-in-out infinite',
                      }} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          <style>{`
            @keyframes cacheSlide {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(350%); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
};

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
