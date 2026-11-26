import type { ChitStatus, DareType, PromptKind, Tier } from './types.js';

export interface DeckChit {
  id: string;
  kind: PromptKind;
  tier: Tier;
  dareType: DareType | null;
  status: ChitStatus;
}

export interface DrawChitResult {
  drawn: DeckChit | null;
  updatedPool: DeckChit[];
}

export type SwapChitResult =
  | {
      ok: true;
      drawn: DeckChit;
      updatedPool: DeckChit[];
      swapsRemaining: number;
    }
  | {
      ok: false;
      reason: 'NO_SWAPS_LEFT' | 'NO_CHIT_AVAILABLE';
    };

function isAvailable(chit: DeckChit, kind?: PromptKind, excludeChitId?: string | null): boolean {
  const statusOk = chit.status === 'SEALED' || chit.status === 'RETURNED';
  const kindOk = kind === undefined || chit.kind === kind;
  const notExcluded = excludeChitId === undefined || excludeChitId === null || chit.id !== excludeChitId;
  return statusOk && kindOk && notExcluded;
}

/**
 * Refills the room chit pool from the starter deck if no available chits remain
 * (optionally scoped to a specific `kind`).
 */
export function refillDeckIfEmpty(
  pool: readonly DeckChit[],
  starterDeck: readonly DeckChit[],
  kind?: PromptKind,
  excludeChitId?: string | null,
): DeckChit[] {
  const hasAvailable = pool.some((c) => isAvailable(c, kind, excludeChitId));
  if (hasAvailable) {
    return pool.map((c) => ({ ...c }));
  }

  const existingIds = new Set(pool.map((c) => c.id));
  const candidates = starterDeck.filter((c) => kind === undefined || c.kind === kind);
  const source = candidates.length > 0 ? candidates : starterDeck;

  const refilled = source.map((c, idx) => {
    const id = existingIds.has(c.id) ? `${c.id}_refill_${pool.length + idx}` : c.id;
    return {
      ...c,
      id,
      status: 'SEALED' as const,
    };
  });

  return [...pool.map((c) => ({ ...c })), ...refilled];
}

/**
 * Draws an available chit of the requested `kind`, refilling from `starterDeck` if exhausted.
 * Marks the drawn chit as `USED` in the returned pool.
 */
export function drawChit(
  pool: readonly DeckChit[],
  kind: PromptKind,
  starterDeck: readonly DeckChit[],
  excludeChitId?: string | null,
  rng: () => number = Math.random,
): DrawChitResult {
  const workingPool = refillDeckIfEmpty(pool, starterDeck, kind, excludeChitId);
  const available = workingPool.filter((c) => isAvailable(c, kind, excludeChitId));

  if (available.length === 0) {
    return { drawn: null, updatedPool: workingPool };
  }

  const index = Math.min(available.length - 1, Math.max(0, Math.floor(rng() * available.length)));
  const chosen = available[index] as DeckChit;

  const updatedPool = workingPool.map((c) =>
    c.id === chosen.id ? { ...c, status: 'USED' as const } : c,
  );
  const drawn: DeckChit = { ...chosen, status: 'USED' };

  return { drawn, updatedPool };
}

/**
 * Performs a 1-per-game free chit swap during PERFORM.
 * Returns the current chit to `RETURNED` and draws a different chit of the same `kind`.
 */
export function swapChit(
  pool: readonly DeckChit[],
  currentChitId: string,
  kind: PromptKind,
  starterDeck: readonly DeckChit[],
  swapsRemaining: number,
  rng: () => number = Math.random,
): SwapChitResult {
  if (swapsRemaining <= 0) {
    return { ok: false, reason: 'NO_SWAPS_LEFT' };
  }

  const returnedPool = pool.map((c) =>
    c.id === currentChitId ? { ...c, status: 'RETURNED' as const } : c,
  );

  const { drawn, updatedPool } = drawChit(returnedPool, kind, starterDeck, currentChitId, rng);
  if (!drawn) {
    return { ok: false, reason: 'NO_CHIT_AVAILABLE' };
  }

  return {
    ok: true,
    drawn,
    updatedPool,
    swapsRemaining: swapsRemaining - 1,
  };
}
