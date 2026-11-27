import { existsSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import * as nodeModule from 'node:module';
import { fileURLToPath } from 'node:url';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Map `.js` relative TypeScript imports to `.ts` when running directly under Node 26+.
const modWithHooks = nodeModule as unknown as {
  registerHooks?: (hooks: {
    resolve: (
      specifier: string,
      context: { parentURL?: string },
      nextResolve: (specifier: string, context: { parentURL?: string }) => unknown,
    ) => unknown;
  }) => void;
};

if (typeof modWithHooks.registerHooks === 'function') {
  modWithHooks.registerHooks({
    resolve(specifier, context, nextResolve) {
      try {
        return nextResolve(specifier, context);
      } catch (err) {
        if (specifier.endsWith('.js') && context.parentURL?.startsWith('file:')) {
          const tsSpecifier = `${specifier.slice(0, -3)}.ts`;
          const candidateUrl = new URL(tsSpecifier, context.parentURL);
          if (existsSync(fileURLToPath(candidateUrl))) {
            return nextResolve(tsSpecifier, context);
          }
        }
        throw err;
      }
    },
  });
}

if (!process.env.VOWLET_LOCAL_MEMORY && !process.env.FIREBASE_SERVICE_ACCOUNT_JSON && !process.env.FIRESTORE_EMULATOR_HOST) {
  process.env.VOWLET_LOCAL_MEMORY = '1';
}

type VercelHandler = (req: VercelRequest, res: VercelResponse) => void | Promise<void>;

async function loadRoutes(): Promise<Map<string, VercelHandler>> {
  const entries: Array<[string, () => Promise<{ default: VercelHandler }>]> = [
    ['/api/health', () => import('./health.js')],
    ['/api/room/create', () => import('./room/create.js')],
    ['/api/room/join', () => import('./room/join.js')],
    ['/api/room/leave', () => import('./room/leave.js')],
    ['/api/room/kick', () => import('./room/kick.js')],
    ['/api/room/settings', () => import('./room/settings.js')],
    ['/api/room/start', () => import('./room/start.js')],
    ['/api/room/state', () => import('./room/state.js')],
    ['/api/chit/submit', () => import('./chit/submit.js')],
    ['/api/chit/swap', () => import('./chit/swap.js')],
    ['/api/turn/advance', () => import('./turn/advance.js')],
    ['/api/turn/choose', () => import('./turn/choose.js')],
    ['/api/turn/vote', () => import('./turn/vote.js')],
    ['/api/turn/perform/done', () => import('./turn/perform/done.js')],
    ['/api/turn/perform/skip', () => import('./turn/perform/skip.js')],
    ['/api/turn/perform/stall', () => import('./turn/perform/stall.js')],
    ['/api/game/finish', () => import('./game/finish.js')],
    ['/api/room/migrate', () => import('./room/migrate.js')],
    ['/api/report', () => import('./report.js')],
    ['/api/user/delete', () => import('./user/delete.js')],
    ['/api/prompts/community', () => import('./prompts/community.js')],
    ['/api/prompts/rate', () => import('./prompts/rate.js')],
    ['/api/prompts/delete', () => import('./prompts/delete.js')],
    ['/api/rtc/signal', () => import('./rtc/signal.js')],
  ];

  const map = new Map<string, VercelHandler>();
  for (const [route, loader] of entries) {
    const mod = await loader();
    map.set(route, mod.default);
  }
  return map;
}

async function readRequestBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

function buildQuery(searchParams: URLSearchParams): Record<string, string | string[]> {
  const query: Record<string, string | string[]> = {};
  for (const [key, value] of searchParams.entries()) {
    const existing = query[key];
    if (existing === undefined) {
      query[key] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      query[key] = [existing, value];
    }
  }
  return query;
}

function createVercelResponse(res: ServerResponse): VercelResponse {
  const vercelRes = res as unknown as VercelResponse;

  vercelRes.status = (statusCode: number): VercelResponse => {
    res.statusCode = statusCode;
    return vercelRes;
  };

  vercelRes.json = (body: unknown): VercelResponse => {
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
    res.end(JSON.stringify(body));
    return vercelRes;
  };

  vercelRes.send = (body: unknown): VercelResponse => {
    if (typeof body === 'object' && body !== null && !Buffer.isBuffer(body)) {
      return vercelRes.json(body);
    }
    res.end(body as string | Buffer);
    return vercelRes;
  };

  return vercelRes;
}

const routes = await loadRoutes();
const port = Number(process.env.API_PORT ?? 3001);

const server = createServer(async (incomingReq, serverRes) => {
  const url = new URL(incomingReq.url ?? '/', `http://localhost:${port}`);
  const pathname = url.pathname.replace(/\/+$/, '') || '/';
  const handler = routes.get(pathname);

  if (!handler) {
    serverRes.statusCode = 404;
    serverRes.setHeader('Content-Type', 'application/json; charset=utf-8');
    serverRes.end(
      JSON.stringify({
        ok: false,
        error: { code: 'NOT_FOUND', message: `No API handler for ${pathname}` },
      }),
    );
    return;
  }

  try {
    const rawBody =
      incomingReq.method === 'GET' || incomingReq.method === 'HEAD' || incomingReq.method === 'OPTIONS'
        ? ''
        : await readRequestBody(incomingReq);

    const vercelReq = Object.assign(incomingReq, {
      query: buildQuery(url.searchParams),
      cookies: {},
      body: rawBody,
    }) as unknown as VercelRequest;

    const vercelRes = createVercelResponse(serverRes);
    await handler(vercelReq, vercelRes);
  } catch (err) {
    if (!serverRes.headersSent) {
      serverRes.statusCode = 500;
      serverRes.setHeader('Content-Type', 'application/json; charset=utf-8');
      serverRes.end(
        JSON.stringify({
          ok: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: err instanceof Error ? err.message : 'Internal server error',
          },
        }),
      );
    }
  }
});

server.listen(port, () => {
  console.log(
    `[vowlet-api] dev server listening on http://localhost:${port} (memoryStore=${process.env.VOWLET_LOCAL_MEMORY === '1'})`,
  );
});
