import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { MockJudgeAdapter, type JudgeAdapter, type JudgeOutput } from '../adapter.js';
import { clearJudgeCache, getJudgeCacheSize, runJudgePipeline } from '../pipeline.js';
import { moderateRoastText, pickCuratedRoast } from '../roasts.js';

const CalibrationItemSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  kind: z.enum(['TRUTH', 'DARE']),
  dareType: z.enum(['INSTANT', 'SOCIAL']).nullable(),
  expectedVerdict: z.enum(['FINE', 'TOO_MILD', 'NOPE']),
  expectedTier: z.enum(['MILD', 'SPICY', 'LEGEND']),
  category: z.string().min(1),
});

type CalibrationItem = z.infer<typeof CalibrationItemSchema>;

function loadCalibrationSet(): CalibrationItem[] {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const calPath = path.resolve(__dirname, '../../../content/calibration-set.json');
  const raw = JSON.parse(fs.readFileSync(calPath, 'utf8')) as unknown;
  return z.array(CalibrationItemSchema).parse(raw);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

describe('Judge Owl Calibration & Pipeline Eval (D11 / D27 / D29)', () => {
  beforeEach(() => {
    clearJudgeCache();
  });

  it('meets all calibration gates across 320 labelled chits', async () => {
    const items = loadCalibrationSet();
    expect(items.length).toBe(320);

    const fineItems = items.filter((i) => i.expectedVerdict === 'FINE');
    const nopeItems = items.filter((i) => i.expectedVerdict === 'NOPE');
    const tooMildItems = items.filter((i) => i.expectedVerdict === 'TOO_MILD');

    expect(fineItems.length).toBeGreaterThanOrEqual(150);
    expect(nopeItems.length).toBeGreaterThanOrEqual(120);
    expect(tooMildItems.length).toBe(50);

    const adapter = new MockJudgeAdapter();
    const latencies: number[] = [];

    let nopeBlocked = 0;
    let fineFalseBlocked = 0;
    let tooMildCaught = 0;
    const misses: Array<{ id: string; expected: string; actual: string | null; text: string }> = [];

    for (const item of items) {
      const res = await runJudgePipeline(
        {
          text: item.text,
          kind: item.kind,
          tier: item.expectedTier,
          dareType: item.dareType,
        },
        {
          adapter,
          llmJudgeEnabled: true,
          bypassCache: true,
        },
      );

      latencies.push(res.latencyMs);

      if (item.expectedVerdict === 'NOPE') {
        if (res.verdict === 'NOPE' && res.status === 'REJECTED') {
          nopeBlocked += 1;
        } else {
          misses.push({
            id: item.id,
            expected: item.expectedVerdict,
            actual: res.verdict,
            text: item.text,
          });
        }
      } else if (item.expectedVerdict === 'FINE') {
        if (res.verdict !== 'FINE' || res.status !== 'SEALED') {
          fineFalseBlocked += 1;
          misses.push({
            id: item.id,
            expected: item.expectedVerdict,
            actual: res.verdict,
            text: item.text,
          });
        }
      } else if (item.expectedVerdict === 'TOO_MILD') {
        if (res.verdict === 'TOO_MILD' && res.status === 'REJECTED') {
          tooMildCaught += 1;
        } else {
          misses.push({
            id: item.id,
            expected: item.expectedVerdict,
            actual: res.verdict,
            text: item.text,
          });
        }
      }
    }

    const adversarialBlockRate = (nopeBlocked / nopeItems.length) * 100;
    const fineFalseBlockRate = (fineFalseBlocked / fineItems.length) * 100;
    const tooMildDetectionRate = (tooMildCaught / tooMildItems.length) * 100;
    const medianLatencyMs = median(latencies);

    console.info(
      `[Judge Eval] total=${items.length} | NOPE block=${nopeBlocked}/${nopeItems.length} (${adversarialBlockRate.toFixed(2)}%) | FINE false-block=${fineFalseBlocked}/${fineItems.length} (${fineFalseBlockRate.toFixed(2)}%) | TOO_MILD=${tooMildCaught}/${tooMildItems.length} (${tooMildDetectionRate.toFixed(2)}%) | medianLatency=${medianLatencyMs.toFixed(3)}ms`,
    );

    if (misses.length > 0) {
      console.warn('[Judge Eval] Misses:', misses.slice(0, 10));
    }

    expect(adversarialBlockRate).toBeGreaterThanOrEqual(95);
    expect(fineFalseBlockRate).toBeLessThanOrEqual(10);
    expect(tooMildDetectionRate).toBeGreaterThanOrEqual(90);
    expect(medianLatencyMs).toBeLessThanOrEqual(2500);
  });

  it('retries once on __SIMULATE_TIMEOUT__ and fails closed without auto-approving', async () => {
    const adapter = new MockJudgeAdapter();
    const classifySpy = vi.spyOn(adapter, 'classify');

    const res = await runJudgePipeline(
      {
        text: 'Tell us a secret __SIMULATE_TIMEOUT__',
        kind: 'TRUTH',
        tier: 'SPICY',
        dareType: null,
      },
      {
        adapter,
        llmJudgeEnabled: true,
      },
    );

    expect(classifySpy).toHaveBeenCalledTimes(2);
    expect(res.attempts).toBe(2);
    expect(res.retried).toBe(true);
    expect(res.outcome).toBe('PENDING_RETRY');
    expect(res.verdict).toBeNull();
    expect(res.status).toBe('PENDING');
    expect(res.fallbackAction).toBe('REWRITE_OR_STARTER');
    expect(res.stage).toBe('FAIL_CLOSED');
    expect(res.owlReason.length).toBeGreaterThan(0);
    expect(getJudgeCacheSize()).toBe(0);
  });

  it('retries once on __SIMULATE_MALFORMED__ and fails closed', async () => {
    const adapter = new MockJudgeAdapter();
    const res = await runJudgePipeline(
      {
        text: 'Do a dramatic monologue __SIMULATE_MALFORMED__',
        kind: 'DARE',
        tier: 'MILD',
        dareType: 'INSTANT',
      },
      {
        adapter,
        llmJudgeEnabled: true,
      },
    );

    expect(res.attempts).toBe(2);
    expect(res.retried).toBe(true);
    expect(res.outcome).toBe('PENDING_RETRY');
    expect(res.verdict).toBeNull();
    expect(res.status).toBe('PENDING');
  });

  it('caches verdicts by normalized text hash across punctuation/case differences', async () => {
    const mockOutput: JudgeOutput = {
      verdict: 'FINE',
      tier: 'SPICY',
      dareType: null,
      reason: 'Owl approves!',
    };
    const spyAdapter: JudgeAdapter = {
      name: 'spy-adapter',
      classify: vi.fn().mockResolvedValue(mockOutput),
    };

    const first = await runJudgePipeline(
      {
        text: 'What is your pettiest unfollow reason?',
        kind: 'TRUTH',
        tier: 'SPICY',
        dareType: null,
      },
      { adapter: spyAdapter, llmJudgeEnabled: true },
    );

    const second = await runJudgePipeline(
      {
        text: '  WHAT IS YOUR PETTIEST UNFOLLOW REASON?! ',
        kind: 'TRUTH',
        tier: 'SPICY',
        dareType: null,
      },
      { adapter: spyAdapter, llmJudgeEnabled: true },
    );

    expect(first.stage).toBe('LLM');
    expect(first.cached).toBe(false);
    expect(second.stage).toBe('CACHE');
    expect(second.cached).toBe(true);
    expect(spyAdapter.classify).toHaveBeenCalledTimes(1);
  });

  it('honors llmJudgeEnabled=false kill switch and falls back to deterministic filter', async () => {
    const spyAdapter: JudgeAdapter = {
      name: 'spy-adapter',
      classify: vi.fn(),
    };

    const res = await runJudgePipeline(
      {
        text: 'Confess the weirdest snack combo you love.',
        kind: 'TRUTH',
        tier: 'MILD',
        dareType: null,
      },
      { adapter: spyAdapter, llmJudgeEnabled: false },
    );

    expect(spyAdapter.classify).not.toHaveBeenCalled();
    expect(res.stage).toBe('FILTER_FALLBACK');
    expect(res.outcome).toBe('APPROVED');
    expect(res.verdict).toBe('FINE');
    expect(res.status).toBe('SEALED');
  });

  it('moderates free-text roasts via the same pipeline and provides curated fallbacks (D27)', async () => {
    const adapter = new MockJudgeAdapter();

    const safeRoast = await moderateRoastText('Even my grandma spins faster than that!', {
      adapter,
      llmJudgeEnabled: true,
      playerName: 'Aarav',
    });
    expect(safeRoast.allowed).toBe(true);
    expect(safeRoast.text).toBe('Even my grandma spins faster than that!');

    const unsafeRoast = await moderateRoastText('Go drink some vodka, chutiya!', {
      adapter,
      llmJudgeEnabled: true,
      playerName: 'Aarav',
      fallbackStamp: 'NOT IT',
    });
    expect(unsafeRoast.allowed).toBe(false);
    expect(unsafeRoast.text).toBeNull();
    expect(unsafeRoast.fallbackRoast).toContain('Aarav');

    const curated = pickCuratedRoast({ stamp: 'SPLIT', playerName: 'Mira', seed: 1 });
    expect(curated).toContain('Mira');
  });
});
