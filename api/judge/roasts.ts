import type { ResultStamp } from '@vowlet/shared';
import type { JudgeAdapter } from './adapter.js';
import { runJudgePipeline, type JudgePipelineResult } from './pipeline.js';

export const CURATED_ROAST_TEMPLATES: Record<ResultStamp, readonly string[]> = {
  PASSED: [
    'Clean landing! {name} actually pulled it off without blinking.',
    'Not bad, {name}—even the Owl raised an eyebrow in respect.',
    'Full marks, {name}! Bilkul filmy style mein pass ho gaye.',
  ],
  'NOT IT': [
    'The table saw right through that, {name}—nice try though!',
    'Rejected by the jury! {name}, thoda aur effort lagao next round.',
    'Close, {name}, but the witnesses are tough critics tonight.',
  ],
  SPLIT: [
    'Right down the middle! {name} divided the room like pineapple on pizza.',
    'Half impressed, half suspicious—classic {name} energy.',
    'Fifty-fifty verdict! {name} keeps the streak alive on pure suspense.',
  ],
  SKIPPED: [
    'Tactical retreat by {name}! Minus 30 points, zero shame.',
    '{name} hit the eject button—Owl respects knowing your limits.',
    'Skipped! {name} saved the drama for the next spin.',
  ],
  STALLED: [
    'Clock ran out on {name}—even a sloth moves faster than that!',
    'Table voted "Taking Too Long"—{name}, next time bring a stopwatch.',
    'Stalled out! {name} left the room hanging in suspense.',
  ],
};

export interface PickCuratedRoastOptions {
  stamp?: ResultStamp;
  playerName?: string;
  seed?: number;
}

/**
 * Picks a warm, teasing-never-shaming curated Owl roast template (D27 / B6).
 */
export function pickCuratedRoast(options: PickCuratedRoastOptions = {}): string {
  const stamp = options.stamp ?? 'PASSED';
  const templates = CURATED_ROAST_TEMPLATES[stamp];
  const index = Math.abs(options.seed ?? 0) % templates.length;
  const template = templates[index] ?? templates[0]!;
  const safeName = (options.playerName ?? 'Player').trim() || 'Player';
  return template.replace(/\{name\}/g, safeName);
}

export interface ModerateRoastOptions {
  adapter?: JudgeAdapter;
  llmJudgeEnabled?: boolean;
  timeoutMs?: number;
  fallbackStamp?: ResultStamp;
  playerName?: string;
}

export interface ModerateRoastResult {
  allowed: boolean;
  text: string | null;
  owlReason: string;
  fallbackRoast: string;
  pipeline: JudgePipelineResult;
}

/**
 * Moderates any free-text roast through the full Judge Owl pipeline (D27).
 * Fails closed: if the roast is rejected, too mild, or pending retry, returns
 * `allowed: false` along with a safe curated fallback roast.
 */
export async function moderateRoastText(
  text: string,
  options: ModerateRoastOptions = {},
): Promise<ModerateRoastResult> {
  const pipeline = await runJudgePipeline(
    {
      text,
      kind: 'TRUTH',
      tier: 'SPICY',
      dareType: null,
    },
    {
      adapter: options.adapter,
      llmJudgeEnabled: options.llmJudgeEnabled,
      timeoutMs: options.timeoutMs,
    },
  );

  const fallbackRoast = pickCuratedRoast({
    stamp: options.fallbackStamp ?? 'NOT IT',
    playerName: options.playerName,
  });

  if (pipeline.outcome === 'APPROVED' && pipeline.verdict === 'FINE') {
    return {
      allowed: true,
      text: text.trim(),
      owlReason: pipeline.owlReason,
      fallbackRoast,
      pipeline,
    };
  }

  return {
    allowed: false,
    text: null,
    owlReason: pipeline.owlReason,
    fallbackRoast,
    pipeline,
  };
}
