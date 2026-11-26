import { createHash } from 'node:crypto';
import { getApps, initializeApp, cert, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getAppCheck } from 'firebase-admin/app-check';
import { getDatabase } from 'firebase-admin/database';
import { FieldValue, getFirestore, Timestamp as AdminTimestamp } from 'firebase-admin/firestore';
import type {
  ChitDoc,
  PlayerDoc,
  PresenceNode,
  PrivatePromptDoc,
  ResultStamp,
  RoomDoc,
  SecretChitDoc,
  TurnDoc,
  UserDoc,
  VoteDoc,
} from '@vowlet/shared';
import { getEnvConfig } from './env.js';

export interface VerifiedTurnRecord {
  turnVersion: number;
  round: number;
  performerUid: string;
  resultStamp: ResultStamp;
  streakAtTurn: number;
  lifetimeXpDelta: number;
}

export interface RoomRecord extends RoomDoc {
  awardedTurnVersions?: number[];
  lowPlayerSince?: number | null;
  phaseDeadlineAt?: number | null;
}

export interface CachedResponse {
  status: number;
  body: unknown;
  createdAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

export class ArbiterError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly currentState?: { phase: string; turnVersion: number };

  constructor(
    statusCode: number,
    code: string,
    message: string,
    currentState?: { phase: string; turnVersion: number },
  ) {
    super(message);
    this.name = 'ArbiterError';
    this.statusCode = statusCode;
    this.code = code;
    this.currentState = currentState;
  }
}

export interface ArbiterTransaction {
  now(): number;
  getRoom(code: string): Promise<RoomRecord | null>;
  setRoom(code: string, room: RoomRecord): void;
  getPlayers(code: string): Promise<PlayerDoc[]>;
  setPlayer(code: string, uid: string, player: PlayerDoc): void;
  deletePlayer(code: string, uid: string): void;
  getTurn(code: string): Promise<TurnDoc | null>;
  setTurn(code: string, turn: TurnDoc | null): void;
  getVotes(code: string): Promise<VoteDoc[]>;
  setVote(code: string, uid: string, vote: VoteDoc): void;
  deleteVote(code: string, uid: string): void;
  getChits(code: string): Promise<ChitDoc[]>;
  setChit(code: string, chit: ChitDoc): void;
  getSecret(code: string, chitId: string): Promise<SecretChitDoc | null>;
  getSecretsForRoom(code: string): Promise<Record<string, SecretChitDoc>>;
  setSecret(code: string, chitId: string, secret: SecretChitDoc): void;
  getPrivatePrompt(code: string, uid: string): Promise<PrivatePromptDoc | null>;
  setPrivatePrompt(code: string, uid: string, prompt: PrivatePromptDoc): void;
  deletePrivatePrompt(code: string, uid: string): void;
  getTurnRecords(code: string): Promise<VerifiedTurnRecord[]>;
  addTurnRecord(code: string, record: VerifiedTurnRecord): void;
  getUser(uid: string): Promise<UserDoc | null>;
  setUser(uid: string, user: UserDoc): void;
  getPresence(code: string): Promise<Record<string, PresenceNode>>;
}

export interface ArbiterStore {
  runTransaction<T>(fn: (tx: ArbiterTransaction) => Promise<T>): Promise<T>;
  getIdempotency(uid: string, route: string, key: string): Promise<CachedResponse | null>;
  setIdempotency(uid: string, route: string, key: string, response: CachedResponse): Promise<void>;
  checkRateLimit(
    uid: string,
    routeGroup: string,
    limit: number,
    windowMs: number,
  ): Promise<RateLimitResult>;
  verifyIdToken(token: string): Promise<{ uid: string }>;
  verifyAppCheckToken(token: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// In-Memory Transactional Store (for zero-key local dev, Vitest, & Playwright)
// ---------------------------------------------------------------------------

interface MemoryRoomBucket {
  room: RoomRecord | null;
  players: Map<string, PlayerDoc>;
  turn: TurnDoc | null;
  votes: Map<string, VoteDoc>;
  chits: Map<string, ChitDoc>;
  secrets: Map<string, SecretChitDoc>;
  privates: Map<string, PrivatePromptDoc>;
  turnRecords: VerifiedTurnRecord[];
  presence: Map<string, PresenceNode>;
}

interface MemoryState {
  rooms: Map<string, MemoryRoomBucket>;
  users: Map<string, UserDoc>;
  idempotency: Map<string, CachedResponse>;
  rateLimits: Map<string, number[]>;
}

function createEmptyBucket(): MemoryRoomBucket {
  return {
    room: null,
    players: new Map(),
    turn: null,
    votes: new Map(),
    chits: new Map(),
    secrets: new Map(),
    privates: new Map(),
    turnRecords: [],
    presence: new Map(),
  };
}

export class MemoryArbiterStore implements ArbiterStore {
  private state: MemoryState = {
    rooms: new Map(),
    users: new Map(),
    idempotency: new Map(),
    rateLimits: new Map(),
  };

  private txQueue: Promise<unknown> = Promise.resolve();
  private clockOffsetMs = 0;

  reset(): void {
    this.state = {
      rooms: new Map(),
      users: new Map(),
      idempotency: new Map(),
      rateLimits: new Map(),
    };
    this.clockOffsetMs = 0;
  }

  advanceClock(ms: number): void {
    this.clockOffsetMs += ms;
  }

  now(): number {
    return Date.now() + this.clockOffsetMs;
  }

  /** Test helper to simulate RTDB presence updates. */
  setPresence(code: string, uid: string, node: PresenceNode): void {
    let bucket = this.state.rooms.get(code);
    if (!bucket) {
      bucket = createEmptyBucket();
      this.state.rooms.set(code, bucket);
    }
    bucket.presence.set(uid, structuredClone(node));
  }

  /** Test helper to simulate client vote writes during VOTE phase. */
  setVoteDirect(code: string, uid: string, vote: VoteDoc): void {
    let bucket = this.state.rooms.get(code);
    if (!bucket) {
      bucket = createEmptyBucket();
      this.state.rooms.set(code, bucket);
    }
    bucket.votes.set(uid, structuredClone(vote));
  }

  /** Test helper to inspect secret docs directly. */
  getSecretDirect(code: string, chitId: string): SecretChitDoc | null {
    return structuredClone(this.state.rooms.get(code)?.secrets.get(chitId) ?? null);
  }

  async runTransaction<T>(fn: (tx: ArbiterTransaction) => Promise<T>): Promise<T> {
    const run = async (): Promise<T> => {
      // Snapshot rooms & users for atomic rollback on error
      const roomsSnapshot = structuredClone(this.state.rooms);
      const usersSnapshot = structuredClone(this.state.users);
      const nowMs = this.now();

      const getOrCreateBucket = (code: string): MemoryRoomBucket => {
        let bucket = this.state.rooms.get(code);
        if (!bucket) {
          bucket = createEmptyBucket();
          this.state.rooms.set(code, bucket);
        }
        return bucket;
      };

      const tx: ArbiterTransaction = {
        now: () => nowMs,
        getRoom: async (code) => structuredClone(this.state.rooms.get(code)?.room ?? null),
        setRoom: (code, room) => {
          getOrCreateBucket(code).room = structuredClone(room);
        },
        getPlayers: async (code) =>
          Array.from(this.state.rooms.get(code)?.players.values() ?? []).map((p) =>
            structuredClone(p),
          ),
        setPlayer: (code, uid, player) => {
          getOrCreateBucket(code).players.set(uid, structuredClone(player));
        },
        deletePlayer: (code, uid) => {
          this.state.rooms.get(code)?.players.delete(uid);
        },
        getTurn: async (code) => structuredClone(this.state.rooms.get(code)?.turn ?? null),
        setTurn: (code, turn) => {
          getOrCreateBucket(code).turn = structuredClone(turn);
        },
        getVotes: async (code) =>
          Array.from(this.state.rooms.get(code)?.votes.values() ?? []).map((v) =>
            structuredClone(v),
          ),
        setVote: (code, uid, vote) => {
          getOrCreateBucket(code).votes.set(uid, structuredClone(vote));
        },
        deleteVote: (code, uid) => {
          this.state.rooms.get(code)?.votes.delete(uid);
        },
        getChits: async (code) =>
          Array.from(this.state.rooms.get(code)?.chits.values() ?? []).map((c) =>
            structuredClone(c),
          ),
        setChit: (code, chit) => {
          getOrCreateBucket(code).chits.set(chit.id, structuredClone(chit));
        },
        getSecret: async (code, chitId) =>
          structuredClone(this.state.rooms.get(code)?.secrets.get(chitId) ?? null),
        getSecretsForRoom: async (code) => {
          const out: Record<string, SecretChitDoc> = {};
          const secrets = this.state.rooms.get(code)?.secrets;
          if (secrets) {
            for (const [k, v] of secrets.entries()) {
              out[k] = structuredClone(v);
            }
          }
          return out;
        },
        setSecret: (code, chitId, secret) => {
          getOrCreateBucket(code).secrets.set(chitId, structuredClone(secret));
        },
        getPrivatePrompt: async (code, uid) =>
          structuredClone(this.state.rooms.get(code)?.privates.get(uid) ?? null),
        setPrivatePrompt: (code, uid, prompt) => {
          getOrCreateBucket(code).privates.set(uid, structuredClone(prompt));
        },
        deletePrivatePrompt: (code, uid) => {
          this.state.rooms.get(code)?.privates.delete(uid);
        },
        getTurnRecords: async (code) =>
          structuredClone(this.state.rooms.get(code)?.turnRecords ?? []),
        addTurnRecord: (code, record) => {
          getOrCreateBucket(code).turnRecords.push(structuredClone(record));
        },
        getUser: async (uid) => structuredClone(this.state.users.get(uid) ?? null),
        setUser: (uid, user) => {
          this.state.users.set(uid, structuredClone(user));
        },
        getPresence: async (code) => {
          const out: Record<string, PresenceNode> = {};
          const bucket = this.state.rooms.get(code);
          if (bucket) {
            for (const [uid, node] of bucket.presence.entries()) {
              out[uid] = structuredClone(node);
            }
          }
          return out;
        },
      };

      try {
        return await fn(tx);
      } catch (err) {
        this.state.rooms = roomsSnapshot;
        this.state.users = usersSnapshot;
        throw err;
      }
    };

    const next = this.txQueue.then(run, run);
    this.txQueue = next.catch(() => undefined);
    return next;
  }

  async getIdempotency(uid: string, route: string, key: string): Promise<CachedResponse | null> {
    const cacheKey = `${uid}:${route}:${key}`;
    return structuredClone(this.state.idempotency.get(cacheKey) ?? null);
  }

  async setIdempotency(
    uid: string,
    route: string,
    key: string,
    response: CachedResponse,
  ): Promise<void> {
    const cacheKey = `${uid}:${route}:${key}`;
    this.state.idempotency.set(cacheKey, structuredClone(response));
  }

  async checkRateLimit(
    uid: string,
    routeGroup: string,
    limit: number,
    windowMs: number,
  ): Promise<RateLimitResult> {
    const nowMs = this.now();
    const key = `${uid}:${routeGroup}`;
    const cutoff = nowMs - windowMs;
    const timestamps = (this.state.rateLimits.get(key) ?? []).filter((ts) => ts > cutoff);

    if (timestamps.length >= limit) {
      const oldest = timestamps[0] ?? nowMs;
      this.state.rateLimits.set(key, timestamps);
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: Math.max(1, oldest + windowMs - nowMs),
      };
    }

    timestamps.push(nowMs);
    this.state.rateLimits.set(key, timestamps);
    return {
      allowed: true,
      remaining: Math.max(0, limit - timestamps.length),
      retryAfterMs: 0,
    };
  }

  async verifyIdToken(token: string): Promise<{ uid: string }> {
    if (token.startsWith('test:')) {
      const uid = token.slice('test:'.length).trim();
      if (uid.length > 0) {
        return { uid };
      }
    }
    throw new ArbiterError(401, 'UNAUTHORIZED', 'Invalid auth token');
  }

  async verifyAppCheckToken(_token: string): Promise<void> {
    // App Check is bypassed in memory store unless explicitly tested
  }
}

// ---------------------------------------------------------------------------
// Firestore + RTDB Arbiter Store (Production / Firebase Emulator)
// ---------------------------------------------------------------------------

function ensureFirebaseApp(): App {
  const existing = getApps();
  if (existing.length > 0 && existing[0]) {
    return existing[0];
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const databaseURL = process.env.FIREBASE_DATABASE_URL;

  if (serviceAccountJson) {
    const parsed = JSON.parse(serviceAccountJson) as Record<string, string>;
    return initializeApp({
      credential: cert(parsed),
      ...(databaseURL ? { databaseURL } : {}),
    });
  }

  return initializeApp({
    ...(databaseURL ? { databaseURL } : {}),
  });
}

type BufferedWrite = () => void;

export class FirestoreArbiterStore implements ArbiterStore {
  private readonly rateLimits = new Map<string, number[]>();

  private getApp(): App {
    return ensureFirebaseApp();
  }

  async runTransaction<T>(fn: (tx: ArbiterTransaction) => Promise<T>): Promise<T> {
    const app = this.getApp();
    const db = getFirestore(app);
    const rtdb = getDatabase(app);

    return db.runTransaction(async (fsTx) => {
      const nowMs = Date.now();
      const pendingWrites: BufferedWrite[] = [];

      const roomRef = (code: string) => db.collection('rooms').doc(code);
      const playersCol = (code: string) => roomRef(code).collection('players');
      const turnRef = (code: string) => roomRef(code).collection('turn').doc('current');
      const votesCol = (code: string) => roomRef(code).collection('votes');
      const chitsCol = (code: string) => roomRef(code).collection('chits');
      const secretsCol = (code: string) => roomRef(code).collection('secret');
      const privatesCol = (code: string) => roomRef(code).collection('private');
      const recordsCol = (code: string) => roomRef(code).collection('turnHistory');

      const tx: ArbiterTransaction = {
        now: () => nowMs,
        getRoom: async (code) => {
          const snap = await fsTx.get(roomRef(code));
          return snap.exists ? (snap.data() as RoomRecord) : null;
        },
        setRoom: (code, room) => {
          pendingWrites.push(() => {
            const payload: Record<string, unknown> = {
              ...room,
              updatedAt: FieldValue.serverTimestamp(),
              expiresAt:
                typeof room.expiresAt === 'number'
                  ? AdminTimestamp.fromMillis(room.expiresAt)
                  : room.expiresAt,
            };
            if (typeof room.createdAt === 'number') {
              payload.createdAt = FieldValue.serverTimestamp();
            }
            fsTx.set(roomRef(code), payload);
          });
        },
        getPlayers: async (code) => {
          const snap = await fsTx.get(playersCol(code));
          return snap.docs.map((d) => d.data() as PlayerDoc);
        },
        setPlayer: (code, uid, player) => {
          pendingWrites.push(() => {
            const payload: Record<string, unknown> = {
              ...player,
            };
            if (typeof player.joinedAt === 'number') {
              payload.joinedAt = AdminTimestamp.fromMillis(player.joinedAt);
            }
            fsTx.set(playersCol(code).doc(uid), payload);
          });
        },
        deletePlayer: (code, uid) => {
          pendingWrites.push(() => {
            fsTx.delete(playersCol(code).doc(uid));
          });
        },
        getTurn: async (code) => {
          const snap = await fsTx.get(turnRef(code));
          return snap.exists ? (snap.data() as TurnDoc) : null;
        },
        setTurn: (code, turn) => {
          pendingWrites.push(() => {
            if (turn === null) {
              fsTx.delete(turnRef(code));
            } else {
              fsTx.set(turnRef(code), turn);
            }
          });
        },
        getVotes: async (code) => {
          const snap = await fsTx.get(votesCol(code));
          return snap.docs.map((d) => d.data() as VoteDoc);
        },
        setVote: (code, uid, vote) => {
          pendingWrites.push(() => {
            fsTx.set(votesCol(code).doc(uid), vote);
          });
        },
        deleteVote: (code, uid) => {
          pendingWrites.push(() => {
            fsTx.delete(votesCol(code).doc(uid));
          });
        },
        getChits: async (code) => {
          const snap = await fsTx.get(chitsCol(code));
          return snap.docs.map((d) => d.data() as ChitDoc);
        },
        setChit: (code, chit) => {
          pendingWrites.push(() => {
            fsTx.set(chitsCol(code).doc(chit.id), chit);
          });
        },
        getSecret: async (code, chitId) => {
          const snap = await fsTx.get(secretsCol(code).doc(chitId));
          return snap.exists ? (snap.data() as SecretChitDoc) : null;
        },
        getSecretsForRoom: async (code) => {
          const snap = await fsTx.get(secretsCol(code));
          const out: Record<string, SecretChitDoc> = {};
          for (const doc of snap.docs) {
            out[doc.id] = doc.data() as SecretChitDoc;
          }
          return out;
        },
        setSecret: (code, chitId, secret) => {
          pendingWrites.push(() => {
            fsTx.set(secretsCol(code).doc(chitId), secret);
          });
        },
        getPrivatePrompt: async (code, uid) => {
          const snap = await fsTx.get(privatesCol(code).doc(uid));
          return snap.exists ? (snap.data() as PrivatePromptDoc) : null;
        },
        setPrivatePrompt: (code, uid, prompt) => {
          pendingWrites.push(() => {
            fsTx.set(privatesCol(code).doc(uid), prompt);
          });
        },
        deletePrivatePrompt: (code, uid) => {
          pendingWrites.push(() => {
            fsTx.delete(privatesCol(code).doc(uid));
          });
        },
        getTurnRecords: async (code) => {
          const snap = await fsTx.get(recordsCol(code));
          return snap.docs.map((d) => d.data() as VerifiedTurnRecord);
        },
        addTurnRecord: (code, record) => {
          pendingWrites.push(() => {
            fsTx.set(recordsCol(code).doc(String(record.turnVersion)), record);
          });
        },
        getUser: async (uid) => {
          const snap = await fsTx.get(db.collection('users').doc(uid));
          return snap.exists ? (snap.data() as UserDoc) : null;
        },
        setUser: (uid, user) => {
          pendingWrites.push(() => {
            fsTx.set(db.collection('users').doc(uid), {
              ...user,
              updatedAt: FieldValue.serverTimestamp(),
            });
          });
        },
        getPresence: async (code) => {
          try {
            const snap = await rtdb.ref(`presence/${code}`).get();
            return (snap.val() as Record<string, PresenceNode> | null) ?? {};
          } catch {
            return {};
          }
        },
      };

      const result = await fn(tx);
      for (const write of pendingWrites) {
        write();
      }
      return result;
    });
  }

  private idempotencyDocId(uid: string, route: string, key: string): string {
    return createHash('sha256').update(`${uid}:${route}:${key}`).digest('hex');
  }

  async getIdempotency(uid: string, route: string, key: string): Promise<CachedResponse | null> {
    const db = getFirestore(this.getApp());
    const docId = this.idempotencyDocId(uid, route, key);
    const snap = await db.collection('_idempotency').doc(docId).get();
    return snap.exists ? (snap.data() as CachedResponse) : null;
  }

  async setIdempotency(
    uid: string,
    route: string,
    key: string,
    response: CachedResponse,
  ): Promise<void> {
    const db = getFirestore(this.getApp());
    const docId = this.idempotencyDocId(uid, route, key);
    await db.collection('_idempotency').doc(docId).set(response);
  }

  async checkRateLimit(
    uid: string,
    routeGroup: string,
    limit: number,
    windowMs: number,
  ): Promise<RateLimitResult> {
    const nowMs = Date.now();
    const key = `${uid}:${routeGroup}`;
    const cutoff = nowMs - windowMs;
    const timestamps = (this.rateLimits.get(key) ?? []).filter((ts) => ts > cutoff);

    if (timestamps.length >= limit) {
      const oldest = timestamps[0] ?? nowMs;
      this.rateLimits.set(key, timestamps);
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: Math.max(1, oldest + windowMs - nowMs),
      };
    }

    timestamps.push(nowMs);
    this.rateLimits.set(key, timestamps);
    return {
      allowed: true,
      remaining: Math.max(0, limit - timestamps.length),
      retryAfterMs: 0,
    };
  }

  async verifyIdToken(token: string): Promise<{ uid: string }> {
    try {
      const decoded = await getAuth(this.getApp()).verifyIdToken(token);
      return { uid: decoded.uid };
    } catch {
      throw new ArbiterError(401, 'UNAUTHORIZED', 'Invalid Firebase ID token');
    }
  }

  async verifyAppCheckToken(token: string): Promise<void> {
    try {
      await getAppCheck(this.getApp()).verifyToken(token);
    } catch {
      throw new ArbiterError(401, 'APP_CHECK_FAILED', 'Invalid Firebase App Check token');
    }
  }
}

// ---------------------------------------------------------------------------
// Store Singleton
// ---------------------------------------------------------------------------

const memoryStoreInstance = new MemoryArbiterStore();
const firestoreStoreInstance = new FirestoreArbiterStore();

export function getMemoryStore(): MemoryArbiterStore {
  return memoryStoreInstance;
}

export function getArbiterStore(): ArbiterStore {
  return getEnvConfig().useMemoryStore ? memoryStoreInstance : firestoreStoreInstance;
}
