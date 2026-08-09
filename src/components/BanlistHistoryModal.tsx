import React, { useEffect, useMemo, useState } from 'react';
import { GameFormat } from '../types/ygo';
import { BANLIST_HISTORY_DATA } from '../services/banlistHistoryData';
import { X, Calendar, History, Award, AlertCircle, ArrowRight, Filter, Search } from 'lucide-react';

interface BanlistHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFormat: GameFormat;
  onSelectCardKeyword: (keyword: string) => void;
}

interface GitHubContentItem {
  name?: string;
  type?: string;
}

const MASTER_DUEL_ARCHIVE_API =
  'https://api.github.com/repos/DawnbrandBots/yaml-yugi-limit-regulation/contents/data/master-duel?ref=master';
const MASTER_DUEL_ARCHIVE_CDN =
  'https://dawnbrandbots.github.io/yaml-yugi-limit-regulation/master-duel';

function getDateParts(title: string, effectiveDate: string) {
  const text = `${title} ${effectiveDate}`;
  return {
    year: text.match(/(20\d{2})年/)?.[1],
    month: text.match(/20\d{2}年\s*(\d{1,2})月/)?.[1],
  };
}

export const BanlistHistoryModal: React.FC<BanlistHistoryModalProps> = ({
  isOpen,
  onClose,
  currentFormat,
  onSelectCardKeyword
}) => {
  const [selectedFormat, setSelectedFormat] = useState<GameFormat>(currentFormat);
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [modalSearchTerm, setModalSearchTerm] = useState<string>('');
  const [archiveDates, setArchiveDates] = useState<string[]>([]);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [selectedSnapshotDate, setSelectedSnapshotDate] = useState('');
  const [snapshot, setSnapshot] = useState<Record<string, number> | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedFormat(currentFormat);
      setSelectedYear('ALL');
      setSelectedMonth('ALL');
    }
  }, [currentFormat, isOpen]);

  useEffect(() => {
    if (!isOpen || selectedFormat !== 'MasterDuel') return;
    let cancelled = false;
    setArchiveLoading(true);
    setArchiveError(null);
    fetch(MASTER_DUEL_ARCHIVE_API)
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<GitHubContentItem[]>;
      })
      .then(items => {
        if (cancelled || !Array.isArray(items)) return;
        const dates = items
          .filter(item => item.type === 'file' && /^\d{4}-\d{2}-\d{2}\.name\.json$/.test(item.name || ''))
          .map(item => item.name!.slice(0, 10))
          .sort((a, b) => b.localeCompare(a));
        setArchiveDates(dates);
        if (dates.length === 0) setArchiveError('远程档案中没有找到可用版本');
      })
      .catch(error => {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : '未知错误';
          setArchiveError(`完整月表档案加载失败：${message}`);
        }
      })
      .finally(() => { if (!cancelled) setArchiveLoading(false); });
    return () => { cancelled = true; };
  }, [isOpen, selectedFormat]);

  const availableYears = useMemo(() => Array.from(new Set(
    selectedFormat === 'MasterDuel' && archiveDates.length > 0
      ? archiveDates.map(date => date.slice(0, 4))
      : BANLIST_HISTORY_DATA
          .filter(item => item.format === selectedFormat)
          .map(item => getDateParts(item.versionTitle, item.effectiveDate).year)
          .filter((year): year is string => Boolean(year))
  )).sort((a, b) => Number(b) - Number(a)), [archiveDates, selectedFormat]);

  const availableMonths = useMemo(() => Array.from(new Set(
    selectedFormat === 'MasterDuel' && archiveDates.length > 0
      ? archiveDates
          .filter(date => selectedYear === 'ALL' || date.slice(0, 4) === selectedYear)
          .map(date => String(Number(date.slice(5, 7))))
      : BANLIST_HISTORY_DATA
          .filter(item => {
            if (item.format !== selectedFormat) return false;
            const { year } = getDateParts(item.versionTitle, item.effectiveDate);
            return selectedYear === 'ALL' || year === selectedYear;
          })
          .map(item => getDateParts(item.versionTitle, item.effectiveDate).month)
          .filter((month): month is string => Boolean(month))
  )).sort((a, b) => Number(b) - Number(a)), [archiveDates, selectedFormat, selectedYear]);

  const matchingArchiveDates = useMemo(() => archiveDates.filter(date =>
    (selectedYear === 'ALL' || date.slice(0, 4) === selectedYear) &&
    (selectedMonth === 'ALL' || String(Number(date.slice(5, 7))) === selectedMonth)
  ), [archiveDates, selectedMonth, selectedYear]);

  useEffect(() => {
    if (selectedFormat !== 'MasterDuel') return;
    if (!matchingArchiveDates.includes(selectedSnapshotDate)) {
      setSelectedSnapshotDate(matchingArchiveDates[0] || '');
    }
  }, [matchingArchiveDates, selectedFormat, selectedSnapshotDate]);

  useEffect(() => {
    if (!isOpen || selectedFormat !== 'MasterDuel' || !selectedSnapshotDate) {
      setSnapshot(null);
      return;
    }
    let cancelled = false;
    setSnapshotLoading(true);
    setArchiveError(null);
    fetch(`${MASTER_DUEL_ARCHIVE_CDN}/${selectedSnapshotDate}.name.json`)
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<Record<string, number>>;
      })
      .then(data => { if (!cancelled) setSnapshot(data); })
      .catch(error => {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : '未知错误';
          setArchiveError(`版本 ${selectedSnapshotDate} 加载失败：${message}`);
          setSnapshot(null);
        }
      })
      .finally(() => { if (!cancelled) setSnapshotLoading(false); });
    return () => { cancelled = true; };
  }, [isOpen, selectedFormat, selectedSnapshotDate]);

  if (!isOpen) return null;

  // 过滤出选定赛制格式与年份、月度的历史改订记录
  const historyList = BANLIST_HISTORY_DATA.filter(item => {
    if (item.format !== selectedFormat) return false;
    const { year, month } = getDateParts(item.versionTitle, item.effectiveDate);
    if (selectedYear !== 'ALL' && year !== selectedYear) return false;
    if (selectedMonth !== 'ALL' && month !== selectedMonth) return false;
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

  const snapshotSections = snapshot ? [
    { label: '禁止', limit: 0, color: '#ef4444', background: 'rgba(239,68,68,0.1)' },
    { label: '限制', limit: 1, color: '#f97316', background: 'rgba(249,115,22,0.1)' },
    { label: '准限制', limit: 2, color: '#f59e0b', background: 'rgba(245,158,11,0.1)' },
  ].map(section => ({
    ...section,
    names: Object.entries(snapshot)
      .filter(([, limit]) => limit === section.limit)
      .map(([name]) => name)
      .sort((a, b) => a.localeCompare(b)),
  })) : [];

  const handleCardClick = (cardName: string) => {
    onSelectCardKeyword(cardName);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 500,
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
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>禁卡表历史改订档案</h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>
                按生效年月查看项目已收录的 Master Duel / OCG / TCG 改订记录
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
              onClick={() => { setSelectedFormat('MasterDuel'); setSelectedYear('ALL'); setSelectedMonth('ALL'); }}
            >
              <Award size={14} color="#f59e0b" />
              <span>Master Duel 历史改订</span>
            </button>

            <button
              className={`ds-btn ${selectedFormat === 'OCG' ? 'active' : ''}`}
              onClick={() => { setSelectedFormat('OCG'); setSelectedYear('ALL'); setSelectedMonth('ALL'); }}
            >
              <span>OCG 官方卡表</span>
            </button>

            <button
              className={`ds-btn ${selectedFormat === 'TCG' ? 'active' : ''}`}
              onClick={() => { setSelectedFormat('TCG'); setSelectedYear('ALL'); setSelectedMonth('ALL'); }}
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
                onChange={(e) => { setSelectedYear(e.target.value); setSelectedMonth('ALL'); }}
              >
                <option value="ALL">全部年份</option>
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}年</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <Calendar size={14} color="var(--accent-cyan)" />
              <span className="filter-label">月份:</span>
              <select
                className="filter-select"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                <option value="ALL">全部月份</option>
                {availableMonths.map(month => (
                  <option key={month} value={month}>{Number(month)}月</option>
                ))}
              </select>
            </div>

            {selectedFormat === 'MasterDuel' && (
              <div className="filter-group">
                <History size={14} color="var(--accent-gold)" />
                <span className="filter-label">版本:</span>
                <select
                  className="filter-select"
                  value={selectedSnapshotDate}
                  disabled={archiveLoading || matchingArchiveDates.length === 0}
                  onChange={(e) => setSelectedSnapshotDate(e.target.value)}
                >
                  {matchingArchiveDates.length === 0 && <option value="">暂无版本</option>}
                  {matchingArchiveDates.map(date => (
                    <option key={date} value={date}>{date}</option>
                  ))}
                </select>
              </div>
            )}

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
          {selectedFormat === 'MasterDuel' && (
            <div style={{
              background: 'linear-gradient(145deg, rgba(6,182,212,0.08), rgba(245,158,11,0.06))',
              border: '1px solid rgba(6,182,212,0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: '1rem' }}>
                    Master Duel 完整禁限快照
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    当前选择版本：{selectedSnapshotDate || '等待远程档案'} · 这是该版本完整卡表，不只是当期变化
                  </div>
                </div>
                {(archiveLoading || snapshotLoading) && (
                  <span style={{ color: 'var(--accent-cyan)', fontSize: '0.78rem' }}>正在加载…</span>
                )}
              </div>

              {archiveError && (
                <div style={{ color: '#fbbf24', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                  <AlertCircle size={14} style={{ verticalAlign: 'middle', marginRight: '0.35rem' }} />
                  {archiveError}
                </div>
              )}

              {snapshotSections.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
                  {snapshotSections.map(section => (
                    <div key={section.limit} style={{
                      background: section.background,
                      border: `1px solid ${section.color}55`,
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.8rem',
                      maxHeight: '260px',
                      overflowY: 'auto',
                    }}>
                      <div style={{ color: section.color, fontWeight: 800, fontSize: '0.82rem', marginBottom: '0.55rem' }}>
                        {section.label}（{section.names.length}张）
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        {section.names.map(name => (
                          <button
                            key={name}
                            onClick={() => handleCardClick(name)}
                            style={{
                              background: 'none', border: 'none', padding: 0,
                              color: '#e5e7eb', textAlign: 'left', cursor: 'pointer',
                              fontSize: '0.76rem', lineHeight: 1.35,
                            }}
                            title="点击在当前禁卡表中搜索"
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedFormat === 'MasterDuel' && historyList.length > 0 && (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 700 }}>
              项目内置改订摘要
            </div>
          )}

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
                    📢 数据说明：{item.notes}
                  </p>
                )}

                {/* 变动卡牌区块 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem' }}>
                  {/* 新禁止 0张 */}
                  {item.changes.newForbidden.length > 0 && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-sm)', padding: '0.75rem' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ef4444', marginBottom: '0.5rem' }}>
                        🔴 新增/维持禁止 ({item.changes.newForbidden.length}张)
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
                        🟠 新增限制 ({item.changes.newLimited.length}张)
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
                        🟡 新增准限制 ({item.changes.newSemiLimited.length}张)
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
                        🟢 解除限制/无限制 ({item.changes.newUnlimited.length}张)
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
                  {item.changes.newForbidden.length === 0 &&
                    item.changes.newLimited.length === 0 &&
                    item.changes.newSemiLimited.length === 0 &&
                    item.changes.newUnlimited.length === 0 && (
                      <div style={{
                        gridColumn: '1 / -1',
                        color: 'var(--text-dim)',
                        fontSize: '0.82rem',
                        padding: '0.75rem',
                        border: '1px dashed var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                      }}>
                        该期仅收录了生效日期，具体卡牌变动尚待补充核对。
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
