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
  Trophy,
  Users,
} from 'lucide-react';
import { fetchDeckPlaza } from '../services/deckPlazaApi';
import {
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

export const DeckPlazaPage: React.FC = () => {
  const [format, setFormat] = useState<DeckPlazaFormat>('master-duel');
  const [metric, setMetric] = useState<DeckPlazaMetric>('power');
  const [query, setQuery] = useState('');
  const [data, setData] = useState<DeckPlazaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleFormatChange = (nextFormat: DeckPlazaFormat) => {
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
                  <Database size={14} />{source.persisted ? 'SQLite 已入库' : '内存缓存'}
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
              <div className="deck-ranking-grid">
                {rankings.map(item => (
                  <article className="deck-ranking-card" key={item.id}>
                    <div
                      className="deck-ranking-art"
                      style={item.imageUrl ? {
                        backgroundImage: `linear-gradient(135deg, rgba(6, 182, 212, 0.18), rgba(139, 92, 246, 0.2)), url("${item.imageUrl}")`,
                      } : undefined}
                    >
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
                    {item.detailUrl && (
                      <a href={item.detailUrl} target="_blank" rel="noreferrer" className="deck-card-link" aria-label={`查看 ${item.name} 来源详情`}>
                        查看构筑与来源 <ExternalLink size={14} />
                      </a>
                    )}
                  </article>
                ))}
              </div>
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
                    <div
                      className="tournament-deck-thumb"
                      style={deck.imageUrl ? {
                        backgroundImage: `linear-gradient(135deg, rgba(6, 182, 212, 0.18), rgba(139, 92, 246, 0.22)), url("${deck.imageUrl}")`,
                      } : undefined}
                    />
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
    </main>
  );
};
