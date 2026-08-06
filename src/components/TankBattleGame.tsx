import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowLeft, RefreshCw, Trophy, Volume2, VolumeX, Zap, Heart, Flame, ShieldAlert } from 'lucide-react';

interface TankBattleGameProps {
  onClose: () => void;
}

// 游戏常量
const GRID_SIZE = 13; // 13x13 经典网格
const TILE_SIZE = 32; // 每个格子 32px -> 画布 416x416
const CANVAS_WIDTH = GRID_SIZE * TILE_SIZE; // 416
const CANVAS_HEIGHT = GRID_SIZE * TILE_SIZE; // 416

// 地图图块类型
type TileType = 0 | 1 | 2 | 3 | 4 | 9; 
// 0: 空地, 1: 砖墙(可摧毁), 2: 钢墙(不可摧毁), 3: 树林(遮挡视线), 4: 河流(无法通过), 9: 基地(老鹰)

// 粒子效果接口
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

// 道具接口
interface PowerUp {
  x: number;
  y: number;
  type: 'star' | 'shield' | 'bomb' | 'life';
  duration: number; // 存在时间 (帧)
}

// 子弹接口
interface Bullet {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isPlayer: boolean;
  active: boolean;
}

// 坦克接口
interface Tank {
  x: number;
  y: number;
  dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
  speed: number;
  isPlayer: boolean;
  hp: number;
  maxHp: number;
  shootCooldown: number;
  shieldTime?: number;
  color: string;
}

// 初始化默认关卡地图
const defaultMap: TileType[][] = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
  [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
  [0, 1, 0, 1, 0, 2, 2, 2, 0, 1, 0, 1, 0],
  [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 1, 0, 2, 0, 3, 3, 3, 0, 2, 0, 1, 0],
  [0, 1, 0, 2, 0, 3, 3, 3, 0, 2, 0, 1, 0],
  [0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0],
  [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
  [0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0],
  [0, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 0],
  [0, 1, 0, 0, 0, 1, 9, 1, 0, 0, 0, 1, 0],
];

export const TankBattleGame: React.FC<TankBattleGameProps> = ({ onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // 游戏状态
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(3);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER' | 'VICTORY'>('START');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [enemiesRemaining, setEnemiesRemaining] = useState(10);

  // 内部 Ref 存储游戏运行时变量，避免 Closure 遗留
  const gameStateRef = useRef({
    map: JSON.parse(JSON.stringify(defaultMap)) as TileType[][],
    player: {
      x: 4 * TILE_SIZE,
      y: 12 * TILE_SIZE,
      dir: 'UP' as 'UP' | 'DOWN' | 'LEFT' | 'RIGHT',
      speed: 3,
      isPlayer: true,
      hp: 1,
      maxHp: 1,
      shootCooldown: 0,
      shieldTime: 180, // 初始 3 秒无敌护盾
      color: '#f59e0b',
    } as Tank,
    enemies: [] as Tank[],
    bullets: [] as Bullet[],
    particles: [] as Particle[],
    powerUps: [] as PowerUp[],
    keys: { Up: false, Down: false, Left: false, Right: false, Shoot: false },
    score: 0,
    lives: 3,
    enemiesToSpawn: 10,
    spawnTimer: 0,
    nextBulletId: 1,
    baseAlive: true,
  });

  // 音效合成（使用 Web Audio API，无需外部音频资源）
  const playSound = useCallback((type: 'shoot' | 'explode' | 'hit' | 'powerup' | 'gameover') => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'shoot') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else if (type === 'explode') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else if (type === 'powerup') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      }
    } catch {
      // 忽略音频异常
    }
  }, [soundEnabled]);

  // 重置关卡
  const initGame = useCallback((nextLevel = 1) => {
    const newMap = JSON.parse(JSON.stringify(defaultMap)) as TileType[][];
    // 关卡越高添加更多砖块与敌人
    if (nextLevel > 1) {
      for (let i = 1; i < 11; i += 2) {
        newMap[5][i] = 1;
        newMap[6][i] = 2;
      }
    }

    const state = gameStateRef.current;
    state.map = newMap;
    state.player = {
      x: 4 * TILE_SIZE,
      y: 12 * TILE_SIZE,
      dir: 'UP',
      speed: 3,
      isPlayer: true,
      hp: 1,
      maxHp: 1,
      shootCooldown: 0,
      shieldTime: 180,
      color: '#f59e0b',
    };
    state.enemies = [];
    state.bullets = [];
    state.particles = [];
    state.powerUps = [];
    state.score = nextLevel === 1 ? 0 : state.score;
    state.lives = nextLevel === 1 ? 3 : state.lives;
    state.enemiesToSpawn = 8 + nextLevel * 2;
    state.spawnTimer = 0;
    state.baseAlive = true;

    setScore(state.score);
    setLives(state.lives);
    setLevel(nextLevel);
    setEnemiesRemaining(state.enemiesToSpawn);
    setGameState('PLAYING');
  }, []);

  // 生成粒子爆炸效果
  const createExplosion = (x: number, y: number, color = '#f97316', count = 16) => {
    const particles = gameStateRef.current.particles;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 4 + 2,
        color,
        life: 0,
        maxLife: Math.floor(Math.random() * 20 + 10),
      });
    }
  };

  // 生成敌方坦克
  const spawnEnemy = () => {
    const state = gameStateRef.current;
    if (state.enemiesToSpawn <= 0 || state.enemies.length >= 4) return;

    const spawnPoints = [
      { x: 0 * TILE_SIZE, y: 0 * TILE_SIZE },
      { x: 6 * TILE_SIZE, y: 0 * TILE_SIZE },
      { x: 12 * TILE_SIZE, y: 0 * TILE_SIZE },
    ];
    const pt = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];

    // 随机敌坦克类型（常规、快速、重装）
    const rand = Math.random();
    let speed = 1.5;
    let hp = 1;
    let color = '#ef4444'; // 红色

    if (rand > 0.7) {
      speed = 2.5; // 快速
      color = '#3b82f6'; // 蓝色
    } else if (rand > 0.4) {
      hp = 2; // 重装
      color = '#a855f7'; // 紫色
    }

    state.enemies.push({
      x: pt.x,
      y: pt.y,
      dir: 'DOWN',
      speed,
      isPlayer: false,
      hp,
      maxHp: hp,
      shootCooldown: Math.floor(Math.random() * 60 + 30),
      color,
    });
    state.enemiesToSpawn--;
  };

  // 碰撞检测：矩形相交
  const isColliding = (
    x1: number, y1: number, w1: number, h1: number,
    x2: number, y2: number, w2: number, h2: number
  ) => {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
  };

  // 地形碰撞检测
  const canMoveTo = (x: number, y: number, isPlayer: boolean) => {
    const state = gameStateRef.current;
    if (x < 0 || y < 0 || x + TILE_SIZE > CANVAS_WIDTH || y + TILE_SIZE > CANVAS_HEIGHT) {
      return false;
    }

    // 检查地图图块 (加入 4px 内边距Padding避免转弯贴墙卡死)
    const pad = 4;
    const startTileX = Math.floor((x + pad) / TILE_SIZE);
    const endTileX = Math.floor((x + TILE_SIZE - 1 - pad) / TILE_SIZE);
    const startTileY = Math.floor((y + pad) / TILE_SIZE);
    const endTileY = Math.floor((y + TILE_SIZE - 1 - pad) / TILE_SIZE);

    for (let ty = startTileY; ty <= endTileY; ty++) {
      for (let tx = startTileX; tx <= endTileX; tx++) {
        if (ty >= 0 && ty < GRID_SIZE && tx >= 0 && tx < GRID_SIZE) {
          const tile = state.map[ty][tx];
          // 1:砖块, 2:钢墙, 4:水流, 9:老鹰
          if (tile === 1 || tile === 2 || tile === 4 || tile === 9) {
            return false;
          }
        }
      }
    }

    // 坦克相互碰撞检查
    const allTanks = isPlayer ? state.enemies : [state.player, ...state.enemies.filter(e => e.x !== x || e.y !== y)];
    for (const t of allTanks) {
      if (t && isColliding(x, y, TILE_SIZE - 2, TILE_SIZE - 2, t.x, t.y, TILE_SIZE - 2, TILE_SIZE - 2)) {
        return false;
      }
    }

    return true;
  };

  // 主循环 Update 逻辑
  const updateGame = () => {
    const state = gameStateRef.current;
    if (gameState !== 'PLAYING') return;

    // 1. 生成敌方坦克
    state.spawnTimer++;
    if (state.spawnTimer > 120) {
      spawnEnemy();
      state.spawnTimer = 0;
    }

    // 2. 玩家坦克移动与冷却
    const p = state.player;
    if (p.shootCooldown > 0) p.shootCooldown--;
    if (p.shieldTime && p.shieldTime > 0) p.shieldTime--;

    let moveX = p.x;
    let moveY = p.y;
    if (state.keys.Up) { p.dir = 'UP'; moveY -= p.speed; }
    else if (state.keys.Down) { p.dir = 'DOWN'; moveY += p.speed; }
    else if (state.keys.Left) { p.dir = 'LEFT'; moveX -= p.speed; }
    else if (state.keys.Right) { p.dir = 'RIGHT'; moveX += p.speed; }

    if (canMoveTo(moveX, moveY, true)) {
      p.x = moveX;
      p.y = moveY;
    }

    // 玩家射击
    if (state.keys.Shoot && p.shootCooldown <= 0) {
      let vx = 0, vy = 0;
      let bx = p.x + TILE_SIZE / 2 - 3;
      let by = p.y + TILE_SIZE / 2 - 3;
      const bSpeed = 7;

      if (p.dir === 'UP') vy = -bSpeed;
      else if (p.dir === 'DOWN') vy = bSpeed;
      else if (p.dir === 'LEFT') vx = -bSpeed;
      else if (p.dir === 'RIGHT') vx = bSpeed;

      state.bullets.push({
        id: state.nextBulletId++,
        x: bx, y: by, vx, vy, isPlayer: true, active: true
      });
      p.shootCooldown = 18;
      playSound('shoot');
    }

    // 3. 敌方坦克 AI 移动与射击
    state.enemies.forEach((e) => {
      if (e.shootCooldown > 0) e.shootCooldown--;

      let ex = e.x;
      let ey = e.y;
      const bSpeed = 5;

      if (e.dir === 'UP') ey -= e.speed;
      else if (e.dir === 'DOWN') ey += e.speed;
      else if (e.dir === 'LEFT') ex -= e.speed;
      else if (e.dir === 'RIGHT') ex += e.speed;

      if (canMoveTo(ex, ey, false)) {
        e.x = ex;
        e.y = ey;
      } else {
        // 遇到障碍随机转向
        const dirs: ('UP' | 'DOWN' | 'LEFT' | 'RIGHT')[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
        e.dir = dirs[Math.floor(Math.random() * dirs.length)];
      }

      // 敌方随机射击
      if (e.shootCooldown <= 0 && Math.random() < 0.05) {
        let vx = 0, vy = 0;
        if (e.dir === 'UP') vy = -bSpeed;
        else if (e.dir === 'DOWN') vy = bSpeed;
        else if (e.dir === 'LEFT') vx = -bSpeed;
        else if (e.dir === 'RIGHT') vx = bSpeed;

        state.bullets.push({
          id: state.nextBulletId++,
          x: e.x + TILE_SIZE / 2 - 3,
          y: e.y + TILE_SIZE / 2 - 3,
          vx, vy, isPlayer: false, active: true
        });
        e.shootCooldown = Math.floor(Math.random() * 50 + 40);
      }
    });

    // 4. 子弹移动与碰撞检测
    state.bullets.forEach((b) => {
      if (!b.active) return;
      b.x += b.vx;
      b.y += b.vy;

      // 出界检测
      if (b.x < 0 || b.x > CANVAS_WIDTH || b.y < 0 || b.y > CANVAS_HEIGHT) {
        b.active = false;
        return;
      }

      // 地形碰撞
      const tx = Math.floor((b.x + 3) / TILE_SIZE);
      const ty = Math.floor((b.y + 3) / TILE_SIZE);

      if (tx >= 0 && tx < GRID_SIZE && ty >= 0 && ty < GRID_SIZE) {
        const tile = state.map[ty][tx];

        // 打中砖块：摧毁砖块
        if (tile === 1) {
          state.map[ty][tx] = 0;
          b.active = false;
          createExplosion(b.x, b.y, '#f59e0b', 8);
          playSound('hit');
          return;
        }
        // 打中钢墙：吸收子弹
        if (tile === 2) {
          b.active = false;
          createExplosion(b.x, b.y, '#9ca3af', 6);
          playSound('hit');
          return;
        }
        // 打中基地：游戏结束！
        if (tile === 9) {
          state.map[ty][tx] = 0;
          b.active = false;
          state.baseAlive = false;
          createExplosion(b.x, b.y, '#ef4444', 30);
          playSound('gameover');
          setGameState('GAMEOVER');
          return;
        }
      }

      // 子弹与玩家坦克碰撞
      if (!b.isPlayer && isColliding(b.x, b.y, 6, 6, p.x, p.y, TILE_SIZE, TILE_SIZE)) {
        b.active = false;
        if (!p.shieldTime || p.shieldTime <= 0) {
          state.lives--;
          setLives(state.lives);
          createExplosion(p.x + TILE_SIZE / 2, p.y + TILE_SIZE / 2, '#ef4444', 24);
          playSound('explode');

          if (state.lives <= 0) {
            setGameState('GAMEOVER');
          } else {
            // 重置玩家位置并加护盾
            p.x = 4 * TILE_SIZE;
            p.y = 12 * TILE_SIZE;
            p.shieldTime = 180;
          }
        }
        return;
      }

      // 玩家子弹与敌方坦克碰撞
      if (b.isPlayer) {
        for (let i = state.enemies.length - 1; i >= 0; i--) {
          const e = state.enemies[i];
          if (isColliding(b.x, b.y, 6, 6, e.x, e.y, TILE_SIZE, TILE_SIZE)) {
            b.active = false;
            e.hp--;
            createExplosion(b.x, b.y, '#f59e0b', 12);

            if (e.hp <= 0) {
              state.enemies.splice(i, 1);
              state.score += 100;
              setScore(state.score);
              setEnemiesRemaining(state.enemiesToSpawn + state.enemies.length);
              createExplosion(e.x + TILE_SIZE / 2, e.y + TILE_SIZE / 2, '#ef4444', 24);
              playSound('explode');

              // 随机掉落道具
              if (Math.random() < 0.3) {
                const types: ('star' | 'shield' | 'bomb' | 'life')[] = ['star', 'shield', 'bomb', 'life'];
                state.powerUps.push({
                  x: e.x,
                  y: e.y,
                  type: types[Math.floor(Math.random() * types.length)],
                  duration: 600,
                });
              }

              // 胜利判断
              if (state.enemiesToSpawn === 0 && state.enemies.length === 0) {
                setGameState('VICTORY');
              }
            } else {
              playSound('hit');
            }
            break;
          }
        }
      }
    });

    // 过滤掉非活动子弹
    state.bullets = state.bullets.filter(b => b.active);

    // 5. 道具吃取与过期
    state.powerUps.forEach((pow, idx) => {
      pow.duration--;
      if (isColliding(p.x, p.y, TILE_SIZE, TILE_SIZE, pow.x, pow.y, 24, 24)) {
        playSound('powerup');
        if (pow.type === 'shield') {
          p.shieldTime = 300;
        } else if (pow.type === 'life') {
          state.lives++;
          setLives(state.lives);
        } else if (pow.type === 'bomb') {
          // 清屏消灭当前敌人
          state.enemies.forEach((e) => {
            createExplosion(e.x + TILE_SIZE / 2, e.y + TILE_SIZE / 2, '#ef4444', 20);
            state.score += 100;
          });
          state.enemies = [];
          setScore(state.score);
        } else if (pow.type === 'star') {
          p.speed = Math.min(5, p.speed + 0.5);
        }
        state.powerUps.splice(idx, 1);
      }
    });
    state.powerUps = state.powerUps.filter(pow => pow.duration > 0);

    // 6. 粒子更新
    state.particles.forEach((pt) => {
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.life++;
    });
    state.particles = state.particles.filter(pt => pt.life < pt.maxLife);
  };

  // Canvas 渲染绘图
  const renderGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const state = gameStateRef.current;

    // 清屏黑色网格背景
    ctx.fillStyle = '#0a0c14';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 绘制微弱底图网格线
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * TILE_SIZE, 0);
      ctx.lineTo(i * TILE_SIZE, CANVAS_HEIGHT);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * TILE_SIZE);
      ctx.lineTo(CANVAS_WIDTH, i * TILE_SIZE);
      ctx.stroke();
    }

    // 1. 绘制地图图块
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const tile = state.map[r][c];
        const x = c * TILE_SIZE;
        const y = r * TILE_SIZE;

        if (tile === 1) {
          // 砖墙 (红褐色砖缝纹理)
          ctx.fillStyle = '#b45309';
          ctx.fillRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
          ctx.fillStyle = '#78350f';
          ctx.fillRect(x + 2, y + 2, 12, 12);
          ctx.fillRect(x + 16, y + 16, 12, 12);
        } else if (tile === 2) {
          // 钢墙 (银灰色防弹纹理)
          ctx.fillStyle = '#9ca3af';
          ctx.fillRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
          ctx.fillStyle = '#e5e7eb';
          ctx.fillRect(x + 4, y + 4, 10, 10);
          ctx.fillRect(x + 18, y + 18, 10, 10);
        } else if (tile === 4) {
          // 河流 (蓝色水波纹)
          ctx.fillStyle = 'rgba(6, 182, 212, 0.6)';
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        } else if (tile === 9) {
          // 基地 (金色老鹰图标)
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
          ctx.fillStyle = '#9a3412';
          ctx.font = '20px sans-serif';
          ctx.fillText('🦅', x + 5, y + 24);
        }
      }
    }

    // 2. 绘制道具
    state.powerUps.forEach((pow) => {
      ctx.save();
      ctx.fillStyle = pow.type === 'shield' ? '#3b82f6' : pow.type === 'bomb' ? '#ef4444' : '#f59e0b';
      ctx.beginPath();
      ctx.arc(pow.x + 12, pow.y + 12, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '12px sans-serif';
      const icon = pow.type === 'shield' ? '🛡️' : pow.type === 'bomb' ? '💣' : pow.type === 'life' ? '❤️' : '⭐';
      ctx.fillText(icon, pow.x + 4, pow.y + 16);
      ctx.restore();
    });

    // 绘制坦克的通用 Helper 函数
    const drawTank = (t: Tank) => {
      ctx.save();
      ctx.translate(t.x + TILE_SIZE / 2, t.y + TILE_SIZE / 2);

      // 根据方向旋转
      let angle = 0;
      if (t.dir === 'RIGHT') angle = Math.PI / 2;
      else if (t.dir === 'DOWN') angle = Math.PI;
      else if (t.dir === 'LEFT') angle = -Math.PI / 2;
      ctx.rotate(angle);

      // 车身主色
      ctx.fillStyle = t.color;
      ctx.fillRect(-12, -12, 24, 24);

      // 履带 (左右黑道)
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(-15, -14, 5, 28);
      ctx.fillRect(10, -14, 5, 28);

      // 炮塔炮管
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-3, -16, 6, 12);

      ctx.restore();

      // 无敌护盾圈
      if (t.shieldTime && t.shieldTime > 0) {
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(t.x + TILE_SIZE / 2, t.y + TILE_SIZE / 2, TILE_SIZE / 2 + 4, 0, Math.PI * 2);
        ctx.stroke();
      }
    };

    // 3. 绘制玩家坦克
    if (gameState === 'PLAYING' || gameState === 'START') {
      drawTank(state.player);
    }

    // 4. 绘制敌方坦克
    state.enemies.forEach(drawTank);

    // 5. 绘制树林 (遮挡层，覆盖在坦克之上)
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (state.map[r][c] === 3) {
          ctx.fillStyle = 'rgba(34, 197, 94, 0.75)';
          ctx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
      }
    }

    // 6. 绘制子弹
    state.bullets.forEach((b) => {
      ctx.fillStyle = b.isPlayer ? '#f59e0b' : '#ef4444';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // 7. 绘制粒子
    state.particles.forEach((pt) => {
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = 1 - pt.life / pt.maxLife;
      ctx.fillRect(pt.x, pt.y, pt.size, pt.size);
      ctx.globalAlpha = 1;
    });
  };

  // 键盘事件绑定
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const keys = gameStateRef.current.keys;
      if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') keys.Up = true;
      if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') keys.Down = true;
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') keys.Left = true;
      if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') keys.Right = true;
      if (e.key === ' ' || e.key === 'j' || e.key === 'J') keys.Shoot = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const keys = gameStateRef.current.keys;
      if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') keys.Up = false;
      if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') keys.Down = false;
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') keys.Left = false;
      if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') keys.Right = false;
      if (e.key === ' ' || e.key === 'j' || e.key === 'J') keys.Shoot = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // 游戏主Loop requestAnimationFrame
  useEffect(() => {
    let animId: number;
    const loop = () => {
      updateGame();
      renderGame();
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState]);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', minHeight: '100vh',
      background: '#07090e', color: '#fff', fontFamily: 'var(--font-family)'
    }}>
      {/* 头部导航栏 */}
      <header style={{
        padding: '0.85rem 1.5rem', background: 'rgba(18, 21, 36, 0.9)',
        borderBottom: '1px solid var(--border-color)', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={onClose}
            className="action-btn"
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
          >
            <ArrowLeft size={16} />
            <span>返回查卡主页</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Flame color="#f59e0b" size={22} />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
              经典坦克大战 (Battle City Arcade)
            </h2>
          </div>
        </div>

        {/* 核心数据仪表 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', fontSize: '0.9rem', fontWeight: 700 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f59e0b' }}>
            <Trophy size={16} />
            <span>得分: {score}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#ef4444' }}>
            <Heart size={16} />
            <span>生命: {lives}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#ec4899' }}>
            <ShieldAlert size={16} />
            <span>敌机: {enemiesRemaining}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#06b6d4' }}>
            <Zap size={16} />
            <span>关卡: {level}</span>
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            style={{
              background: 'none', border: 'none', color: '#9ca3af',
              cursor: 'pointer', display: 'flex', alignItems: 'center'
            }}
            title={soundEnabled ? "关闭音效" : "开启音效"}
          >
            {soundEnabled ? <Volume2 size={20} color="#10b981" /> : <VolumeX size={20} color="#6b7280" />}
          </button>
        </div>
      </header>

      {/* 主画布与操作面板 */}
      <main style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem', gap: '2rem', flexWrap: 'wrap'
      }}>
        {/* Canvas 画布区域 */}
        <div style={{
          position: 'relative', borderRadius: '12px', overflow: 'hidden',
          boxShadow: '0 0 40px rgba(0, 0, 0, 0.8), 0 0 20px rgba(6, 182, 212, 0.2)',
          border: '2px solid rgba(6, 182, 212, 0.4)'
        }}>
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            style={{ display: 'block', background: '#0a0c14' }}
          />

          {/* 开始画面 Overlay */}
          {gameState === 'START' && (
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(10, 12, 20, 0.88)',
              backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: '1.2rem', textAlign: 'center'
            }}>
              <Flame size={54} color="#f59e0b" />
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff' }}>坦克大战 · 街机复刻版</h2>
              <p style={{ fontSize: '0.9rem', color: '#9ca3af', maxWidth: '300px', textAlign: 'center' }}>
                消灭所有入侵敌方坦克，保护基地🦅不被摧毁！
              </p>
              <button
                className="action-btn"
                onClick={() => initGame(1)}
                style={{
                  padding: '0.8rem 2.2rem', fontSize: '1rem', fontWeight: 800,
                  background: 'linear-gradient(135deg, #f59e0b, #ec4899)', border: 'none'
                }}
              >
                开始游戏
              </button>
            </div>
          )}

          {/* Game Over Overlay */}
          {gameState === 'GAMEOVER' && (
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(239, 68, 68, 0.15)',
              backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: '1rem'
            }}>
              <h2 style={{ fontSize: '2.4rem', fontWeight: 900, color: '#ef4444' }}>GAME OVER</h2>
              <p style={{ color: '#d1d5db' }}>最终得分: <strong style={{ color: '#f59e0b' }}>{score}</strong></p>
              <button
                className="action-btn"
                onClick={() => initGame(1)}
                style={{
                  padding: '0.75rem 1.8rem', fontSize: '0.95rem',
                  background: 'linear-gradient(135deg, #ef4444, #ec4899)'
                }}
              >
                <RefreshCw size={16} />
                <span>重新挑战</span>
              </button>
            </div>
          )}

          {/* Victory Overlay */}
          {gameState === 'VICTORY' && (
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(16, 185, 129, 0.18)',
              backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: '1rem'
            }}>
              <Trophy size={48} color="#f59e0b" />
              <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#10b981' }}>关卡胜利 VICTORY!</h2>
              <p style={{ color: '#d1d5db' }}>进入第 {level + 1} 关！</p>
              <button
                className="action-btn"
                onClick={() => initGame(level + 1)}
                style={{
                  padding: '0.75rem 1.8rem', fontSize: '0.95rem',
                  background: 'linear-gradient(135deg, #10b981, #06b6d4)'
                }}
              >
                下一关卡
              </button>
            </div>
          )}
        </div>

        {/* 侧边按键说明与操作指南 */}
        <div style={{
          width: '280px', background: 'rgba(18, 21, 36, 0.75)', padding: '1.25rem',
          borderRadius: '12px', border: '1px solid var(--border-color)',
          display: 'flex', flexDirection: 'column', gap: '1.2rem'
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
            🎮 操作指南 (Controls)
          </h3>

          <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#9ca3af' }}>移动 (Move)</span>
              <kbd style={{ background: 'rgba(255,255,255,0.1)', padding: '3px 8px', borderRadius: '4px' }}>W A S D / 方向键</kbd>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#9ca3af' }}>开火 (Shoot)</span>
              <kbd style={{ background: 'rgba(255,255,255,0.1)', padding: '3px 8px', borderRadius: '4px' }}>空格键 / J</kbd>
            </div>
          </div>

          <hr style={{ borderColor: 'var(--border-color)' }} />

          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
            🧱 地形与道具 (Legend)
          </h3>

          <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', color: '#d1d5db' }}>
            <div>🟫 <strong>砖墙</strong>：可被子弹击碎</div>
            <div>⬜ <strong>钢墙</strong>：抵挡普通子弹</div>
            <div>🟦 <strong>水流</strong>：坦克不可通过，子弹可通过</div>
            <div>🟩 <strong>树林</strong>：遮挡坦克视线与位置</div>
            <div>🛡️ <strong>蓝盾</strong>：获得无敌护盾时间</div>
            <div>💣 <strong>炸弹</strong>：消灭全屏敌方坦克</div>
            <div>❤️ <strong>红心</strong>：增加 1 点玩家生命</div>
          </div>
        </div>
      </main>
    </div>
  );
};
