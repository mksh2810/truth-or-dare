import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z, type ZodTypeAny } from 'zod';
import { IdempotencyKeySchema } from '@vowlet/shared';
import { getEnvConfig } from './env.js';
import { ArbiterError, getArbiterStore, type ArbiterStore } from './store.js';

export interface RateLimitConfig {
  routeGroup: string;
  limit: number;
  windowMs: number;
}

export interface ArbiterMiddlewareOptions {
  rateLimit?: RateLimitConfig;
  requireIdempotency?: boolean;
}

export interface ArbiterContext<TBody> {
  req: VercelRequest;
  res: VercelResponse;
  uid: string;
  body: TBody;
  idempotencyKey: string;
  store: ArbiterStore;
}

export interface ArbiterGetContext {
  req: VercelRequest;
  res: VercelResponse;
  uid: string;
  store: ArbiterStore;
}

function getHeader(req: VercelRequest, name: string): string | undefined {
  const target = name.toLowerCase();
  for (const [k, v] of Object.entries(req.headers)) {
    if (k.toLowerCase() === target) {
      return Array.isArray(v) ? v[0] : v;
    }
  }
  return undefined;
}

function isOriginAllowed(origin: string, allowedOrigins: readonly string[], isDev: boolean): boolean {
  if (allowedOrigins.includes(origin)) {
    return true;
  }
  if (isDev && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
    return true;
  }
  return false;
}

export function applyCors(req: VercelRequest, res: VercelResponse): boolean {
  const env = getEnvConfig();
  const origin = getHeader(req, 'origin');
  const isDev = process.env.NODE_ENV !== 'production';

  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Firebase-AppCheck, X-Test-Uid, Idempotency-Key',
  );

  if (origin) {
    if (!isOriginAllowed(origin, env.allowedOrigins, isDev)) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Origin not allowed by CORS policy',
        },
      });
      return false;
    }
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return false;
  }

  return true;
}

async function authenticateRequest(req: VercelRequest, store: ArbiterStore): Promise<string> {
  const env = getEnvConfig();

  if (env.useMemoryStore && process.env.NODE_ENV !== 'production') {
    const testUid = getHeader(req, 'x-test-uid');
    if (testUid && testUid.trim().length > 0) {
      return testUid.trim();
    }
  }

  const authHeader = getHeader(req, 'authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ArbiterError(401, 'UNAUTHORIZED', 'Missing Bearer authorization token');
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    throw new ArbiterError(401, 'UNAUTHORIZED', 'Empty Bearer authorization token');
  }

  const verified = await store.verifyIdToken(token);

  if (env.appCheckEnforce) {
    const appCheckToken = getHeader(req, 'x-firebase-appcheck');
    if (!appCheckToken || appCheckToken.trim().length === 0) {
      throw new ArbiterError(401, 'APP_CHECK_FAILED', 'Missing Firebase App Check token');
    }
    await store.verifyAppCheckToken(appCheckToken.trim());
  }

  return verified.uid;
}

function sendArbiterError(res: VercelResponse, err: unknown): void {
  if (err instanceof ArbiterError) {
    if (err.code === 'VERSION_MISMATCH') {
      res.status(err.statusCode).json({
        ok: false,
        code: 'VERSION_MISMATCH',
        currentState: err.currentState,
        error: {
          code: err.code,
          message: err.message,
          currentState: err.currentState,
        },
      });
      return;
    }

    res.status(err.statusCode).json({
      ok: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.currentState ? { currentState: err.currentState } : {}),
      },
    });
    return;
  }

  res.status(500).json({
    ok: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    },
  });
}

function parseRawBody(req: VercelRequest): Record<string, unknown> {
  if (req.body === undefined || req.body === null) {
    return {};
  }
  if (typeof req.body === 'string') {
    if (req.body.trim() === '') {
      return {};
    }
    const parsed: unknown = JSON.parse(req.body);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    throw new ArbiterError(400, 'VALIDATION_ERROR', 'Request body must be a JSON object');
  }
  if (typeof req.body === 'object' && !Array.isArray(req.body)) {
    return req.body as Record<string, unknown>;
  }
  throw new ArbiterError(400, 'VALIDATION_ERROR', 'Request body must be a JSON object');
}

/**
 * Wraps a POST Arbiter endpoint with locked CORS, Firebase ID token + App Check auth,
 * sliding-window rate limiting, zod body validation, idempotency deduplication,
 * and standard error / VERSION_MISMATCH formatting.
 */
export async function withArbiterAuth<TSchema extends ZodTypeAny>(
  req: VercelRequest,
  res: VercelResponse,
  schema: TSchema,
  handler: (ctx: ArbiterContext<z.infer<TSchema>>) => Promise<{ status?: number; body: unknown }>,
  options: ArbiterMiddlewareOptions = {},
): Promise<void> {
  if (!applyCors(req, res)) {
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({
      ok: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Method not allowed',
      },
    });
    return;
  }

  const store = getArbiterStore();

  try {
    const uid = await authenticateRequest(req, store);

    const rateConfig = options.rateLimit ?? {
      routeGroup: 'default',
      limit: 60,
      windowMs: 60_000,
    };
    const rateResult = await store.checkRateLimit(
      uid,
      rateConfig.routeGroup,
      rateConfig.limit,
      rateConfig.windowMs,
    );
    if (!rateResult.allowed) {
      res.setHeader('Retry-After', String(Math.ceil(rateResult.retryAfterMs / 1000)));
      throw new ArbiterError(429, 'RATE_LIMITED', 'Too many requests, please slow down');
    }

    let rawObj: Record<string, unknown>;
    try {
      rawObj = parseRawBody(req);
    } catch (err) {
      if (err instanceof ArbiterError) throw err;
      throw new ArbiterError(400, 'VALIDATION_ERROR', 'Invalid JSON body');
    }

    // Normalize `code` -> `roomCode` if caller provided `code`
    const normalizedInput: Record<string, unknown> = { ...rawObj };
    if (normalizedInput.roomCode === undefined && typeof normalizedInput.code === 'string') {
      normalizedInput.roomCode = normalizedInput.code;
    }

    // Extract idempotencyKey from body or Idempotency-Key header
    const headerIdem = getHeader(req, 'idempotency-key');
    const rawIdem =
      typeof normalizedInput.idempotencyKey === 'string'
        ? normalizedInput.idempotencyKey
        : headerIdem;

    const requireIdem = options.requireIdempotency ?? true;
    let idempotencyKey = '';
    if (requireIdem) {
      const idemParse = IdempotencyKeySchema.safeParse(rawIdem);
      if (!idemParse.success) {
        throw new ArbiterError(
          400,
          'VALIDATION_ERROR',
          'Missing or invalid idempotencyKey (UUID required)',
        );
      }
      idempotencyKey = idemParse.data;
      if (normalizedInput.idempotencyKey === undefined) {
        normalizedInput.idempotencyKey = idempotencyKey;
      }
    }

    const parsed = schema.safeParse(normalizedInput);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      throw new ArbiterError(
        400,
        'VALIDATION_ERROR',
        firstIssue ? `${firstIssue.path.join('.')}: ${firstIssue.message}` : 'Validation error',
      );
    }

    const routePath = req.url?.split('?')[0] ?? rateConfig.routeGroup;

    if (requireIdem && idempotencyKey) {
      const cached = await store.getIdempotency(uid, routePath, idempotencyKey);
      if (cached) {
        res.status(cached.status).json(cached.body);
        return;
      }
    }

    const result = await handler({
      req,
      res,
      uid,
      body: parsed.data,
      idempotencyKey,
      store,
    });

    const status = result.status ?? 200;
    if (requireIdem && idempotencyKey && status >= 200 && status < 300) {
      await store.setIdempotency(uid, routePath, idempotencyKey, {
        status,
        body: result.body,
        createdAt: Date.now(),
      });
    }

    res.status(status).json(result.body);
  } catch (err) {
    sendArbiterError(res, err);
  }
}

/**
 * Wraps a GET Arbiter endpoint with locked CORS, Firebase ID token + App Check auth,
 * and sliding-window rate limiting.
 */
export async function withArbiterGet(
  req: VercelRequest,
  res: VercelResponse,
  handler: (ctx: ArbiterGetContext) => Promise<{ status?: number; body: unknown }>,
  options: { rateLimit?: RateLimitConfig } = {},
): Promise<void> {
  if (!applyCors(req, res)) {
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({
      ok: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Method not allowed',
      },
    });
    return;
  }

  const store = getArbiterStore();

  try {
    const uid = await authenticateRequest(req, store);

    const rateConfig = options.rateLimit ?? {
      routeGroup: 'read',
      limit: 120,
      windowMs: 60_000,
    };
    const rateResult = await store.checkRateLimit(
      uid,
      rateConfig.routeGroup,
      rateConfig.limit,
      rateConfig.windowMs,
    );
    if (!rateResult.allowed) {
      res.setHeader('Retry-After', String(Math.ceil(rateResult.retryAfterMs / 1000)));
      throw new ArbiterError(429, 'RATE_LIMITED', 'Too many requests, please slow down');
    }

    const result = await handler({ req, res, uid, store });
    res.status(result.status ?? 200).json(result.body);
  } catch (err) {
    sendArbiterError(res, err);
  }
}
