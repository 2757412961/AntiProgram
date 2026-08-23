import React, { useState, useEffect } from 'react';
import {
  SearchFilters, CardMainType, GameFormat, BanStatusFilter, CacheState, DataSourceType,
  CardSortField,
} from '../types/ygo';
import { useCardSearch } from '../context/CardSearchContext';
import {
  Search, X, Filter, RotateCcw, ShieldAlert, Award, Database,
  ChevronDown, ChevronUp, Sparkles, Swords, Layers, ArrowUp, ArrowDown, ArrowUpDown, Star
} from 'lucide-react';
import { DataSourceSelector } from './DataSourceSelector';

interface SearchBarProps {
  filters?: SearchFilters;
  onFilterChange?: (newFilters: SearchFilters) => void;
  cacheState?: CacheState;
  dataSource?: DataSourceType; // 用于稀有度筛选灰显判断
}

// ── 种族列表 ─────────────────────────────────────────────
const RACES = [
  'ALL',
  '龙族', '战士族', '魔法师族', '天使族', '恶魔族', '不死族',
  '机械族', '水族', '炎族', '岩石族', '鸟兽族', '植物族',
  '昆虫族', '雷族', '鱼族', '海龙族', '爬虫类族', '兽族',
  '兽战士族', '恐龙族', '神兽族', '幻神兽族', '创造神族', '幻龙族', '电子界族',
];

// ── 怪兽小类 ──────────────────────────────────────────────
const MONSTER_SUBTYPES = [
  { value: 'ALL',      label: '全部类型' },
  { value: 'Normal',   label: '通常怪兽' },
  { value: 'Effect',   label: '效果怪兽' },
  { value: 'Fusion',   label: '融合怪兽' },
  { value: 'Synchro',  label: '同调怪兽' },
  { value: 'Xyz',      label: '超量怪兽' },
  { value: 'Link',     label: '连接怪兽' },
  { value: 'Ritual',   label: '仪式怪兽' },
  { value: 'Pendulum', label: '灵摆怪兽' },
  { value: 'Flip',     label: '反转怪兽' },
  { value: 'Toon',     label: '卡通怪兽' },
];

// ── 魔法/陷阱小类 ─────────────────────────────────────────
const SPELL_TRAP_SUBTYPES = [
  { value: 'ALL',        label: '全部小类' },
  { value: 'Normal',     label: '通常魔法/陷阱' },
  { value: 'Quick-Play', label: '速攻魔法' },
  { value: 'Continuous', label: '永续魔法/陷阱' },
  { value: 'Counter',    label: '反击陷阱' },
  { value: 'Equip',      label: '装备魔法' },
  { value: 'Field',      label: '场地魔法' },
  { value: 'Ritual',     label: '仪式魔法' },
];

const DEFAULT_FILTERS: SearchFilters = {
  keyword: '',
  sortBy: 'cardType',
  sortDirection: 'asc',
  mainType: 'all',
  attribute: 'ALL',
  level: 'ALL',
  race: 'ALL',
  format: 'MasterDuel',
  banStatus: 'all',
  rarity: 'ALL',
  monsterSubType: 'ALL',
  spellTrapSubType: 'ALL',
  atkMin: '',
  atkMax: '',
  defMin: '',
  defMax: '',
};

// 判断高级筛选是否有激活项
function hasAdvancedFilter(f: SearchFilters): boolean {
  return (
    (f.rarity !== 'ALL' && f.rarity !== '') ||
    (f.monsterSubType !== 'ALL' && f.monsterSubType !== '') ||
    (f.spellTrapSubType !== 'ALL' && f.spellTrapSubType !== '') ||
    f.atkMin !== '' || f.atkMax !== '' ||
    f.defMin !== '' || f.defMax !== ''
  );
}

// 小标题组件
const FilterSectionTitle: React.FC<{ icon: React.ReactNode; label: string; color: string }> = ({ icon, label, color }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: '0.35rem',
    fontSize: '0.72rem', fontWeight: 700, color,
    textTransform: 'uppercase', letterSpacing: '0.06em',
    marginBottom: '0.5rem',
  }}>
    {icon}<span>{label}</span>
  </div>
);

// 通用 Select 组件
const FilterSelect: React.FC<{
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
  title?: string;
}> = ({ value, onChange, disabled, children, title }) => (
  <select
    className="filter-select"
    value={value}
    disabled={disabled}
    title={title}
    onChange={e => onChange(e.target.value)}
    style={{ opacity: disabled ? 0.4 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
  >
    {children}
  </select>
);

// 数字范围输入框
const RangeInput: React.FC<{
  minVal: string; maxVal: string;
  onMinChange: (v: string) => void;
  onMaxChange: (v: string) => void;
  label: string; color: string;
}> = ({ minVal, maxVal, onMinChange, onMaxChange, label, color }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
    <div style={{ fontSize: '0.7rem', color, fontWeight: 600 }}>{label}</div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
      <input
        type="number"
        min={0}
        placeholder="最小"
        value={minVal}
        onChange={e => onMinChange(e.target.value)}
        style={{
          width: '72px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)',
          borderRadius: '6px', padding: '0.3rem 0.5rem', color: '#fff', fontSize: '0.78rem',
          outline: 'none',
        }}
      />
      <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>~</span>
      <input
        type="number"
        min={0}
        placeholder="最大"
        value={maxVal}
        onChange={e => onMaxChange(e.target.value)}
        style={{
          width: '72px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)',
          borderRadius: '6px', padding: '0.3rem 0.5rem', color: '#fff', fontSize: '0.78rem',
          outline: 'none',
        }}
      />
    </div>
  </div>
);

export const SearchBar: React.FC<SearchBarProps> = (props) => {
  const context = useCardSearch();
  const filters = props.filters ?? context.filters;
  const onFilterChange = props.onFilterChange ?? context.setFilters;
  const cacheState = props.cacheState ?? context.cacheState;
  const dataSource = props.dataSource ?? context.dataSource;
  const setDataSource = context.setDataSource;

  const [searchTerm, setSearchTerm] = useState(filters.keyword);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Keep the input in sync when another view (for example banlist history)
  // selects a card and updates the shared filter directly.
  useEffect(() => {
    setSearchTerm(filters.keyword);
  }, [filters.keyword]);

  useEffect(() => {
    const handler = setTimeout(() => {
      onFilterChange({ ...filters, keyword: searchTerm });
    }, 280);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const set = (patch: Partial<SearchFilters>) => onFilterChange({ ...filters, ...patch });

  const handleReset = () => {
    setSearchTerm('');
    onFilterChange(DEFAULT_FILTERS);
  };

  const rarityDisabled = dataSource === 'YGOCDB' && filters.format !== 'MasterDuel';

  const isBasicFiltered = !!searchTerm || filters.mainType !== 'all' ||
    filters.attribute !== 'ALL' || filters.level !== 'ALL' ||
    (filters.race !== 'ALL' && filters.race !== '') ||
    filters.banStatus !== 'all' || filters.format !== 'MasterDuel' ||
    filters.sortBy !== 'cardType' || filters.sortDirection !== 'asc';
  const isAdvFiltered = hasAdvancedFilter(filters);
  const isFiltered = isBasicFiltered || isAdvFiltered;

  return (
    <div className="search-container">
      {/* ── 第一行：搜索框 + 赛制切换 + 数据源 + 缓存状态 ── */}
      <div className="input-row" style={{ flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
        <div className="search-input-wrapper" style={{ flex: '1 1 280px' }}>
          <Search className="search-icon" size={18} />
          <input
            type="text"
            className="search-input"
            placeholder="输入卡片中文名、密码或效果关键词（例如：灰流丽 / 增殖的G / 37744402）..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => { setSearchTerm(''); set({ keyword: '' }); }}
              style={{ position: 'absolute', right: '1rem', background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* 赛制环境切换 */}
        <div className="datasource-selector" style={{ background: 'rgba(0,0,0,0.5)', padding: '3px' }}>
          {(['MasterDuel', 'OCG', 'TCG'] as GameFormat[]).map(fmt => (
            <button
              key={fmt}
              className={`ds-btn ${filters.format === fmt ? 'active' : ''}`}
              onClick={() => set({ format: fmt })}
              style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
            >
              {fmt === 'MasterDuel' && <Award size={14} color="#f59e0b" />}
              <span>{fmt === 'MasterDuel' ? 'MasterDuel 赛制' : `${fmt} 赛制`}</span>
            </button>
          ))}
        </div>

        {/* 数据源选择：仅随查卡页展示，并紧邻赛制环境 */}
        <DataSourceSelector
          currentSource={dataSource}
          onSourceChange={setDataSource}
          cacheState={cacheState}
        />

        {/* 缓存状态指示 */}
        {cacheState.status === 'loading' && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.35)',
            color: '#93c5fd', padding: '0.45rem 0.85rem',
            borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap',
          }}>
            <Database size={14} style={{ animation: 'spin 1.5s linear infinite' }} />
            <span>全量缓存中...</span>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          </div>
        )}
        {cacheState.status === 'ready' && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
            color: '#6ee7b7', padding: '0.45rem 0.85rem',
            borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap',
          }}>
            <Database size={14} color="#10b981" />
            <span>全量 {cacheState.totalCount.toLocaleString()} 张已缓存</span>
          </div>
        )}
      </div>

      {/* ── 第二行：基础筛选 + 高级筛选按钮 ── */}
      <div className="filter-row">
        {/* 卡片大类 */}
        <div className="type-pills">
          {(['all', 'monster', 'spell', 'trap'] as CardMainType[]).map(t => (
            <button
              key={t}
              className={`pill-btn ${filters.mainType === t ? `active-${t}` : ''}`}
              onClick={() => set({ mainType: t })}
            >
              {t === 'all' ? '全部' : t === 'monster' ? '怪兽卡' : t === 'spell' ? '魔法卡' : '陷阱卡'}
            </button>
          ))}
        </div>

        {/* 搜索结果整体排序 */}
        <div className="filter-group" style={{ borderColor: 'rgba(6,182,212,0.45)' }}>
          <ArrowUpDown size={14} color="var(--accent-cyan)" />
          <span className="filter-label">排序:</span>
          <select
            className="filter-select"
            value={filters.sortBy}
            onChange={e => set({ sortBy: e.target.value as CardSortField })}
            title="对全部匹配结果排序后再分页显示"
          >
            <option value="cardType">卡片类型</option>
            <option value="name">卡片名称</option>
            <option value="level">等级/阶级/连接值</option>
            <option value="atk">ATK 攻击力</option>
            <option value="def">DEF 守备力</option>
            <option value="rarity">稀有度</option>
            <option value="banStatus">禁限状态</option>
            <option value="id">卡片密码</option>
            <option value="source">相关度/数据源顺序</option>
          </select>
          <button
            className="sort-direction-btn"
            disabled={filters.sortBy === 'source'}
            onClick={() => set({ sortDirection: filters.sortDirection === 'asc' ? 'desc' : 'asc' })}
            title={filters.sortBy === 'source'
              ? '数据源顺序不支持升降序切换'
              : filters.sortDirection === 'asc' ? '当前为正序，点击切换倒序' : '当前为倒序，点击切换正序'}
            aria-label={filters.sortDirection === 'asc' ? '切换为倒序' : '切换为正序'}
          >
            {filters.sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
            <span>{filters.sortDirection === 'asc' ? '正序' : '倒序'}</span>
          </button>
        </div>

        {/* 禁卡状态 */}
        <div className="filter-group" style={{ borderColor: filters.banStatus !== 'all' ? 'var(--accent-pink)' : undefined }}>
          <ShieldAlert size={14} color="var(--accent-pink)" />
          <span className="filter-label">禁卡状态:</span>
          <select className="filter-select" value={filters.banStatus} onChange={e => set({ banStatus: e.target.value as BanStatusFilter })}>
            <option value="all">全部</option>
            <option value="forbidden">🔴 禁止</option>
            <option value="limited">🟠 限制</option>
            <option value="semi-limited">🟡 准限制</option>
            <option value="unlimited">🟢 无限制</option>
          </select>
        </div>

        {/* 属性 */}
        <div className="filter-group">
          <Filter size={14} color="var(--accent-cyan)" />
          <span className="filter-label">属性:</span>
          <select className="filter-select" value={filters.attribute} onChange={e => set({ attribute: e.target.value })}>
            <option value="ALL">全部属性</option>
            {['DARK', 'LIGHT', 'FIRE', 'WATER', 'EARTH', 'WIND', 'DIVINE'].map(a => (
              <option key={a} value={a}>
                {a === 'DARK' ? '暗' : a === 'LIGHT' ? '光' : a === 'FIRE' ? '炎' :
                  a === 'WATER' ? '水' : a === 'EARTH' ? '地' : a === 'WIND' ? '风' : '神'} ({a})
              </option>
            ))}
          </select>
        </div>

        {/* 种族 */}
        <div className="filter-group" style={{ borderColor: filters.race !== 'ALL' ? '#34d399' : undefined }}>
          <Filter size={14} color="#34d399" />
          <span className="filter-label">种族:</span>
          <select className="filter-select" value={filters.race} onChange={e => set({ race: e.target.value })}>
            <option value="ALL">全部种族</option>
            {RACES.filter(r => r !== 'ALL').map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {/* 星级 */}
        <div className="filter-group">
          <Star size={14} color="#fbbf24" />
          <span className="filter-label">星级:</span>
          <select className="filter-select" value={filters.level} onChange={e => set({ level: e.target.value })}>
            <option value="ALL">全部星级</option>
            {Array.from({ length: 13 }, (_, i) => (i + 1).toString()).map(lvl => (
              <option key={lvl} value={lvl}>{lvl} 星/阶/↗</option>
            ))}
          </select>
        </div>

        {/* 高级筛选开关按钮 */}
        <button
          onClick={() => setAdvancedOpen(p => !p)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.4rem 0.85rem', borderRadius: 'var(--radius-sm)',
            fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
            border: isAdvFiltered
              ? '1px solid rgba(167,139,250,0.6)'
              : advancedOpen
              ? '1px solid var(--border-color)'
              : '1px solid var(--border-color)',
            background: isAdvFiltered
              ? 'rgba(167,139,250,0.15)'
              : advancedOpen
              ? 'rgba(255,255,255,0.08)'
              : 'rgba(255,255,255,0.04)',
            color: isAdvFiltered ? '#c4b5fd' : 'var(--text-muted)',
            boxShadow: isAdvFiltered ? '0 0 12px rgba(167,139,250,0.25)' : 'none',
            transition: 'all 0.2s ease',
          }}
        >
          <Sparkles size={14} />
          <span>高级筛选</span>
          {isAdvFiltered && (
            <span style={{
              background: '#7c3aed', color: '#fff',
              fontSize: '0.62rem', fontWeight: 800,
              padding: '1px 5px', borderRadius: '99px',
            }}>
              已激活
            </span>
          )}
          {advancedOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        {/* 重置按钮 */}
        <button
          onClick={handleReset}
          style={{
            marginLeft: 'auto',
            background: isFiltered ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.05)',
            border: isFiltered ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid var(--border-color)',
            color: isFiltered ? '#f87171' : 'var(--text-muted)',
            padding: '0.4rem 0.85rem', borderRadius: 'var(--radius-sm)',
            fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            transition: 'all 0.2s ease',
          }}
          title="重置所有搜索与筛选条件"
        >
          <RotateCcw size={14} />
          <span>重置条件</span>
        </button>
      </div>

      {/* ── 第三行：高级筛选面板（可折叠） ── */}
      {advancedOpen && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '1rem',
          padding: '1rem 1.1rem',
          background: 'rgba(167,139,250,0.04)',
          border: '1px solid rgba(167,139,250,0.18)',
          borderRadius: '10px',
          marginTop: '0.1rem',
          animation: 'fadeInDown 0.2s ease',
        }}>
          <style>{`
            @keyframes fadeInDown {
              from { opacity: 0; transform: translateY(-8px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>

          {/* 怪兽小类 */}
          <div>
            <FilterSectionTitle icon={<Swords size={12} />} label="怪兽小类" color="#f59e0b" />
            <div className="filter-group" style={{ borderColor: filters.monsterSubType !== 'ALL' ? '#f59e0b' : undefined }}>
              <FilterSelect value={filters.monsterSubType} onChange={v => set({ monsterSubType: v })}>
                {MONSTER_SUBTYPES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </FilterSelect>
            </div>
          </div>

          {/* 魔陷小类 */}
          <div>
            <FilterSectionTitle icon={<Layers size={12} />} label="魔法/陷阱小类" color="#60a5fa" />
            <div className="filter-group" style={{ borderColor: filters.spellTrapSubType !== 'ALL' ? '#60a5fa' : undefined }}>
              <FilterSelect value={filters.spellTrapSubType} onChange={v => set({ spellTrapSubType: v })}>
                {SPELL_TRAP_SUBTYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </FilterSelect>
            </div>
          </div>

          {/* 稀有度 */}
          <div>
            <FilterSectionTitle icon={<Sparkles size={12} />} label="稀有度" color="#f472b6" />
            <div
              className="filter-group"
              style={{ borderColor: filters.rarity !== 'ALL' && !rarityDisabled ? '#f472b6' : undefined }}
              title={rarityDisabled ? '百鸽数据源不提供该赛制的稀有度数据' : undefined}
            >
              <FilterSelect
                value={filters.rarity}
                onChange={v => set({ rarity: v })}
                disabled={rarityDisabled}
                title={rarityDisabled ? '百鸽数据源不支持该赛制的稀有度筛选' : undefined}
              >
                <option value="ALL">全部稀有度</option>
                <option value="N">N</option>
                <option value="R">R</option>
                <option value="SR">SR</option>
                <option value="UR">UR</option>
              </FilterSelect>
              {rarityDisabled && (
                <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginLeft: '0.3rem', whiteSpace: 'nowrap' }}>
                  （不支持）
                </span>
              )}
            </div>
          </div>

          {/* ATK 范围 */}
          <div>
            <FilterSectionTitle icon={<span style={{ fontSize: '11px' }}>⚔️</span>} label="ATK 攻击力范围" color="#ef4444" />
            <RangeInput
              label=""
              color="#ef4444"
              minVal={filters.atkMin}
              maxVal={filters.atkMax}
              onMinChange={v => set({ atkMin: v })}
              onMaxChange={v => set({ atkMax: v })}
            />
          </div>

          {/* DEF 范围 */}
          <div>
            <FilterSectionTitle icon={<span style={{ fontSize: '11px' }}>🛡️</span>} label="DEF 守备力范围" color="#3b82f6" />
            <RangeInput
              label=""
              color="#3b82f6"
              minVal={filters.defMin}
              maxVal={filters.defMax}
              onMinChange={v => set({ defMin: v })}
              onMaxChange={v => set({ defMax: v })}
            />
          </div>
        </div>
      )}
    </div>
  );
};
