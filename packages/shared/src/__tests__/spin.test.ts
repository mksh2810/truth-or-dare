import { describe, expect, it } from 'vitest';
import { computeTargetAngle, selectNextPerformerSeat, type SpinCandidate } from '../spin.js';

describe('spin selection & angle math', () => {
  it('returns null when no eligible candidates exist', () => {
    const candidates: SpinCandidate[] = [
      { uid: 'u1', seat: 0, online: false, banned: false, turnsTaken: 0 },
      { uid: 'u2', seat: 1, online: true, banned: true, turnsTaken: 0 },
      { uid: 'u3', seat: 2, online: true, banned: false, spectator: true, turnsTaken: 0 },
      { uid: 'u4', seat: 8, online: true, banned: false, turnsTaken: 0 },
    ];
    expect(selectNextPerformerSeat(candidates, null)).toBeNull();
  });

  it('excludes offline/banned/spectator and never repeats lastPerformer when >= 2 eligible', () => {
    const candidates: SpinCandidate[] = [
      { uid: 'u1', seat: 0, online: true, banned: false, turnsTaken: 0 },
      { uid: 'u2', seat: 1, online: true, banned: false, turnsTaken: 0 },
      { uid: 'u3', seat: 2, online: false, banned: false, turnsTaken: 0 },
      { uid: 'u4', seat: 3, online: true, banned: true, turnsTaken: 0 },
    ];

    for (let i = 0; i < 50; i += 1) {
      const picked = selectNextPerformerSeat(candidates, 'u1');
      expect(picked).toEqual({ uid: 'u2', seat: 1 });
    }
  });

  it('falls back to single eligible candidate even if they were lastPerformer', () => {
    const candidates: SpinCandidate[] = [
      { uid: 'u1', seat: 2, online: true, banned: false, turnsTaken: 3 },
      { uid: 'u2', seat: 4, online: false, banned: false, turnsTaken: 0 },
    ];
    expect(selectNextPerformerSeat(candidates, 'u1')).toEqual({ uid: 'u1', seat: 2 });
  });

  it('handles duplicate uid fallback and rng boundary >= 1', () => {
    const candidates: SpinCandidate[] = [
      { uid: 'u1', seat: 0, online: true, banned: false, turnsTaken: 0 },
      { uid: 'u1', seat: 1, online: true, banned: false, turnsTaken: 0 },
    ];
    expect(selectNextPerformerSeat(candidates, 'u1', () => 1.5)).toEqual({ uid: 'u1', seat: 0 });
  });

  it('favours players with fewer turnsTaken over 1000 simulated spins', () => {
    const candidates: SpinCandidate[] = [
      { uid: 'low', seat: 0, online: true, banned: false, turnsTaken: 0 },
      { uid: 'mid', seat: 1, online: true, banned: false, turnsTaken: 2 },
      { uid: 'high', seat: 2, online: true, banned: false, turnsTaken: 5 },
    ];

    let seed = 42;
    const deterministicRng = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    const counts: Record<string, number> = { low: 0, mid: 0, high: 0 };
    for (let i = 0; i < 1000; i += 1) {
      const picked = selectNextPerformerSeat(candidates, null, deterministicRng);
      expect(picked).not.toBeNull();
      if (picked) {
        counts[picked.uid] = (counts[picked.uid] ?? 0) + 1;
      }
    }

    expect(counts.low).toBeGreaterThan(counts.mid ?? 0);
    expect(counts.mid).toBeGreaterThan(counts.high ?? 0);
  });

  it('computes strictly increasing cumulative target angles aligned to mySeatIndex at bottom (180 deg)', () => {
    // 4 seats: step = 90 deg. mySeatIndex = 1.
    // Target seat 1 (self) -> 180 deg mod 360
    const a1 = computeTargetAngle(0, 1, 1, 4, 4);
    expect(a1).toBeGreaterThan(0);
    expect(a1 % 360).toBe(180);

    // Target seat 2 -> 180 + 90 = 270 deg mod 360
    const a2 = computeTargetAngle(a1, 2, 1, 4, 4);
    expect(a2).toBeGreaterThan(a1);
    expect(a2 % 360).toBe(270);

    // Crossing 350 -> 10 deg never reverses
    const a3 = computeTargetAngle(350, 3, 1, 4, 3);
    expect(a3).toBeGreaterThan(350);
    expect(a3 % 360).toBe(0);
  });
});
