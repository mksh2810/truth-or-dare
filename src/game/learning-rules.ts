import { cosineSimilarity } from './similarity';

export interface ChitCandidate {
  id: string;
  text: string;
  normalisedText: string;
  type: 'truth' | 'dare';
  tier: 'mild' | 'spicy' | 'legend';
  authorUid: string;
  embedding: number[];
  plays: number;
  passes: number;
  fails: number;
  fire: number;
  mid: number;
  tooMuch: number;
  distinctRaters: number;
  raterUids: string[];
  reports: number;
  status: 'candidate' | 'promoted' | 'rejected';
  createdAt: string;
  promotedAt?: string;
  rejectionReason?: string;
}

/**
 * Evaluates whether a chit candidate meets all statistical criteria for promotion (LEARN-5):
 * - plays >= 3
 * - distinctRaters >= 5
 * - fire ratio >= 0.6 (60%)
 * - tooMuch ratio < 0.15 (15%)
 * - reports == 0
 * - status == 'candidate'
 */
export function meetsPromotionCriteria(candidate: ChitCandidate): {
  eligible: boolean;
  reasons: string[];
  fireRatio: number;
  tooMuchRatio: number;
} {
  const reasons: string[] = [];
  const totalRatings = candidate.fire + candidate.mid + candidate.tooMuch;
  const fireRatio = totalRatings > 0 ? candidate.fire / totalRatings : 0;
  const tooMuchRatio = totalRatings > 0 ? candidate.tooMuch / totalRatings : 0;

  if (candidate.status !== 'candidate') {
    reasons.push(`Status is already '${candidate.status}'`);
  }
  if (candidate.plays < 3) {
    reasons.push(`Requires at least 3 plays (currently ${candidate.plays})`);
  }
  if (candidate.distinctRaters < 5) {
    reasons.push(`Requires at least 5 distinct raters (currently ${candidate.distinctRaters})`);
  }
  if (fireRatio < 0.6) {
    reasons.push(`Fire ratio must be >= 60% (currently ${(fireRatio * 100).toFixed(1)}%)`);
  }
  if (tooMuchRatio >= 0.15) {
    reasons.push(`Too-much ratio must be < 15% (currently ${(tooMuchRatio * 100).toFixed(1)}%)`);
  }
  if (candidate.reports > 0) {
    reasons.push(`Reports must be 0 (currently ${candidate.reports})`);
  }

  return {
    eligible: reasons.length === 0,
    reasons,
    fireRatio,
    tooMuchRatio,
  };
}

/**
 * Searches existing candidates for a duplicate using cosine similarity.
 * Threshold is 0.9 per LEARN-3.
 */
export function findDuplicateCandidate(
  embedding: number[],
  existingCandidates: ChitCandidate[],
  threshold = 0.9
): ChitCandidate | null {
  if (!embedding || embedding.length === 0) return null;

  for (const existing of existingCandidates) {
    if (existing.embedding && existing.embedding.length === embedding.length) {
      const sim = cosineSimilarity(embedding, existing.embedding);
      if (sim >= threshold) {
        return existing;
      }
    }
  }
  return null;
}

/**
 * Merges counters when a duplicate chit is submitted (LEARN-3).
 */
export function mergeDuplicateCounters(
  original: ChitCandidate,
  additional: {
    plays?: number;
    passes?: number;
    fails?: number;
    fire?: number;
    mid?: number;
    tooMuch?: number;
    raterUid?: string;
  }
): ChitCandidate {
  const raterUids = [...original.raterUids];
  let distinctRaters = original.distinctRaters;

  if (additional.raterUid && !raterUids.includes(additional.raterUid)) {
    raterUids.push(additional.raterUid);
    distinctRaters += 1;
  }

  return {
    ...original,
    plays: original.plays + (additional.plays || 0),
    passes: original.passes + (additional.passes || 0),
    fails: original.fails + (additional.fails || 0),
    fire: original.fire + (additional.fire || 0),
    mid: original.mid + (additional.mid || 0),
    tooMuch: original.tooMuch + (additional.tooMuch || 0),
    distinctRaters,
    raterUids,
  };
}
