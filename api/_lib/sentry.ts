export const REDACTED = '[REDACTED]' as const;
export const REDACTED_SECRET_PATH = '[REDACTED_SECRET_PATH]' as const;

export interface SentryBreadcrumbLike {
  type?: string;
  category?: string;
  level?: string;
  message?: string;
  data?: Record<string, unknown>;
  timestamp?: number;
  [key: string]: unknown;
}

export interface SentryEventLike {
  message?: string;
  user?: Record<string, unknown>;
  request?: {
    url?: string;
    method?: string;
    headers?: Record<string, unknown>;
    data?: unknown;
    query_string?: unknown;
    cookies?: unknown;
    [key: string]: unknown;
  };
  extra?: Record<string, unknown>;
  contexts?: Record<string, unknown>;
  tags?: Record<string, unknown>;
  breadcrumbs?: SentryBreadcrumbLike[] | { values?: SentryBreadcrumbLike[] };
  exception?: {
    values?: Array<{
      type?: string;
      value?: string;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

const SENSITIVE_KEYS = new Set([
  'chittext',
  'prompttext',
  'secrettext',
  'sealedprompt',
  'privateprompt',
  'text',
  'playername',
  'displayname',
  'name',
  'username',
  'email',
  'token',
  'idtoken',
  'authtoken',
  'accesstoken',
  'refreshtoken',
  'appchecktoken',
  'authorization',
  'cookie',
  'cookies',
  'set-cookie',
  'x-firebase-appcheck',
  'x-test-uid',
  'x-api-key',
  'apikey',
  'gemini_api_key',
  'secret',
  'password',
  'authoruid',
  'ip_address',
]);

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const BEARER_REGEX = /\bBearer\s+[A-Za-z0-9\-._~+/]+=*/gi;
const JWT_REGEX = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g;
const SECRET_PATH_REGEX = /(?:\/?rooms\/[A-Za-z0-9_-]+\/)?\/?secret(?:\/[^\s"'`?&]*)?/gi;

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.has(key.trim().toLowerCase());
}

function scrubString(input: string): string {
  return input
    .replace(BEARER_REGEX, `Bearer ${REDACTED}`)
    .replace(JWT_REGEX, REDACTED)
    .replace(EMAIL_REGEX, REDACTED)
    .replace(SECRET_PATH_REGEX, REDACTED_SECRET_PATH);
}

function scrubValue(value: unknown, seen: WeakSet<object>, keyHint?: string): unknown {
  if (keyHint && isSensitiveKey(keyHint)) {
    return REDACTED;
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    return scrubString(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    if (seen.has(value)) {
      return REDACTED;
    }
    seen.add(value);
    return value.map((item) => scrubValue(item, seen));
  }

  if (typeof value === 'object') {
    if (seen.has(value)) {
      return REDACTED;
    }
    seen.add(value);
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = scrubValue(v, seen, k);
    }
    return out;
  }

  return REDACTED;
}

function scrubBreadcrumb(
  crumb: SentryBreadcrumbLike,
  seen: WeakSet<object>,
): SentryBreadcrumbLike {
  const out: SentryBreadcrumbLike = { ...crumb };
  if (typeof out.message === 'string') {
    out.message = scrubString(out.message);
  }
  if (out.data && typeof out.data === 'object') {
    out.data = scrubValue(out.data, seen) as Record<string, unknown>;
  }
  return out;
}

/**
 * Privacy scrubber for Sentry events (Section 9.5).
 * Strips chit text, player names, emails, auth tokens, and `secret` paths
 * from breadcrumbs, extra, request data, user, message, and exception values.
 * Returns a new scrubbed object without mutating the input.
 */
export function scrubSentryEvent<T extends SentryEventLike>(event: T): T {
  if (!event || typeof event !== 'object') {
    return event;
  }

  const seen = new WeakSet<object>();
  seen.add(event);

  const scrubbed: SentryEventLike = { ...event };

  if (typeof scrubbed.message === 'string') {
    scrubbed.message = scrubString(scrubbed.message);
  }

  if (scrubbed.user && typeof scrubbed.user === 'object') {
    scrubbed.user = scrubValue(scrubbed.user, seen) as Record<string, unknown>;
  }

  if (scrubbed.request && typeof scrubbed.request === 'object') {
    scrubbed.request = scrubValue(scrubbed.request, seen) as SentryEventLike['request'];
  }

  if (scrubbed.extra && typeof scrubbed.extra === 'object') {
    scrubbed.extra = scrubValue(scrubbed.extra, seen) as Record<string, unknown>;
  }

  if (scrubbed.contexts && typeof scrubbed.contexts === 'object') {
    scrubbed.contexts = scrubValue(scrubbed.contexts, seen) as Record<string, unknown>;
  }

  if (scrubbed.tags && typeof scrubbed.tags === 'object') {
    scrubbed.tags = scrubValue(scrubbed.tags, seen) as Record<string, unknown>;
  }

  if (Array.isArray(scrubbed.breadcrumbs)) {
    scrubbed.breadcrumbs = scrubbed.breadcrumbs.map((b) => scrubBreadcrumb(b, seen));
  } else if (
    scrubbed.breadcrumbs &&
    typeof scrubbed.breadcrumbs === 'object' &&
    Array.isArray(scrubbed.breadcrumbs.values)
  ) {
    scrubbed.breadcrumbs = {
      ...scrubbed.breadcrumbs,
      values: scrubbed.breadcrumbs.values.map((b) => scrubBreadcrumb(b, seen)),
    };
  }

  if (scrubbed.exception && typeof scrubbed.exception === 'object') {
    const ex = { ...scrubbed.exception };
    if (Array.isArray(ex.values)) {
      ex.values = ex.values.map((v) => ({
        ...v,
        ...(typeof v.value === 'string' ? { value: scrubString(v.value) } : {}),
      }));
    }
    scrubbed.exception = ex;
  }

  return scrubbed as T;
}
