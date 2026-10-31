/**
 * Calculates the lower bound of the Wilson score confidence interval
 * for a Bernoulli parameter (default 95% confidence, z = 1.96).
 *
 * Used for ranking community chits and suggestions fairly,
 * penalizing items with very few ratings.
 */
export function wilsonScoreLower(positive: number, total: number, z = 1.96): number {
  if (total <= 0) return 0;
  const p = Math.max(0, positive) / total;
  const z2 = z * z;
  const denominator = 1 + z2 / total;
  const center = p + z2 / (2 * total);
  const spread = z * Math.sqrt((p * (1 - p) + z2 / (4 * total)) / total);

  return Math.max(0, (center - spread) / denominator);
}

export interface RatedCandidate {
  id: string;
  fire: number;
  mid: number;
  tooMuch: number;
  [key: string]: any;
}

/**
 * Ranks candidate chits by Wilson score lower bound on the fire ratio.
 */
export function rankCandidatesByWilson<T extends RatedCandidate>(candidates: T[]): T[] {
  return [...candidates].sort((a, b) => {
    const totalA = a.fire + a.mid + a.tooMuch;
    const totalB = b.fire + b.mid + b.tooMuch;
    const scoreA = wilsonScoreLower(a.fire, totalA);
    const scoreB = wilsonScoreLower(b.fire, totalB);
    return scoreB - scoreA;
  });
}
