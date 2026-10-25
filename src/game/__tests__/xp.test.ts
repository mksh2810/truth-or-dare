import { describe, it, expect } from 'vitest';
import { xpForNext, applyXp, turnXp } from '../xp';

describe('xpForNext', () => {
  it('calculates XP threshold for each level', () => {
    expect(xpForNext(1)).toBe(100);
    expect(xpForNext(2)).toBe(175);
    expect(xpForNext(3)).toBe(250);
  });
});

describe('applyXp', () => {
  it('adds XP without level up', () => {
    const result = applyXp(1, 20, 50);
    expect(result).toEqual({ level: 1, xp: 70 });
  });

  it('levels up when exceeding threshold', () => {
    const result = applyXp(1, 80, 50); // Total 130 >= 100
    expect(result).toEqual({ level: 2, xp: 30 });
  });

  it('handles multi-level jumps', () => {
    // Lv1 needs 100, Lv2 needs 175. Total for 1->3 is 275.
    const result = applyXp(1, 0, 300);
    expect(result).toEqual({ level: 3, xp: 25 });
  });
});

describe('turnXp', () => {
  it('awards base 50 on pass, plus streak bonus capped at 30', () => {
    expect(turnXp('pass', 0)).toBe(50);
    expect(turnXp('pass', 1)).toBe(60);
    expect(turnXp('pass', 3)).toBe(80);
    expect(turnXp('pass', 5)).toBe(80); // Capped at +30
  });

  it('awards 10 on fail, 0 on skip', () => {
    expect(turnXp('fail', 3)).toBe(10);
    expect(turnXp('skip', 3)).toBe(0);
  });
});
