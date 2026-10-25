import { describe, it, expect } from 'vitest';
import {
  BASE,
  GROWTH,
  xpForNext,
  cumulativeXpForLevel,
  levelFromTotal,
  progress,
  applyTotalXp,
  turnXp,
  legacyToTotalXp,
} from '../xp';

describe('Exponential XP Constants (XP-4)', () => {
  it('exports BASE = 100 and GROWTH = 1.25', () => {
    expect(BASE).toBe(100);
    expect(GROWTH).toBe(1.25);
  });
});

describe('Monotonic growth & rounding', () => {
  it('rounds to nearest 5 and strictly increases monotonically', () => {
    for (let l = 1; l <= 25; l++) {
      const current = xpForNext(l);
      expect(current % 5).toBe(0);
      if (l > 1) {
        const prev = xpForNext(l - 1);
        expect(current).toBeGreaterThan(prev);
      }
    }
  });

  it('matches expected early level values', () => {
    expect(xpForNext(1)).toBe(100);
    expect(xpForNext(2)).toBe(125);
    expect(xpForNext(3)).toBe(155);
    expect(xpForNext(4)).toBe(195);
    expect(xpForNext(5)).toBe(245);
  });
});

describe('Property test: levelFromTotal and cumulative XP agreement', () => {
  it('consistently maps cumulative thresholds to exact levels', () => {
    for (let l = 1; l <= 30; l++) {
      const cum = cumulativeXpForLevel(l);
      expect(levelFromTotal(cum)).toBe(l);

      // 1 point before threshold should belong to previous level
      if (cum > 0) {
        expect(levelFromTotal(cum - 1)).toBe(l - 1);
      }

      // Check progress object at boundary
      const p = progress(cum);
      expect(p.level).toBe(l);
      expect(p.xpInLevel).toBe(0);
      expect(p.neededForNext).toBe(xpForNext(l));
      expect(p.progressRatio).toBe(0);
    }
  });
});

describe('applyTotalXp across multiple levels', () => {
  it('handles multi-level jumps smoothly', () => {
    // Level 1: 0 to 99
    // Level 2: 100 to 224
    // Level 3: 225 to 379
    // Level 4: 380+
    const initial = 50; // Level 1 (50/100)
    const result = applyTotalXp(initial, 350); // Total 400 => reaches Level 4!

    expect(result.previousLevel).toBe(1);
    expect(result.newLevel).toBe(4);
    expect(result.leveledUp).toBe(true);
    expect(result.newTotalXp).toBe(400);

    const cum4 = cumulativeXpForLevel(4); // 380
    expect(result.progress.xpInLevel).toBe(400 - cum4); // 20
    expect(result.progress.neededForNext).toBe(xpForNext(4)); // 195
  });
});

describe('legacyToTotalXp migration helper', () => {
  it('correctly converts legacy level and partial xp to totalXp', () => {
    // Legacy level 1, 40 xp => 40
    expect(legacyToTotalXp(1, 40)).toBe(40);

    // Legacy level 2 (needed 100 to finish lv 1), 50 xp => 100 + 50 = 150
    expect(legacyToTotalXp(2, 50)).toBe(150);

    // Legacy level 3 (100 + 175 = 275 base), 25 xp => 300
    expect(legacyToTotalXp(3, 25)).toBe(300);
  });
});

describe('turnXp', () => {
  it('awards base 50 on pass plus streak bonus capped at +30', () => {
    expect(turnXp('pass', 0)).toBe(50);
    expect(turnXp('pass', 1)).toBe(60);
    expect(turnXp('pass', 2)).toBe(70);
    expect(turnXp('pass', 3)).toBe(80);
    expect(turnXp('pass', 4)).toBe(80);
  });

  it('awards 10 on fail and 0 on skip', () => {
    expect(turnXp('fail', 3)).toBe(10);
    expect(turnXp('skip', 3)).toBe(0);
  });
});
