// Pure game rules for XP and Level calculation (PACK.md 1.8, 5.4, XP-4)

export const BASE = 100;
export const GROWTH = 1.25;

/**
 * XP required to advance from Level L to L+1.
 * xpForNext(L) = round to nearest 5 of BASE * GROWTH^(L-1)
 */
export function xpForNext(level: number): number {
  const lvl = Math.max(1, Math.floor(level));
  const raw = BASE * Math.pow(GROWTH, lvl - 1);
  return Math.max(5, Math.round(raw / 5) * 5);
}

/**
 * Returns cumulative XP needed to reach a given level from level 1.
 * Level 1 = 0 XP.
 * Level 2 = xpForNext(1) = 100 XP.
 * Level 3 = xpForNext(1) + xpForNext(2) = 225 XP, etc.
 */
export function cumulativeXpForLevel(level: number): number {
  const target = Math.max(1, Math.floor(level));
  let total = 0;
  for (let l = 1; l < target; l++) {
    total += xpForNext(l);
  }
  return total;
}

export interface XpProgress {
  level: number;
  xpInLevel: number;
  neededForNext: number;
  progressRatio: number;
  totalXp: number;
}

/**
 * Derives current level from total cumulative XP.
 * Level is never stored as the source of truth (XP-4).
 */
export function levelFromTotal(totalXp: number): number {
  if (totalXp <= 0) return 1;
  let level = 1;
  let accumulated = 0;

  while (true) {
    const nextReq = xpForNext(level);
    if (totalXp < accumulated + nextReq) {
      return level;
    }
    accumulated += nextReq;
    level += 1;
  }
}

/**
 * Calculates full progress object including level, current XP within level,
 * and XP needed for next level.
 */
export function progress(totalXp: number): XpProgress {
  const validTotal = Math.max(0, Math.floor(totalXp || 0));
  const level = levelFromTotal(validTotal);
  const baseForCurrentLevel = cumulativeXpForLevel(level);
  const xpInLevel = validTotal - baseForCurrentLevel;
  const neededForNext = xpForNext(level);
  const progressRatio = Math.min(1, Math.max(0, xpInLevel / neededForNext));

  return {
    level,
    xpInLevel,
    neededForNext,
    progressRatio,
    totalXp: validTotal,
  };
}

/**
 * Applies XP gain to total cumulative XP.
 */
export function applyTotalXp(
  currentTotalXp: number,
  gain: number
): {
  previousTotalXp: number;
  newTotalXp: number;
  previousLevel: number;
  newLevel: number;
  leveledUp: boolean;
  progress: XpProgress;
} {
  const previousTotalXp = Math.max(0, Math.floor(currentTotalXp || 0));
  const newTotalXp = previousTotalXp + Math.max(0, Math.floor(gain || 0));
  const previousLevel = levelFromTotal(previousTotalXp);
  const currentProgress = progress(newTotalXp);
  const newLevel = currentProgress.level;

  return {
    previousTotalXp,
    newTotalXp,
    previousLevel,
    newLevel,
    leveledUp: newLevel > previousLevel,
    progress: currentProgress,
  };
}

/**
 * XP awarded per turn result (PACK.md 1.8)
 */
export function turnXp(result: 'pass' | 'fail' | 'skip', streakBefore: number): number {
  if (result === 'pass') {
    return 50 + Math.min(30, 10 * Math.max(0, streakBefore));
  }
  return result === 'fail' ? 10 : 0;
}

/**
 * One-time migration helper: converts legacy (level, xp) pair to totalXp.
 * Legacy formula was: xpForNext_legacy(l) = 100 + 75 * (l - 1)
 */
export function legacyToTotalXp(level: number, xpInLevel: number): number {
  const lvl = Math.max(1, Math.floor(level));
  let cumulative = 0;
  for (let l = 1; l < lvl; l++) {
    cumulative += 100 + 75 * (l - 1);
  }
  return cumulative + Math.max(0, Math.floor(xpInLevel || 0));
}
