import { describe, expect, it } from 'vitest';
import {
  checkDeterministicModeration,
  fnv1aHash,
  normalizeTextForHash,
  sha256Hex,
} from '../moderation.js';

describe('deterministic moderation & hashing', () => {
  it('allows safe English and Hinglish chits under 140 chars', () => {
    expect(checkDeterministicModeration('Tell us your funniest college memory!')).toEqual({
      allowed: true,
      reason: null,
      categories: [],
    });
    expect(
      checkDeterministicModeration('Apne best friend ko call karke bolo "chai peene chale?"'),
    ).toEqual({
      allowed: true,
      reason: null,
      categories: [],
    });
  });

  it('blocks empty or >140 char chits', () => {
    expect(checkDeterministicModeration('   ').categories).toContain('LENGTH');
    expect(checkDeterministicModeration('a'.repeat(141)).categories).toContain('LENGTH');
  });

  it('blocks PII (email, phone, address)', () => {
    expect(checkDeterministicModeration('Email me at test@example.com').categories).toContain('PII');
    expect(checkDeterministicModeration('Call +91 98765 43210 right now').categories).toContain('PII');
    expect(checkDeterministicModeration('Meet at 221 Baker Street').categories).toContain('PII');
  });

  it('blocks alcohol/drugs, minors, sexual, violence/self-harm, unsafe dares, and Hinglish slurs', () => {
    expect(checkDeterministicModeration('Take a shot of vodka').categories).toContain('ALCOHOL_DRUGS');
    expect(checkDeterministicModeration('Daaru ki botal khol').categories).toContain('ALCOHOL_DRUGS');
    expect(checkDeterministicModeration('Text a minor right now').categories).toContain('MINORS');
    expect(checkDeterministicModeration('Send nudes to the group').categories).toContain('SEXUAL');
    expect(checkDeterministicModeration('Jump off the balcony').categories).toContain('UNSAFE_DARE');
    expect(checkDeterministicModeration('Go hurt or kill yourself').categories).toContain(
      'VIOLENCE_SELF_HARM',
    );
    expect(checkDeterministicModeration('Tu toh bada chutiya hai').categories).toContain(
      'HATE_SLURS',
    );
  });

  it('normalizes text and computes deterministic hashes', async () => {
    const a = normalizeTextForHash('  Hello,   WORLD!! ');
    const b = normalizeTextForHash('hello world');
    expect(a).toBe('hello world');
    expect(a).toBe(b);
    expect(fnv1aHash('  Hello,   WORLD!! ')).toBe(fnv1aHash('hello world'));
    const shaA = await sha256Hex('  Hello,   WORLD!! ');
    const shaB = await sha256Hex('hello world');
    expect(shaA).toHaveLength(64);
    expect(shaA).toBe(shaB);
  });
});
