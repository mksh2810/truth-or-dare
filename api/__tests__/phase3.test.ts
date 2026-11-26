import { randomUUID } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { calculateLevel, fnv1aHash, SCHEMA_VERSION } from '@vowlet/shared';
import { getMemoryStore } from '../_lib/store.js';
import gameFinishHandler, {
  computeUnlockedSkins,
  type UserDocWithHistory,
} from '../game/finish.js';
import communityPromptsHandler, {
  optInCommunityPrompt,
  resetMemoryCommunityStore,
  seedMemoryCommunityPrompt,
  wilsonLowerBound,
} from '../prompts/community.js';
import deletePromptHandler from '../prompts/delete.js';
import ratePromptHandler from '../prompts/rate.js';

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

describe('Phase 3: Security (SEC-F1), Progression (D15/B12), & Community Deck (B9/D19/D28)', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalLocalMemory = process.env.VOWLET_LOCAL_MEMORY;

  beforeEach(() => {
    getMemoryStore().reset();
    resetMemoryCommunityStore();
    process.env.VOWLET_LOCAL_MEMORY = '1';
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.VOWLET_LOCAL_MEMORY = originalLocalMemory;
  });

  it('SEC-F1: rejects x-test-uid header when NODE_ENV=production even if useMemoryStore is true', async () => {
    process.env.NODE_ENV = 'production';
    process.env.VOWLET_LOCAL_MEMORY = '1';

    const getRes = await callRoute(communityPromptsHandler, {
      method: 'GET',
      uid: 'spoofed-uid',
      url: '/api/prompts/community',
    });
    expect(getRes.statusCode).toBe(401);
    expect((getRes.body as { error: { code: string } }).error.code).toBe('UNAUTHORIZED');

    const postRes = await callRoute(ratePromptHandler, {
      method: 'POST',
      uid: 'spoofed-uid',
      url: '/api/prompts/rate',
      body: {
        idempotencyKey: randomUUID(),
        promptId: 'p1',
        up: true,
      },
    });
    expect(postRes.statusCode).toBe(401);
    expect((postRes.body as { error: { code: string } }).error.code).toBe('UNAUTHORIZED');
  });

  it('ranks community prompts by Wilson lower-bound and enforces 20-rating unlock gate + starter fallback (B9/D19)', async () => {
    // 19/19 -> below 20-rating gate, must be excluded
    seedMemoryCommunityPrompt({
      id: 'comm_under_gate',
      text: 'Tell everyone your most awkward elevator moment.',
      kind: 'TRUTH',
      tier: 'MILD',
      dareType: null,
      pack: 'community',
      source: 'COMMUNITY',
      ratingAgg: { up: 19, total: 19, wilsonScore: wilsonLowerBound(19, 19) },
      hash: fnv1aHash('Tell everyone your most awkward elevator moment.'),
      authorUid: 'author_1',
      createdAt: 1000,
    });

    // 19/20 (95% on 20) -> lower Wilson bound than 90/100
    seedMemoryCommunityPrompt({
      id: 'comm_small_sample',
      text: 'What is the funniest autocorrect fail you have ever sent?',
      kind: 'TRUTH',
      tier: 'MILD',
      dareType: null,
      pack: 'community',
      source: 'COMMUNITY',
      ratingAgg: { up: 19, total: 20, wilsonScore: wilsonLowerBound(19, 20) },
      hash: fnv1aHash('What is the funniest autocorrect fail you have ever sent?'),
      authorUid: 'author_2',
      createdAt: 1001,
    });

    // 90/100 (90% on 100) -> higher Wilson lower-bound than 19/20
    seedMemoryCommunityPrompt({
      id: 'comm_high_wilson',
      text: 'Do your best 10-second movie trailer voiceover for this room.',
      kind: 'DARE',
      tier: 'MILD',
      dareType: 'INSTANT',
      pack: 'community',
      source: 'COMMUNITY',
      ratingAgg: { up: 90, total: 100, wilsonScore: wilsonLowerBound(90, 100) },
      hash: fnv1aHash('Do your best 10-second movie trailer voiceover for this room.'),
      authorUid: 'author_3',
      createdAt: 1002,
    });

    expect(wilsonLowerBound(90, 100)).toBeGreaterThan(wilsonLowerBound(19, 20));
    expect(wilsonLowerBound(0, 0)).toBe(0);

    const res = await callRoute(communityPromptsHandler, {
      method: 'GET',
      uid: 'viewer_1',
      url: '/api/prompts/community',
      query: { limit: '5' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.body as {
      items: Array<{ id: string; source: string; authorUid?: string }>;
      nextCursor: string | null;
    };

    expect(body.items.length).toBe(5);
    expect(body.items[0]!.id).toBe('comm_high_wilson');
    expect(body.items[1]!.id).toBe('comm_small_sample');
    expect(body.items.some((item) => item.id === 'comm_under_gate')).toBe(false);
    // Remaining 3 slots filled from curated starter deck
    expect(body.items.slice(2).every((item) => item.source === 'CURATED')).toBe(true);
    // Authorship is stripped from public community responses
    expect(body.items[0]!.authorUid).toBeUndefined();
  });

  it('enforces one rating per uid per prompt and blocks near-duplicate ratings (D19)', async () => {
    const promptText = 'Sing the chorus of your guilty-pleasure song in slow motion.';
    seedMemoryCommunityPrompt({
      id: 'comm_rate_1',
      text: promptText,
      kind: 'DARE',
      tier: 'MILD',
      dareType: 'INSTANT',
      pack: 'community',
      source: 'COMMUNITY',
      ratingAgg: { up: 0, total: 0, wilsonScore: 0 },
      hash: fnv1aHash(promptText),
      authorUid: 'author_1',
      createdAt: 1000,
    });

    // Near-duplicate prompt with same normalized hash (punctuation/case difference)
    seedMemoryCommunityPrompt({
      id: 'comm_rate_dup',
      text: 'sing the chorus of your guilty pleasure song in slow motion',
      kind: 'DARE',
      tier: 'MILD',
      dareType: 'INSTANT',
      pack: 'community',
      source: 'COMMUNITY',
      ratingAgg: { up: 0, total: 0, wilsonScore: 0 },
      hash: fnv1aHash('sing the chorus of your guilty pleasure song in slow motion'),
      authorUid: 'author_2',
      createdAt: 1001,
    });

    const firstRate = await callRoute(ratePromptHandler, {
      uid: 'rater_1',
      url: '/api/prompts/rate',
      body: {
        idempotencyKey: randomUUID(),
        promptId: 'comm_rate_1',
        up: true,
      },
    });
    expect(firstRate.statusCode).toBe(200);
    expect((firstRate.body as { ratingAgg: { up: number; total: number } }).ratingAgg.up).toBe(1);
    expect((firstRate.body as { ratingAgg: { up: number; total: number } }).ratingAgg.total).toBe(1);

    // Same uid rating same prompt again (new idempotencyKey) -> 409 ALREADY_RATED
    const secondRate = await callRoute(ratePromptHandler, {
      uid: 'rater_1',
      url: '/api/prompts/rate',
      body: {
        idempotencyKey: randomUUID(),
        promptId: 'comm_rate_1',
        up: false,
      },
    });
    expect(secondRate.statusCode).toBe(409);
    expect((secondRate.body as { error: { code: string } }).error.code).toBe('ALREADY_RATED');

    // Same uid rating near-duplicate prompt -> 409 DUPLICATE_RATING
    const dupRate = await callRoute(ratePromptHandler, {
      uid: 'rater_1',
      url: '/api/prompts/rate',
      body: {
        idempotencyKey: randomUUID(),
        promptId: 'comm_rate_dup',
        up: true,
      },
    });
    expect(dupRate.statusCode).toBe(409);
    expect((dupRate.body as { error: { code: string } }).error.code).toBe('DUPLICATE_RATING');

    // Different uid can rate
    const otherUserRate = await callRoute(ratePromptHandler, {
      uid: 'rater_2',
      url: '/api/prompts/rate',
      body: {
        idempotencyKey: randomUUID(),
        promptId: 'comm_rate_1',
        up: false,
      },
    });
    expect(otherUserRate.statusCode).toBe(200);
    expect((otherUserRate.body as { ratingAgg: { total: number } }).ratingAgg.total).toBe(2);
  });

  it('scrubs PII on community opt-in, rejects near-duplicates, and enforces author-only delete (D28)', async () => {
    const submitRes = await callRoute(communityPromptsHandler, {
      method: 'POST',
      uid: 'author_u1',
      url: '/api/prompts/community',
      body: {
        idempotencyKey: randomUUID(),
        text: 'DM @secret_pal or email bob@example.com or call 9876543210 for a funny joke!',
        kind: 'DARE',
        tier: 'MILD',
        dareType: 'SOCIAL',
      },
    });

    expect(submitRes.statusCode).toBe(201);
    const submitted = submitRes.body as {
      ok: boolean;
      piiScrubbed: boolean;
      prompt: { id: string; text: string };
    };
    expect(submitted.piiScrubbed).toBe(true);
    expect(submitted.prompt.text).not.toContain('bob@example.com');
    expect(submitted.prompt.text).not.toContain('9876543210');
    expect(submitted.prompt.text).not.toContain('@secret_pal');
    expect(submitted.prompt.text).toContain('[redacted]');

    // Near-duplicate submission via helper is rejected
    await expect(
      optInCommunityPrompt({
        uid: 'author_u2',
        text: 'DM [redacted] or email [redacted] or call [redacted] for a funny joke',
        kind: 'DARE',
      }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'DUPLICATE_PROMPT' });

    // Non-author delete -> 403 FORBIDDEN
    const nonAuthorDelete = await callRoute(deletePromptHandler, {
      uid: 'intruder_u2',
      url: '/api/prompts/delete',
      body: {
        idempotencyKey: randomUUID(),
        promptId: submitted.prompt.id,
      },
    });
    expect(nonAuthorDelete.statusCode).toBe(403);
    expect((nonAuthorDelete.body as { error: { code: string } }).error.code).toBe('FORBIDDEN');

    // Author delete -> 200 OK
    const authorDelete = await callRoute(deletePromptHandler, {
      uid: 'author_u1',
      url: '/api/prompts/delete',
      body: {
        idempotencyKey: randomUUID(),
        promptId: submitted.prompt.id,
      },
    });
    expect(authorDelete.statusCode).toBe(200);
    expect((authorDelete.body as { deleted: boolean }).deleted).toBe(true);

    // Subsequent delete -> 404 NOT_FOUND
    const secondDelete = await callRoute(deletePromptHandler, {
      uid: 'author_u1',
      url: '/api/prompts/delete',
      body: {
        idempotencyKey: randomUUID(),
        promptId: submitted.prompt.id,
      },
    });
    expect(secondDelete.statusCode).toBe(404);
  });

  it('computes server-side monotonic XP, exponential levels, bottle skin unlocks, and Table history (D15/B12)', async () => {
    expect(computeUnlockedSkins(1, [])).toEqual(['amber']);
    expect(computeUnlockedSkins(2, ['amber'])).toEqual(['amber', 'brass']);
    expect(computeUnlockedSkins(3, ['amber', 'brass'])).toEqual(['amber', 'brass', 'emerald']);
    expect(computeUnlockedSkins(5, [])).toEqual(['amber', 'brass', 'emerald', 'crimson']);

    const store = getMemoryStore();
    const now = store.now();
    const roomCode = 'VWTR3P';

    await store.runTransaction(async (tx) => {
      tx.setRoom(roomCode, {
        code: roomCode,
        hostUid: 'u1',
        phase: 'SUMMARY',
        round: 5,
        totalRounds: 5,
        turnVersion: 10,
        schemaVersion: SCHEMA_VERSION,
        callLink: null,
        settings: {
          maxPlayers: 8,
          rounds: 5,
          quickPlay: true,
          writingDeadlineSec: 120,
          chooseDeadlineSec: 15,
          voteDeadlineSec: 20,
          packIds: ['friends'],
          tableMode: false,
        },
        createdAt: now - 60_000,
        updatedAt: now,
        expiresAt: now + 3_600_000,
      });

      const basePlayer = {
        avatar: 'owl-1',
        joinedAt: now - 60_000,
        ready: true,
        banned: false,
        spectator: false,
        turnsTaken: 2,
        streak: 0,
        swapUsed: false,
      };

      tx.setPlayer(roomCode, 'u1', { ...basePlayer, uid: 'u1', name: 'Alice', seat: 0, sessionScore: 700 });
      tx.setPlayer(roomCode, 'u2', { ...basePlayer, uid: 'u2', name: 'Bob', seat: 1, sessionScore: 100 });
      tx.setPlayer(roomCode, 'u3', { ...basePlayer, uid: 'u3', name: 'Cara', seat: 2, sessionScore: 0 });

      // u1 earns 700 XP -> level 5 (unlocks amber, brass, emerald, crimson)
      tx.addTurnRecord(roomCode, {
        turnVersion: 1,
        round: 1,
        performerUid: 'u1',
        resultStamp: 'PASSED',
        streakAtTurn: 4,
        lifetimeXpDelta: 700,
      });
      // u2 earns 100 XP -> level 2 (unlocks amber, brass)
      tx.addTurnRecord(roomCode, {
        turnVersion: 2,
        round: 2,
        performerUid: 'u2',
        resultStamp: 'PASSED',
        streakAtTurn: 0,
        lifetimeXpDelta: 100,
      });
      // u3 skipped -> 0 XP -> level 1 (unlocks amber)
      tx.addTurnRecord(roomCode, {
        turnVersion: 3,
        round: 3,
        performerUid: 'u3',
        resultStamp: 'SKIPPED',
        streakAtTurn: 0,
        lifetimeXpDelta: 0,
      });
    });

    const finishRes = await callRoute(gameFinishHandler, {
      uid: 'u1',
      url: '/api/game/finish',
      body: {
        idempotencyKey: randomUUID(),
        roomCode,
        expectedPhase: 'SUMMARY',
        expectedVersion: 10,
      },
    });

    expect(finishRes.statusCode).toBe(200);
    const finishBody = finishRes.body as {
      ok: boolean;
      turnVersion: number;
      awards: Record<
        string,
        {
          xpGained: number;
          newLifetimeXp: number;
          newLevel: number;
          unlockedSkins: string[];
        }
      >;
    };

    expect(finishBody.turnVersion).toBe(11);
    expect(finishBody.awards.u1!.xpGained).toBe(700);
    expect(finishBody.awards.u1!.newLevel).toBe(calculateLevel(700));
    expect(finishBody.awards.u1!.newLevel).toBeGreaterThanOrEqual(5);
    expect(finishBody.awards.u1!.unlockedSkins).toEqual(['amber', 'brass', 'emerald', 'crimson']);

    expect(finishBody.awards.u2!.xpGained).toBe(100);
    expect(finishBody.awards.u2!.newLevel).toBe(2);
    expect(finishBody.awards.u2!.unlockedSkins).toEqual(['amber', 'brass']);

    expect(finishBody.awards.u3!.xpGained).toBe(0);
    expect(finishBody.awards.u3!.newLevel).toBe(1);
    expect(finishBody.awards.u3!.unlockedSkins).toEqual(['amber']);

    // Verify Table history is persisted on users/{uid}
    const savedU1 = (await store.runTransaction((tx) => tx.getUser('u1'))) as UserDocWithHistory;
    expect(savedU1.tableHistory).toHaveLength(1);
    expect(savedU1.tableHistory![0]).toMatchObject({
      roomCode,
      roundsPlayed: 5,
      sessionScore: 700,
      xpGained: 700,
      rank: 1,
      playerCount: 3,
    });

    // Calling finish again with a new idempotencyKey does not double-award XP
    const replayRes = await callRoute(gameFinishHandler, {
      uid: 'u2',
      url: '/api/game/finish',
      body: {
        idempotencyKey: randomUUID(),
        roomCode,
        expectedPhase: 'SUMMARY',
        expectedVersion: 11,
      },
    });
    expect(replayRes.statusCode).toBe(200);
    const replayAwards = (replayRes.body as typeof finishBody).awards;
    expect(replayAwards.u1!.xpGained).toBe(0);
    expect(replayAwards.u1!.newLifetimeXp).toBe(700);
  });
});
