import { getFirebaseClients, isLocalDevMode } from '../auth/firebase';

export interface VowletAnalyticsEventMap {
  table_created: {
    quickPlay: boolean;
    totalRounds: number;
    tableMode: boolean;
    passThePhone?: boolean;
  };
  table_joined: {
    method: 'code' | 'qr' | 'link';
    spectator: boolean;
  };
  game_started: {
    playerCount: number;
    quickPlay: boolean;
    packCount: number;
  };
  turn_completed: {
    kind: 'TRUTH' | 'DARE';
    resultStamp: string;
    durationSec: number;
    stalled: boolean;
  };
  chit_submitted: {
    kind: 'TRUTH' | 'DARE';
    verdict: 'FINE' | 'TOO_MILD' | 'NOPE';
    tier: string;
  };
  recap_shared: {
    method: 'web_share' | 'clipboard';
  };
  rematch_started: {
    playerCount: number;
  };
  table_mode_toggled: {
    enabled: boolean;
    mode: 'table' | 'pass_the_phone';
  };
}

export type VowletAnalyticsEventName = keyof VowletAnalyticsEventMap;

export type SafeAnalyticsPrimitive = string | number | boolean;

export interface AnalyticsEventRecord {
  name: VowletAnalyticsEventName;
  params: Record<string, SafeAnalyticsPrimitive>;
  timestamp: number;
}

declare global {
  interface Window {
    __vowletAnalytics?: AnalyticsEventRecord[];
  }
}

const MAX_BUFFER_SIZE = 100;
const OPT_OUT_KEY = 'vowlet_analytics_opt_out';

const PII_FORBIDDEN_KEYS = new Set([
  'name',
  'playername',
  'winnername',
  'displayname',
  'email',
  'text',
  'prompt',
  'code',
  'roomcode',
  'ip',
  'phone',
  'uid',
  'authoruid',
  'performeruid',
  'calllink',
]);

let memoryBuffer: AnalyticsEventRecord[] = [];
let firebaseAnalyticsPromise: Promise<import('firebase/analytics').Analytics | null> | null = null;

export function isAnalyticsOptedOut(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(OPT_OUT_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setAnalyticsOptOut(optOut: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (optOut) {
      window.localStorage.setItem(OPT_OUT_KEY, 'true');
    } else {
      window.localStorage.removeItem(OPT_OUT_KEY);
    }
  } catch {
    // storage unavailable
  }
}

/**
 * Strips any accidental PII keys and non-primitive values from analytics payloads.
 */
export function sanitizeAnalyticsParams(
  params: Record<string, unknown>,
): Record<string, SafeAnalyticsPrimitive> {
  const safe: Record<string, SafeAnalyticsPrimitive> = {};
  for (const [key, value] of Object.entries(params)) {
    if (PII_FORBIDDEN_KEYS.has(key.toLowerCase())) {
      continue;
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      if (typeof value === 'number' && !Number.isFinite(value)) continue;
      safe[key] = value;
    }
  }
  return safe;
}

async function resolveFirebaseAnalytics(): Promise<import('firebase/analytics').Analytics | null> {
  if (isLocalDevMode || typeof window === 'undefined') return null;
  const { app } = getFirebaseClients();
  if (!app) return null;

  if (!firebaseAnalyticsPromise) {
    firebaseAnalyticsPromise = (async () => {
      try {
        const mod = await import('firebase/analytics');
        const supported = await mod.isSupported();
        if (!supported) return null;
        return mod.getAnalytics(app);
      } catch {
        return null;
      }
    })();
  }

  return firebaseAnalyticsPromise;
}

/**
 * Emits a zero-PII analytics event to the testable buffer and Firebase Analytics (when configured).
 */
export function trackEvent<K extends VowletAnalyticsEventName>(
  name: K,
  params: VowletAnalyticsEventMap[K],
): AnalyticsEventRecord | null {
  if (isAnalyticsOptedOut()) {
    return null;
  }

  const safeParams = sanitizeAnalyticsParams(params as Record<string, unknown>);
  const record: AnalyticsEventRecord = {
    name,
    params: safeParams,
    timestamp: Date.now(),
  };

  memoryBuffer = [...memoryBuffer.slice(-(MAX_BUFFER_SIZE - 1)), record];
  if (typeof window !== 'undefined') {
    const existing = Array.isArray(window.__vowletAnalytics) ? window.__vowletAnalytics : [];
    window.__vowletAnalytics = [...existing.slice(-(MAX_BUFFER_SIZE - 1)), record];
  }

  void resolveFirebaseAnalytics().then(async (analytics) => {
    if (!analytics) return;
    try {
      const { logEvent } = await import('firebase/analytics');
      logEvent(analytics, name, safeParams);
    } catch {
      // Non-fatal in ad-blocked or offline environments
    }
  });

  return record;
}

export function getAnalyticsBuffer(): AnalyticsEventRecord[] {
  if (typeof window !== 'undefined' && Array.isArray(window.__vowletAnalytics)) {
    return window.__vowletAnalytics;
  }
  return memoryBuffer;
}

export function clearAnalyticsBuffer(): void {
  memoryBuffer = [];
  if (typeof window !== 'undefined') {
    window.__vowletAnalytics = [];
  }
}
