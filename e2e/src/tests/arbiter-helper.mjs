import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import * as nodeModule from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../..');

// Map `.js` relative TypeScript imports to `.ts` when running directly under Node 26+.
if (typeof nodeModule.registerHooks === 'function') {
  nodeModule.registerHooks({
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

process.env.VOWLET_LOCAL_MEMORY = '1';

const imp = (relPath) => import(pathToFileURL(resolve(repoRoot, relPath)).href);

const { getMemoryStore } = await imp('api/_lib/store.ts');
const { MockJudgeAdapter } = await imp('api/judge/adapter.ts');
const { clearJudgeCache, runJudgePipeline } = await imp('api/judge/pipeline.ts');
const { default: submitChitHandler } = await imp('api/chit/submit.ts');
const { default: createRoomHandler } = await imp('api/room/create.ts');
const { default: joinRoomHandler } = await imp('api/room/join.ts');
const { default: leaveRoomHandler } = await imp('api/room/leave.ts');
const { default: migrateHostHandler } = await imp('api/room/migrate.ts');
const { default: startRoomHandler } = await imp('api/room/start.ts');
const { default: advanceTurnHandler } = await imp('api/turn/advance.ts');
const { default: chooseTurnHandler } = await imp('api/turn/choose.ts');
const { default: performDoneHandler } = await imp('api/turn/perform/done.ts');
const { default: voteTurnHandler } = await imp('api/turn/vote.ts');

const PRESENCE_GRACE_MS = 25_000;
const SCHEMA_VERSION = 1;

async function invokeHandler(handler, options) {
  const req = {
    method: options.method ?? 'POST',
    headers: { 'x-test-uid': options.uid },
    body: options.body ? { idempotencyKey: randomUUID(), ...options.body } : undefined,
    query: options.query ?? {},
    url: options.url ?? '/api/test',
  };

  const result = { status: 200, body: {} };
  const res = {
    setHeader() {
      return this;
    },
    status(code) {
      result.status = code;
      return this;
    },
    json(payload) {
      result.body = payload;
      return this;
    },
    end() {
      return this;
    },
  };

  await handler(req, res);
  return result;
}

async function setupToVote() {
  const store = getMemoryStore();
  store.reset();
  const t0 = store.now();

  const createRes = await invokeHandler(createRoomHandler, {
    uid: 'u1',
    url: '/api/room/create',
    body: {
      name: 'Aria',
      avatar: 'owl-1',
      schemaVersion: SCHEMA_VERSION,
      settings: { rounds: 5, quickPlay: true },
    },
  });
  const code = createRes.body.code;

  for (const [uid, name] of [
    ['u2', 'Kabir'],
    ['u3', 'Meera'],
  ]) {
    store.advanceClock(100);
    await invokeHandler(joinRoomHandler, {
      uid,
      url: '/api/room/join',
      body: { roomCode: code, name, avatar: 'owl-2', schemaVersion: SCHEMA_VERSION },
    });
  }

  const now = store.now();
  store.setPresence(code, 'u1', { online: true, away: false, lastSeen: t0 });
  store.setPresence(code, 'u2', { online: true, away: false, lastSeen: now });
  store.setPresence(code, 'u3', { online: true, away: false, lastSeen: now });

  const startRes = await invokeHandler(startRoomHandler, {
    uid: 'u1',
    url: '/api/room/start',
    body: { roomCode: code, expectedPhase: 'LOBBY', expectedVersion: 0 },
  });

  store.advanceClock(5_000);
  const spinAdv = await invokeHandler(advanceTurnHandler, {
    uid: 'u2',
    url: '/api/turn/advance',
    body: { roomCode: code, expectedPhase: 'SPIN', expectedVersion: startRes.body.turnVersion },
  });

  const performerUid = spinAdv.body.performerUid;
  const chooseRes = await invokeHandler(chooseTurnHandler, {
    uid: performerUid,
    url: '/api/turn/choose',
    body: {
      roomCode: code,
      expectedPhase: 'CHOOSE',
      expectedVersion: spinAdv.body.turnVersion,
      choice: 'TRUTH',
    },
  });

  const doneRes = await invokeHandler(performDoneHandler, {
    uid: performerUid,
    url: '/api/turn/perform/done',
    body: {
      roomCode: code,
      expectedPhase: 'PERFORM',
      expectedVersion: chooseRes.body.turnVersion,
    },
  });

  return { store, code, performerUid, voteVersion: doneRes.body.turnVersion };
}

const scenario = process.argv[2];

if (scenario === 'chaos1') {
  const { store, code, performerUid, voteVersion } = await setupToVote();
  store.advanceClock(PRESENCE_GRACE_MS + 5_000);
  const now = store.now();
  store.setPresence(code, 'u1', {
    online: false,
    away: false,
    lastSeen: now - PRESENCE_GRACE_MS - 1_000,
  });
  store.setPresence(code, 'u2', { online: true, away: false, lastSeen: now });
  store.setPresence(code, 'u3', { online: true, away: false, lastSeen: now });

  const migrateRes = await invokeHandler(migrateHostHandler, {
    uid: 'u2',
    url: '/api/room/migrate',
    body: { roomCode: code, expectedPhase: 'VOTE', expectedVersion: voteVersion },
  });

  const witnessUid = ['u2', 'u3'].find((u) => u !== performerUid) ?? 'u2';
  const voteRes = await invokeHandler(voteTurnHandler, {
    uid: witnessUid,
    url: '/api/turn/vote',
    body: {
      roomCode: code,
      expectedPhase: 'VOTE',
      expectedVersion: migrateRes.body.turnVersion,
      verdict: 'APPROVE',
    },
  });
  const advRes = await invokeHandler(advanceTurnHandler, {
    uid: witnessUid,
    url: '/api/turn/advance',
    body: {
      roomCode: code,
      expectedPhase: 'VOTE',
      expectedVersion: migrateRes.body.turnVersion,
    },
  });

  console.log(JSON.stringify({ migrateRes, voteRes, advRes }));
} else if (scenario === 'chaos4') {
  const { store, code, performerUid, voteVersion } = await setupToVote();
  const witness = ['u1', 'u2', 'u3'].find((u) => u !== performerUid);
  const otherWitness = ['u1', 'u2', 'u3'].find((u) => u !== performerUid && u !== witness);

  await invokeHandler(voteTurnHandler, {
    uid: witness,
    url: '/api/turn/vote',
    body: {
      roomCode: code,
      expectedPhase: 'VOTE',
      expectedVersion: voteVersion,
      verdict: 'APPROVE',
    },
  });
  store.advanceClock(21_000);
  const advRes = await invokeHandler(advanceTurnHandler, {
    uid: witness,
    url: '/api/turn/advance',
    body: { roomCode: code, expectedPhase: 'VOTE', expectedVersion: voteVersion },
  });

  const lateVoteRes = await invokeHandler(voteTurnHandler, {
    uid: otherWitness,
    url: '/api/turn/vote',
    body: {
      roomCode: code,
      expectedPhase: 'VOTE',
      expectedVersion: voteVersion,
      verdict: 'REJECT',
    },
  });

  console.log(JSON.stringify({ advRes, lateVoteRes }));
} else if (scenario === 'chaos7') {
  const store = getMemoryStore();
  store.reset();
  const createRes = await invokeHandler(createRoomHandler, {
    uid: 'u1',
    url: '/api/room/create',
    body: {
      name: 'Aria',
      avatar: 'owl-1',
      schemaVersion: SCHEMA_VERSION,
      settings: { rounds: 5, quickPlay: true },
    },
  });
  process.env.MIN_SCHEMA_VERSION = '2';
  const oldJoinRes = await invokeHandler(joinRoomHandler, {
    uid: 'u2',
    url: '/api/room/join',
    body: {
      roomCode: createRes.body.code,
      name: 'Kabir',
      avatar: 'owl-2',
      schemaVersion: 1,
    },
  });
  console.log(JSON.stringify({ oldJoinRes }));
} else if (scenario === 'chaos10') {
  clearJudgeCache();
  const pipelineResult = await runJudgePipeline(
    {
      text: 'Share a harmless secret __SIMULATE_TIMEOUT__',
      kind: 'TRUTH',
      tier: 'MILD',
      dareType: null,
    },
    {
      adapter: new MockJudgeAdapter(),
      llmJudgeEnabled: true,
      bypassCache: true,
    },
  );

  process.env.GEMINI_API_KEY = 'mock-eval-key';
  const store = getMemoryStore();
  store.reset();
  const createRes = await invokeHandler(createRoomHandler, {
    uid: 'u1',
    url: '/api/room/create',
    body: {
      name: 'Aria',
      avatar: 'owl-1',
      schemaVersion: SCHEMA_VERSION,
      settings: { rounds: 5, quickPlay: false },
    },
  });
  const submitRes = await invokeHandler(submitChitHandler, {
    uid: 'u1',
    url: '/api/chit/submit',
    body: {
      roomCode: createRes.body.code,
      kind: 'TRUTH',
      tier: 'MILD',
      text: 'Tell a funny story __SIMULATE_TIMEOUT__',
    },
  });

  console.log(JSON.stringify({ pipelineResult, submitRes }));
} else if (scenario === 'chaos13') {
  const { store, code } = await setupToVote();
  const leave1 = await invokeHandler(leaveRoomHandler, {
    uid: 'u3',
    url: '/api/room/leave',
    body: { roomCode: code },
  });
  const pausedRoom = await store.runTransaction((tx) => tx.getRoom(code));
  const remainingPlayers = await store.runTransaction((tx) => tx.getPlayers(code));

  store.advanceClock(61_000);
  const leave2 = await invokeHandler(leaveRoomHandler, {
    uid: 'u2',
    url: '/api/room/leave',
    body: { roomCode: code },
  });

  console.log(
    JSON.stringify({
      leave1,
      remainingCount: remainingPlayers.length,
      lowPlayerSince: pausedRoom?.lowPlayerSince ?? null,
      leave2,
    }),
  );
} else {
  throw new Error(`Unknown scenario: ${scenario}`);
}
