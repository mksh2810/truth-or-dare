import { describe, it, expect } from 'vitest';
import {
  meetsPromotionCriteria,
  findDuplicateCandidate,
  mergeDuplicateCounters,
  ChitCandidate,
} from '../learning-rules';

const baseCandidate: ChitCandidate = {
  id: 'cand-1',
  text: 'Tell a story in an operatic singing voice.',
  normalisedText: 'tell a story in an operatic singing voice.',
  type: 'dare',
  tier: 'spicy',
  authorUid: 'user-1',
  embedding: [0.5, 0.5, 0.5, 0.5],
  plays: 4,
  passes: 4,
  fails: 0,
  fire: 8,
  mid: 2,
  tooMuch: 0,
  distinctRaters: 6,
  raterUids: ['u1', 'u2', 'u3', 'u4', 'u5', 'u6'],
  reports: 0,
  status: 'candidate',
  createdAt: new Date().toISOString(),
};

describe('Candidate Promotion Thresholds (LEARN-5)', () => {
  it('approves a candidate meeting all thresholds', () => {
    const evalResult = meetsPromotionCriteria(baseCandidate);
    expect(evalResult.eligible).toBe(true);
    expect(evalResult.reasons).toHaveLength(0);
    expect(evalResult.fireRatio).toBe(0.8);
    expect(evalResult.tooMuchRatio).toBe(0);
  });

  it('rejects candidate with fewer than 3 plays', () => {
    const candidate = { ...baseCandidate, plays: 2 };
    const evalResult = meetsPromotionCriteria(candidate);
    expect(evalResult.eligible).toBe(false);
    expect(evalResult.reasons.some((r) => r.includes('3 plays'))).toBe(true);
  });

  it('rejects candidate with fewer than 5 distinct raters', () => {
    const candidate = { ...baseCandidate, distinctRaters: 4 };
    const evalResult = meetsPromotionCriteria(candidate);
    expect(evalResult.eligible).toBe(false);
    expect(evalResult.reasons.some((r) => r.includes('5 distinct raters'))).toBe(true);
  });

  it('rejects candidate with fire ratio below 0.6', () => {
    // 5 fire, 5 mid => 50% fire ratio
    const candidate = { ...baseCandidate, fire: 5, mid: 5, tooMuch: 0 };
    const evalResult = meetsPromotionCriteria(candidate);
    expect(evalResult.eligible).toBe(false);
    expect(evalResult.reasons.some((r) => r.includes('Fire ratio'))).toBe(true);
  });

  it('rejects candidate with tooMuch ratio >= 0.15', () => {
    // 8 fire, 0 mid, 2 tooMuch => 20% tooMuch
    const candidate = { ...baseCandidate, fire: 8, mid: 0, tooMuch: 2 };
    const evalResult = meetsPromotionCriteria(candidate);
    expect(evalResult.eligible).toBe(false);
    expect(evalResult.reasons.some((r) => r.includes('Too-much ratio'))).toBe(true);
  });

  it('strictly rejects candidate with any reports', () => {
    const candidate = { ...baseCandidate, reports: 1 };
    const evalResult = meetsPromotionCriteria(candidate);
    expect(evalResult.eligible).toBe(false);
    expect(evalResult.reasons.some((r) => r.includes('Reports must be 0'))).toBe(true);
  });
});

describe('Duplicate Candidate Detection (LEARN-3)', () => {
  it('detects candidate with cosine similarity >= 0.9', () => {
    const list = [baseCandidate];
    // identical direction
    const duplicate = findDuplicateCandidate([0.5, 0.5, 0.5, 0.5], list, 0.9);
    expect(duplicate?.id).toBe('cand-1');

    // completely orthogonal
    const different = findDuplicateCandidate([1, -1, 1, -1], list, 0.9);
    expect(different).toBeNull();
  });

  it('merges counters and distinct raters properly', () => {
    const updated = mergeDuplicateCounters(baseCandidate, {
      plays: 1,
      fire: 1,
      raterUid: 'u7', // new rater
    });
    expect(updated.plays).toBe(5);
    expect(updated.fire).toBe(9);
    expect(updated.distinctRaters).toBe(7);
    expect(updated.raterUids).toContain('u7');
  });
});
