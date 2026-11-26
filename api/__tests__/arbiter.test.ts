import { randomUUID } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { beforeEach, describe, expect, it } from 'vitest';
import { ROOM_TTL_MS } from '@vowlet/shared';
import { getMemoryStore } from '../_lib/store.js';
import createRoomHandler from '../room/create.js';
import joinRoomHandler from '../room/join.js';
import leaveRoomHandler from '../room/leave.js';
import kickPlayerHandler from '../room/kick.js';
import settingsHandler from '../room/settings.js';
import startGameHandler from '../room/start.js';
import stateHandler from '../room/state.js';
import submitChitHandler from '../chit/submit.js';
import swapChitHandler from '../chit/swap.js';
import advanceTurnHandler from '../turn/advance.js';
import chooseTurnHandler from '../turn/choose.js';
import performDoneHandler from '../turn/perform/done.js';
import performSkipHandler from '../turn/perform/skip.js';
import performStallHandler from '../turn/perform/stall.js';
import gameFinishHandler from '../game/finish.js';

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

async function createAndJoinThreePlayers() {
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

  return { code };
}

describe('Arbiter API integration', () => {
  beforeEach(() => {
    process.env.VOWLET_LOCAL_MEMORY = '1';
    getMemoryStore().reset();
  });

  it('creates room with unambiguous 6-char code, 4h TTL, seat 0 host, and rejects reserved names', async () => {
    const reserved = await callRoute(createRoomHandler, {
      uid: 'u1',
      url: '/api/room/create',
      body: {
        idempotencyKey: randomUUID(),
        name: 'Vowlet',
        avatar: 'owl-1',
        schemaVersion: 1,
      },
    });
    expect(reserved.statusCode).toBe(400);
    expect((reserved.body as { error: { code: string } }).error.code).toBe('NAME_RESERVED');

    const res = await callRoute(createRoomHandler, {
      uid: 'u1',
      url: '/api/room/create',
      body: {
        idempotencyKey: randomUUID(),
        name: 'Alice',
        avatar: 'owl-1',
        schemaVersion: 1,
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.body as { code: string; seat: number; phase: string; turnVersion: number };
    expect(body.code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
    expect(body.code).not.toMatch(/[0O1IL]/);
    expect(body.seat).toBe(0);
    expect(body.phase).toBe('LOBBY');
    expect(body.turnVersion).toBe(0);

    const stateRes = await callRoute(stateHandler, {
      method: 'GET',
      uid: 'u1',
      url: '/api/room/state',
      query: { roomCode: body.code },
    });
    expect(stateRes.statusCode).toBe(200);
    const state = stateRes.body as { room: { createdAt: number; expiresAt: number } };
    expect(state.room.expiresAt - state.room.createdAt).toBe(ROOM_TTL_MS);
  });

  it('enforces unique sanitized names, max 8 players, rejoin with same uid, and ban list', async () => {
    const { code } = await createAndJoinThreePlayers();

    // Duplicate name (case/whitespace insensitive)
    const dup = await callRoute(joinRoomHandler, {
      uid: 'u4',
      url: '/api/room/join',
      body: {
        idempotencyKey: randomUUID(),
        roomCode: code,
        name: '  bob ',
        avatar: 'owl-4',
        schemaVersion: 1,
      },
    });
    expect(dup.statusCode).toBe(400);
    expect((dup.body as { error: { code: string } }).error.code).toBe('NAME_TAKEN');

    // Fill remaining 5 seats (total 8)
    for (let i = 4; i <= 8; i += 1) {
      const jr = await callRoute(joinRoomHandler, {
        uid: `u${i}`,
        url: '/api/room/join',
        body: {
          idempotencyKey: randomUUID(),
          roomCode: code,
          name: `Player${i}`,
          avatar: 'owl-1',
          schemaVersion: 1,
        },
      });
      expect(jr.statusCode).toBe(200);
    }

    // 9th player rejected
    const full = await callRoute(joinRoomHandler, {
      uid: 'u9',
      url: '/api/room/join',
      body: {
        idempotencyKey: randomUUID(),
        roomCode: code,
        name: 'Player9',
        avatar: 'owl-1',
        schemaVersion: 1,
      },
    });
    expect(full.statusCode).toBe(409);
    expect((full.body as { error: { code: string } }).error.code).toBe('ROOM_FULL');

    // Rejoin with same uid succeeds
    const rejoin = await callRoute(joinRoomHandler, {
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
    expect(rejoin.statusCode).toBe(200);
    expect((rejoin.body as { seat: number }).seat).toBe(1);

    // Host kicks u3 -> u3 cannot rejoin
    const kickRes = await callRoute(kickPlayerHandler, {
      uid: 'u1',
      url: '/api/room/kick',
      body: {
        idempotencyKey: randomUUID(),
        roomCode: code,
        targetUid: 'u3',
      },
    });
    expect(kickRes.statusCode).toBe(200);

    const bannedJoin = await callRoute(joinRoomHandler, {
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
    expect(bannedJoin.statusCode).toBe(403);
    expect((bannedJoin.body as { error: { code: string } }).error.code).toBe('BANNED');
  });

  it('returns VERSION_MISMATCH without mutating state and deduplicates idempotency keys', async () => {
    const { code } = await createAndJoinThreePlayers();

    // Version mismatch on start
    const mismatch = await callRoute(startGameHandler, {
      uid: 'u1',
      url: '/api/room/start',
      body: {
        idempotencyKey: randomUUID(),
        roomCode: code,
        expectedPhase: 'LOBBY',
        expectedVersion: 99,
      },
    });
    expect(mismatch.statusCode).toBe(409);
    expect(mismatch.body).toMatchObject({
      ok: false,
      code: 'VERSION_MISMATCH',
      currentState: { phase: 'LOBBY', turnVersion: 0 },
    });

    // Idempotent start
    const startKey = randomUUID();
    const start1 = await callRoute(startGameHandler, {
      uid: 'u1',
      url: '/api/room/start',
      body: {
        idempotencyKey: startKey,
        roomCode: code,
        expectedPhase: 'LOBBY',
        expectedVersion: 0,
      },
    });
    expect(start1.statusCode).toBe(200);
    expect((start1.body as { phase: string; turnVersion: number }).phase).toBe('SPIN');
    expect((start1.body as { turnVersion: number }).turnVersion).toBe(1);

    // Replay same idempotencyKey -> identical cached response, no version bump
    const start2 = await callRoute(startGameHandler, {
      uid: 'u1',
      url: '/api/room/start',
      body: {
        idempotencyKey: startKey,
        roomCode: code,
        expectedPhase: 'LOBBY',
        expectedVersion: 0,
      },
    });
    expect(start2.statusCode).toBe(200);
    expect(start2.body).toEqual(start1.body);
  });

  it('runs full spin -> choose -> perform -> vote -> result -> summary -> podium -> finish loop', async () => {
    const { code } = await createAndJoinThreePlayers();
    const store = getMemoryStore();

    // Update settings to 5 rounds, quickPlay=false to test WRITING too
    const settingsRes = await callRoute(settingsHandler, {
      uid: 'u1',
      url: '/api/room/settings',
      body: {
        idempotencyKey: randomUUID(),
        roomCode: code,
        settings: { rounds: 5, quickPlay: false },
      },
    });
    expect(settingsRes.statusCode).toBe(200);
    let version = (settingsRes.body as { turnVersion: number }).turnVersion;

    // Start -> WRITING
    const startRes = await callRoute(startGameHandler, {
      uid: 'u1',
      url: '/api/room/start',
      body: {
        idempotencyKey: randomUUID(),
        roomCode: code,
        expectedPhase: 'LOBBY',
        expectedVersion: version,
      },
    });
    expect(startRes.statusCode).toBe(200);
    expect((startRes.body as { phase: string }).phase).toBe('WRITING');
    version = (startRes.body as { turnVersion: number }).turnVersion;

    // Moderation filter rejects unsafe dare, accepts safe truth
    const badChit = await callRoute(submitChitHandler, {
      uid: 'u1',
      url: '/api/chit/submit',
      body: {
        idempotencyKey: randomUUID(),
        roomCode: code,
        kind: 'DARE',
        tier: 'SPICY',
        dareType: 'INSTANT',
        text: 'Take a shot of vodka right now',
      },
    });
    expect(badChit.statusCode).toBe(200);
    expect((badChit.body as { verdict: string; status: string }).verdict).toBe('NOPE');
    expect((badChit.body as { status: string }).status).toBe('REJECTED');

    for (const uid of ['u1', 'u2', 'u3']) {
      const goodChit = await callRoute(submitChitHandler, {
        uid,
        url: '/api/chit/submit',
        body: {
          idempotencyKey: randomUUID(),
          roomCode: code,
          kind: 'TRUTH',
          tier: 'MILD',
          text: `Safe truth from ${uid}`,
        },
      });
      expect(goodChit.statusCode).toBe(200);
      expect((goodChit.body as { status: string }).status).toBe('SEALED');
    }

    // All sealed -> advance WRITING -> SPIN
    const advSpin = await callRoute(advanceTurnHandler, {
      uid: 'u2',
      url: '/api/turn/advance',
      body: {
        idempotencyKey: randomUUID(),
        roomCode: code,
        expectedPhase: 'WRITING',
        expectedVersion: version,
      },
    });
    expect(advSpin.statusCode).toBe(200);
    expect((advSpin.body as { phase: string }).phase).toBe('SPIN');
    version = (advSpin.body as { turnVersion: number }).turnVersion;

    // Play 5 rounds
    for (let round = 1; round <= 5; round += 1) {
      // Advance clock past 4.5s SPIN deadline
      store.advanceClock(5000);
      const advChoose = await callRoute(advanceTurnHandler, {
        uid: 'u1',
        url: '/api/turn/advance',
        body: {
          idempotencyKey: randomUUID(),
          roomCode: code,
          expectedPhase: 'SPIN',
          expectedVersion: version,
        },
      });
      expect(advChoose.statusCode).toBe(200);
      expect((advChoose.body as { phase: string }).phase).toBe('CHOOSE');
      const performerUid = (advChoose.body as { performerUid: string }).performerUid;
      version = (advChoose.body as { turnVersion: number }).turnVersion;

      // Performer chooses TRUTH or DARE
      const chooseRes = await callRoute(chooseTurnHandler, {
        uid: performerUid,
        url: '/api/turn/choose',
        body: {
          idempotencyKey: randomUUID(),
          roomCode: code,
          expectedPhase: 'CHOOSE',
          expectedVersion: version,
          choice: round % 2 === 0 ? 'DARE' : 'TRUTH',
        },
      });
      expect(chooseRes.statusCode).toBe(200);
      expect((chooseRes.body as { phase: string }).phase).toBe('PERFORM');
      version = (chooseRes.body as { turnVersion: number }).turnVersion;

      // Verify privatePrompt is visible only to performer, and secret is never exposed
      const perfState = await callRoute(stateHandler, {
        method: 'GET',
        uid: performerUid,
        url: '/api/room/state',
        query: { roomCode: code },
      });
      const perfBody = perfState.body as {
        privatePrompt: { text: string } | null;
        secret?: unknown;
      };
      expect(perfBody.privatePrompt?.text).toBeTruthy();
      expect(perfBody.secret).toBeUndefined();

      const otherUid = ['u1', 'u2', 'u3'].find((u) => u !== performerUid)!;
      const otherState = await callRoute(stateHandler, {
        method: 'GET',
        uid: otherUid,
        url: '/api/room/state',
        query: { roomCode: code },
      });
      expect((otherState.body as { privatePrompt: unknown }).privatePrompt).toBeNull();

      // Test 1 free swap on round 1
      if (round === 1) {
        const swapRes = await callRoute(swapChitHandler, {
          uid: performerUid,
          url: '/api/chit/swap',
          body: {
            idempotencyKey: randomUUID(),
            roomCode: code,
            expectedPhase: 'PERFORM',
            expectedVersion: version,
          },
        });
        expect(swapRes.statusCode).toBe(200);
        version = (swapRes.body as { turnVersion: number }).turnVersion;
      }

      // Performer taps Done -> VOTE
      const doneRes = await callRoute(performDoneHandler, {
        uid: performerUid,
        url: '/api/turn/perform/done',
        body: {
          idempotencyKey: randomUUID(),
          roomCode: code,
          expectedPhase: 'PERFORM',
          expectedVersion: version,
        },
      });
      expect(doneRes.statusCode).toBe(200);
      expect((doneRes.body as { phase: string }).phase).toBe('VOTE');
      version = (doneRes.body as { turnVersion: number }).turnVersion;

      // All witnesses vote APPROVE
      const witnesses = ['u1', 'u2', 'u3'].filter((u) => u !== performerUid);
      for (const w of witnesses) {
        store.setVoteDirect(code, w, {
          uid: w,
          verdict: 'APPROVE',
          turnVersion: version,
          createdAt: store.now(),
        });
      }

      // Advance VOTE -> RESULT
      const advResult = await callRoute(advanceTurnHandler, {
        uid: witnesses[0]!,
        url: '/api/turn/advance',
        body: {
          idempotencyKey: randomUUID(),
          roomCode: code,
          expectedPhase: 'VOTE',
          expectedVersion: version,
        },
      });
      expect(advResult.statusCode).toBe(200);
      expect((advResult.body as { phase: string; resultStamp: string }).phase).toBe('RESULT');
      expect((advResult.body as { resultStamp: string }).resultStamp).toBe('PASSED');
      version = (advResult.body as { turnVersion: number }).turnVersion;

      // Advance RESULT -> SPIN (rounds 1..4) or SUMMARY (round 5)
      store.advanceClock(6500);
      const advNext = await callRoute(advanceTurnHandler, {
        uid: 'u1',
        url: '/api/turn/advance',
        body: {
          idempotencyKey: randomUUID(),
          roomCode: code,
          expectedPhase: 'RESULT',
          expectedVersion: version,
        },
      });
      expect(advNext.statusCode).toBe(200);
      const expectedNextPhase = round < 5 ? 'SPIN' : 'SUMMARY';
      expect((advNext.body as { phase: string }).phase).toBe(expectedNextPhase);
      version = (advNext.body as { turnVersion: number }).turnVersion;
    }

    // SUMMARY -> PODIUM
    const advPodium = await callRoute(advanceTurnHandler, {
      uid: 'u1',
      url: '/api/turn/advance',
      body: {
        idempotencyKey: randomUUID(),
        roomCode: code,
        expectedPhase: 'SUMMARY',
        expectedVersion: version,
      },
    });
    expect(advPodium.statusCode).toBe(200);
    expect((advPodium.body as { phase: string }).phase).toBe('PODIUM');
    version = (advPodium.body as { turnVersion: number }).turnVersion;

    // /api/game/finish awards monotonic lifetime XP
    const finishRes = await callRoute(gameFinishHandler, {
      uid: 'u1',
      url: '/api/game/finish',
      body: {
        idempotencyKey: randomUUID(),
        roomCode: code,
        expectedPhase: 'PODIUM',
        expectedVersion: version,
      },
    });
    expect(finishRes.statusCode).toBe(200);
    const awards = (finishRes.body as { awards: Record<string, { xpGained: number }> }).awards;
    const totalXpAwarded = Object.values(awards).reduce((sum, a) => sum + a.xpGained, 0);
    expect(totalXpAwarded).toBeGreaterThanOrEqual(250);
  });

  it('handles skip (-30), stall (>50% witnesses), and performer leave during PERFORM', async () => {
    const { code } = await createAndJoinThreePlayers();
    const store = getMemoryStore();

    const startRes = await callRoute(startGameHandler, {
      uid: 'u1',
      url: '/api/room/start',
      body: {
        idempotencyKey: randomUUID(),
        roomCode: code,
        expectedPhase: 'LOBBY',
        expectedVersion: 0,
      },
    });
    let version = (startRes.body as { turnVersion: number }).turnVersion;

    store.advanceClock(5000);
    const advChoose = await callRoute(advanceTurnHandler, {
      uid: 'u1',
      url: '/api/turn/advance',
      body: {
        idempotencyKey: randomUUID(),
        roomCode: code,
        expectedPhase: 'SPIN',
        expectedVersion: version,
      },
    });
    const performerUid = (advChoose.body as { performerUid: string }).performerUid;
    version = (advChoose.body as { turnVersion: number }).turnVersion;

    // Auto-Truth timeout on CHOOSE
    store.advanceClock(16000);
    const autoTruth = await callRoute(advanceTurnHandler, {
      uid: 'u1',
      url: '/api/turn/advance',
      body: {
        idempotencyKey: randomUUID(),
        roomCode: code,
        expectedPhase: 'CHOOSE',
        expectedVersion: version,
      },
    });
    expect(autoTruth.statusCode).toBe(200);
    expect((autoTruth.body as { phase: string; autoTruth: boolean }).phase).toBe('PERFORM');
    expect((autoTruth.body as { autoTruth: boolean }).autoTruth).toBe(true);
    version = (autoTruth.body as { turnVersion: number }).turnVersion;

    // Witness 1 votes stall (1 of 2 witnesses = 50%, not >50%)
    const witnesses = ['u1', 'u2', 'u3'].filter((u) => u !== performerUid);
    const stall1 = await callRoute(performStallHandler, {
      uid: witnesses[0]!,
      url: '/api/turn/perform/stall',
      body: {
        idempotencyKey: randomUUID(),
        roomCode: code,
        expectedPhase: 'PERFORM',
        expectedVersion: version,
      },
    });
    expect(stall1.statusCode).toBe(200);
    expect((stall1.body as { phase: string }).phase).toBe('PERFORM');
    version = (stall1.body as { turnVersion: number }).turnVersion;

    // Witness 2 votes stall (2 of 2 = 100% > 50%) -> VOTE
    const stall2 = await callRoute(performStallHandler, {
      uid: witnesses[1]!,
      url: '/api/turn/perform/stall',
      body: {
        idempotencyKey: randomUUID(),
        roomCode: code,
        expectedPhase: 'PERFORM',
        expectedVersion: version,
      },
    });
    expect(stall2.statusCode).toBe(200);
    expect((stall2.body as { phase: string }).phase).toBe('VOTE');
    version = (stall2.body as { turnVersion: number }).turnVersion;

    // Advance VOTE with 0 votes -> STALLED
    store.advanceClock(21000);
    const advResult = await callRoute(advanceTurnHandler, {
      uid: witnesses[0]!,
      url: '/api/turn/advance',
      body: {
        idempotencyKey: randomUUID(),
        roomCode: code,
        expectedPhase: 'VOTE',
        expectedVersion: version,
      },
    });
    expect(advResult.statusCode).toBe(200);
    expect((advResult.body as { resultStamp: string }).resultStamp).toBe('STALLED');
    version = (advResult.body as { turnVersion: number }).turnVersion;

    // Round 2: test Skip (-30)
    store.advanceClock(6500);
    const spin2 = await callRoute(advanceTurnHandler, {
      uid: 'u1',
      url: '/api/turn/advance',
      body: {
        idempotencyKey: randomUUID(),
        roomCode: code,
        expectedPhase: 'RESULT',
        expectedVersion: version,
      },
    });
    version = (spin2.body as { turnVersion: number }).turnVersion;
    store.advanceClock(5000);
    const choose2 = await callRoute(advanceTurnHandler, {
      uid: 'u1',
      url: '/api/turn/advance',
      body: {
        idempotencyKey: randomUUID(),
        roomCode: code,
        expectedPhase: 'SPIN',
        expectedVersion: version,
      },
    });
    const perf2 = (choose2.body as { performerUid: string }).performerUid;
    version = (choose2.body as { turnVersion: number }).turnVersion;

    const chosen2 = await callRoute(chooseTurnHandler, {
      uid: perf2,
      url: '/api/turn/choose',
      body: {
        idempotencyKey: randomUUID(),
        roomCode: code,
        expectedPhase: 'CHOOSE',
        expectedVersion: version,
        choice: 'DARE',
      },
    });
    version = (chosen2.body as { turnVersion: number }).turnVersion;

    const skipRes = await callRoute(performSkipHandler, {
      uid: perf2,
      url: '/api/turn/perform/skip',
      body: {
        idempotencyKey: randomUUID(),
        roomCode: code,
        expectedPhase: 'PERFORM',
        expectedVersion: version,
      },
    });
    expect(skipRes.statusCode).toBe(200);
    expect((skipRes.body as { resultStamp: string; sessionScoreDelta: number }).resultStamp).toBe(
      'SKIPPED',
    );
    expect((skipRes.body as { sessionScoreDelta: number }).sessionScoreDelta).toBe(-30);

    // Leave during lobby/result updates host if host leaves
    const leaveRes = await callRoute(leaveRoomHandler, {
      uid: 'u1',
      url: '/api/room/leave',
      body: {
        idempotencyKey: randomUUID(),
        roomCode: code,
      },
    });
    expect(leaveRes.statusCode).toBe(200);
    expect((leaveRes.body as { hostUid: string }).hostUid).not.toBe('u1');
  });

  it('enforces auth, locked CORS, and rate limiting on /api/room/join', async () => {
    // Missing auth
    const unauth = await callRoute(createRoomHandler, {
      uid: null,
      url: '/api/room/create',
      body: {
        idempotencyKey: randomUUID(),
        name: 'Alice',
        avatar: 'owl-1',
        schemaVersion: 1,
      },
    });
    expect(unauth.statusCode).toBe(401);

    // Disallowed CORS origin
    const badCors = await callRoute(createRoomHandler, {
      uid: 'u1',
      url: '/api/room/create',
      headers: { origin: 'https://evil.example.com' },
      body: {
        idempotencyKey: randomUUID(),
        name: 'Alice',
        avatar: 'owl-1',
        schemaVersion: 1,
      },
    });
    expect(badCors.statusCode).toBe(403);

    // Rate limiting on /api/room/join (10 req / 60s)
    for (let i = 0; i < 10; i += 1) {
      const attempt = await callRoute(joinRoomHandler, {
        uid: 'prober',
        url: '/api/room/join',
        body: {
          idempotencyKey: randomUUID(),
          roomCode: 'ABCDEF',
          name: 'Prober',
          avatar: 'owl-1',
          schemaVersion: 1,
        },
      });
      expect(attempt.statusCode).toBe(404);
    }

    const throttled = await callRoute(joinRoomHandler, {
      uid: 'prober',
      url: '/api/room/join',
      body: {
        idempotencyKey: randomUUID(),
        roomCode: 'ABCDEF',
        name: 'Prober',
        avatar: 'owl-1',
        schemaVersion: 1,
      },
    });
    expect(throttled.statusCode).toBe(429);
    expect((throttled.body as { error: { code: string } }).error.code).toBe('RATE_LIMITED');
  });
});
