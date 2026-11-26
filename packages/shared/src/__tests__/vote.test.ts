import { describe, expect, it } from 'vitest';
import { computeQuorum, isStalled, tallyVotes } from '../vote.js';

describe('voting & quorum', () => {
  it('computes quorum as floor(witnessCount / 2) + 1', () => {
    expect(computeQuorum(0)).toBe(0);
    expect(computeQuorum(-1)).toBe(0);
    expect(computeQuorum(2)).toBe(2);
    expect(computeQuorum(3)).toBe(2);
    expect(computeQuorum(4)).toBe(3);
    expect(computeQuorum(5)).toBe(3);
    expect(computeQuorum(6)).toBe(4);
    expect(computeQuorum(7)).toBe(4);
  });

  it('detects stalled threshold (> 50% of witnesses)', () => {
    expect(isStalled(0, 4)).toBe(false);
    expect(isStalled(2, 0)).toBe(false);
    expect(isStalled(2, 4)).toBe(false); // exactly 50% is not enough
    expect(isStalled(3, 4)).toBe(true);
    expect(isStalled(2, 5)).toBe(false);
    expect(isStalled(3, 5)).toBe(true);
  });

  it('resolves PASSED, NOT IT, SPLIT, and STALLED accurately', () => {
    // Quorum met, Approve > Reject -> PASSED
    expect(
      tallyVotes({ approveCount: 3, rejectCount: 1, witnessCount: 5 }),
    ).toMatchObject({
      stamp: 'PASSED',
      quorumRequired: 3,
      quorumMet: true,
      castCount: 4,
    });

    // Quorum met, Reject > Approve -> NOT IT
    expect(
      tallyVotes({ approveCount: 1, rejectCount: 3, witnessCount: 5 }),
    ).toMatchObject({
      stamp: 'NOT IT',
      quorumMet: true,
    });

    // Quorum met, exact tie -> SPLIT
    expect(
      tallyVotes({ approveCount: 2, rejectCount: 2, witnessCount: 5 }),
    ).toMatchObject({
      stamp: 'SPLIT',
      quorumMet: true,
    });

    // No quorum -> SPLIT
    expect(
      tallyVotes({ approveCount: 2, rejectCount: 0, witnessCount: 5 }),
    ).toMatchObject({
      stamp: 'SPLIT',
      quorumMet: false,
    });

    // Stalled flag: Approve majority with quorum still yields PASSED
    expect(
      tallyVotes({ approveCount: 3, rejectCount: 1, witnessCount: 5, stalled: true }),
    ).toMatchObject({
      stamp: 'PASSED',
    });

    // Stalled flag: Reject majority, tie, or no quorum yields STALLED
    expect(
      tallyVotes({ approveCount: 1, rejectCount: 3, witnessCount: 5, stalled: true }),
    ).toMatchObject({
      stamp: 'STALLED',
    });
    expect(
      tallyVotes({ approveCount: 1, rejectCount: 0, witnessCount: 5, stalled: true }),
    ).toMatchObject({
      stamp: 'STALLED',
    });
  });

  it('satisfies quorum & tie property invariants across witness counts 2..7', () => {
    for (let w = 2; w <= 7; w += 1) {
      for (let a = 0; a <= w; a += 1) {
        for (let r = 0; r <= w - a; r += 1) {
          const res = tallyVotes({ approveCount: a, rejectCount: r, witnessCount: w });
          if (a + r <= w / 2) {
            expect(res.stamp).toBe('SPLIT');
          } else if (a === r) {
            expect(res.stamp).toBe('SPLIT');
          } else if (a > r) {
            expect(res.stamp).toBe('PASSED');
          } else {
            expect(res.stamp).toBe('NOT IT');
          }
        }
      }
    }
  });
});
