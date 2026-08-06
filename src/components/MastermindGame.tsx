import React, { useState, useEffect, useCallback } from 'react';
import { Shield, RefreshCw, Trophy, HelpCircle, ArrowLeft, Eye, EyeOff, Check, Sparkles, User, Bot, Layers } from 'lucide-react';
import {
  PegTheme, PegOption, CLASSIC_PEGS, YGO_PEGS, GuessRow, calculateFeedback
} from '../hooks/useMastermind';
export type { PegTheme, PegOption, GuessRow };
export { CLASSIC_PEGS, YGO_PEGS, calculateFeedback };

interface MastermindGameProps {
  onClose: () => void;
}

export const MastermindGame: React.FC<MastermindGameProps> = ({ onClose }) => {
  const [theme, setTheme] = useState<PegTheme>('classic');
  const [allowDuplicates, setAllowDuplicates] = useState<boolean>(false);
  const [isVsAi, setIsVsAi] = useState<boolean>(true);
  
  // 双人模式下：'setting' 表示出题阶段，'playing' 表示破译阶段
  const [setupStage, setSetupStage] = useState<'setting' | 'playing'>('playing');
  const [customSecret, setCustomSecret] = useState<(string | null)[]>([null, null, null, null]);

  const [secretCode, setSecretCode] = useState<string[]>([]);
  const [history, setHistory] = useState<GuessRow[]>([]);
  const [currentGuess, setCurrentGuess] = useState<(string | null)[]>([null, null, null, null]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');
  const [showRules, setShowRules] = useState<boolean>(false);
  const [stats, setStats] = useState({ wins: 0, total: 0 });

  const activePegs = theme === 'classic' ? CLASSIC_PEGS : YGO_PEGS;

  // 生成 AI 随机密码
  const generateRandomSecret = useCallback((allowDup: boolean) => {
    const pegs = theme === 'classic' ? CLASSIC_PEGS : YGO_PEGS;
    const code: string[] = [];
    const pool = [...pegs];

    for (let i = 0; i < 4; i++) {
      if (allowDup) {
        const randomIndex = Math.floor(Math.random() * pegs.length);
        code.push(pegs[randomIndex].id);
      } else {
        const randomIndex = Math.floor(Math.random() * pool.length);
        code.push(pool[randomIndex].id);
        pool.splice(randomIndex, 1);
      }
    }
    return code;
  }, [theme]);

  // 初始化重置游戏
  const startNewGame = useCallback(() => {
    if (isVsAi) {
      const newSecret = generateRandomSecret(allowDuplicates);
      setSecretCode(newSecret);
      setSetupStage('playing');
    } else {
      setSetupStage('setting');
      setCustomSecret([null, null, null, null]);
      setSecretCode([]);
    }
    setHistory([]);
    setCurrentGuess([null, null, null, null]);
    setSelectedIndex(0);
    setGameState('playing');
  }, [isVsAi, allowDuplicates, generateRandomSecret]);

  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  // 双人模式提交出题密码
  const handleConfirmCustomSecret = () => {
    if (customSecret.every((p) => p !== null)) {
      setSecretCode(customSecret as string[]);
      setSetupStage('playing');
      setHistory([]);
      setCurrentGuess([null, null, null, null]);
      setSelectedIndex(0);
      setGameState('playing');
    }
  };

  // 在当前槽位选择棋子
  const handleSelectPeg = (pegId: string) => {
    if (gameState !== 'playing' || setupStage === 'setting') return;

    const newGuess = [...currentGuess];
    newGuess[selectedIndex] = pegId;
    setCurrentGuess(newGuess);

    // 自动跳到下一个未填写的槽位
    const nextEmpty = newGuess.findIndex((p, idx) => idx > selectedIndex && p === null);
    if (nextEmpty !== -1) {
      setSelectedIndex(nextEmpty);
    } else {
      const anyEmpty = newGuess.findIndex((p) => p === null);
      if (anyEmpty !== -1) setSelectedIndex(anyEmpty);
    }
  };

  // 提交当前猜测
  const handleSubmitGuess = () => {
    if (currentGuess.some((p) => p === null) || gameState !== 'playing') return;

    const guess = currentGuess as string[];
    const { bulls, cows } = calculateFeedback(secretCode, guess);

    const newRow: GuessRow = {
      pegs: guess,
      bulls,
      cows,
      isSubmitted: true,
    };

    const newHistory = [...history, newRow];
    setHistory(newHistory);
    setCurrentGuess([null, null, null, null]);
    setSelectedIndex(0);

    // 判定胜负
    if (bulls === 4) {
      setGameState('won');
      setStats((prev) => ({ wins: prev.wins + 1, total: prev.total + 1 }));
    } else if (newHistory.length >= 10) {
      setGameState('lost');
      setStats((prev) => ({ ...prev, total: prev.total + 1 }));
    }
  };

  // 渲染单个棋子/指示物
  const renderPeg = (pegId: string | null, size = '36px') => {
    if (!pegId) {
      return (
        <div
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            background: 'rgba(0, 0, 0, 0.4)',
            border: '2px dashed rgba(255, 255, 255, 0.2)',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.6)',
          }}
        />
      );
    }

    const pegInfo = activePegs.find((p) => p.id === pegId);
    if (!pegInfo) return null;

    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: pegInfo.bgGradient,
          boxShadow: `0 3px 8px ${pegInfo.color}66, inset 0 2px 3px rgba(255,255,255,0.6)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1rem',
          userSelect: 'none',
          transition: 'transform 0.15s ease',
        }}
        title={pegInfo.name}
      >
        {pegInfo.icon && <span>{pegInfo.icon}</span>}
      </div>
    );
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at 50% 20%, #1e1b4b, #0f172a 70%)',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '1rem',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* 顶栏控制区域 */}
      <header
        style={{
          width: '100%',
          maxWidth: '780px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.8rem 1.2rem',
          background: 'rgba(30, 41, 59, 0.7)',
          backdropFilter: 'blur(12px)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          marginBottom: '1.2rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}
      >
        <button
          onClick={onClose}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            color: '#cbd5e1',
            padding: '0.5rem 0.9rem',
            borderRadius: '10px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.85rem',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
        >
          <ArrowLeft size={16} />
          <span>返回查卡器</span>
        </button>

        <div style={{ textAlign: 'center' }}>
          <h1
            style={{
              margin: 0,
              fontSize: '1.25rem',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #a78bfa, #f472b6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            <Shield size={22} color="#a78bfa" />
            <span>珠玑妙算 • Mastermind</span>
          </h1>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>逻辑推理密码破译游戏</span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setShowRules(!showRules)}
            style={{
              background: 'rgba(167, 139, 250, 0.15)',
              border: '1px solid rgba(167, 139, 250, 0.3)',
              color: '#c4b5fd',
              padding: '0.5rem',
              borderRadius: '10px',
              cursor: 'pointer',
            }}
            title="规则说明"
          >
            <HelpCircle size={18} />
          </button>
          <button
            onClick={startNewGame}
            style={{
              background: 'rgba(244, 114, 182, 0.15)',
              border: '1px solid rgba(244, 114, 182, 0.3)',
              color: '#fbcfe8',
              padding: '0.5rem 0.8rem',
              borderRadius: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
            title="重新开始"
          >
            <RefreshCw size={16} />
            <span>重开</span>
          </button>
        </div>
      </header>

      {/* 规则说明弹窗 */}
      {showRules && (
        <div
          style={{
            width: '100%',
            maxWidth: '780px',
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(167, 139, 250, 0.4)',
            borderRadius: '14px',
            padding: '1.2rem 1.5rem',
            marginBottom: '1.2rem',
            fontSize: '0.88rem',
            lineHeight: '1.6',
            color: '#e2e8f0',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          }}
        >
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#c4b5fd', fontSize: '1rem' }}>🎮 规则指南：</h3>
          <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
            <li><b>出题</b>：出题者在挡板后隐藏设置 4 个颜色/属性棋子。</li>
            <li><b>破译</b>：你在 10 轮尝试内预测正确的 4 个棋子序列。</li>
            <li>
              <b>反馈规则</b>：
              <br />
              🎯 <b>黑针 (Bull)</b>：代表有 1 个棋子<b>颜色和位置完全正确</b>。
              <br />
              ⚪ <b>白针 (Cow)</b>：代表有 1 个棋子<b>颜色对了，但位置不对</b>。
            </li>
          </ul>
        </div>
      )}

      {/* 选项模式栏 */}
      <div
        style={{
          width: '100%',
          maxWidth: '780px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(15, 23, 42, 0.5)',
          padding: '0.6rem 1rem',
          borderRadius: '12px',
          marginBottom: '1.2rem',
          border: '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        {/* 对战模式切换 */}
        <div style={{ display: 'flex', gap: '0.3rem', background: 'rgba(0,0,0,0.3)', padding: '3px', borderRadius: '8px' }}>
          <button
            onClick={() => {
              setIsVsAi(true);
            }}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
              border: 'none',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: isVsAi ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
              color: isVsAi ? '#fff' : '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
          >
            <Bot size={14} /> 人机对战 (VS AI)
          </button>
          <button
            onClick={() => {
              setIsVsAi(false);
            }}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
              border: 'none',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: !isVsAi ? 'linear-gradient(135deg, #ec4899, #8b5cf6)' : 'transparent',
              color: !isVsAi ? '#fff' : '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
          >
            <User size={14} /> 双人同屏出题
          </button>
        </div>

        {/* 皮肤样式切换 */}
        <div style={{ display: 'flex', gap: '0.3rem', background: 'rgba(0,0,0,0.3)', padding: '3px', borderRadius: '8px' }}>
          <button
            onClick={() => setTheme('classic')}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
              border: 'none',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: theme === 'classic' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
              color: theme === 'classic' ? '#fff' : '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
          >
            🎨 经典 6 色
          </button>
          <button
            onClick={() => setTheme('ygo')}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
              border: 'none',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              background: theme === 'ygo' ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
              color: theme === 'ygo' ? '#fff' : '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
          >
            <Layers size={14} color="#facc15" /> YGO 6 属性
          </button>
        </div>

        {/* 允许重复选项 */}
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.8rem',
            color: '#cbd5e1',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={allowDuplicates}
            onChange={(e) => setAllowDuplicates(e.target.checked)}
            style={{ accentColor: '#8b5cf6' }}
          />
          <span>允许重复颜色/属性</span>
        </label>
      </div>

      {/* 主游戏区域面板 */}
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.85), rgba(15, 23, 42, 0.95))',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '1.25rem',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
        }}
      >
        {/* 秘密密码遮挡盒 */}
        <div
          style={{
            width: '100%',
            padding: '0.8rem 1.2rem',
            borderRadius: '14px',
            background: gameState !== 'playing'
              ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(59, 130, 246, 0.2))'
              : 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.9))',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {gameState !== 'playing' ? (
              <Eye size={18} color="#34d399" />
            ) : (
              <EyeOff size={18} color="#94a3b8" />
            )}
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#e2e8f0' }}>
              {gameState !== 'playing'
                ? '秘密密码解密公布'
                : setupStage === 'setting'
                ? '双人模式：请出题者设置秘密密码'
                : '秘密密码（已锁闭）'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem' }}>
            {setupStage === 'setting' ? (
              customSecret.map((peg, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedIndex(idx)}
                  style={{
                    cursor: 'pointer',
                    transform: selectedIndex === idx ? 'scale(1.15)' : 'scale(1)',
                    transition: 'transform 0.15s ease',
                  }}
                >
                  {renderPeg(peg, '34px')}
                </div>
              ))
            ) : gameState !== 'playing' ? (
              secretCode.map((peg, idx) => (
                <div key={idx}>{renderPeg(peg, '34px')}</div>
              ))
            ) : (
              [0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #475569, #1e293b)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.9rem',
                    color: '#94a3b8',
                    fontWeight: 'bold',
                  }}
                >
                  ?
                </div>
              ))
            )}
          </div>
        </div>

        {/* 双人模式：确认出题按钮 */}
        {setupStage === 'setting' && !isVsAi && (
          <button
            onClick={handleConfirmCustomSecret}
            disabled={customSecret.some((p) => p === null)}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '12px',
              border: 'none',
              background: customSecret.every((p) => p !== null)
                ? 'linear-gradient(135deg, #10b981, #059669)'
                : 'rgba(255, 255, 255, 0.1)',
              color: customSecret.every((p) => p !== null) ? '#fff' : '#64748b',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: customSecret.every((p) => p !== null) ? 'pointer' : 'not-allowed',
              boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            <Check size={18} />
            <span>设定完成，开启破译挑战！</span>
          </button>
        )}

        {/* 历史破译记录网格 */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column-reverse',
            gap: '0.6rem',
            background: 'rgba(15, 23, 42, 0.4)',
            padding: '0.8rem',
            borderRadius: '14px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            maxHeight: '380px',
            overflowY: 'auto',
          }}
        >
          {/* 生成 10 轮放置槽 */}
          {Array.from({ length: 10 }).map((_, rowIndex) => {
            const historyRow = history[rowIndex];
            const isCurrentActiveRow = history.length === rowIndex && gameState === 'playing' && setupStage === 'playing';

            return (
              <div
                key={rowIndex}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '10px',
                  background: isCurrentActiveRow
                    ? 'rgba(139, 92, 246, 0.15)'
                    : historyRow
                    ? 'rgba(255, 255, 255, 0.03)'
                    : 'transparent',
                  border: isCurrentActiveRow
                    ? '1px solid rgba(139, 92, 246, 0.5)'
                    : '1px solid transparent',
                  opacity: !historyRow && !isCurrentActiveRow ? 0.4 : 1,
                  transition: 'all 0.2s ease',
                }}
              >
                {/* 轮数标记 */}
                <span
                  style={{
                    width: '24px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: isCurrentActiveRow ? '#a78bfa' : '#64748b',
                  }}
                >
                  #{rowIndex + 1}
                </span>

                {/* 4 个棋子位置 */}
                <div style={{ display: 'flex', gap: '0.65rem' }}>
                  {[0, 1, 2, 3].map((colIndex) => {
                    const pegVal = historyRow
                      ? historyRow.pegs[colIndex]
                      : isCurrentActiveRow
                      ? currentGuess[colIndex]
                      : null;

                    const isSelected = isCurrentActiveRow && selectedIndex === colIndex;

                    return (
                      <div
                        key={colIndex}
                        onClick={() => {
                          if (isCurrentActiveRow) setSelectedIndex(colIndex);
                        }}
                        style={{
                          cursor: isCurrentActiveRow ? 'pointer' : 'default',
                          transform: isSelected ? 'scale(1.18)' : 'scale(1)',
                          transition: 'all 0.15s ease',
                          outline: isSelected ? '2px solid #a78bfa' : 'none',
                          outlineOffset: '2px',
                          borderRadius: '50%',
                        }}
                      >
                        {renderPeg(pegVal, '32px')}
                      </div>
                    );
                  })}
                </div>

                {/* 右侧提交按钮/提示信息 (黑白针) */}
                <div style={{ width: '80px', display: 'flex', justifyContent: 'flex-end' }}>
                  {historyRow ? (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '3px',
                        background: 'rgba(0,0,0,0.4)',
                        padding: '4px',
                        borderRadius: '6px',
                      }}
                      title={`🎯黑针(位置+颜色对): ${historyRow.bulls} | ⚪白针(仅颜色对): ${historyRow.cows}`}
                    >
                      {/* 渲染 Bulls (🎯 黑/红点) */}
                      {Array.from({ length: historyRow.bulls }).map((_, i) => (
                        <div
                          key={`bull-${i}`}
                          style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: '#ef4444',
                            boxShadow: '0 0 6px #ef4444',
                          }}
                        />
                      ))}
                      {/* 渲染 Cows (⚪ 白点) */}
                      {Array.from({ length: historyRow.cows }).map((_, i) => (
                        <div
                          key={`cow-${i}`}
                          style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: '#f8fafc',
                            boxShadow: '0 0 4px #ffffff',
                          }}
                        />
                      ))}
                      {/* 空白占位点 */}
                      {Array.from({ length: 4 - historyRow.bulls - historyRow.cows }).map((_, i) => (
                        <div
                          key={`empty-${i}`}
                          style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.08)',
                          }}
                        />
                      ))}
                    </div>
                  ) : isCurrentActiveRow ? (
                    <button
                      onClick={handleSubmitGuess}
                      disabled={currentGuess.some((p) => p === null)}
                      style={{
                        padding: '0.3rem 0.6rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        borderRadius: '6px',
                        border: 'none',
                        background: currentGuess.every((p) => p !== null)
                          ? 'linear-gradient(135deg, #8b5cf6, #ec4899)'
                          : 'rgba(255,255,255,0.1)',
                        color: currentGuess.every((p) => p !== null) ? '#fff' : '#64748b',
                        cursor: currentGuess.every((p) => p !== null) ? 'pointer' : 'not-allowed',
                      }}
                    >
                      提交
                    </button>
                  ) : (
                    <span style={{ fontSize: '0.7rem', color: '#475569' }}>--</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 底部棋子调色板 (Color Palette) */}
        {gameState === 'playing' && (
          <div
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'space-around',
              alignItems: 'center',
              padding: '0.8rem',
              borderRadius: '14px',
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            {activePegs.map((peg) => (
              <div
                key={peg.id}
                onClick={() => {
                  if (setupStage === 'setting') {
                    const newSecret = [...customSecret];
                    newSecret[selectedIndex] = peg.id;
                    setCustomSecret(newSecret);
                    const nextEmpty = newSecret.findIndex((p, idx) => idx > selectedIndex && p === null);
                    if (nextEmpty !== -1) setSelectedIndex(nextEmpty);
                  } else {
                    handleSelectPeg(peg.id);
                  }
                }}
                style={{
                  cursor: 'pointer',
                  transform: 'scale(1.1)',
                  transition: 'transform 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.28)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
              >
                {renderPeg(peg.id, '38px')}
              </div>
            ))}
          </div>
        )}

        {/* 胜负结果结算 */}
        {gameState !== 'playing' && (
          <div
            style={{
              width: '100%',
              padding: '1rem',
              borderRadius: '14px',
              background: gameState === 'won'
                ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(59, 130, 246, 0.2))'
                : 'linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(236, 72, 153, 0.2))',
              border: gameState === 'won'
                ? '1px solid rgba(16, 185, 129, 0.5)'
                : '1px solid rgba(239, 68, 68, 0.5)',
              textAlign: 'center',
              animation: 'fadeIn 0.3s ease-out',
            }}
          >
            <h2
              style={{
                margin: '0 0 0.4rem 0',
                fontSize: '1.3rem',
                color: gameState === 'won' ? '#34d399' : '#f87171',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              {gameState === 'won' ? (
                <>
                  <Trophy size={24} color="#34d399" />
                  <span>破译成功！完美解密！</span>
                </>
              ) : (
                <>
                  <Sparkles size={24} color="#f87171" />
                  <span>破译失败！已用完 10 次尝试</span>
                </>
              )}
            </h2>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#cbd5e1' }}>
              {gameState === 'won'
                ? `使用了 ${history.length} 轮成功破译！胜率：${Math.round((stats.wins / stats.total) * 100)}%`
                : '别灰心，再来一局试试看吧！'}
            </p>
            <button
              onClick={startNewGame}
              style={{
                padding: '0.6rem 1.5rem',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)',
              }}
            >
              再来一局
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
