import React, { useState } from 'react';
import { X, Gamepad2, ExternalLink, Sparkles, Trophy, Play, Zap, Flame } from 'lucide-react';

interface MinigameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartMastermind: () => void;
  onStartTank: () => void;
}

export const MinigameModal: React.FC<MinigameModalProps> = ({ isOpen, onClose, onStartMastermind, onStartTank }) => {
  const [customGameUrl, setCustomGameUrl] = useState('');

  if (!isOpen) return null;

  const handleLaunchExternal = (url: string) => {
    if (url) {
      window.open(url, '_blank');
    }
  };

  const quickGameLinks = [
    {
      id: 'tank-battle',
      title: '坦克大战 (Battle City Arcade)',
      subtitle: '经典街机复刻！操控坦克掩护老鹰基地，痛击敌方守卫！',
      badge: '经典热血',
      badgeColor: '#f59e0b',
      icon: Flame,
      action: () => {
        onClose();
        onStartTank();
      },
    },
    {
      id: 'mastermind',
      title: '珠玑妙算 (Mastermind / Bulls & Cows)',
      subtitle: '经典双人/人机密码破译桌面游戏（含 6 色与 YGO 6 属性模式）',
      badge: '热门智力',
      badgeColor: '#ec4899',
      icon: Trophy,
      action: () => {
        onClose();
        onStartMastermind();
      },
    },
    {
      id: 'ygo-pro',
      title: '在线决斗实验室',
      subtitle: '连接外部 YGO 在线小游戏或模拟器',
      badge: '外部链接',
      badgeColor: '#3b82f6',
      icon: ExternalLink,
      action: () => {
        const target = customGameUrl.trim() || 'https://mycard.moe/';
        window.open(target, '_blank');
      },
    },
    {
      id: 'puzzle-mode',
      title: '残局破解挑战',
      subtitle: '经典一回合胜负解 puzzle 绝境突破',
      badge: '拓展游戏',
      badgeColor: '#f59e0b',
      icon: Zap,
      action: () => alert('残局破解模式拓展中！'),
    },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(14px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        animation: 'fadeIn 0.25s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '620px',
          background: 'linear-gradient(145deg, rgba(20, 24, 33, 0.96), rgba(12, 15, 23, 0.98))',
          border: '1px solid rgba(139, 92, 246, 0.4)',
          borderRadius: '16px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(139, 92, 246, 0.2)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1.2rem 1.5rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.15), rgba(236, 72, 153, 0.1))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 15px rgba(139, 92, 246, 0.5)',
              }}
            >
              <Gamepad2 size={24} color="#fff" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>
                小游戏入口中心
              </h2>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#a1a1aa' }}>
                YGO Mini Game Launcher & Entrance
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: 'none',
              borderRadius: '8px',
              padding: '0.45rem',
              color: '#a1a1aa',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
              e.currentTarget.style.color = '#a1a1aa';
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.35rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <div
            style={{
              padding: '0.8rem 1rem',
              borderRadius: '10px',
              background: 'rgba(139, 92, 246, 0.08)',
              border: '1px solid rgba(139, 92, 246, 0.25)',
              fontSize: '0.85rem',
              color: '#c4b5fd',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
            }}
          >
            <Sparkles size={18} color="#a78bfa" />
            <span>可以通过此处入口前往各种游戏王趣味小游戏或体验拓展项目。</span>
          </div>

          {/* Quick Links List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {quickGameLinks.map((item) => {
              const IconComp = item.icon;
              return (
                <div
                  key={item.id}
                  onClick={item.action}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.9rem 1.1rem',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(139, 92, 246, 0.12)';
                    e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.4)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                    <div
                      style={{
                        padding: '0.55rem',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <IconComp size={18} color="#a78bfa" />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.92rem', color: '#fff' }}>
                          {item.title}
                        </span>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            padding: '0.12rem 0.4rem',
                            borderRadius: '4px',
                            background: `${item.badgeColor}22`,
                            color: item.badgeColor,
                            border: `1px solid ${item.badgeColor}55`,
                            fontWeight: 600,
                          }}
                        >
                          {item.badge}
                        </span>
                      </div>
                      <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.78rem', color: '#9ca3af' }}>
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      background: 'rgba(139, 92, 246, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Play size={13} color="#a78bfa" style={{ marginLeft: '2px' }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* External URL launcher input */}
          <div
            style={{
              marginTop: '0.2rem',
              padding: '0.9rem 1rem',
              borderRadius: '12px',
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <label
              style={{
                display: 'block',
                fontSize: '0.78rem',
                fontWeight: 600,
                color: '#d1d5db',
                marginBottom: '0.4rem',
              }}
            >
              自定义小游戏 URL 快捷打开
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="输入第三方小游戏网址 (http://...)"
                value={customGameUrl}
                onChange={(e) => setCustomGameUrl(e.target.value)}
                style={{
                  flex: 1,
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#fff',
                  fontSize: '0.82rem',
                  outline: 'none',
                }}
              />
              <button
                onClick={() => handleLaunchExternal(customGameUrl)}
                disabled={!customGameUrl.trim()}
                style={{
                  padding: '0.5rem 0.9rem',
                  borderRadius: '8px',
                  background: customGameUrl.trim()
                    ? 'linear-gradient(135deg, #8b5cf6, #ec4899)'
                    : 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  color: customGameUrl.trim() ? '#fff' : '#6b7280',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: customGameUrl.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.2s ease',
                }}
              >
                <ExternalLink size={14} />
                <span>打开</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
