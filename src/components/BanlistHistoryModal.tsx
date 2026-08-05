import React, { useState } from 'react';
import { GameFormat } from '../types/ygo';
import { BANLIST_HISTORY_DATA } from '../services/banlistHistoryData';
import { X, Calendar, History, Award, AlertCircle, ArrowRight, Filter, Search } from 'lucide-react';

interface BanlistHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFormat: GameFormat;
  onSelectCardKeyword: (keyword: string) => void;
}

export const BanlistHistoryModal: React.FC<BanlistHistoryModalProps> = ({
  isOpen,
  onClose,
  currentFormat,
  onSelectCardKeyword
}) => {
  const [selectedFormat, setSelectedFormat] = useState<GameFormat>(currentFormat);
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [modalSearchTerm, setModalSearchTerm] = useState<string>('');

  if (!isOpen) return null;

  // 过滤出选定赛制格式与年份、月度的历史改订记录
  const historyList = BANLIST_HISTORY_DATA.filter(item => {
    if (item.format !== selectedFormat) return false;
    if (selectedYear !== 'ALL' && !item.versionTitle.includes(selectedYear)) return false;
    if (modalSearchTerm) {
      const term = modalSearchTerm.toLowerCase();
      const matchTitle = item.versionTitle.toLowerCase().includes(term);
      const matchDate = item.effectiveDate.toLowerCase().includes(term);
      const matchNotes = item.notes?.toLowerCase().includes(term);
      const matchCards = [
        ...item.changes.newForbidden,
        ...item.changes.newLimited,
        ...item.changes.newSemiLimited,
        ...item.changes.newUnlimited
      ].some(c => c.name.toLowerCase().includes(term));

      if (!matchTitle && !matchDate && !matchNotes && !matchCards) return false;
    }
    return true;
  });

  const handleCardClick = (cardName: string) => {
    onSelectCardKeyword(cardName);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          width: '100%',
          maxWidth: '980px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal 顶栏 */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(0, 0, 0, 0.3)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <History size={22} color="var(--accent-gold)" />
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>Konami 官方禁卡表历史公告档案</h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>
                MasterDuel 自 2022年1月全球开服起 Konami 官方发布的每一期真实改订公告全收录
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              color: '#aaa',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* 赛制切换 Tab (MasterDuel 官方改订全量 / OCG / TCG) 与年份搜索 */}
        <div style={{ padding: '1rem 1.5rem 0.5rem 1.5rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', background: 'rgba(0,0,0,0.15)' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className={`ds-btn ${selectedFormat === 'MasterDuel' ? 'active' : ''}`}
              onClick={() => setSelectedFormat('MasterDuel')}
            >
              <Award size={14} color="#f59e0b" />
              <span>MasterDuel 官方发布全表 (2022-2026)</span>
            </button>

            <button
              className={`ds-btn ${selectedFormat === 'OCG' ? 'active' : ''}`}
              onClick={() => setSelectedFormat('OCG')}
            >
              <span>OCG 官方卡表</span>
            </button>

            <button
              className={`ds-btn ${selectedFormat === 'TCG' ? 'active' : ''}`}
              onClick={() => setSelectedFormat('TCG')}
            >
              <span>TCG 官方卡表</span>
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {/* 年份选择 */}
            <div className="filter-group">
              <Filter size={14} color="var(--accent-gold)" />
              <span className="filter-label">年份:</span>
              <select
                className="filter-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                <option value="ALL">全部年份 (2022-2026)</option>
                <option value="2026年">2026年</option>
                <option value="2025年">2025年</option>
                <option value="2024年">2024年</option>
                <option value="2023年">2023年</option>
                <option value="2022年">2022年 (开服元年)</option>
              </select>
            </div>

            {/* 搜卡搜索框 */}
            <div className="search-input-wrapper" style={{ minWidth: '180px' }}>
              <Search className="search-icon" size={14} />
              <input
                type="text"
                className="search-input"
                style={{ padding: '0.4rem 0.6rem 0.4rem 2rem', fontSize: '0.8rem' }}
                placeholder="搜索改订卡名或日期..."
                value={modalSearchTerm}
                onChange={(e) => setModalSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* 历史改订时间轴内容区域 */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {historyList.length === 0 ? (
            <div className="state-box">
              <AlertCircle size={36} color="var(--text-muted)" />
              <p>暂无符合条件的历史改订纪录数据</p>
            </div>
          ) : (
            historyList.map((item) => (
              <div
                key={item.id}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem'
                }}
              >
                {/* 改订表版本标题与日期 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.75rem' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                    {item.versionTitle}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <Calendar size={14} />
                    <span>{item.effectiveDate}</span>
                  </div>
                </div>

                {item.notes && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    📢 Konami 公告说明: {item.notes}
                  </p>
                )}

                {/* 变动卡牌区块 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem' }}>
                  {/* 新禁止 0张 */}
                  {item.changes.newForbidden.length > 0 && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-sm)', padding: '0.75rem' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ef4444', marginBottom: '0.5rem' }}>
                        🔴 新增/维持禁止 (0张)
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {item.changes.newForbidden.map((card, idx) => (
                          <div
                            key={`${card.id}-${idx}`}
                            onClick={() => handleCardClick(card.name)}
                            style={{ fontSize: '0.8rem', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                            title="点击在搜索器中定位此卡"
                          >
                            <span>{card.name}</span>
                            <ArrowRight size={12} color="#888" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 新限制 1张 (橙色) */}
                  {item.changes.newLimited.length > 0 && (
                    <div style={{ background: 'rgba(249, 115, 22, 0.1)', border: '1px solid rgba(249, 115, 22, 0.3)', borderRadius: 'var(--radius-sm)', padding: '0.75rem' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#f97316', marginBottom: '0.5rem' }}>
                        🟠 新增限制 (1张)
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {item.changes.newLimited.map((card, idx) => (
                          <div
                            key={`${card.id}-${idx}`}
                            onClick={() => handleCardClick(card.name)}
                            style={{ fontSize: '0.8rem', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                            title="点击在搜索器中定位此卡"
                          >
                            <span>{card.name}</span>
                            <ArrowRight size={12} color="#888" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 新准限制 2张 (黄色) */}
                  {item.changes.newSemiLimited.length > 0 && (
                    <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 'var(--radius-sm)', padding: '0.75rem' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#f59e0b', marginBottom: '0.5rem' }}>
                        🟡 新增准限制 (2张)
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {item.changes.newSemiLimited.map((card, idx) => (
                          <div
                            key={`${card.id}-${idx}`}
                            onClick={() => handleCardClick(card.name)}
                            style={{ fontSize: '0.8rem', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                            title="点击在搜索器中定位此卡"
                          >
                            <span>{card.name}</span>
                            <ArrowRight size={12} color="#888" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 新无限制 3张 */}
                  {item.changes.newUnlimited.length > 0 && (
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-sm)', padding: '0.75rem' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#10b981', marginBottom: '0.5rem' }}>
                        🟢 解除限制/无限制 (3张)
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {item.changes.newUnlimited.map((card, idx) => (
                          <div
                            key={`${card.id}-${idx}`}
                            onClick={() => handleCardClick(card.name)}
                            style={{ fontSize: '0.8rem', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                            title="点击在搜索器中定位此卡"
                          >
                            <span>{card.name}</span>
                            <ArrowRight size={12} color="#888" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
