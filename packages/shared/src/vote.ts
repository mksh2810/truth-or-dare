import type { ResultStamp } from './types.js';

export interface VoteTallyInput {
  approveCount: number;
  rejectCount: number;
  witnessCount: number;
  stalled?: boolean;
}

export interface VoteTallyResult {
  stamp: ResultStamp;
  quorumRequired: number;
  quorumMet: boolean;
  castCount: number;
  approveCount: number;
  rejectCount: number;
}

/**
 * Returns true when strictly more than 50% of witnesses have pressed "Taking Too Long".
 */
export function isStalled(stallVotesCount: number, witnessCount: number): boolean {
  if (witnessCount <= 0 || stallVotesCount <= 0) {
    return false;
  }
  return stallVotesCount > witnessCount / 2;
}

/**
 * Quorum requires strictly more than half of eligible witnesses to cast a vote.
 */
export function computeQuorum(witnessCount: number): number {
  if (witnessCount <= 0) {
    return 0;
  }
  return Math.floor(witnessCount / 2) + 1;
}

/**
 * Tallies cast witness votes and resolves the authoritative ResultStamp.
 * Only cast votes count; abstentions do not count as Reject.
 * No quorum or exact tie yields SPLIT (no host tie-break).
 */
export function tallyVotes(input: VoteTallyInput): VoteTallyResult {
  const approveCount = Math.max(0, Math.floor(input.approveCount));
  const rejectCount = Math.max(0, Math.floor(input.rejectCount));
  const witnessCount = Math.max(0, Math.floor(input.witnessCount));
  const castCount = approveCount + rejectCount;
  const quorumRequired = computeQuorum(witnessCount);
  const quorumMet = witnessCount > 0 && castCount >= quorumRequired;

  let stamp: ResultStamp;
  if (quorumMet && approveCount > rejectCount) {
    stamp = 'PASSED';
  } else if (input.stalled) {
    stamp = 'STALLED';
  } else if (!quorumMet || approveCount === rejectCount) {
    stamp = 'SPLIT';
  } else {
    stamp = 'NOT IT';
  }

  return {
    stamp,
    quorumRequired,
    quorumMet,
    castCount,
    approveCount,
    rejectCount,
  };
}
