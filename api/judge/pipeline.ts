import {
  checkDeterministicModeration,
  fnv1aHash,
  type ChitStatus,
  type DareType,
  type JudgeVerdict,
  type PromptKind,
  type Tier,
} from '@vowlet/shared';
import {
  createDefaultJudgeAdapter,
  DEFAULT_JUDGE_TIMEOUT_MS,
  detectPromptInjection,
  JudgeMalformedError,
  JudgeRateLimitError,
  JudgeTimeoutError,
  type JudgeAdapter,
  type JudgeInput,
  type JudgeOutput,
} from './adapter.js';

export type JudgeOutcome = 'APPROVED' | 'TOO_MILD' | 'REJECTED' | 'PENDING_RETRY';
export type JudgeStage = 'DETERMINISTIC' | 'CACHE' | 'LLM' | 'FILTER_FALLBACK' | 'FAIL_CLOSED';
export type JudgeFallbackAction = 'NONE' | 'REWRITE_OR_STARTER';

export interface JudgePipelineOptions {
  adapter?: JudgeAdapter;
  llmJudgeEnabled?: boolean;
  timeoutMs?: number;
  bypassCache?: boolean;
}

export interface JudgePipelineResult {
  outcome: JudgeOutcome;
  verdict: JudgeVerdict | null;
  status: ChitStatus;
  fallbackAction: JudgeFallbackAction;
  tier: Tier;
  dareType: DareType | null;
  owlReason: string;
  stage: JudgeStage;
  cached: boolean;
  retried: boolean;
  attempts: number;
  latencyMs: number;
  normalizedHash: string;
}

const MAX_CACHE_ENTRIES = 2000;
const verdictCache = new Map<string, JudgeOutput>();

function buildCacheKey(input: JudgeInput, normalizedHash: string): string {
  return `${normalizedHash}:${input.kind}:${input.tier}:${input.dareType ?? 'NONE'}`;
}

function setCachedVerdict(key: string, output: JudgeOutput): void {
  if (verdictCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = verdictCache.keys().next().value;
    if (oldestKey !== undefined) {
      verdictCache.delete(oldestKey);
    }
  }
  verdictCache.set(key, output);
}

export function clearJudgeCache(): void {
  verdictCache.clear();
}

export function getJudgeCacheSize(): number {
  return verdictCache.size;
}

function toSingleLineReason(reason: string | null | undefined, fallback: string): string {
  const cleaned = (reason ?? '').replace(/[\r\n]+/g, ' ').trim();
  return cleaned.length > 0 ? cleaned.slice(0, 200) : fallback;
}

function isRetryableJudgeError(err: unknown): boolean {
  return (
    err instanceof JudgeTimeoutError ||
    err instanceof JudgeRateLimitError ||
    err instanceof JudgeMalformedError
  );
}

function mapOutputToResult(
  output: JudgeOutput,
  meta: {
    stage: JudgeStage;
    cached: boolean;
    retried: boolean;
    attempts: number;
    latencyMs: number;
    normalizedHash: string;
    kind: PromptKind;
  },
): JudgePipelineResult {
  const dareType = meta.kind === 'TRUTH' ? null : output.dareType ?? 'INSTANT';

  if (output.verdict === 'FINE') {
    return {
      outcome: 'APPROVED',
      verdict: 'FINE',
      status: 'SEALED',
      fallbackAction: 'NONE',
      tier: output.tier,
      dareType,
      owlReason: toSingleLineReason(output.reason, 'Owl approves! Sealed onto the table.'),
      ...meta,
    };
  }

  if (output.verdict === 'TOO_MILD') {
    return {
      outcome: 'TOO_MILD',
      verdict: 'TOO_MILD',
      status: 'REJECTED',
      fallbackAction: 'REWRITE_OR_STARTER',
      tier: output.tier,
      dareType,
      owlReason: toSingleLineReason(
        output.reason,
        'A bit too tame for this table—spice it up or grab a starter prompt!',
      ),
      ...meta,
    };
  }

  return {
    outcome: 'REJECTED',
    verdict: 'NOPE',
    status: 'REJECTED',
    fallbackAction: 'REWRITE_OR_STARTER',
    tier: output.tier,
    dareType,
    owlReason: toSingleLineReason(
      output.reason,
      'Judge Owl says nope—keep it safe, 18+, and within table rules.',
    ),
    ...meta,
  };
}

/**
 * Full Judge Owl moderation & classification pipeline (Section 5.5 / D11):
 * 1. Deterministic filter (140 chars, English+Hinglish blocklists, PII, unsafe dares, prompt injection)
 * 2. Normalized-text hash cache
 * 3. Remote Config kill switch (`llmJudgeEnabled`)
 * 4. LLM adapter with 2.5s timeout + 1 retry on timeout/rate-limit/malformed
 * 5. Fail-closed (`PENDING_RETRY` / `REWRITE_OR_STARTER`, NEVER auto-approve)
 */
export async function runJudgePipeline(
  input: JudgeInput,
  options: JudgePipelineOptions = {},
): Promise<JudgePipelineResult> {
  const startedAt = performance.now();
  const normalizedHash = fnv1aHash(input.text);
  const dareType = input.kind === 'TRUTH' ? null : input.dareType ?? 'INSTANT';

  // Stage 1: Deterministic filter
  if (detectPromptInjection(input.text)) {
    return {
      outcome: 'REJECTED',
      verdict: 'NOPE',
      status: 'REJECTED',
      fallbackAction: 'REWRITE_OR_STARTER',
      tier: input.tier,
      dareType,
      owlReason: 'Nice try! Judge Owl ignores override tricks—write a real prompt.',
      stage: 'DETERMINISTIC',
      cached: false,
      retried: false,
      attempts: 0,
      latencyMs: performance.now() - startedAt,
      normalizedHash,
    };
  }

  const deterministic = checkDeterministicModeration(input.text);
  if (!deterministic.allowed) {
    return {
      outcome: 'REJECTED',
      verdict: 'NOPE',
      status: 'REJECTED',
      fallbackAction: 'REWRITE_OR_STARTER',
      tier: input.tier,
      dareType,
      owlReason: toSingleLineReason(
        deterministic.reason,
        'Keep prompts safe, 18+, and under 140 characters.',
      ),
      stage: 'DETERMINISTIC',
      cached: false,
      retried: false,
      attempts: 0,
      latencyMs: performance.now() - startedAt,
      normalizedHash,
    };
  }

  // Stage 2: Normalized-text hash cache
  const cacheKey = buildCacheKey(input, normalizedHash);
  if (!options.bypassCache) {
    const cached = verdictCache.get(cacheKey);
    if (cached) {
      return mapOutputToResult(cached, {
        stage: 'CACHE',
        cached: true,
        retried: false,
        attempts: 0,
        latencyMs: performance.now() - startedAt,
        normalizedHash,
        kind: input.kind,
      });
    }
  }

  // Stage 3: Kill switch check (Remote Config / env `llm_judge_enabled`)
  const llmEnabled = options.llmJudgeEnabled ?? process.env.LLM_JUDGE_ENABLED !== 'false';
  if (!llmEnabled) {
    return {
      outcome: 'APPROVED',
      verdict: 'FINE',
      status: 'SEALED',
      fallbackAction: 'NONE',
      tier: input.tier,
      dareType,
      owlReason: 'Owl approves! Sealed onto the table.',
      stage: 'FILTER_FALLBACK',
      cached: false,
      retried: false,
      attempts: 0,
      latencyMs: performance.now() - startedAt,
      normalizedHash,
    };
  }

  // Stage 4: LLM adapter with 1 retry on timeout / rate-limit / malformed output
  const adapter = options.adapter ?? createDefaultJudgeAdapter();
  const timeoutMs = options.timeoutMs ?? DEFAULT_JUDGE_TIMEOUT_MS;
  let attempts = 0;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    attempts = attempt;
    try {
      const output = await adapter.classify(input, { timeoutMs, attempt });
      if (!options.bypassCache) {
        setCachedVerdict(cacheKey, output);
      }
      return mapOutputToResult(output, {
        stage: 'LLM',
        cached: false,
        retried: attempt > 1,
        attempts,
        latencyMs: performance.now() - startedAt,
        normalizedHash,
        kind: input.kind,
      });
    } catch (err) {
      const canRetry = attempt === 1 && isRetryableJudgeError(err);
      if (canRetry) {
        continue;
      }
      break;
    }
  }

  // Stage 5: Fail-closed (NEVER auto-approve)
  return {
    outcome: 'PENDING_RETRY',
    verdict: null,
    status: 'PENDING',
    fallbackAction: 'REWRITE_OR_STARTER',
    tier: input.tier,
    dareType,
    owlReason:
      'Judge Owl blinked—this chit is pending. Rewrite it or pick a starter prompt!',
    stage: 'FAIL_CLOSED',
    cached: false,
    retried: attempts > 1,
    attempts,
    latencyMs: performance.now() - startedAt,
    normalizedHash,
  };
}
