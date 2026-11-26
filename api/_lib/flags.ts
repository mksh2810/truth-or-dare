import { getApps, initializeApp } from 'firebase-admin/app';
import { getRemoteConfig } from 'firebase-admin/remote-config';
import { SCHEMA_VERSION } from '@vowlet/shared';
import { getEnvConfig } from './env.js';

export interface FeatureFlags {
  llm_judge_enabled: boolean;
  video_enabled: boolean;
  community_deck_enabled: boolean;
  pause_room_creation: boolean;
  min_schema_version: number;
}

function parseBoolFlag(raw: string | undefined, defaultValue: boolean): boolean {
  if (raw === undefined) {
    return defaultValue;
  }
  const normalized = raw.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') {
    return true;
  }
  if (normalized === 'false' || normalized === '0') {
    return false;
  }
  return defaultValue;
}

function parsePositiveInt(raw: string | undefined, defaultValue: number): number {
  if (raw === undefined) {
    return defaultValue;
  }
  const parsed = Number.parseInt(raw.trim(), 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return defaultValue;
  }
  return parsed;
}

/**
 * Reads kill switches and feature flags from environment variables.
 * `llm_judge_enabled` defaults to `false` whenever `GEMINI_API_KEY` is absent.
 */
export function getFeatureFlags(overrides?: Partial<FeatureFlags>): FeatureFlags {
  const hasGeminiKey = Boolean(
    process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0,
  );

  const llmJudgeRaw = process.env.FLAG_LLM_JUDGE_ENABLED ?? process.env.LLM_JUDGE_ENABLED;
  const llmJudgeEnabled = hasGeminiKey ? parseBoolFlag(llmJudgeRaw, true) : false;

  const base: FeatureFlags = {
    llm_judge_enabled: llmJudgeEnabled,
    video_enabled: parseBoolFlag(
      process.env.FLAG_VIDEO_ENABLED ?? process.env.VIDEO_ENABLED,
      false,
    ),
    community_deck_enabled: parseBoolFlag(
      process.env.FLAG_COMMUNITY_DECK_ENABLED ?? process.env.COMMUNITY_DECK_ENABLED,
      true,
    ),
    pause_room_creation: parseBoolFlag(
      process.env.FLAG_PAUSE_ROOM_CREATION ?? process.env.PAUSE_ROOM_CREATION,
      false,
    ),
    min_schema_version: parsePositiveInt(
      process.env.FLAG_MIN_SCHEMA_VERSION ?? process.env.MIN_SCHEMA_VERSION,
      SCHEMA_VERSION,
    ),
  };

  if (!overrides) {
    return base;
  }

  return {
    ...base,
    ...overrides,
  };
}

/**
 * Fetches Remote Config template defaults in non-memory environments and merges
 * them over env defaults. Falls back safely to `getFeatureFlags()` on error.
 */
export async function getRemoteConfigFlags(): Promise<FeatureFlags> {
  const envFlags = getFeatureFlags();
  const env = getEnvConfig();
  if (env.useMemoryStore) {
    return envFlags;
  }

  try {
    if (getApps().length === 0) {
      initializeApp();
    }
    const template = await getRemoteConfig().getTemplate();
    const params = template.parameters ?? {};

    const readParam = (key: string): string | undefined => {
      const def = params[key]?.defaultValue;
      if (def && 'value' in def && typeof def.value === 'string') {
        return def.value;
      }
      return undefined;
    };

    const hasGeminiKey = Boolean(
      process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0,
    );

    return {
      llm_judge_enabled: hasGeminiKey
        ? parseBoolFlag(readParam('llm_judge_enabled'), envFlags.llm_judge_enabled)
        : false,
      video_enabled: parseBoolFlag(readParam('video_enabled'), envFlags.video_enabled),
      community_deck_enabled: parseBoolFlag(
        readParam('community_deck_enabled'),
        envFlags.community_deck_enabled,
      ),
      pause_room_creation: parseBoolFlag(
        readParam('pause_room_creation'),
        envFlags.pause_room_creation,
      ),
      min_schema_version: parsePositiveInt(
        readParam('min_schema_version'),
        envFlags.min_schema_version,
      ),
    };
  } catch {
    return envFlags;
  }
}
