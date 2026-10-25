import { describe, it, expect } from 'vitest';
import { getSeededTilt } from '../tilt';

describe('getSeededTilt', () => {
  it('returns deterministic tilt for the same id', () => {
    const tilt1 = getSeededTilt('chit-123');
    const tilt2 = getSeededTilt('chit-123');
    expect(tilt1).toBe(tilt2);
  });

  it('stays within the specified bounds (-2.5 to 2.5)', () => {
    for (let i = 0; i < 50; i++) {
      const tilt = getSeededTilt(`test-item-${i}`);
      expect(tilt).toBeGreaterThanOrEqual(-2.5);
      expect(tilt).toBeLessThanOrEqual(2.5);
    }
  });

  it('returns 0 for empty id', () => {
    expect(getSeededTilt('')).toBe(0);
  });
});
