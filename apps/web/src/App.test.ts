import { describe, expect, it } from 'vitest';
import { App, VOWLET_TAGLINE } from './App';

describe('@vowlet/web smoke', () => {
  it('exports App and the canonical tagline', () => {
    expect(typeof App).toBe('function');
    expect(VOWLET_TAGLINE).toBe('A little truth, a little trouble');
  });
});
