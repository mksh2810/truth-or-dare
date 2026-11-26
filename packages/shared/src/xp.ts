import type { ResultStamp } from './types.js';

export const BASE_COMPLETION_XP = 50;
export const MAX_STREAK_BONUS = 80;
export const STREAK_STEP_BONUS = 20;
export const SKIP_SESSION_PENALTY = -30;

export interface TurnScoreOutcome {
  sessionDelta: number;
  nextStreak: number;
}

export interface TurnXpOptions {
  leaver?: boolean;
}

/**
 * Computes the streak bonus for a given streak count (capped at +80).
 */
export function calculateStreakBonus(streak: number): number {
  if (!Number.isFinite(streak) || streak <= 0) {
    return 0;
  }
  return Math.min(MAX_STREAK_BONUS, Math.floor(streak) * STREAK_STEP_BONUS);
}

/**
 * Computes the session score delta and next streak for a turn outcome.
 * Session score drives the game podium and resets every game.
 */
export function calculateTurnSessionDelta(
  stamp: ResultStamp,
  currentStreak: number,
  options?: TurnXpOptions,
): TurnScoreOutcome {
  const safeStreak = Number.isFinite(currentStreak) && currentStreak > 0 ? Math.floor(currentStreak) : 0;

  switch (stamp) {
    case 'PASSED': {
      const bonus = calculateStreakBonus(safeStreak);
      return {
        sessionDelta: BASE_COMPLETION_XP + bonus,
        nextStreak: safeStreak + 1,
      };
    }
    case 'SPLIT': {
      const bonus = calculateStreakBonus(safeStreak);
      return {
        sessionDelta: Math.floor((BASE_COMPLETION_XP + bonus) / 2),
        nextStreak: safeStreak,
      };
    }
    case 'SKIPPED': {
      return {
        sessionDelta: options?.leaver ? 0 : SKIP_SESSION_PENALTY,
        nextStreak: 0,
      };
    }
    case 'NOT IT':
    case 'STALLED': {
      return {
        sessionDelta: 0,
        nextStreak: 0,
      };
    }
  }
}

/**
 * Computes the lifetime XP contribution for a verified turn record.
 * Lifetime XP is strictly non-negative and monotonically non-decreasing.
 */
export function calculateLifetimeXpDelta(stamp: ResultStamp, currentStreak: number): number {
  const safeStreak = Number.isFinite(currentStreak) && currentStreak > 0 ? Math.floor(currentStreak) : 0;

  switch (stamp) {
    case 'PASSED':
      return BASE_COMPLETION_XP + calculateStreakBonus(safeStreak);
    case 'SPLIT':
      return Math.floor((BASE_COMPLETION_XP + calculateStreakBonus(safeStreak)) / 2);
    case 'NOT IT':
    case 'SKIPPED':
    case 'STALLED':
      return 0;
  }
}

/**
 * Returns the cumulative lifetime XP required to reach `level` (1-indexed).
 * Level 1 = 0 XP, Level 2 = 100 XP, Level 3 = 235 XP, etc.
 */
export function xpForLevel(level: number): number {
  if (!Number.isFinite(level) || level <= 1) {
    return 0;
  }
  const normalizedLevel = Math.floor(level);
  return Math.floor((100 * (Math.pow(1.35, normalizedLevel - 1) - 1)) / 0.35);
}

/**
 * Derives the exponential player level from cumulative lifetime XP.
 * Monotonically non-decreasing with respect to `lifetimeXp`.
 */
export function calculateLevel(lifetimeXp: number): number {
  if (!Number.isFinite(lifetimeXp) || lifetimeXp <= 0) {
    return 1;
  }
  let level = 1;
  while (level < 500 && xpForLevel(level + 1) <= lifetimeXp) {
    level += 1;
  }
  return level;
}
