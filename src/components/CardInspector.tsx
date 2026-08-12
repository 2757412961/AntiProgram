import React, { useState, useEffect } from 'react';
import { YgoCard } from '../types/ygo';
import { Copy, Check, FileCode, ShieldAlert } from 'lucide-react';
import { fetchCardDetailFromYgocdb } from '../services/cardDetailService';
import { getChineseCardBackUrl, getChineseCardImageUrl } from '../services/cardDetailService';
import { useCardSearch } from '../context/CardSearchContext';

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

  useEffect(() => {
    if (card) {
      setImageVariant('sc');
      fetchCardDetailFromYgocdb(card.id, card).then(setDetail).catch(err => {
        console.warn('Failed to fetch detailed info', err);
        setDetail(card);
      });
    } else {
      setDetail(null);
    }
  }, [card]);

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
        className="inspector-preview-img"
        onError={() => setImageVariant('back')}
      />

      <div className="inspector-details">
        <div className="inspector-title">{detail.name}</div>

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
      </div>
    </aside>
  );
};
