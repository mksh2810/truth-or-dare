import { describe, it, expect } from 'vitest';
import { wilsonScoreLower, rankCandidatesByWilson } from '../wilson';
import { cosineSimilarity, trigramSimilarity, pseudoEmbed } from '../similarity';

describe('Wilson Score Lower Bound (LEARN-5)', () => {
  it('returns 0 for items with no ratings', () => {
    expect(wilsonScoreLower(0, 0)).toBe(0);
  });

  it('ranks high volume positive items above single positive items', () => {
    // 100 out of 100 vs 1 out of 1
    const score100of100 = wilsonScoreLower(100, 100);
    const score1of1 = wilsonScoreLower(1, 1);
    expect(score100of100).toBeGreaterThan(score1of1);
  });

  it('ranks higher fire ratio above lower fire ratio with equal sample size', () => {
    const scoreA = wilsonScoreLower(8, 10);
    const scoreB = wilsonScoreLower(4, 10);
    expect(scoreA).toBeGreaterThan(scoreB);
  });

  it('properly orders candidate list by Wilson lower bound', () => {
    const candidates = [
      { id: 'low-sample', fire: 1, mid: 0, tooMuch: 0 },
      { id: 'high-quality', fire: 90, mid: 10, tooMuch: 0 },
      { id: 'poor-quality', fire: 10, mid: 50, tooMuch: 40 },
    ];
    const sorted = rankCandidatesByWilson(candidates);
    expect(sorted[0].id).toBe('high-quality');
    expect(sorted[sorted.length - 1].id).toBe('poor-quality');
  });
});

describe('Vector & Trigram Similarity (LEARN-3)', () => {
  it('computes cosine similarity accurately', () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1.0);
    expect(cosineSimilarity([1, 0, 0], [0, 1, 0])).toBeCloseTo(0.0);
    expect(cosineSimilarity([1, 1], [-1, -1])).toBeCloseTo(-1.0);
  });

  it('calculates trigram similarity for similar sentences', () => {
    const s1 = 'What is your most embarrassing secret in school?';
    const s2 = 'What is your most embarrassing secret in college?';
    const s3 = 'Do a dramatic runway walk across the room.';

    const sim12 = trigramSimilarity(s1, s2);
    const sim13 = trigramSimilarity(s1, s3);

    expect(sim12).toBeGreaterThan(0.7);
    expect(sim13).toBeLessThan(0.3);
  });

  it('pseudoEmbed creates unit vectors with high cosine similarity for identical text', () => {
    const v1 = pseudoEmbed('Dance with no music for 60 seconds.');
    const v2 = pseudoEmbed('dance with no music for 60 seconds.');
    const v3 = pseudoEmbed('Confess your childhood crush.');

    expect(cosineSimilarity(v1, v2)).toBeGreaterThan(0.99);
    expect(cosineSimilarity(v1, v3)).toBeLessThan(0.5);
  });
});
