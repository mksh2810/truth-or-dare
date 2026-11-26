import { randomUUID } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PRESENCE_GRACE_MS } from '@vowlet/shared';
import { getFeatureFlags } from '../_lib/flags.js';
import { REDACTED, REDACTED_SECRET_PATH, scrubSentryEvent } from '../_lib/sentry.js';
import { getMemoryStore } from '../_lib/store.js';
import createRoomHandler from '../room/create.js';
import joinRoomHandler from '../room/join.js';
import migrateHostHandler from '../room/migrate.js';
import settingsHandler from '../room/settings.js';
import stateHandler from '../room/state.js';
import reportHandler, { getMemoryReports, resetMemoryReports } from '../report.js';
import deleteUserHandler from '../user/delete.js';

interface MockResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
}

type HandlerFn = (req: VercelRequest, res: VercelResponse) => Promise<void> | void;

async function callRoute(
  handler: HandlerFn,
  options: {
    method?: 'GET' | 'POST' | 'OPTIONS';
    uid?: string | null;
    body?: Record<string, unknown>;
    query?: Record<string, string>;
    headers?: Record<string, string>;
    url?: string;
  },
): Promise<MockResponse> {
  const headers: Record<string, string> = {
    ...(options.headers ?? {}),
  };
  if (options.uid !== null && options.uid !== undefined) {
    headers['x-test-uid'] = options.uid;
  }

  const req = {
    method: options.method ?? 'POST',
    headers,
    body: options.body,
    query: options.query ?? {},
    url: options.url ?? '/api/test',
  } as unknown as VercelRequest;

  const result: MockResponse = {
    statusCode: 200,
    headers: {},
    body: undefined,
  };

  const res = {
    setHeader(name: string, value: string) {
      result.headers[name.toLowerCase()] = value;
      return this;
    },
    status(code: number) {
      result.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      result.body = payload;
      return this;
    },
    end() {
      return this;
    },
  } as unknown as VercelResponse;

  await handler(req, res);
  return result;
}

async function setupThreePlayerRoom() {
  const store = getMemoryStore();
  const t0 = store.now();

  const createRes = await callRoute(createRoomHandler, {
    uid: 'u1',
    url: '/api/room/create',
    body: {
      idempotencyKey: randomUUID(),
      name: 'Alice',
      avatar: 'owl-1',
      schemaVersion: 1,
      settings: { rounds: 5, quickPlay: true },
    },
  });
  expect(createRes.statusCode).toBe(201);
  const code = (createRes.body as { code: string }).code;

  store.advanceClock(100);
  const j2 = await callRoute(joinRoomHandler, {
    uid: 'u2',
    url: '/api/room/join',
    body: {
      idempotencyKey: randomUUID(),
      roomCode: code,
      name: 'Bob',
      avatar: 'owl-2',
      schemaVersion: 1,
    },
  });
  expect(j2.statusCode).toBe(200);

  store.advanceClock(100);
  const j3 = await callRoute(joinRoomHandler, {
    uid: 'u3',
    url: '/api/room/join',
    body: {
      idempotencyKey: randomUUID(),
      roomCode: code,
      name: 'Charlie',
      avatar: 'owl-3',
      schemaVersion: 1,
    },
  });
  expect(j3.statusCode).toBe(200);

  const now = store.now();
  store.setPresence(code, 'u1', { online: true, away: false, lastSeen: t0 });
  store.setPresence(code, 'u2', { online: true, away: false, lastSeen: now });
  store.setPresence(code, 'u3', { online: true, away: false, lastSeen: now });

  return code;
}

describe('Phase 2 Backend & Safety Deliverables', () => {
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    getMemoryStore().reset();
    resetMemoryReports();
    for (const key of [
      'GEMINI_API_KEY',
      'FLAG_LLM_JUDGE_ENABLED',
      'LLM_JUDGE_ENABLED',
      'FLAG_MIN_SCHEMA_VERSION',
      'MIN_SCHEMA_VERSION',
    ]) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const [key, val] of Object.entries(savedEnv)) {
      if (val === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = val;
      }
    }
  });

  describe('Feature flags & kill switches', () => {
    it('defaults llm_judge_enabled to false when GEMINI_API_KEY is absent', () => {
      const flags = getFeatureFlags();
      expect(flags).toEqual({
        llm_judge_enabled: false,
        video_enabled: false,
        community_deck_enabled: true,
        pause_room_creation: false,
        min_schema_version: 1,
      });
    });

    it('enables llm_judge_enabled when GEMINI_API_KEY is set unless killed by env', () => {
      process.env.GEMINI_API_KEY = 'test-key';
      expect(getFeatureFlags().llm_judge_enabled).toBe(true);

      process.env.FLAG_LLM_JUDGE_ENABLED = 'false';
      expect(getFeatureFlags().llm_judge_enabled).toBe(false);
    });
  });

  describe('Deterministic host migration & old-host demotion (D5)', () => {
    it('elects earliest joinedAt present non-banned player and demotes returning old host', async () => {
      const store = getMemoryStore();
      const code = await setupThreePlayerRoom();

      // u1 goes offline past the 25s grace window
      store.advanceClock(PRESENCE_GRACE_MS + 5_000);
      const now = store.now();
      store.setPresence(code, 'u1', {
        online: false,
        away: false,
        lastSeen: now - PRESENCE_GRACE_MS - 1_000,
      });
      store.setPresence(code, 'u2', { online: true, away: false, lastSeen: now });
      store.setPresence(code, 'u3', { online: true, away: false, lastSeen: now });

      // Stale expectedVersion must be rejected with 409 VERSION_MISMATCH
      const staleRes = await callRoute(migrateHostHandler, {
        uid: 'u2',
        url: '/api/room/migrate',
        body: {
          idempotencyKey: randomUUID(),
          roomCode: code,
          expectedPhase: 'LOBBY',
          expectedVersion: 99,
        },
      });
      expect(staleRes.statusCode).toBe(409);
      expect((staleRes.body as { code: string }).code).toBe('VERSION_MISMATCH');

      // Valid migration elects u2 (earliest joinedAt among u2, u3)
      const migrateRes = await callRoute(migrateHostHandler, {
        uid: 'u3',
        url: '/api/room/migrate',
        body: {
          idempotencyKey: randomUUID(),
          roomCode: code,
          expectedPhase: 'LOBBY',
          expectedVersion: 0,
        },
      });
      expect(migrateRes.statusCode).toBe(200);
      expect(migrateRes.body).toMatchObject({
        ok: true,
        migrated: true,
        hostUid: 'u2',
        previousHostUid: 'u1',
        demotedHostUid: 'u1',
        turnVersion: 1,
      });

      // u1 returns online; u1 MUST remain demoted while u2 is present
      store.setPresence(code, 'u1', { online: true, away: false, lastSeen: store.now() });

      const afterReturnRes = await callRoute(migrateHostHandler, {
        uid: 'u1',
        url: '/api/room/migrate',
        body: {
          idempotencyKey: randomUUID(),
          roomCode: code,
          expectedPhase: 'LOBBY',
          expectedVersion: 1,
        },
      });
      expect(afterReturnRes.statusCode).toBe(200);
      expect(afterReturnRes.body).toMatchObject({
        ok: true,
        migrated: false,
        hostUid: 'u2',
        turnVersion: 1,
      });

      // Returning old host u1 cannot use host-only settings endpoint
      const settingsRes = await callRoute(settingsHandler, {
        uid: 'u1',
        url: '/api/room/settings',
        body: {
          idempotencyKey: randomUUID(),
          roomCode: code,
          settings: { rounds: 10 },
        },
      });
      expect(settingsRes.statusCode).toBe(403);
    });
  });

  describe('SchemaVersion mismatch block (D16)', () => {
    it('rejects client schemaVersion < min_schema_version with 426 SCHEMA_MISMATCH on join and state', async () => {
      const code = await setupThreePlayerRoom();
      process.env.MIN_SCHEMA_VERSION = '2';

      const joinRes = await callRoute(joinRoomHandler, {
        uid: 'u4',
        url: '/api/room/join',
        body: {
          idempotencyKey: randomUUID(),
          roomCode: code,
          name: 'Dana',
          avatar: 'owl-4',
          schemaVersion: 1,
        },
      });
      expect(joinRes.statusCode).toBe(426);
      expect((joinRes.body as { error: { code: string } }).error.code).toBe('SCHEMA_MISMATCH');

      const stateRes = await callRoute(stateHandler, {
        method: 'GET',
        uid: 'u1',
        url: '/api/room/state',
        query: { roomCode: code, schemaVersion: '1' },
      });
      expect(stateRes.statusCode).toBe(426);
      expect((stateRes.body as { error: { code: string } }).error.code).toBe('SCHEMA_MISMATCH');
    });
  });

  describe('Report & block (POST /api/report)', () => {
    it('stores player and prompt reports and updates reporter block list when block=true', async () => {
      const code = await setupThreePlayerRoom();

      const reportPlayerRes = await callRoute(reportHandler, {
        uid: 'u2',
        url: '/api/report',
        body: {
          idempotencyKey: randomUUID(),
          targetUid: 'u3',
          roomCode: code,
          reason: 'HARASSMENT',
          details: 'Rude behavior in lobby',
          block: true,
        },
      });
      expect(reportPlayerRes.statusCode).toBe(201);
      expect(reportPlayerRes.body).toMatchObject({
        ok: true,
        blocked: true,
      });

      const reportPromptRes = await callRoute(reportHandler, {
        uid: 'u2',
        url: '/api/report',
        body: {
          idempotencyKey: randomUUID(),
          promptId: 'prompt_abc',
          reason: 'UNSAFE_DARE',
          details: 'Unsafe dare',
        },
      });
      expect(reportPromptRes.statusCode).toBe(201);

      const reports = getMemoryReports();
      expect(reports).toHaveLength(2);
      expect(reports[0]?.targetUid).toBe('u3');
      expect(reports[1]?.promptId).toBe('prompt_abc');

      const userAfterBlock = await getMemoryStore().runTransaction((tx) => tx.getUser('u2'));
      expect((userAfterBlock as { blockedUids?: string[] } | null)?.blockedUids).toContain('u3');
    });

    it('rejects self-reporting', async () => {
      const res = await callRoute(reportHandler, {
        uid: 'u1',
        url: '/api/report',
        body: {
          idempotencyKey: randomUUID(),
          targetUid: 'u1',
          reason: 'OTHER',
        },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('Delete My Data SOP (POST /api/user/delete)', () => {
    it('deletes users/{uid} and anonymizes player records in active/recent rooms', async () => {
      const store = getMemoryStore();
      const code = await setupThreePlayerRoom();

      await store.runTransaction(async (tx) => {
        tx.setUser('u2', {
          uid: 'u2',
          lifetimeXp: 350,
          level: 3,
          skins: ['owl-brass'],
          optIns: { communityDeck: true, analytics: false },
          updatedAt: tx.now(),
        });
      });

      const delRes = await callRoute(deleteUserHandler, {
        uid: 'u2',
        url: '/api/user/delete',
        body: {
          idempotencyKey: randomUUID(),
          roomCodes: [code],
        },
      });
      expect(delRes.statusCode).toBe(200);
      expect(delRes.body).toMatchObject({
        ok: true,
        deletedUser: true,
        anonymizedRooms: [code],
      });

      const userAfter = await store.runTransaction((tx) => tx.getUser('u2'));
      expect(userAfter).toBeNull();

      const players = await store.runTransaction((tx) => tx.getPlayers(code));
      const u2Player = players.find((p) => p.uid === 'u2');
      expect(u2Player?.name).toBe('Deleted Player');
      expect(u2Player?.avatar).toBe('deleted');
    });
  });

  describe('Sentry privacy scrubber', () => {
    it('strips chit text, player names, emails, auth tokens, and secret paths without mutating input', () => {
      const rawEvent = {
        message: 'Failed reading rooms/ABC234/secret/chit_9 for alice@example.com with Bearer secret-token-123',
        user: {
          id: 'u1',
          email: 'alice@example.com',
          username: 'Alice',
        },
        request: {
          url: 'https://vowlet.app/api/rooms/ABC234/secret/chit_9',
          headers: {
            authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1MSJ9.sig123456',
            'x-firebase-appcheck': 'appcheck-xyz',
            'content-type': 'application/json',
          },
          data: {
            chitText: 'Tell everyone your biggest secret',
            playerName: 'Alice',
            roomCode: 'ABC234',
          },
        },
        extra: {
          promptText: 'Secret dare text',
          nested: {
            email: 'bob@example.com',
            idToken: 'tok-999',
          },
        },
        breadcrumbs: [
          {
            category: 'http',
            message: 'GET /rooms/ABC234/secret/chit_9',
            data: {
              text: 'Sensitive chit text',
              name: 'Bob',
              path: 'rooms/ABC234/secret/chit_9',
            },
          },
        ],
        exception: {
          values: [
            {
              type: 'Error',
              value: 'Token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1MSJ9.sig123456 rejected for bob@example.com',
            },
          ],
        },
      };

      const snapshot = structuredClone(rawEvent);
      const scrubbed = scrubSentryEvent(rawEvent);

      // Input must not be mutated
      expect(rawEvent).toEqual(snapshot);

      expect(scrubbed.message).not.toContain('alice@example.com');
      expect(scrubbed.message).not.toContain('secret-token-123');
      expect(scrubbed.message).not.toContain('secret/chit_9');
      expect(scrubbed.message).toContain(REDACTED_SECRET_PATH);

      expect(scrubbed.user?.email).toBe(REDACTED);
      expect(scrubbed.user?.username).toBe(REDACTED);
      expect(scrubbed.user?.id).toBe('u1');

      expect(scrubbed.request?.url).toContain(REDACTED_SECRET_PATH);
      expect(scrubbed.request?.headers?.authorization).toBe(REDACTED);
      expect(scrubbed.request?.headers?.['x-firebase-appcheck']).toBe(REDACTED);
      expect(scrubbed.request?.headers?.['content-type']).toBe('application/json');
      expect((scrubbed.request?.data as Record<string, unknown>).chitText).toBe(REDACTED);
      expect((scrubbed.request?.data as Record<string, unknown>).playerName).toBe(REDACTED);
      expect((scrubbed.request?.data as Record<string, unknown>).roomCode).toBe('ABC234');

      expect(scrubbed.extra?.promptText).toBe(REDACTED);
      expect((scrubbed.extra?.nested as Record<string, unknown>).email).toBe(REDACTED);
      expect((scrubbed.extra?.nested as Record<string, unknown>).idToken).toBe(REDACTED);

      const crumb = (scrubbed.breadcrumbs as Array<{ message?: string; data?: Record<string, unknown> }>)[0];
      expect(crumb?.message).toContain(REDACTED_SECRET_PATH);
      expect(crumb?.data?.text).toBe(REDACTED);
      expect(crumb?.data?.name).toBe(REDACTED);
      expect(crumb?.data?.path).toContain(REDACTED_SECRET_PATH);

      const exVal = scrubbed.exception?.values?.[0]?.value ?? '';
      expect(exVal).not.toContain('bob@example.com');
      expect(exVal).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    });
  });
});
