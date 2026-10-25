import { describe, it, expect } from 'vitest';
import { getRankTitle, COSMETIC_UNLOCKS } from '../ranks';

describe('getRankTitle', () => {
  it('maps levels to correct rank names per PACK.md 1.8', () => {
    expect(getRankTitle(1)).toBe('Fresh Chit');
    expect(getRankTitle(2)).toBe('Fresh Chit');
    expect(getRankTitle(3)).toBe('Table Warmer');
    expect(getRankTitle(4)).toBe('Table Warmer');
    expect(getRankTitle(5)).toBe('Mild Troublemaker');
    expect(getRankTitle(7)).toBe('Mild Troublemaker');
    expect(getRankTitle(8)).toBe('Certified Menace');
    expect(getRankTitle(10)).toBe('Certified Menace');
    expect(getRankTitle(11)).toBe('Spice Merchant');
    expect(getRankTitle(15)).toBe('Dare Devil');
    expect(getRankTitle(20)).toBe('Legend of the Table');
    expect(getRankTitle(50)).toBe('Legend of the Table');
  });

  it('contains expected cosmetics unlock thresholds', () => {
    expect(COSMETIC_UNLOCKS.some((u) => u.level === 2 && u.name.includes('Green Glass'))).toBe(true);
    expect(COSMETIC_UNLOCKS.some((u) => u.level === 4 && u.name.includes('Amber'))).toBe(true);
    expect(COSMETIC_UNLOCKS.some((u) => u.level === 10 && u.name.includes('Golden'))).toBe(true);
  });
});
