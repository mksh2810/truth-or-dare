// Pure game rules for XP and Level calculation (PACK.md 5.4)

export const xpForNext = (level: number): number => 100 + 75 * (level - 1);

export interface XpResult {
  level: number;
  xp: number;
}

export function applyXp(level: number, xp: number, gain: number): XpResult {
  let l = level;
  let x = xp + gain;
  while (x >= xpForNext(l)) {
    x -= xpForNext(l);
    l += 1;
  }
  return { level: l, xp: x };
}

// streakBefore = consecutive passes before this turn
export function turnXp(result: 'pass' | 'fail' | 'skip', streakBefore: number): number {
  if (result === 'pass') {
    return 50 + Math.min(30, 10 * streakBefore);
  }
  return result === 'fail' ? 10 : 0;
}
