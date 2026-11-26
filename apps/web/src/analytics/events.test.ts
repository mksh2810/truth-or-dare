import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearAnalyticsBuffer,
  getAnalyticsBuffer,
  sanitizeAnalyticsParams,
  trackEvent,
} from './events';
import { BOTTLE_SKINS, normalizeBottleSkinId } from '../design/bottleSkins';

describe('Vowlet analytics instrumentation', () => {
  beforeEach(() => {
    clearAnalyticsBuffer();
  });

  it('strips PII fields and non-primitives', () => {
    const safe = sanitizeAnalyticsParams({
      quickPlay: true,
      totalRounds: 10,
      name: 'Alice',
      email: 'alice@example.com',
      text: 'Secret prompt',
      code: 'ABCDEF',
      uid: 'user-123',
      nested: { foo: 'bar' },
    });

    expect(safe).toEqual({
      quickPlay: true,
      totalRounds: 10,
    });
  });

  it('records all core contract events in the buffer', () => {
    trackEvent('table_created', { quickPlay: false, totalRounds: 10, tableMode: true });
    trackEvent('table_joined', { method: 'code', spectator: false });
    trackEvent('game_started', { playerCount: 4, quickPlay: false, packCount: 1 });
    trackEvent('chit_submitted', { kind: 'TRUTH', verdict: 'FINE', tier: 'MILD' });
    trackEvent('turn_completed', {
      kind: 'DARE',
      resultStamp: 'PASSED',
      durationSec: 18,
      stalled: false,
    });
    trackEvent('recap_shared', { method: 'clipboard' });
    trackEvent('rematch_started', { playerCount: 4 });
    trackEvent('table_mode_toggled', { enabled: true, mode: 'table' });

    const buffer = getAnalyticsBuffer();
    expect(buffer).toHaveLength(8);
    expect(buffer.map((e) => e.name)).toEqual([
      'table_created',
      'table_joined',
      'game_started',
      'chit_submitted',
      'turn_completed',
      'recap_shared',
      'rematch_started',
      'table_mode_toggled',
    ]);
  });

  it('supports all four bottle skins with amber fallback', () => {
    expect(BOTTLE_SKINS.map((s) => s.id)).toEqual(['amber', 'brass', 'emerald', 'crimson']);
    expect(normalizeBottleSkinId('emerald')).toBe('emerald');
    expect(normalizeBottleSkinId('unknown-skin')).toBe('amber');
  });
});
