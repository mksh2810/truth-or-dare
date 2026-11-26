import { describe, expect, it } from 'vitest';
import { drawChit, refillDeckIfEmpty, swapChit, type DeckChit } from '../deck.js';

const starterDeck: DeckChit[] = [
  { id: 's-t1', kind: 'TRUTH', tier: 'MILD', dareType: null, status: 'SEALED' },
  { id: 's-d1', kind: 'DARE', tier: 'SPICY', dareType: 'INSTANT', status: 'SEALED' },
];

describe('deck draw, refill & swap', () => {
  it('draws an available chit and marks it USED', () => {
    const pool: DeckChit[] = [
      { id: 'c1', kind: 'TRUTH', tier: 'MILD', dareType: null, status: 'SEALED' },
      { id: 'c2', kind: 'DARE', tier: 'MILD', dareType: 'INSTANT', status: 'SEALED' },
    ];

    const { drawn, updatedPool } = drawChit(pool, 'TRUTH', starterDeck, null, () => 0);
    expect(drawn).toMatchObject({ id: 'c1', kind: 'TRUTH', status: 'USED' });
    expect(updatedPool.find((c) => c.id === 'c1')?.status).toBe('USED');
  });

  it('refills from starter deck when pool is exhausted', () => {
    const emptyPool: DeckChit[] = [
      { id: 's-t1', kind: 'TRUTH', tier: 'MILD', dareType: null, status: 'USED' },
    ];

    const refilled = refillDeckIfEmpty(emptyPool, starterDeck, 'TRUTH');
    expect(refilled.length).toBeGreaterThan(1);
    expect(refilled.some((c) => c.kind === 'TRUTH' && c.status === 'SEALED')).toBe(true);

    const { drawn } = drawChit(emptyPool, 'TRUTH', starterDeck);
    expect(drawn).not.toBeNull();
    expect(drawn?.kind).toBe('TRUTH');
    expect(drawn?.status).toBe('USED');
  });

  it('supports 1 free swap per game and rejects a second swap', () => {
    const pool: DeckChit[] = [
      { id: 't1', kind: 'TRUTH', tier: 'MILD', dareType: null, status: 'USED' },
      { id: 't2', kind: 'TRUTH', tier: 'SPICY', dareType: null, status: 'SEALED' },
    ];

    const firstSwap = swapChit(pool, 't1', 'TRUTH', starterDeck, 1, () => 0);
    expect(firstSwap.ok).toBe(true);
    if (firstSwap.ok) {
      expect(firstSwap.drawn.id).toBe('t2');
      expect(firstSwap.swapsRemaining).toBe(0);
      expect(firstSwap.updatedPool.find((c) => c.id === 't1')?.status).toBe('RETURNED');

      const secondSwap = swapChit(
        firstSwap.updatedPool,
        't2',
        'TRUTH',
        starterDeck,
        firstSwap.swapsRemaining,
      );
      expect(secondSwap).toEqual({ ok: false, reason: 'NO_SWAPS_LEFT' });
    }
  });
});
