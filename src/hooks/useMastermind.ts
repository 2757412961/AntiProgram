export type PegTheme = 'classic' | 'ygo';

export interface PegOption {
  id: string;
  name: string;
  color: string;
  icon?: string;
  bgGradient: string;
}

export const CLASSIC_PEGS: PegOption[] = [
  { id: 'red', name: '红色', color: '#ef4444', bgGradient: 'radial-gradient(circle at 30% 30%, #fca5a5, #ef4444, #991b1b)' },
  { id: 'blue', name: '蓝色', color: '#3b82f6', bgGradient: 'radial-gradient(circle at 30% 30%, #93c5fd, #3b82f6, #1e40af)' },
  { id: 'yellow', name: '黄色', color: '#eab308', bgGradient: 'radial-gradient(circle at 30% 30%, #fef08a, #eab308, #854d0e)' },
  { id: 'green', name: '绿色', color: '#22c55e', bgGradient: 'radial-gradient(circle at 30% 30%, #86efac, #22c55e, #166534)' },
  { id: 'purple', name: '紫色', color: '#a855f7', bgGradient: 'radial-gradient(circle at 30% 30%, #d8b4fe, #a855f7, #6b21a8)' },
  { id: 'orange', name: '橙色', color: '#f97316', bgGradient: 'radial-gradient(circle at 30% 30%, #ffedd5, #f97316, #9a3412)' },
];

export const YGO_PEGS: PegOption[] = [
  { id: 'light', name: '光属性', color: '#facc15', icon: '💡', bgGradient: 'radial-gradient(circle at 30% 30%, #fef9c3, #facc15, #854d0e)' },
  { id: 'dark', name: '暗属性', color: '#a855f7', icon: '🌑', bgGradient: 'radial-gradient(circle at 30% 30%, #f3e8ff, #a855f7, #581c87)' },
  { id: 'fire', name: '炎属性', color: '#ef4444', icon: '🔥', bgGradient: 'radial-gradient(circle at 30% 30%, #fee2e2, #ef4444, #7f1d1d)' },
  { id: 'water', name: '水属性', color: '#06b6d4', icon: '💧', bgGradient: 'radial-gradient(circle at 30% 30%, #cff4fc, #06b6d4, #164e63)' },
  { id: 'wind', name: '风属性', color: '#10b981', icon: '🍃', bgGradient: 'radial-gradient(circle at 30% 30%, #d1fae5, #10b981, #064e3b)' },
  { id: 'earth', name: '地属性', color: '#d97706', icon: '🪨', bgGradient: 'radial-gradient(circle at 30% 30%, #fef3c7, #d97706, #78350f)' },
];

export interface GuessRow {
  pegs: (string | null)[];
  bulls: number;
  cows: number;
  isSubmitted: boolean;
}

export function calculateFeedback(secret: string[], guess: string[]) {
  let bulls = 0;
  let cows = 0;
  const secretUsed = new Array(secret.length).fill(false);
  const guessUsed = new Array(guess.length).fill(false);

  for (let i = 0; i < secret.length; i++) {
    if (guess[i] === secret[i]) {
      bulls++;
      secretUsed[i] = true;
      guessUsed[i] = true;
    }
  }

  for (let i = 0; i < guess.length; i++) {
    if (!guessUsed[i]) {
      for (let j = 0; j < secret.length; j++) {
        if (!secretUsed[j] && guess[i] === secret[j]) {
          cows++;
          secretUsed[j] = true;
          break;
        }
      }
    }
  }

  return { bulls, cows };
}

export function generateRandomSecret(pegs: PegOption[], allowDuplicates: boolean): string[] {
  const secret: string[] = [];
  const available = [...pegs];

  for (let i = 0; i < 4; i++) {
    if (allowDuplicates) {
      const randomIndex = Math.floor(Math.random() * pegs.length);
      secret.push(pegs[randomIndex].id);
    } else {
      const randomIndex = Math.floor(Math.random() * available.length);
      secret.push(available[randomIndex].id);
      available.splice(randomIndex, 1);
    }
  }
  return secret;
}
