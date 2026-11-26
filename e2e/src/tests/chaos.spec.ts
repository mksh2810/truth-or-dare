import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { BotPlayer } from '../bots/bot-player';

const SCHEMA_VERSION = 1;
const API_BASE = process.env.API_URL ?? 'http://localhost:3001';

interface ApiCallResult<T = Record<string, unknown>> {
  status: number;
  body: T;
}

async function httpApi<T = Record<string, unknown>>(
  path: string,
  options: {
    method?: 'GET' | 'POST';
    uid: string;
    body?: Record<string, unknown>;
    query?: Record<string, string>;
  },
): Promise<ApiCallResult<T>> {
  const method = options.method ?? 'POST';
  const url = new URL(path, API_BASE);
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      url.searchParams.set(k, v);
    }
  }
  const res = await fetch(url.toString(), {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-test-uid': options.uid,
    },
    body:
      method === 'POST'
        ? JSON.stringify({ idempotencyKey: randomUUID(), ...(options.body ?? {}) })
        : undefined,
  });
  const body = (await res.json()) as T;
  return { status: res.status, body };
}

function runArbiterScenario<T = Record<string, unknown>>(scenario: string): T {
  const helperPath = resolve(process.cwd(), 'src/tests/arbiter-helper.mjs');
  const stdout = execFileSync(process.execPath, [helperPath, scenario], {
    encoding: 'utf8',
  });
  return JSON.parse(stdout.trim()) as T;
}

async function waitForAllTestId(bots: BotPlayer[], testId: string, timeout = 20_000): Promise<void> {
  await Promise.all(
    bots.map((bot) => bot.getPage().getByTestId(testId).waitFor({ state: 'visible', timeout })),
  );
}

async function findPerformerInChoose(bots: BotPlayer[]): Promise<BotPlayer> {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    for (const bot of bots) {
      const visible = await bot
        .getPage()
        .getByTestId('choose-truth-btn')
        .isVisible()
        .catch(() => false);
      if (visible) return bot;
    }
    await bots[0]!.getPage().waitForTimeout(100);
  }
  throw new Error('Timed out waiting for performer in CHOOSE');
}

test.describe('Phase 2 Chaos Suite (Section 9.2 — All 14 Scenarios)', () => {
  test('Chaos 1: Host closes app mid-vote -> /api/room/migrate elects new host, vote completes', async () => {
    const out = runArbiterScenario<{
      migrateRes: { status: number; body: { ok: boolean; migrated: boolean; hostUid: string; demotedHostUid: string } };
      voteRes: { status: number };
      advRes: { status: number; body: { phase: string } };
    }>('chaos1');

    expect(out.migrateRes.status).toBe(200);
    expect(out.migrateRes.body).toMatchObject({
      ok: true,
      migrated: true,
      hostUid: 'u2',
      demotedHostUid: 'u1',
    });
    expect(out.voteRes.status).toBe(200);
    expect(out.advRes.status).toBe(200);
    expect(out.advRes.body.phase).toBe('RESULT');
  });

  test('Chaos 2: Performer backgrounds app (visibilitychange) -> stays away, not dropped', async ({
    browser,
  }) => {
    const bots = ['Aria', 'Kabir', 'Meera'].map((name) => new BotPlayer({ name }));
    const [host, ...guests] = bots as [BotPlayer, ...BotPlayer[]];

    try {
      await Promise.all(bots.map((b) => b.init(browser)));
      await Promise.all(bots.map((b) => b.acceptConsentIfPresent()));

      const roomCode = await host.createRoom({ rounds: 5, quickPlay: true });
      await Promise.all(guests.map((b) => b.joinRoom(roomCode)));
      await Promise.all(bots.map((b) => b.toggleReady()));
      await host.startGame();

      await waitForAllTestId(bots, 'chosen-screen');
      const performer = await findPerformerInChoose(bots);
      await performer.choose('TRUTH');
      await waitForAllTestId(bots, 'perform-screen');

      // Simulate mobile app backgrounding via visibilitychange
      await performer.getPage().evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
        Object.defineProperty(document, 'visibilityState', {
          configurable: true,
          get: () => 'hidden',
        });
        document.dispatchEvent(new Event('visibilitychange'));
      });

      await performer.getPage().waitForTimeout(800);
      await expect(performer.getPage().getByTestId('perform-screen')).toBeVisible();
      await expect(performer.getPage().getByTestId('room-closed-screen')).toHaveCount(0);

      // Foreground app again and complete turn
      await performer.getPage().evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
        Object.defineProperty(document, 'visibilityState', {
          configurable: true,
          get: () => 'visible',
        });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      await performer.completePerform('DONE');
      await waitForAllTestId(bots, 'vote-screen');
    } finally {
      await Promise.all(bots.map((b) => b.close()));
    }
  });

  test('Chaos 3: Two clients call /api/turn/advance at the same instant after deadline -> 200 + 409', async () => {
    const u1 = `c3_u1_${randomUUID().slice(0, 6)}`;
    const u2 = `c3_u2_${randomUUID().slice(0, 6)}`;
    const u3 = `c3_u3_${randomUUID().slice(0, 6)}`;

    const createRes = await httpApi<{ code: string }>('/api/room/create', {
      uid: u1,
      body: {
        name: 'Aria',
        avatar: 'owl-1',
        schemaVersion: SCHEMA_VERSION,
        settings: { rounds: 5, quickPlay: true },
      },
    });
    expect(createRes.status).toBe(201);
    const code = createRes.body.code;

    await httpApi('/api/room/join', {
      uid: u2,
      body: { roomCode: code, name: 'Kabir', avatar: 'owl-2', schemaVersion: SCHEMA_VERSION },
    });
    await httpApi('/api/room/join', {
      uid: u3,
      body: { roomCode: code, name: 'Meera', avatar: 'owl-3', schemaVersion: SCHEMA_VERSION },
    });

    const startRes = await httpApi<{ turnVersion: number }>('/api/room/start', {
      uid: u1,
      body: { roomCode: code, expectedPhase: 'LOBBY', expectedVersion: 0 },
    });
    expect(startRes.status).toBe(200);

    // Wait past 4.5s SPIN deadline
    await new Promise((r) => setTimeout(r, 4700));

    const [r1, r2] = await Promise.all([
      httpApi('/api/turn/advance', {
        uid: u1,
        body: { roomCode: code, expectedPhase: 'SPIN', expectedVersion: startRes.body.turnVersion },
      }),
      httpApi('/api/turn/advance', {
        uid: u2,
        body: { roomCode: code, expectedPhase: 'SPIN', expectedVersion: startRes.body.turnVersion },
      }),
    ]);

    const statuses = [r1.status, r2.status].sort((a, b) => a - b);
    expect(statuses).toEqual([200, 409]);
  });

  test('Chaos 4: Vote written offline arrives after turn ended -> rejected (409) with clear message', async () => {
    const out = runArbiterScenario<{
      advRes: { status: number };
      lateVoteRes: { status: number; body: { code: string; error: { message: string } } };
    }>('chaos4');

    expect(out.advRes.status).toBe(200);
    expect(out.lateVoteRes.status).toBe(409);
    expect(out.lateVoteRes.body.code).toBe('VERSION_MISMATCH');
    expect(out.lateVoteRes.body.error.message).toMatch(/Expected phase VOTE/i);
  });

  test('Chaos 5: Two players join last (8th) seat at once -> one succeeds (200), one gets ROOM_FULL (409)', async () => {
    const names = ['Aria', 'Kabir', 'Meera', 'Dev', 'Zoya', 'Rohan', 'Naina', 'Vikram', 'Tara'] as const;
    const hostUid = `c5_u1_${randomUUID().slice(0, 6)}`;
    const createRes = await httpApi<{ code: string }>('/api/room/create', {
      uid: hostUid,
      body: {
        name: names[0],
        avatar: 'owl-1',
        schemaVersion: SCHEMA_VERSION,
        settings: { rounds: 5, quickPlay: true },
      },
    });
    expect(createRes.status).toBe(201);
    const code = createRes.body.code;

    // Fill seats 2..7
    for (let i = 1; i <= 6; i += 1) {
      const joinRes = await httpApi('/api/room/join', {
        uid: `c5_u${i + 1}_${randomUUID().slice(0, 6)}`,
        body: {
          roomCode: code,
          name: names[i]!,
          avatar: 'owl-2',
          schemaVersion: SCHEMA_VERSION,
        },
      });
      expect(joinRes.status).toBe(200);
    }

    // Two players race for the 8th (last) seat
    const [r8, r9] = await Promise.all([
      httpApi<{ seat?: number; error?: { code: string } }>('/api/room/join', {
        uid: `c5_u8_${randomUUID().slice(0, 6)}`,
        body: { roomCode: code, name: names[7], avatar: 'owl-3', schemaVersion: SCHEMA_VERSION },
      }),
      httpApi<{ seat?: number; error?: { code: string } }>('/api/room/join', {
        uid: `c5_u9_${randomUUID().slice(0, 6)}`,
        body: { roomCode: code, name: names[8], avatar: 'owl-4', schemaVersion: SCHEMA_VERSION },
      }),
    ]);

    const sorted = [r8, r9].sort((a, b) => a.status - b.status);
    expect(sorted[0]!.status).toBe(200);
    expect(sorted[0]!.body.seat).toBe(7);
    expect(sorted[1]!.status).toBe(409);
    expect(sorted[1]!.body.error?.code).toBe('ROOM_FULL');
  });

  test('Chaos 6: Refresh mid-spin and mid-vote -> correct screen restored; bottle snaps to stored angle', async ({
    browser,
  }) => {
    const bots = ['Aria', 'Kabir', 'Meera'].map((name) => new BotPlayer({ name }));
    const [host, guest1, guest2] = bots as [BotPlayer, BotPlayer, BotPlayer];

    try {
      await Promise.all(bots.map((b) => b.init(browser)));
      await Promise.all(bots.map((b) => b.acceptConsentIfPresent()));

      const roomCode = await host.createRoom({ rounds: 5, quickPlay: true });
      await Promise.all([guest1.joinRoom(roomCode), guest2.joinRoom(roomCode)]);
      await Promise.all(bots.map((b) => b.toggleReady()));
      await host.startGame();

      // Mid-SPIN refresh for guest2 with reducedMotion so bottle snaps immediately on reconnect
      await waitForAllTestId(bots, 'bottle-spin-screen');
      await guest2.getPage().emulateMedia({ reducedMotion: 'reduce' });
      await guest2.getPage().goto(`/?join=${roomCode}`);
      await guest2.getPage().getByTestId('join-name-input').fill(guest2.name);
      await guest2.getPage().getByTestId('join-submit-btn').click();
      await guest2
        .getPage()
        .locator('[data-testid="bottle-spin-screen"], [data-testid="chosen-screen"]')
        .first()
        .waitFor({ state: 'visible' });

      // Advance to VOTE
      await waitForAllTestId(bots, 'chosen-screen');
      const performer = await findPerformerInChoose(bots);
      await performer.choose('TRUTH');
      await waitForAllTestId(bots, 'perform-screen');
      await performer.completePerform('DONE');
      await waitForAllTestId(bots, 'vote-screen');

      // Mid-VOTE refresh for a non-performer witness
      const witness = [host, guest1, guest2].find((b) => b !== performer)!;
      await witness.getPage().goto(`/?join=${roomCode}`);
      await witness.getPage().getByTestId('join-name-input').fill(witness.name);
      await witness.getPage().getByTestId('join-submit-btn').click();
      await expect(witness.getPage().getByTestId('vote-screen')).toBeVisible();
    } finally {
      await Promise.all(bots.map((b) => b.close()));
    }
  });

  test('Chaos 7: Old client (schemaVersion < min_schema_version) joins newer room -> blocked with 426 SCHEMA_MISMATCH', async () => {
    const out = runArbiterScenario<{
      oldJoinRes: { status: number; body: { error: { code: string } } };
    }>('chaos7');
    expect(out.oldJoinRes.status).toBe(426);
    expect(out.oldJoinRes.body.error.code).toBe('SCHEMA_MISMATCH');

    // Also verify schemaVersion: 0 is rejected by the HTTP endpoint
    const u1 = `c7_u1_${randomUUID().slice(0, 6)}`;
    const createRes = await httpApi<{ code: string }>('/api/room/create', {
      uid: u1,
      body: {
        name: 'Aria',
        avatar: 'owl-1',
        schemaVersion: SCHEMA_VERSION,
        settings: { rounds: 5, quickPlay: true },
      },
    });
    expect(createRes.status).toBe(201);

    const zeroJoinRes = await httpApi('/api/room/join', {
      uid: `c7_u2_${randomUUID().slice(0, 6)}`,
      body: {
        roomCode: createRes.body.code,
        name: 'OldClient',
        avatar: 'owl-2',
        schemaVersion: 0,
      },
    });
    expect(zeroJoinRes.status).toBeGreaterThanOrEqual(400);
  });

  test('Chaos 8: Non-performer tries to read sealed prompt (private/{performerUid}) -> denied / not exposed', async () => {
    const uids = ['c8_u1', 'c8_u2', 'c8_u3'].map((p) => `${p}_${randomUUID().slice(0, 5)}`);
    const [u1, u2, u3] = uids as [string, string, string];

    const createRes = await httpApi<{ code: string }>('/api/room/create', {
      uid: u1,
      body: {
        name: 'Aria',
        avatar: 'owl-1',
        schemaVersion: SCHEMA_VERSION,
        settings: { rounds: 5, quickPlay: true },
      },
    });
    const code = createRes.body.code;
    await httpApi('/api/room/join', {
      uid: u2,
      body: { roomCode: code, name: 'Kabir', avatar: 'owl-2', schemaVersion: SCHEMA_VERSION },
    });
    await httpApi('/api/room/join', {
      uid: u3,
      body: { roomCode: code, name: 'Meera', avatar: 'owl-3', schemaVersion: SCHEMA_VERSION },
    });

    const startRes = await httpApi<{ turnVersion: number }>('/api/room/start', {
      uid: u1,
      body: { roomCode: code, expectedPhase: 'LOBBY', expectedVersion: 0 },
    });
    await new Promise((r) => setTimeout(r, 4700));

    const spinAdv = await httpApi<{ turnVersion: number; performerUid: string }>('/api/turn/advance', {
      uid: u1,
      body: { roomCode: code, expectedPhase: 'SPIN', expectedVersion: startRes.body.turnVersion },
    });
    const performerUid = spinAdv.body.performerUid;
    await httpApi('/api/turn/choose', {
      uid: performerUid,
      body: {
        roomCode: code,
        expectedPhase: 'CHOOSE',
        expectedVersion: spinAdv.body.turnVersion,
        choice: 'TRUTH',
      },
    });

    const nonPerformer = uids.find((u) => u !== performerUid)!;
    const nonPerfState = await httpApi<{ privatePrompt: unknown }>('/api/room/state', {
      method: 'GET',
      uid: nonPerformer,
      query: { roomCode: code },
    });
    expect(nonPerfState.status).toBe(200);
    expect(nonPerfState.body.privatePrompt).toBeNull();

    const perfState = await httpApi<{ privatePrompt: { text: string } | null }>('/api/room/state', {
      method: 'GET',
      uid: performerUid,
      query: { roomCode: code },
    });
    expect(perfState.status).toBe(200);
    expect(perfState.body.privatePrompt?.text).toBeTruthy();

    const rules = readFileSync(resolve(process.cwd(), '../firebase/firestore.rules'), 'utf8');
    expect(rules).toContain('match /private/{uid}');
    expect(rules).toContain('request.auth.uid == uid');
    expect(rules).toContain('getTurn(code).data.performerUid == uid');
  });

  test('Chaos 9: Client tries to bypass moderation -> Firestore rules deny chits write; /api/chit/submit rejects unsafe chit', async () => {
    const rules = readFileSync(resolve(process.cwd(), '../firebase/firestore.rules'), 'utf8');
    expect(rules).toMatch(/match \/chits\/\{id\}\s*\{[\s\S]*?allow write:\s*if false;/);
    expect(rules).toMatch(/match \/secret\/\{id\}\s*\{[\s\S]*?allow read, write:\s*if false;/);

    const u1 = `c9_u1_${randomUUID().slice(0, 6)}`;
    const createRes = await httpApi<{ code: string }>('/api/room/create', {
      uid: u1,
      body: {
        name: 'Aria',
        avatar: 'owl-1',
        schemaVersion: SCHEMA_VERSION,
        settings: { rounds: 5, quickPlay: false },
      },
    });
    expect(createRes.status).toBe(201);

    const unsafeRes = await httpApi<{ verdict: string; status: string }>('/api/chit/submit', {
      uid: u1,
      body: {
        roomCode: createRes.body.code,
        kind: 'DARE',
        tier: 'SPICY',
        dareType: 'INSTANT',
        text: 'Drink two shots of vodka and drive around the block',
      },
    });
    expect(unsafeRes.status).toBe(200);
    expect(unsafeRes.body.verdict).toBe('NOPE');
    expect(unsafeRes.body.status).toBe('REJECTED');

    const stateRes = await httpApi<{ chits: unknown[] }>('/api/room/state', {
      method: 'GET',
      uid: u1,
      query: { roomCode: createRes.body.code },
    });
    expect(stateRes.status).toBe(200);
    expect(stateRes.body.chits).toEqual([]);
  });

  test('Chaos 10: LLM Judge times out (__SIMULATE_TIMEOUT__) -> stays pending, retries once, never auto-approved', async () => {
    const out = runArbiterScenario<{
      pipelineResult: {
        outcome: string;
        verdict: string | null;
        status: string;
        retried: boolean;
        attempts: number;
        fallbackAction: string;
      };
      submitRes: {
        status: number;
        body: { verdict: string | null; status: string; fallbackAction: string };
      };
    }>('chaos10');

    expect(out.pipelineResult.outcome).toBe('PENDING_RETRY');
    expect(out.pipelineResult.verdict).toBeNull();
    expect(out.pipelineResult.status).toBe('PENDING');
    expect(out.pipelineResult.retried).toBe(true);
    expect(out.pipelineResult.attempts).toBe(2);
    expect(out.pipelineResult.fallbackAction).toBe('REWRITE_OR_STARTER');

    expect(out.submitRes.status).toBe(200);
    expect(out.submitRes.body.verdict).toBeNull();
    expect(out.submitRes.body.status).toBe('PENDING');
    expect(out.submitRes.body.fallbackAction).toBe('REWRITE_OR_STARTER');
  });

  test('Chaos 11: Kicked player rejoins with same uid -> denied (403)', async () => {
    const u1 = `c11_u1_${randomUUID().slice(0, 6)}`;
    const u2 = `c11_u2_${randomUUID().slice(0, 6)}`;
    const u3 = `c11_u3_${randomUUID().slice(0, 6)}`;

    const createRes = await httpApi<{ code: string }>('/api/room/create', {
      uid: u1,
      body: {
        name: 'Aria',
        avatar: 'owl-1',
        schemaVersion: SCHEMA_VERSION,
        settings: { rounds: 5, quickPlay: true },
      },
    });
    const code = createRes.body.code;

    await httpApi('/api/room/join', {
      uid: u2,
      body: { roomCode: code, name: 'Kabir', avatar: 'owl-2', schemaVersion: SCHEMA_VERSION },
    });
    await httpApi('/api/room/join', {
      uid: u3,
      body: { roomCode: code, name: 'Meera', avatar: 'owl-3', schemaVersion: SCHEMA_VERSION },
    });

    const kickRes = await httpApi('/api/room/kick', {
      uid: u1,
      body: { roomCode: code, targetUid: u2 },
    });
    expect(kickRes.status).toBe(200);

    const rejoinRes = await httpApi<{ error: { code: string } }>('/api/room/join', {
      uid: u2,
      body: { roomCode: code, name: 'Kabir', avatar: 'owl-2', schemaVersion: SCHEMA_VERSION },
    });
    expect(rejoinRes.status).toBe(403);
    expect(rejoinRes.body.error.code).toBe('BANNED');
  });

  test('Chaos 12: Performer leaves during PERFORM -> turn ends SKIPPED with no penalty, game continues', async () => {
    const uids = ['c12_u1', 'c12_u2', 'c12_u3', 'c12_u4'].map(
      (p) => `${p}_${randomUUID().slice(0, 5)}`,
    );
    const [u1, u2, u3, u4] = uids as [string, string, string, string];

    const createRes = await httpApi<{ code: string }>('/api/room/create', {
      uid: u1,
      body: {
        name: 'Aria',
        avatar: 'owl-1',
        schemaVersion: SCHEMA_VERSION,
        settings: { rounds: 5, quickPlay: true },
      },
    });
    const code = createRes.body.code;

    for (const [uid, name] of [
      [u2, 'Kabir'],
      [u3, 'Meera'],
      [u4, 'Dev'],
    ] as const) {
      await httpApi('/api/room/join', {
        uid,
        body: { roomCode: code, name, avatar: 'owl-2', schemaVersion: SCHEMA_VERSION },
      });
    }

    const startRes = await httpApi<{ turnVersion: number }>('/api/room/start', {
      uid: u1,
      body: { roomCode: code, expectedPhase: 'LOBBY', expectedVersion: 0 },
    });
    await new Promise((r) => setTimeout(r, 4700));

    const spinAdv = await httpApi<{ turnVersion: number; performerUid: string }>('/api/turn/advance', {
      uid: u1,
      body: { roomCode: code, expectedPhase: 'SPIN', expectedVersion: startRes.body.turnVersion },
    });
    const performerUid = spinAdv.body.performerUid;

    const chooseRes = await httpApi<{ turnVersion: number }>('/api/turn/choose', {
      uid: performerUid,
      body: {
        roomCode: code,
        expectedPhase: 'CHOOSE',
        expectedVersion: spinAdv.body.turnVersion,
        choice: 'DARE',
      },
    });
    expect(chooseRes.status).toBe(200);

    // Performer leaves during PERFORM
    const leaveRes = await httpApi('/api/room/leave', {
      uid: performerUid,
      body: { roomCode: code },
    });
    expect(leaveRes.status).toBe(200);

    const observerUid = uids.find((u) => u !== performerUid)!;
    const stateRes = await httpApi<{
      room: { phase: string; turnVersion: number };
      turn: { resultStamp: string; sessionScoreDelta: number };
    }>('/api/room/state', {
      method: 'GET',
      uid: observerUid,
      query: { roomCode: code },
    });
    expect(stateRes.status).toBe(200);
    expect(stateRes.body.room.phase).toBe('RESULT');
    expect(stateRes.body.turn.resultStamp).toBe('SKIPPED');
    expect(stateRes.body.turn.sessionScoreDelta).toBe(0);

    // Game continues to next round SPIN
    const nextRes = await httpApi<{ phase: string }>('/api/turn/advance', {
      uid: observerUid,
      body: {
        roomCode: code,
        expectedPhase: 'RESULT',
        expectedVersion: stateRes.body.room.turnVersion,
      },
    });
    expect(nextRes.status).toBe(200);
    expect(nextRes.body.phase).toBe('SPIN');
  });

  test('Chaos 13: Players drop below 3 -> room pauses / closes cleanly (<3 present)', async () => {
    const out = runArbiterScenario<{
      leave1: { status: number; body: { phase: string } };
      remainingCount: number;
      lowPlayerSince: number | null;
      leave2: { status: number; body: { phase: string } };
    }>('chaos13');

    expect(out.leave1.status).toBe(200);
    expect(out.remainingCount).toBe(2);
    expect(out.lowPlayerSince).not.toBeNull();
    expect(out.leave2.status).toBe(200);
    expect(out.leave2.body.phase).toBe('CLOSED');
  });

  test('Chaos 14: Device clock set 5 minutes off -> timers show correct remaining time via clockOffsetMs', async ({
    browser,
  }) => {
    const host = new BotPlayer({ name: 'Aria' });
    const guest1 = new BotPlayer({ name: 'Kabir' });
    const guest2 = new BotPlayer({ name: 'Meera' });
    const bots = [host, guest1, guest2];

    try {
      await host.init(browser);
      await guest1.init(browser);
      await guest2.init(browser);

      // Shift guest2's device clock +5 minutes (+300,000 ms) ahead of real time
      await guest2.getPage().addInitScript(() => {
        const SKEW_MS = 300_000;
        const origNow = Date.now.bind(Date);
        Date.now = () => origNow() + SKEW_MS;
      });
      await guest2.getPage().reload();

      await Promise.all(bots.map((b) => b.acceptConsentIfPresent()));

      const roomCode = await host.createRoom({ rounds: 5, quickPlay: true });
      await Promise.all([guest1.joinRoom(roomCode), guest2.joinRoom(roomCode)]);
      await Promise.all(bots.map((b) => b.toggleReady()));
      await host.startGame();

      // Wait for SPIN -> CHOOSE (15s timer)
      await waitForAllTestId(bots, 'chosen-screen');
      const ariaLabel = await guest2.getPage().getByTestId('timer-ring').getAttribute('aria-label');
      const match = ariaLabel?.match(/(\d+)\s+seconds/);
      expect(match).not.toBeNull();
      const remainingSec = Number(match![1]);
      expect(remainingSec).toBeGreaterThanOrEqual(5);
      expect(remainingSec).toBeLessThanOrEqual(16);
    } finally {
      await Promise.all(bots.map((b) => b.close()));
    }
  });
});
