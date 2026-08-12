import React from 'react';
import { BookOpen, GalleryHorizontalEnd, Sparkles } from 'lucide-react';
import type { PrimaryView } from '../App';

interface PrimarySidebarProps {
  activeView: PrimaryView;
  onViewChange: (view: PrimaryView) => void;
}

const ITEMS: Array<{
  id: PrimaryView;
  label: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    id: 'cards',
    label: '查卡',
    description: '检索卡片与禁限状态',
    icon: <BookOpen size={19} />,
  },
  {
    id: 'deck-plaza',
    label: '卡组广场',
    description: '发现近期热门构筑',
    icon: <GalleryHorizontalEnd size={19} />,
  },
];

export const PrimarySidebar: React.FC<PrimarySidebarProps> = ({ activeView, onViewChange }) => (
  <aside className="primary-sidebar" aria-label="主要功能导航">
    <div className="primary-sidebar-heading">
      <span>DISCOVER</span>
      <strong>功能导航</strong>
    </div>

    <nav className="primary-sidebar-nav">
      {ITEMS.map(item => (
        <button
          key={item.id}
          className={activeView === item.id ? 'active' : ''}
          onClick={() => onViewChange(item.id)}
          aria-current={activeView === item.id ? 'page' : undefined}
        >
          <span className="primary-sidebar-icon">{item.icon}</span>
          <span className="primary-sidebar-copy">
            <strong>{item.label}</strong>
            <small>{item.description}</small>
          </span>
        </button>
      ))}
    </nav>

    <div className="primary-sidebar-foot">
      <Sparkles size={15} />
      <span>数据来源与统计口径均可追溯</span>
    </div>
  </aside>
);
