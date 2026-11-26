import { describe, expect, it } from 'vitest';
import {
  calculateLevel,
  calculateLifetimeXpDelta,
  calculateStreakBonus,
  calculateTurnSessionDelta,
  xpForLevel,
} from '../xp.js';
import type { ResultStamp } from '../types.js';

describe('xp & session score', () => {
  it('calculates streak bonus capped at +80', () => {
    expect(calculateStreakBonus(-1)).toBe(0);
    expect(calculateStreakBonus(0)).toBe(0);
    expect(calculateStreakBonus(1)).toBe(20);
    expect(calculateStreakBonus(2)).toBe(40);
    expect(calculateStreakBonus(3)).toBe(60);
    expect(calculateStreakBonus(4)).toBe(80);
    expect(calculateStreakBonus(10)).toBe(80);
    expect(calculateStreakBonus(Number.NaN)).toBe(0);
  });

  it('calculates session delta & streak for every ResultStamp', () => {
    expect(calculateTurnSessionDelta('PASSED', 0)).toEqual({ sessionDelta: 50, nextStreak: 1 });
    expect(calculateTurnSessionDelta('PASSED', 2)).toEqual({ sessionDelta: 90, nextStreak: 3 });
    expect(calculateTurnSessionDelta('PASSED', 5)).toEqual({ sessionDelta: 130, nextStreak: 6 });

    expect(calculateTurnSessionDelta('SPLIT', 0)).toEqual({ sessionDelta: 25, nextStreak: 0 });
    expect(calculateTurnSessionDelta('SPLIT', 3)).toEqual({ sessionDelta: 55, nextStreak: 3 });

    expect(calculateTurnSessionDelta('SKIPPED', 3)).toEqual({ sessionDelta: -30, nextStreak: 0 });
    expect(calculateTurnSessionDelta('SKIPPED', 3, { leaver: true })).toEqual({
      sessionDelta: 0,
      nextStreak: 0,
    });

    expect(calculateTurnSessionDelta('NOT IT', 4)).toEqual({ sessionDelta: 0, nextStreak: 0 });
    expect(calculateTurnSessionDelta('STALLED', 4)).toEqual({ sessionDelta: 0, nextStreak: 0 });
    expect(calculateTurnSessionDelta('PASSED', -2)).toEqual({ sessionDelta: 50, nextStreak: 1 });
  });

  it('keeps lifetime XP monotonic and never negative', () => {
    const stamps: ResultStamp[] = ['PASSED', 'SPLIT', 'NOT IT', 'SKIPPED', 'STALLED'];
    let lifetimeXp = 0;

    for (let streak = 0; streak <= 6; streak += 1) {
      for (const stamp of stamps) {
        const delta = calculateLifetimeXpDelta(stamp, streak);
        expect(delta).toBeGreaterThanOrEqual(0);
        const nextXp = lifetimeXp + delta;
        expect(nextXp).toBeGreaterThanOrEqual(lifetimeXp);
        lifetimeXp = nextXp;
      }
    }

    expect(calculateLifetimeXpDelta('PASSED', -5)).toBe(50);
    expect(calculateLifetimeXpDelta('SPLIT', 1)).toBe(35);
    expect(calculateLifetimeXpDelta('SKIPPED', 3)).toBe(0);
  });

  it('computes exponential levels monotonically', () => {
    expect(xpForLevel(0)).toBe(0);
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(100);
    expect(xpForLevel(3)).toBe(235);
    expect(xpForLevel(Number.NaN)).toBe(0);

    expect(calculateLevel(-10)).toBe(1);
    expect(calculateLevel(0)).toBe(1);
    expect(calculateLevel(99)).toBe(1);
    expect(calculateLevel(100)).toBe(2);
    expect(calculateLevel(234)).toBe(2);
    expect(calculateLevel(235)).toBe(3);

    // Property: levelFromXp(xp1) <= levelFromXp(xp2) whenever xp1 <= xp2
    let prevLevel = 1;
    for (let xp = 0; xp <= 5000; xp += 25) {
      const level = calculateLevel(xp);
      expect(level).toBeGreaterThanOrEqual(prevLevel);
      prevLevel = level;
    }
  });
});
