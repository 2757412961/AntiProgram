import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  Database,
  ExternalLink,
  History,
  RefreshCw,
  Search,
  ShieldAlert,
  X,
} from 'lucide-react';
import { fetchMasterDuelBanlistHistory } from '../services/banlistHistoryApi';
import {
  MasterDuelBanlistHistoryResponse,
  MasterDuelLimit,
} from '../types/banlistHistory';

interface BanlistHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCardKeyword: (keyword: string) => void;
}

function displayDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return `${year}年${month}月${day}日`;
}

function displaySyncTime(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function limitLabel(limit: MasterDuelLimit | null): string {
  if (limit === 'Forbidden') return '禁止';
  if (limit === 'Limited 1') return '限制 1';
  if (limit === 'Limited 2') return '准限制 2';
  return '—';
}

function limitClass(limit: MasterDuelLimit | null): string {
  if (limit === 'Forbidden') return 'forbidden';
  if (limit === 'Limited 1') return 'limited';
  if (limit === 'Limited 2') return 'semi-limited';
  return 'unspecified';
}

export const BanlistHistoryModal: React.FC<BanlistHistoryModalProps> = ({
  isOpen,
  onClose,
  onSelectCardKeyword,
}) => {
  const [data, setData] = useState<MasterDuelBanlistHistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const load = useCallback(async (forceRefresh: boolean, signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const result = await fetchMasterDuelBanlistHistory(forceRefresh, signal);
      if (!signal?.aborted) setData(result);
    } catch (loadError) {
      if (signal?.aborted) return;
      const message = loadError instanceof Error ? loadError.message : '未知错误';
      setError(`无法验证公告镜像数据：${message}`);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    setSelectedYear('ALL');
    setSelectedMonth('ALL');
    setSearchTerm('');
    void load(false, controller.signal);
    return () => controller.abort();
  }, [isOpen, load]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const availableYears = useMemo(() => Array.from(new Set(
    (data?.records || []).map(record => record.announcedAt.slice(0, 4)),
  )).sort((left, right) => right.localeCompare(left)), [data]);

  const availableMonths = useMemo(() => Array.from(new Set(
    (data?.records || [])
      .filter(record => selectedYear === 'ALL' || record.announcedAt.startsWith(selectedYear))
      .map(record => record.announcedAt.slice(5, 7)),
  )).sort((left, right) => right.localeCompare(left)), [data, selectedYear]);

  const filteredRecords = useMemo(() => {
    const term = searchTerm.trim().toLocaleLowerCase();
    return (data?.records || []).filter(record => {
      const date = record.announcedAt.slice(0, 10);
      if (selectedYear !== 'ALL' && date.slice(0, 4) !== selectedYear) return false;
      if (selectedMonth !== 'ALL' && date.slice(5, 7) !== selectedMonth) return false;
      if (!term) return true;
      return record.title.toLocaleLowerCase().includes(term)
        || date.includes(term)
        || record.batches.some(batch =>
          (batch.effectiveDate || '').includes(term)
          || batch.changes.some(change =>
            change.cardName.toLocaleLowerCase().includes(term)
            || limitLabel(change.from).includes(term)
            || limitLabel(change.to).includes(term)
          )
        );
    });
  }, [data, searchTerm, selectedMonth, selectedYear]);

  const visibleChangeCount = useMemo(() => filteredRecords.reduce(
    (total, record) => total + record.batches.reduce(
      (batchTotal, batch) => batchTotal + batch.changes.length,
      0,
    ),
    0,
  ), [filteredRecords]);

  if (!isOpen) return null;

  const handleCardClick = (cardName: string) => {
    onSelectCardKeyword(cardName);
    onClose();
  };

  return (
    <div className="banlist-history-overlay" onMouseDown={onClose}>
      <div
        className="banlist-history-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="banlist-history-title"
        onMouseDown={event => event.stopPropagation()}
      >
        <header className="banlist-history-header">
          <div className="banlist-history-title-wrap">
            <History size={23} aria-hidden="true" />
            <div>
              <h2 id="banlist-history-title">Master Duel 禁卡表变更记录</h2>
              <p>按公告镜像分组；同一公告可包含多个生效批次</p>
            </div>
          </div>
          <button className="banlist-history-close" onClick={onClose} aria-label="关闭禁卡表变更记录">
            <X size={19} />
          </button>
        </header>

        <div className="banlist-history-provenance" role="note">
          <ShieldAlert size={21} aria-hidden="true" />
          <div>
            <strong>来源边界：这不是 KONAMI 官方历史档案</strong>
            <p>
              KONAMI 没有公开可机器读取的完整 Master Duel 游戏内通知历史。本页仅展示
              Master Duel Meta 的第三方公告镜像，并保留每条来源；日期与状态按数据源原样显示，
              不补写、不猜测。官方原始依据仍是游戏内通知。
            </p>
          </div>
        </div>

        <div className="banlist-history-toolbar">
          <label>
            <span>公告年份</span>
            <select
              value={selectedYear}
              disabled={!data}
              onChange={event => {
                setSelectedYear(event.target.value);
                setSelectedMonth('ALL');
              }}
            >
              <option value="ALL">全部年份</option>
              {availableYears.map(year => <option key={year} value={year}>{year} 年</option>)}
            </select>
          </label>

          <label>
            <span>公告月份</span>
            <select value={selectedMonth} disabled={!data} onChange={event => setSelectedMonth(event.target.value)}>
              <option value="ALL">全部月份</option>
              {availableMonths.map(month => (
                <option key={month} value={month}>{Number(month)} 月</option>
              ))}
            </select>
          </label>

          <label className="banlist-history-search">
            <Search size={15} aria-hidden="true" />
            <input
              value={searchTerm}
              disabled={!data}
              onChange={event => setSearchTerm(event.target.value)}
              placeholder="搜索卡名、公告或日期"
              aria-label="搜索禁卡表变更记录"
            />
          </label>

          <button
            className="banlist-history-refresh"
            onClick={() => void load(true)}
            disabled={loading}
            title="重新从公告镜像同步；不会使用本地手写备用数据"
          >
            <RefreshCw size={15} className={loading ? 'banlist-history-spinning' : ''} />
            <span>重新同步</span>
          </button>
        </div>

        <main className="banlist-history-content">
          {loading && (
            <div className="banlist-history-state" aria-live="polite">
              <RefreshCw size={34} className="banlist-history-spinning" />
              <strong>正在校验并同步公告镜像…</strong>
              <span>校验失败时不会显示本地猜测数据</span>
            </div>
          )}

          {!loading && error && (
            <div className="banlist-history-state error" role="alert">
              <AlertCircle size={36} />
              <strong>已停止展示未经验证的数据</strong>
              <span>{error}</span>
              <button onClick={() => void load(true)}>重试同步</button>
            </div>
          )}

          {!loading && data && (
            <>
              <div className="banlist-history-summary">
                <div>
                  <Database size={16} />
                  <span>
                    当前筛选 <strong>{filteredRecords.length}</strong> 条公告镜像、
                    <strong>{visibleChangeCount}</strong> 项状态记录
                  </span>
                </div>
                <span>同步于 {displaySyncTime(data.generatedAt)}</span>
              </div>

              {data.warnings.length > 0 && (
                <div className="banlist-history-warnings" role="status">
                  <AlertCircle size={16} />
                  <div>
                    <strong>部分上游记录未通过校验，已拒绝展示</strong>
                    {data.warnings.map((warning, index) => <p key={`${warning}-${index}`}>{warning}</p>)}
                  </div>
                </div>
              )}

              {filteredRecords.length === 0 ? (
                <div className="banlist-history-state">
                  <Search size={34} />
                  <strong>没有符合条件的可验证记录</strong>
                </div>
              ) : filteredRecords.map(record => (
                <article className="banlist-history-record" key={record.id}>
                  <div className="banlist-history-record-head">
                    <div>
                      <div className="banlist-history-announced">
                        <CalendarDays size={15} />
                        <span>镜像记录的公告日：{displayDate(record.announcedAt)}</span>
                      </div>
                      <h3>{record.title}</h3>
                    </div>
                    <div className="banlist-history-source-actions">
                      <span className={`banlist-history-source-badge ${record.sourceKind}`}>
                        {record.sourceKind === 'article' ? '有独立来源页面' : '仅镜像 API 记录'}
                      </span>
                      {record.sourceUrl ? (
                        <a href={record.sourceUrl} target="_blank" rel="noreferrer">
                          查看第三方来源 <ExternalLink size={13} />
                        </a>
                      ) : (
                        <a href={data.source.sourceUrl} target="_blank" rel="noreferrer">
                          查看镜像数据源 <ExternalLink size={13} />
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="banlist-history-batches">
                    {record.batches.map((batch, batchIndex) => (
                      <section className="banlist-history-batch" key={`${record.id}-${batch.effectiveDate || 'unknown'}-${batchIndex}`}>
                        <div className="banlist-history-batch-head">
                          <span>生效批次 {record.batches.length > 1 ? batchIndex + 1 : ''}</span>
                          <strong>
                            {batch.effectiveDate
                              ? displayDate(batch.effectiveDate)
                              : '数据源未提供独立生效日'}
                          </strong>
                          <small>{batch.changes.length} 项</small>
                        </div>
                        <div className="banlist-history-change-grid">
                          {batch.changes.map((change, changeIndex) => (
                            <button
                              className="banlist-history-change"
                              key={`${change.cardId}-${changeIndex}`}
                              onClick={() => handleCardClick(change.cardName)}
                              title="在 Master Duel 查卡页搜索此卡"
                            >
                              <span className="banlist-history-card-name">{change.cardName}</span>
                              <span className="banlist-history-transition">
                                <span className={`limit-pill ${limitClass(change.from)}`}>{limitLabel(change.from)}</span>
                                <ArrowRight size={14} />
                                <span className={`limit-pill ${limitClass(change.to)}`}>{limitLabel(change.to)}</span>
                              </span>
                            </button>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                </article>
              ))}

              <div className="banlist-history-null-note">
                <strong>“—”的含义：</strong>
                上游镜像没有提供该侧状态。本页不会把它推断为“无限制”或“未实装”。
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};
