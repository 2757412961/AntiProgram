import React, { useEffect, useRef, useState } from 'react';
import { YgoCard } from '../types/ygo';
import { AlertCircle, Check, ChevronRight, Copy, FileCode, Network, ShieldAlert } from 'lucide-react';
import { fetchCardDetailFromYgocdb } from '../services/cardDetailService';
import { getChineseCardBackUrl, getChineseCardImageUrl } from '../services/cardDetailService';
import { useCardSearch } from '../context/CardSearchContext';
import { fetchRelatedCards, localizeRelatedCards, RelatedCardsResult } from '../services/relatedCards';

interface CardInspectorProps {
  card?: YgoCard | null;
}

export const CardInspector: React.FC<CardInspectorProps> = (props) => {
  const context = useCardSearch();
  const card = props.card !== undefined ? props.card : context.selectedCard;

  const [copiedId, setCopiedId] = useState(false);
  const [copiedDesc, setCopiedDesc] = useState(false);
  const [detail, setDetail] = useState<YgoCard | null>(null);
  const [imageVariant, setImageVariant] = useState<'sc' | 'back'>('sc');
  const [activeTab, setActiveTab] = useState<'detail' | 'related'>('detail');
  const [relatedResult, setRelatedResult] = useState<RelatedCardsResult | null>(null);
  const relatedCardKeyRef = useRef<string | null>(null);
  const [relatedRetryKey, setRelatedRetryKey] = useState(0);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [relatedLocalizing, setRelatedLocalizing] = useState(false);
  const [relatedError, setRelatedError] = useState<string | null>(null);

  useEffect(() => {
    if (card) {
      setImageVariant('sc');
      setActiveTab('detail');
      setRelatedResult(null);
      relatedCardKeyRef.current = null;
      setRelatedLocalizing(false);
      setRelatedError(null);
      fetchCardDetailFromYgocdb(card.id, card).then(setDetail).catch(err => {
        console.warn('Failed to fetch detailed info', err);
        setDetail(card);
      });
    } else {
      setDetail(null);
    }
  }, [card]);

  useEffect(() => {
    if (!card || activeTab !== 'related') return;
    const key = `${context.filters.format}:${card.id}`;
    if (relatedCardKeyRef.current === key) return;

    let subscribed = true;
    setRelatedLoading(true);
    setRelatedLocalizing(false);
    setRelatedError(null);
    fetchRelatedCards(card, context.filters.format)
      .then(result => {
        if (!subscribed) return;
        setRelatedResult(result);
        relatedCardKeyRef.current = key;
        setRelatedLoading(false);
        setRelatedLocalizing(true);

        void localizeRelatedCards(result)
          .then(localizedResult => {
            if (relatedCardKeyRef.current === key) setRelatedResult(localizedResult);
          })
          .catch(error => {
            console.warn('关联卡片中文资料补全失败', error);
          })
          .finally(() => {
            if (relatedCardKeyRef.current === key) setRelatedLocalizing(false);
          });
      })
      .catch(error => {
        if (!subscribed) return;
        setRelatedError(error instanceof Error ? error.message : '关联卡片加载失败');
        relatedCardKeyRef.current = key;
      })
      .finally(() => {
        if (subscribed) setRelatedLoading(false);
      });

    return () => {
      subscribed = false;
    };
  }, [activeTab, card, context.filters.format, relatedRetryKey]);

  const handleCopyId = () => {
    if (detail) {
      navigator.clipboard.writeText(detail.id.toString());
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleCopyDesc = () => {
    if (detail) {
      navigator.clipboard.writeText(`【${detail.name}】\n${detail.desc}`);
      setCopiedDesc(true);
      setTimeout(() => setCopiedDesc(false), 2000);
    }
  };

  const getBanColor = (status?: string) => {
    if (status === 'Forbidden') return '#ef4444';
    if (status === 'Limited') return '#f97316';
    if (status === 'Semi-Limited') return '#f59e0b';
    return '#10b981';
  };

  const rarityColor: Record<string, string> = {
    N: '#94a3b8',
    R: '#60a5fa',
    SR: '#fbbf24',
    UR: '#c084fc',
  };

  if (!detail) {
    return (
      <aside className="inspector-panel" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>点击左侧卡牌查看高清大图、禁卡表与详细效果</p>
      </aside>
    );
  }

  return (
    <aside className="inspector-panel">
      <img
        src={imageVariant === 'back'
          ? getChineseCardBackUrl()
          : getChineseCardImageUrl(detail.imageId || detail.id, imageVariant, 'full')}
        alt={detail.name}
        className={`inspector-preview-img ${activeTab === 'related' ? 'compact' : ''}`}
        onError={() => setImageVariant('back')}
      />

      <div className="inspector-details">
        <div className="inspector-title">{detail.name}</div>

        <div className="inspector-tabs" role="tablist" aria-label="卡片信息">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'detail'}
            className={activeTab === 'detail' ? 'active' : ''}
            onClick={() => setActiveTab('detail')}
          >
            卡片详情
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'related'}
            className={activeTab === 'related' ? 'active' : ''}
            onClick={() => setActiveTab('related')}
          >
            <Network size={15} />
            相关卡片
            {relatedResult && <span className="inspector-tab-count">{relatedResult.total}</span>}
          </button>
        </div>

        {activeTab === 'detail' ? (
          <>

        {/* 三大环境 (MasterDuel / OCG / TCG) 禁限对比面板 */}
        <div style={{ background: 'rgba(0,0,0,0.4)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
            <ShieldAlert size={14} color="var(--accent-pink)" />
            <span>三环境禁卡表对比:</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem', fontSize: '0.75rem', textAlign: 'center' }}>
            <div style={{ background: 'rgba(255,255,255,0.04)', padding: '4px', borderRadius: '4px' }}>
              <div style={{ color: 'var(--text-dim)', fontSize: '0.65rem' }}>MasterDuel</div>
              <div style={{ fontWeight: 700, color: getBanColor(detail.banlistInfo?.masterDuel) }}>
                {detail.banlistInfo?.masterDuel || '未验证'}
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.04)', padding: '4px', borderRadius: '4px' }}>
              <div style={{ color: 'var(--text-dim)', fontSize: '0.65rem' }}>OCG 赛制</div>
              <div style={{ fontWeight: 700, color: getBanColor(detail.banlistInfo?.ocg || detail.banlistStatus) }}>
                {detail.banlistInfo?.ocg || detail.banlistStatus || 'Unlimited'}
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.04)', padding: '4px', borderRadius: '4px' }}>
              <div style={{ color: 'var(--text-dim)', fontSize: '0.65rem' }}>TCG 赛制</div>
              <div style={{ fontWeight: 700, color: getBanColor(detail.banlistInfo?.tcg || detail.banlistStatus) }}>
                {detail.banlistInfo?.tcg || detail.banlistStatus || 'Unlimited'}
              </div>
            </div>
          </div>
        </div>

        <div className="stat-grid">
          <div className="stat-item">
            <span className="label">卡片密码 (ID)</span>
            <span className="value" style={{ color: 'var(--accent-gold)' }}>{detail.id}</span>
          </div>
          <div className="stat-item">
            <span className="label">卡牌类型</span>
            <span className="value">{detail.subType || detail.type}</span>
          </div>

          {detail.rarity && (
            <div className="stat-item">
              <span className="label">Master Duel 稀有度</span>
              <span className="value" style={{ color: rarityColor[detail.rarity] || '#fff', fontWeight: 800 }}>
                {detail.rarity}
              </span>
            </div>
          )}

          {detail.attribute && (
            <div className="stat-item">
              <span className="label">属性</span>
              <span className="value">{detail.attribute}</span>
            </div>
          )}

          {detail.level !== undefined && (
            <div className="stat-item">
              <span className="label">星级/阶级</span>
              <span className="value">★ {detail.level}</span>
            </div>
          )}

          {detail.type === 'monster' && (
            <>
              <div className="stat-item">
                <span className="label">攻击力 (ATK)</span>
                <span className="value" style={{ color: '#ef4444' }}>{detail.atk ?? '?'}</span>
              </div>
              <div className="stat-item">
                <span className="label">守备力 (DEF)</span>
                <span className="value" style={{ color: '#3b82f6' }}>{detail.def ?? '?'}</span>
              </div>
            </>
          )}

          <div className="stat-item">
            <span className="label">数据来源</span>
            <span className="value" style={{ color: 'var(--accent-cyan)' }}>{detail.source}</span>
          </div>
        </div>

        <div className="card-desc-box">
          {detail.desc}
        </div>

        <div className="inspector-actions">
          <button className="action-btn" onClick={handleCopyId}>
            {copiedId ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
            <span>{copiedId ? '已复制密码' : '复制密码'}</span>
          </button>

          <button className="action-btn" onClick={handleCopyDesc}>
            {copiedDesc ? <Check size={14} color="#10b981" /> : <FileCode size={14} />}
            <span>{copiedDesc ? '已复制文本' : '复制卡文'}</span>
          </button>
        </div>
          </>
        ) : (
          <section className="related-cards-panel" role="tabpanel" aria-live="polite">
            {relatedLoading ? (
              <div className="related-cards-state">
                <div className="spinner" />
                <span>正在分析卡文与系列关系…</span>
              </div>
            ) : relatedError ? (
              <div className="related-cards-state error">
                <AlertCircle size={24} />
                <span>{relatedError}</span>
                <button
                  type="button"
                  className="action-btn"
                  onClick={() => {
                    relatedCardKeyRef.current = null;
                    setRelatedRetryKey(value => value + 1);
                  }}
                >
                  重新加载
                </button>
              </div>
            ) : relatedResult && relatedResult.matches.length > 0 ? (
              <>
                <div className="related-cards-summary">
                  找到 <strong>{relatedResult.total}</strong> 张可解释关联卡片
                  {relatedResult.total > relatedResult.matches.length && `，显示前 ${relatedResult.matches.length} 张`}
                  {relatedLocalizing && <span className="related-localizing"> · 正在补充中文资料…</span>}
                </div>
                <div className="related-cards-list">
                  {relatedResult.matches.map(match => (
                    <button
                      key={match.card.id}
                      type="button"
                      className="related-card-row"
                      onClick={() => {
                        setActiveTab('detail');
                        context.setSelectedCard(match.card);
                      }}
                    >
                      <img
                        src={getChineseCardImageUrl(match.card.imageId || match.card.id, 'sc', 'half')}
                        alt=""
                        loading="lazy"
                        onError={event => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src = getChineseCardBackUrl();
                        }}
                      />
                      <span className="related-card-copy">
                        <strong>{match.card.name}</strong>
                        <small>{match.reason}</small>
                        <span className={`related-card-type type-${match.type}`}>
                          {match.type === 'mentions' && '当前卡点名'}
                          {match.type === 'mentioned-by' && '被此卡点名'}
                          {match.type === 'archetype-support' && '系列支援'}
                          {match.type === 'same-archetype' && '同系列'}
                        </span>
                      </span>
                      <ChevronRight size={17} className="related-card-chevron" />
                    </button>
                  ))}
                </div>
              </>
            ) : relatedResult ? (
              <div className="related-cards-state">
                <Network size={26} />
                <strong>暂未找到明确关联</strong>
                <span>当前版本只收录卡文点名和同系列关系，不会用属性或种族强行凑数。</span>
              </div>
            ) : null}
          </section>
        )}
      </div>
    </aside>
  );
};
