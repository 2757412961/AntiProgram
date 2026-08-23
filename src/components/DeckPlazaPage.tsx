import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Clock3,
  Database,
  ExternalLink,
  Flame,
  Layers3,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { fetchClassicDeck, fetchDeckPlaza } from '../services/deckPlazaApi';
import {
  ClassicDeckBuild,
  ClassicDeckCard,
  DeckPlazaFormat,
  DeckPlazaMetric,
  DeckPlazaResponse,
  DeckRanking,
} from '../types/deckPlaza';
import '../styles/deck-plaza.css';

const FORMAT_OPTIONS: Array<{ id: DeckPlazaFormat; label: string; hint: string }> = [
  { id: 'master-duel', label: 'Master Duel', hint: '天梯与社区赛' },
  { id: 'ocg', label: 'OCG', hint: '亚洲实体赛' },
  { id: 'tcg', label: 'TCG', hint: '欧美实体赛' },
];

const TIER_META: Record<number, { label: string; description: string }> = {
  1: { label: '顶级环境', description: '当前环境最具统治力的构筑' },
  2: { label: '强势竞争', description: '稳定进入上位圈的主流选择' },
  3: { label: '稳定上位', description: '具备成熟体系与赛事竞争力' },
  4: { label: '潜力构筑', description: '环境中值得关注的可用选择' },
};

const FORMAT_LABELS: Record<DeckPlazaFormat, string> = {
  'master-duel': 'Master Duel',
  ocg: 'OCG',
  tcg: 'TCG',
};

const classicDeckCache = new Map<string, ClassicDeckBuild>();

function formatTimestamp(value: string | null): string {
  if (!value) return '尚未同步';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function formatMetric(item: DeckRanking): string {
  if (item.unit === 'percent') return `${item.value.toFixed(2).replace(/\.00$/, '')}%`;
  if (item.unit === 'decks') return `${item.value} 副上位`;
  return item.value.toFixed(1);
}

function metricLabel(metric: DeckPlazaMetric): string {
  if (metric === 'popularity') return '近两周热度';
  if (metric === 'top-count') return '赛事上位数';
  return '赛事 Power';
}

function handleDeckImageError(event: React.SyntheticEvent<HTMLImageElement>) {
  const image = event.currentTarget;
  if (!image.dataset.fallback && image.src.includes('/cards_cropped/')) {
    image.dataset.fallback = 'full-card';
    image.src = image.src.replace('/cards_cropped/', '/cards/');
    return;
  }
  image.hidden = true;
}

const DeckRankingCard: React.FC<{ item: DeckRanking; onSelect: (item: DeckRanking) => void }> = ({ item, onSelect }) => (
  <article className="deck-ranking-card">
    <button
      type="button"
      className="deck-ranking-open"
      onClick={() => onSelect(item)}
      aria-label={`打开 ${item.name} 经典构筑`}
    >
      <div className="deck-ranking-art">
        <span className="deck-ranking-monogram" aria-hidden="true">
          {item.name.trim().charAt(0).toUpperCase() || 'D'}
        </span>
        {item.imageUrl && (
          <img
            src={item.imageUrl}
            alt={`${item.name} 构筑配图`}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={handleDeckImageError}
          />
        )}
        <span className="deck-rank-number">#{item.rank}</span>
        {item.tier && <span className={`deck-tier tier-${item.tier}`}>TIER {item.tier}</span>}
      </div>
      <div className="deck-ranking-content">
        <div>
          <h4 title={item.name}>{item.name}</h4>
          <span>{metricLabel(item.metric)}</span>
        </div>
        <strong className="deck-metric-value">{formatMetric(item)}</strong>
      </div>
      <span className="deck-open-hint"><Sparkles size={13} />查看经典构筑</span>
    </button>
    {item.detailUrl && (
      <a href={item.detailUrl} target="_blank" rel="noreferrer" className="deck-card-link" aria-label={`查看 ${item.name} 来源详情`}>
        查看构筑与来源 <ExternalLink size={14} />
      </a>
    )}
  </article>
);

const DeckCardSection: React.FC<{
  title: string;
  cards: ClassicDeckCard[];
  count: number;
}> = ({ title, cards, count }) => {
  if (cards.length === 0) return null;
  const copies = cards.flatMap(card => Array.from(
    { length: card.amount },
    (_, copyIndex) => ({ card, copyIndex }),
  ));
  return (
    <section className="classic-deck-section">
      <header>
        <h4>{title}</h4>
        <span>{count} 张 · {cards.length} 种</span>
      </header>
      <div className="classic-card-grid">
        {copies.map(({ card, copyIndex }) => (
          <a
            className="classic-card"
            href={card.detailUrl}
            target="_blank"
            rel="noreferrer"
            key={`${card.id}-${copyIndex}`}
            title={`查看 ${card.name} 卡片详情`}
          >
            <div className="classic-card-art">
              <span className="classic-card-monogram" aria-hidden="true">{card.name.charAt(0)}</span>
              <img
                src={card.imageUrl}
                alt={card.name}
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={handleDeckImageError}
              />
              {card.rarity && <em>{card.rarity}</em>}
            </div>
            <strong>{card.name}</strong>
          </a>
        ))}
      </div>
    </section>
  );
};

const ClassicDeckModal: React.FC<{
  item: DeckRanking;
  build: ClassicDeckBuild | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}> = ({ item, build, loading, error, onClose }) => {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="classic-deck-backdrop"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="classic-deck-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="classic-deck-title"
      >
        <header className="classic-deck-hero">
          <div className="classic-deck-cover">
            <span aria-hidden="true">{item.name.charAt(0)}</span>
            {item.imageUrl && (
              <img
                src={item.imageUrl}
                alt=""
                referrerPolicy="no-referrer"
                onError={handleDeckImageError}
              />
            )}
          </div>
          <div className="classic-deck-title">
            <span><Sparkles size={14} /> CLASSIC BUILD</span>
            <h3 id="classic-deck-title">{item.name} · 经典构筑参考</h3>
            <p>{build?.selectionReason || `正在从可信来源选取一副 ${FORMAT_LABELS[item.format]} 公开完整卡表。`}</p>
          </div>
          <div className="classic-deck-badges">
            {item.tier && <span className={`deck-tier tier-${item.tier}`}>TIER {item.tier}</span>}
            <span>{FORMAT_LABELS[item.format]}</span>
          </div>
          <button type="button" className="classic-deck-close" onClick={onClose} aria-label="关闭构筑弹窗" autoFocus>
            <X size={21} />
          </button>
        </header>

        <div className="classic-deck-body">
          {loading && (
            <div className="classic-deck-state">
              <div className="spinner" />
              <strong>正在整理代表构筑</strong>
              <span>首次打开会从来源站按需加载，之后会使用缓存。</span>
            </div>
          )}

          {!loading && error && (
            <div className="classic-deck-state classic-deck-error" role="alert">
              <AlertTriangle size={24} />
              <strong>暂时无法取得完整卡表</strong>
              <span>{error}</span>
              {item.detailUrl && (
                <a href={item.detailUrl} target="_blank" rel="noreferrer">
                  直接查看来源页 <ExternalLink size={14} />
                </a>
              )}
            </div>
          )}

          {!loading && build && (
            <>
              <div className="classic-deck-summary">
                <div>
                  <span>构筑样本</span>
                  <strong>{build.sampleName}</strong>
                </div>
                <div className="classic-deck-counts">
                  <span><b>{build.counts.main}</b> Main</span>
                  <span><b>{build.counts.extra}</b> Extra</span>
                  {build.counts.side > 0 && <span><b>{build.counts.side}</b> Side</span>}
                </div>
                <a href={build.sourceUrl} target="_blank" rel="noreferrer">
                  {build.sourceLabel} <ExternalLink size={14} />
                </a>
              </div>
              <DeckCardSection title="主卡组 · Main Deck" cards={build.main} count={build.counts.main} />
              <DeckCardSection title="额外卡组 · Extra Deck" cards={build.extra} count={build.counts.extra} />
              <DeckCardSection title="副卡组 · Side Deck" cards={build.side} count={build.counts.side} />
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export const DeckPlazaPage: React.FC = () => {
  const [format, setFormat] = useState<DeckPlazaFormat>('master-duel');
  const [metric, setMetric] = useState<DeckPlazaMetric>('power');
  const [query, setQuery] = useState('');
  const [data, setData] = useState<DeckPlazaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDeck, setSelectedDeck] = useState<DeckRanking | null>(null);
  const [classicBuild, setClassicBuild] = useState<ClassicDeckBuild | null>(null);
  const [classicLoading, setClassicLoading] = useState(false);
  const [classicError, setClassicError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetchDeckPlaza({ format, metric, signal: controller.signal })
      .then(setData)
      .catch(caught => {
        if (caught instanceof DOMException && caught.name === 'AbortError') return;
        setData(null);
        setError(caught instanceof Error ? caught.message : '卡组广场加载失败');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [format, metric]);

  useEffect(() => {
    if (!selectedDeck) return undefined;
    const cacheKey = `${selectedDeck.format}:${selectedDeck.id}:${selectedDeck.detailUrl || ''}`;
    const cached = classicDeckCache.get(cacheKey);
    if (cached) {
      setClassicBuild(cached);
      setClassicError(null);
      setClassicLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    setClassicBuild(null);
    setClassicError(null);
    setClassicLoading(true);
    fetchClassicDeck({ item: selectedDeck, signal: controller.signal })
      .then(result => {
        classicDeckCache.set(cacheKey, result);
        setClassicBuild(result);
      })
      .catch(caught => {
        if (caught instanceof DOMException && caught.name === 'AbortError') return;
        setClassicError(caught instanceof Error ? caught.message : '经典构筑加载失败');
      })
      .finally(() => {
        if (!controller.signal.aborted) setClassicLoading(false);
      });
    return () => controller.abort();
  }, [selectedDeck]);

  const rankings = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return data?.rankings || [];
    return (data?.rankings || []).filter(item => item.name.toLowerCase().includes(keyword));
  }, [data, query]);

  const decks = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return data?.decks || [];
    return (data?.decks || []).filter(deck =>
      deck.name.toLowerCase().includes(keyword)
      || deck.event.toLowerCase().includes(keyword)
      || deck.pilot?.toLowerCase().includes(keyword)
    );
  }, [data, query]);

  const tierGroups = useMemo(() => {
    if (format !== 'master-duel' || metric !== 'power') return [];
    return [1, 2, 3, 4]
      .map(tier => ({
        tier,
        items: rankings.filter(item => item.tier === tier),
      }))
      .filter(group => group.items.length > 0);
  }, [format, metric, rankings]);

  const handleFormatChange = (nextFormat: DeckPlazaFormat) => {
    setSelectedDeck(null);
    setFormat(nextFormat);
    setMetric(nextFormat === 'master-duel' ? 'power' : 'top-count');
    setQuery('');
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      setData(await fetchDeckPlaza({ format, metric, forceRefresh: true }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '刷新失败');
    } finally {
      setRefreshing(false);
    }
  };

  const activeSource = data?.sources[0];
  const methodology = activeSource?.methodology[data?.metric || metric];

  return (
    <main className="deck-plaza-page">
      <section className="deck-plaza-hero">
        <div className="deck-plaza-hero-copy">
          <div className="deck-plaza-eyebrow"><Activity size={15} /> LIVE META DISCOVERY</div>
          <h2>卡组广场</h2>
          <p>把不同环境的赛事上位与流行度分开呈现。每一项都保留统计口径、更新时间和原始来源。</p>
        </div>
        <div className="deck-plaza-hero-actions">
          <div className="deck-plaza-updated">
            <Clock3 size={15} />
            <span>采集于 {formatTimestamp(activeSource?.fetchedAt || null)}</span>
          </div>
          <button className="deck-refresh-button" onClick={handleRefresh} disabled={refreshing || loading}>
            <RefreshCw size={16} className={refreshing ? 'is-spinning' : ''} />
            {refreshing ? '同步中' : '同步最新'}
          </button>
        </div>
      </section>

      <section className="deck-plaza-controls" aria-label="卡组广场筛选">
        <div className="deck-format-tabs" role="tablist" aria-label="游戏环境">
          {FORMAT_OPTIONS.map(option => (
            <button
              key={option.id}
              role="tab"
              aria-selected={format === option.id}
              className={format === option.id ? 'active' : ''}
              onClick={() => handleFormatChange(option.id)}
            >
              <strong>{option.label}</strong>
              <span>{option.hint}</span>
            </button>
          ))}
        </div>

        <div className="deck-plaza-toolbar">
          {format === 'master-duel' && (
            <div className="deck-metric-switch" aria-label="统计口径">
              <button className={metric === 'power' ? 'active' : ''} onClick={() => setMetric('power')}>
                <Trophy size={15} />赛事强度
              </button>
              <button className={metric === 'popularity' ? 'active' : ''} onClick={() => setMetric('popularity')}>
                <Flame size={15} />近两周热度
              </button>
            </div>
          )}
          <label className="deck-plaza-search">
            <Search size={17} />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="搜索卡组、赛事或选手…"
            />
          </label>
        </div>
      </section>

      {error && (
        <div className="deck-plaza-alert error" role="alert">
          <AlertTriangle size={18} />
          <div><strong>数据暂时不可用</strong><span>{error}</span></div>
          <button onClick={handleRefresh}>重试</button>
        </div>
      )}

      {data?.warnings.map(warning => (
        <div className="deck-plaza-alert warning" key={warning}>
          <AlertTriangle size={17} /><span>{warning}</span>
        </div>
      ))}

      {loading ? (
        <div className="deck-plaza-loading">
          <div className="spinner" />
          <strong>正在聚合最新环境数据</strong>
          <span>首次访问需要从可靠来源实时采集，之后会命中服务端缓存。</span>
        </div>
      ) : data && (
        <>
          <section className="deck-source-strip">
            {data.sources.map(source => (
              <a key={source.instanceId} href={source.sourceUrl} target="_blank" rel="noreferrer" className="deck-source-card">
                <span className={`source-status ${source.freshness}`} />
                <div>
                  <strong>{source.label}</strong>
                  <span>{source.freshness === 'fresh' ? '实时快照' : source.freshness === 'stale' ? '上次可用快照' : '尚不可用'}</span>
                </div>
                <div className="source-storage">
                  <Database size={14} />{
                    source.storage === 'cache'
                      ? 'Cloudflare 边缘缓存'
                      : source.persisted ? 'SQLite 已入库' : '内存缓存'
                  }
                </div>
                <ExternalLink size={15} />
              </a>
            ))}
          </section>

          <section className="deck-plaza-section">
            <div className="deck-section-heading">
              <div>
                <span className="section-kicker">RANKING</span>
                <h3>{metricLabel(data.metric)}</h3>
              </div>
              <div className="deck-methodology">
                <ShieldCheck size={16} />
                <span>{methodology || '各来源独立排名，不把胜率、投稿量与上位数混为一个分数。'}</span>
              </div>
            </div>

            {rankings.length > 0 ? (
              tierGroups.length > 0 ? (
                <div className="deck-tier-board">
                  {tierGroups.map(group => (
                    <section className={`deck-tier-row deck-tier-row-${group.tier}`} key={group.tier}>
                      <header className="deck-tier-rail">
                        <span>TIER</span>
                        <strong>{group.tier}</strong>
                        <div>
                          <b>{TIER_META[group.tier].label}</b>
                          <small>{TIER_META[group.tier].description}</small>
                        </div>
                        <em>{group.items.length} 个构筑</em>
                      </header>
                      <div className="deck-tier-cards">
                        {group.items.map(item => <DeckRankingCard item={item} onSelect={setSelectedDeck} key={item.id} />)}
                      </div>
                    </section>
                  ))}
                </div>
              ) : (
                <div className="deck-ranking-grid">
                  {rankings.map(item => <DeckRankingCard item={item} onSelect={setSelectedDeck} key={item.id} />)}
                </div>
              )
            ) : (
              <div className="deck-plaza-empty"><Search size={24} /><span>没有匹配的卡组</span></div>
            )}
          </section>

          {data.decks.length > 0 && (
            <section className="deck-plaza-section tournament-section">
              <div className="deck-section-heading">
                <div>
                  <span className="section-kicker">LATEST TOPS</span>
                  <h3>最新赛事卡表</h3>
                </div>
                <div className="deck-summary-chips">
                  <span><Layers3 size={14} />{decks.length} 副卡表</span>
                  <span><Users size={14} />含公开赛事样本</span>
                </div>
              </div>
              <div className="tournament-deck-list">
                {decks.map(deck => (
                  <a key={deck.id} href={deck.detailUrl} target="_blank" rel="noreferrer" className="tournament-deck-row">
                    <div className="tournament-deck-thumb">
                      <span aria-hidden="true">{deck.name.trim().charAt(0).toUpperCase() || 'D'}</span>
                      {deck.imageUrl && (
                        <img
                          src={deck.imageUrl}
                          alt=""
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          onError={handleDeckImageError}
                        />
                      )}
                    </div>
                    <div className="tournament-deck-main">
                      <strong>{deck.name}</strong>
                      <span>{deck.event}</span>
                    </div>
                    <span className="placement-badge">{deck.placement}</span>
                    <div className="tournament-deck-meta">
                      {deck.playerCount && <span><Users size={13} />约 {deck.playerCount} 人</span>}
                      {deck.pilot && <span>选手 {deck.pilot}</span>}
                      {deck.relativeDate && <span>{deck.relativeDate}</span>}
                    </div>
                    <ExternalLink size={15} />
                  </a>
                ))}
              </div>
            </section>
          )}
        </>
      )}
      {selectedDeck && (
        <ClassicDeckModal
          item={selectedDeck}
          build={classicBuild}
          loading={classicLoading}
          error={classicError}
          onClose={() => setSelectedDeck(null)}
        />
      )}
    </main>
  );
};
