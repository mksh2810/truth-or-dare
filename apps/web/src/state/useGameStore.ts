import { create } from 'zustand';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  onDisconnect,
  onValue,
  ref as rtdbRef,
  set as rtdbSet,
  update as rtdbUpdate,
} from 'firebase/database';
import {
  SCHEMA_VERSION,
  calculateLevel,
  calculateTurnSessionDelta,
  checkDeterministicModeration,
  generateRoomCode,
  selectNextPerformerSeat,
  tallyVotes,
  type ChitDoc,
  type DareType,
  type JudgeVerdict,
  type Phase,
  type PlayerDoc,
  type PresenceNode,
  type PrivatePromptDoc,
  type PromptKind,
  type RoomDoc,
  type RoomSettings,
  type TurnDoc,
  type VoteDoc,
  type VoteVerdict,
} from '@vowlet/shared';
import {
  getAppCheckToken,
  getFirebaseClients,
  getIdToken,
  isLocalDevMode,
  type AuthProfile,
} from '../auth/firebase';
import type { SyncState } from '../design/SyncIndicator';

export type NavRoute = 'HOME' | 'CREATE' | 'JOIN' | 'ROOM' | 'CLOSED';

export interface SavedTableSummary {
  code: string;
  dateIso: string;
  winnerName: string;
  myScore: number;
}

export interface ToastMessage {
  id: string;
  text: string;
  tone: 'info' | 'success' | 'error';
}

interface LocalRoomBundle {
  room: RoomDoc;
  players: PlayerDoc[];
  turn: TurnDoc | null;
  votes: VoteDoc[];
  chits: ChitDoc[];
  privatePrompts: Record<string, PrivatePromptDoc>;
  presence: Record<string, PresenceNode>;
}

const LOCAL_CHANNEL_NAME = 'vowlet_local_sync_v1';
const LOCAL_ROOM_PREFIX = 'vowlet_local_room_';
const isLocalApiMode: boolean = isLocalDevMode && import.meta.env.VITE_LOCAL_API === 'true';

interface RoomStateApiResponse {
  ok: boolean;
  room: RoomDoc;
  players: PlayerDoc[];
  turn: TurnDoc | null;
  chits: ChitDoc[];
  presence: Record<string, PresenceNode>;
  voteCount: number;
  myVote: VoteDoc | null;
  privatePrompt: PrivatePromptDoc | null;
}

const STARTER_TRUTHS = [
  'What is the most harmless lie you told this week?',
  'Which friend at this table would survive longest on a deserted island?',
  'What song do you secretly sing at full volume when alone?',
  'What is a tiny habit you have that nobody here knows about?',
];

const STARTER_DARES: Array<{ text: string; dareType: DareType }> = [
  { text: 'Do your best dramatic movie-trailer voice for the next 20 seconds.', dareType: 'INSTANT' },
  { text: 'Let the person to your left pick a new nickname for you for 2 rounds.', dareType: 'INSTANT' },
  { text: 'Send a voice note to your sibling or best friend saying "I have a confession: I like pineapple on pizza."', dareType: 'SOCIAL' },
  { text: 'Balance a spoon or pen on the back of your hand for 15 seconds without laughing.', dareType: 'INSTANT' },
];

const OWL_LINES_BY_STAMP = {
  PASSED: [
    'The table approves. Even my monocle stayed steady.',
    'Cleanly done. Take your points and try not to gloat.',
  ],
  'NOT IT': [
    'The table has spoken—better luck next spin.',
    'Not quite convincing enough for this crowd.',
  ],
  SPLIT: [
    'A divided table! Half the points, all the drama.',
    'Deadlocked! Keep your streak and move along.',
  ],
  SKIPPED: [
    'Tactical retreat noted. Thirty points to the Owl.',
    'Skipped! Sometimes discretion is the wiser dare.',
  ],
  STALLED: [
    'Time slipped away—the table called a stall.',
    'Too much stalling! Onward to the next spin.',
  ],
};

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function readLocalBundle(code: string): LocalRoomBundle | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(`${LOCAL_ROOM_PREFIX}${code}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LocalRoomBundle;
  } catch {
    return null;
  }
}

function writeLocalBundle(code: string, bundle: LocalRoomBundle): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(`${LOCAL_ROOM_PREFIX}${code}`, JSON.stringify(bundle));
  try {
    const ch = new BroadcastChannel(LOCAL_CHANNEL_NAME);
    ch.postMessage({ code });
    ch.close();
  } catch {
    // BroadcastChannel unavailable
  }
}

export interface GameState {
  // Auth & Profile
  auth: AuthProfile | null;
  consentAccepted: boolean;
  displayName: string;
  soundEnabled: boolean;
  reducedMotionOverride: boolean;
  lifetimeXp: number;
  level: number;
  skins: string[];
  savedTables: SavedTableSummary[];

  // Navigation & UI
  route: NavRoute;
  joinPrefillCode: string;
  closedReason: string | null;
  syncState: SyncState;
  isOnline: boolean;
  shareSheetOpen: boolean;
  toast: ToastMessage | null;
  pendingAction: boolean;
  schemaMismatch: boolean;

  // Timing
  clockOffsetMs: number;

  // Room Memory Cache (D3)
  room: RoomDoc | null;
  players: PlayerDoc[];
  turn: TurnDoc | null;
  votes: VoteDoc[];
  chits: ChitDoc[];
  privatePrompt: PrivatePromptDoc | null;
  presence: Record<string, PresenceNode>;

  // Actions
  setAuth: (auth: AuthProfile | null) => void;
  acceptConsent: () => void;
  setDisplayName: (name: string) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setReducedMotionOverride: (enabled: boolean) => void;
  setRoute: (route: NavRoute, prefillCode?: string) => void;
  setShareSheetOpen: (open: boolean) => void;
  showToast: (text: string, tone?: ToastMessage['tone']) => void;
  clearToast: () => void;
  saveCurrentTable: () => void;
  deleteLocalUserData: () => void;
  deleteUserData: () => Promise<void>;

  // Room & Turn Actions
  subscribeToRoom: (code: string) => () => void;
  leaveRoomLocally: (reason?: string | null) => void;
  createRoom: (input: {
    name: string;
    settings: Partial<RoomSettings>;
  }) => Promise<string>;
  joinRoom: (input: { code: string; name: string; spectator?: boolean }) => Promise<void>;
  leaveRoom: () => Promise<void>;
  kickPlayer: (targetUid: string) => Promise<void>;
  updateSettings: (patch: {
    settings?: Partial<RoomSettings>;
    callLink?: string | null;
    ready?: boolean;
  }) => Promise<void>;
  startGame: () => Promise<void>;
  submitChit: (input: {
    kind: PromptKind;
    dareType?: DareType;
    text: string;
  }) => Promise<{
    verdict: JudgeVerdict;
    owlReason: string;
    status: string;
  }>;
  advanceTurn: () => Promise<void>;
  choosePromptKind: (choice: PromptKind) => Promise<void>;
  performDone: () => Promise<void>;
  performSkip: () => Promise<void>;
  performSwap: () => Promise<void>;
  performStall: () => Promise<void>;
  castVote: (verdict: VoteVerdict) => Promise<void>;
  submitReport: (input: {
    targetUid?: string;
    promptId?: string;
    reason: string;
    details?: string;
  }) => Promise<void>;
}

const CONSENT_KEY = 'vowlet_consent_v1';
const PREFS_KEY = 'vowlet_prefs_v1';

function loadPrefs() {
  if (typeof window === 'undefined') {
    return {
      consentAccepted: false,
      displayName: '',
      soundEnabled: false,
      reducedMotionOverride: false,
      lifetimeXp: 0,
      skins: ['classic-amber'],
      savedTables: [] as SavedTableSummary[],
    };
  }
  const consentAccepted = window.localStorage.getItem(CONSENT_KEY) === '1';
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<{
        displayName: string;
        soundEnabled: boolean;
        reducedMotionOverride: boolean;
        lifetimeXp: number;
        skins: string[];
        savedTables: SavedTableSummary[];
      }>;
      return {
        consentAccepted,
        displayName: parsed.displayName ?? '',
        soundEnabled: parsed.soundEnabled ?? false,
        reducedMotionOverride: parsed.reducedMotionOverride ?? false,
        lifetimeXp: parsed.lifetimeXp ?? 0,
        skins: parsed.skins ?? ['classic-amber'],
        savedTables: parsed.savedTables ?? [],
      };
    }
  } catch {
    // ignore
  }
  return {
    consentAccepted,
    displayName: '',
    soundEnabled: false,
    reducedMotionOverride: false,
    lifetimeXp: 0,
    skins: ['classic-amber'],
    savedTables: [] as SavedTableSummary[],
  };
}

function persistPrefs(state: Pick<GameState, 'displayName' | 'soundEnabled' | 'reducedMotionOverride' | 'lifetimeXp' | 'skins' | 'savedTables'>) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    PREFS_KEY,
    JSON.stringify({
      displayName: state.displayName,
      soundEnabled: state.soundEnabled,
      reducedMotionOverride: state.reducedMotionOverride,
      lifetimeXp: state.lifetimeXp,
      skins: state.skins,
      savedTables: state.savedTables,
    }),
  );
}

const initialPrefs = loadPrefs();
let roomUnsubscribers: Unsubscribe[] = [];

class ArbiterError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ArbiterError';
    this.status = status;
    this.code = code;
  }
}

function isExpectedConflict(err: unknown): boolean {
  return (
    err instanceof ArbiterError &&
    err.status === 409 &&
    (err.code === 'VERSION_MISMATCH' || err.code === 'DEADLINE_NOT_REACHED' || !err.code)
  );
}

export const useGameStore = create<GameState>((set, get) => {
  async function callArbiter<TResponse>(
    path: string,
    body: Record<string, unknown>,
  ): Promise<TResponse> {
    set({ syncState: 'syncing', pendingAction: true });
    const idempotencyKey = crypto.randomUUID();
    const token = await getIdToken();
    const appCheck = await getAppCheckToken();
    const uid = get().auth?.uid;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Firebase-AppCheck': appCheck,
      'Idempotency-Key': idempotencyKey,
    };
    if (isLocalDevMode && uid) {
      headers['x-test-uid'] = uid;
    }

    try {
      const res = await fetch(path, {
        method: 'POST',
        headers,
        body: JSON.stringify({ idempotencyKey, ...body }),
      });

      const dateHdr = res.headers.get('Date');
      if (dateHdr) {
        const serverMs = Date.parse(dateHdr);
        if (!Number.isNaN(serverMs)) {
          set({ clockOffsetMs: serverMs - Date.now() });
        }
      }

      if (res.status === 404 && isLocalDevMode) {
        throw new Error('LOCAL_API_UNAVAILABLE');
      }

      const json = (await res.json()) as TResponse & {
        error?: { code?: string; message?: string; currentState?: { phase: Phase; turnVersion: number } };
      };

      if (!res.ok) {
        if (res.status === 426 || json.error?.code === 'SCHEMA_MISMATCH') {
          set({
            schemaMismatch: true,
            syncState: 'synced',
            pendingAction: false,
          });
          get().showToast(
            'Update required: a newer version of Vowlet is live. Please reload.',
            'error',
          );
          throw new ArbiterError(
            json.error?.message || 'App update required.',
            426,
            'SCHEMA_MISMATCH',
          );
        }

        if (res.status === 409) {
          if (json.error?.currentState && get().room) {
            const cur = get().room!;
            if (json.error.currentState.turnVersion >= cur.turnVersion) {
              set({
                room: {
                  ...cur,
                  phase: json.error.currentState.phase,
                  turnVersion: json.error.currentState.turnVersion,
                },
              });
            }
          }
          const activeCode = get().room?.code;
          if (isLocalApiMode && activeCode) {
            void pollRoomState(activeCode);
          }
          throw new ArbiterError(
            json.error?.message || 'State conflict',
            409,
            json.error?.code,
          );
        }

        throw new ArbiterError(
          json.error?.message || `Request failed (${res.status})`,
          res.status,
          json.error?.code,
        );
      }

      set({ syncState: 'synced', pendingAction: false });
      const activeCode = get().room?.code;
      if (isLocalApiMode && activeCode && path !== '/api/room/leave') {
        void pollRoomState(activeCode);
      }
      return json;
    } catch (err) {
      if (
        isLocalDevMode &&
        !isLocalApiMode &&
        err instanceof Error &&
        (err.message === 'LOCAL_API_UNAVAILABLE' || err.message.includes('Failed to fetch'))
      ) {
        set({ syncState: 'synced', pendingAction: false });
        throw new Error('LOCAL_FALLBACK');
      }
      set({ syncState: get().isOnline ? 'synced' : 'offline', pendingAction: false });
      throw err;
    }
  }

  async function pollRoomState(code: string): Promise<void> {
    const uid = get().auth?.uid;
    if (!uid) return;
    try {
      const token = await getIdToken();
      const appCheck = await getAppCheckToken();
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        'X-Firebase-AppCheck': appCheck,
      };
      if (isLocalDevMode) {
        headers['x-test-uid'] = uid;
      }

      const res = await fetch(`/api/room/state?code=${encodeURIComponent(code)}`, {
        method: 'GET',
        headers,
      });

      const dateHdr = res.headers.get('Date');
      if (dateHdr) {
        const serverMs = Date.parse(dateHdr);
        if (!Number.isNaN(serverMs)) {
          set({ clockOffsetMs: serverMs - Date.now() });
        }
      }

      if (res.status === 403 || res.status === 404) {
        get().leaveRoomLocally(
          res.status === 403
            ? 'You were removed from this table.'
            : 'This table is no longer available.',
        );
        return;
      }

      if (!res.ok) {
        return;
      }

      const data = (await res.json()) as RoomStateApiResponse;
      if (!data.ok || !data.room) return;

      if (data.room.schemaVersion !== SCHEMA_VERSION) {
        set({ schemaMismatch: true });
        get().showToast(
          'Update required: a newer version of Vowlet is live. Please reload.',
          'error',
        );
        get().leaveRoomLocally('Version mismatch — please reload Vowlet.');
        return;
      }

      const me = data.players.find((p) => p.uid === uid);
      if (me?.banned) {
        get().leaveRoomLocally('You were removed from this table by the host.');
        return;
      }

      const current = get().room;
      // D3: Stale-write rejection
      if (current && current.code === data.room.code && data.room.turnVersion < current.turnVersion) {
        return;
      }

      const syntheticVotes: VoteDoc[] = [];
      if (data.myVote) {
        syntheticVotes.push(data.myVote);
      }
      const extraVotes = Math.max(0, (data.voteCount ?? 0) - (data.myVote ? 1 : 0));
      for (let i = 0; i < extraVotes; i++) {
        syntheticVotes.push({
          uid: `__anon_voter_${i}`,
          verdict: 'APPROVE',
          turnVersion: data.room.turnVersion,
          createdAt: 0,
        });
      }

      set({
        room: data.room,
        players: data.players,
        turn: data.turn,
        votes: syntheticVotes,
        chits: data.chits,
        privatePrompt: data.privatePrompt,
        presence: data.presence,
        syncState: 'synced',
        isOnline: true,
      });

      if (data.room.phase === 'CLOSED') {
        set({ route: 'CLOSED', closedReason: 'Table closed.' });
      }
    } catch {
      // Transient network error during poll; keep polling
    }
  }

  function applyBundle(bundle: LocalRoomBundle) {
    const current = get().room;
    // D3: Stale-write rejection
    if (current && current.code === bundle.room.code && bundle.room.turnVersion < current.turnVersion) {
      return;
    }
    const uid = get().auth?.uid ?? '';
    set({
      room: bundle.room,
      players: bundle.players,
      turn: bundle.turn,
      votes: bundle.votes,
      chits: bundle.chits,
      privatePrompt: bundle.privatePrompts[uid] ?? null,
      presence: bundle.presence,
    });
    if (bundle.room.phase === 'CLOSED') {
      set({ route: 'CLOSED', closedReason: 'This table has been closed.' });
    }
  }

  return {
    auth: null,
    consentAccepted: initialPrefs.consentAccepted,
    displayName: initialPrefs.displayName,
    soundEnabled: initialPrefs.soundEnabled,
    reducedMotionOverride: initialPrefs.reducedMotionOverride,
    lifetimeXp: initialPrefs.lifetimeXp,
    level: calculateLevel(initialPrefs.lifetimeXp),
    skins: initialPrefs.skins,
    savedTables: initialPrefs.savedTables,

    route: 'HOME',
    joinPrefillCode: '',
    closedReason: null,
    syncState: 'synced',
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    shareSheetOpen: false,
    toast: null,
    pendingAction: false,
    schemaMismatch: false,

    clockOffsetMs: 0,

    room: null,
    players: [],
    turn: null,
    votes: [],
    chits: [],
    privatePrompt: null,
    presence: {},

    setAuth: (auth) => set({ auth }),

    acceptConsent: () => {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(CONSENT_KEY, '1');
      }
      set({ consentAccepted: true });
    },

    setDisplayName: (displayName) => {
      set({ displayName });
      persistPrefs({ ...get(), displayName });
    },

    setSoundEnabled: (soundEnabled) => {
      set({ soundEnabled });
      persistPrefs({ ...get(), soundEnabled });
    },

    setReducedMotionOverride: (reducedMotionOverride) => {
      set({ reducedMotionOverride });
      persistPrefs({ ...get(), reducedMotionOverride });
    },

    setRoute: (route, prefillCode) =>
      set({
        route,
        joinPrefillCode: prefillCode ?? get().joinPrefillCode,
        closedReason: null,
      }),

    setShareSheetOpen: (shareSheetOpen) => set({ shareSheetOpen }),

    showToast: (text, tone = 'info') => {
      const id = crypto.randomUUID();
      set({ toast: { id, text, tone } });
      window.setTimeout(() => {
        if (get().toast?.id === id) {
          set({ toast: null });
        }
      }, 3600);
    },

    clearToast: () => set({ toast: null }),

    saveCurrentTable: () => {
      const { room, players, auth, savedTables } = get();
      if (!room || !auth) return;
      const sorted = [...players].sort((a, b) => b.sessionScore - a.sessionScore);
      const winner = sorted[0]?.name ?? 'Table';
      const me = players.find((p) => p.uid === auth.uid);
      const next: SavedTableSummary[] = [
        {
          code: room.code,
          dateIso: new Date().toISOString(),
          winnerName: winner,
          myScore: me?.sessionScore ?? 0,
        },
        ...savedTables.filter((t) => t.code !== room.code),
      ].slice(0, 10);
      set({ savedTables: next });
      persistPrefs({ ...get(), savedTables: next });
      get().showToast('Table saved to your history!', 'success');
    },

    deleteLocalUserData: () => {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(PREFS_KEY);
        window.localStorage.removeItem(CONSENT_KEY);
      }
      set({
        consentAccepted: false,
        displayName: '',
        soundEnabled: false,
        reducedMotionOverride: false,
        lifetimeXp: 0,
        level: 1,
        skins: ['classic-amber'],
        savedTables: [],
      });
      get().showToast('Your local data has been cleared.', 'info');
    },

    deleteUserData: async () => {
      try {
        await callArbiter('/api/user/delete', {});
      } catch (err) {
        if (
          !(err instanceof Error && err.message === 'LOCAL_FALLBACK') &&
          !(err instanceof ArbiterError && err.status === 404)
        ) {
          // Even if remote delete fails in dev/offline, proceed with local cleanup
        }
      }
      get().deleteLocalUserData();
    },

    leaveRoomLocally: (reason = null) => {
      for (const unsub of roomUnsubscribers) {
        unsub();
      }
      roomUnsubscribers = [];
      set({
        room: null,
        players: [],
        turn: null,
        votes: [],
        chits: [],
        privatePrompt: null,
        presence: {},
        route: reason ? 'CLOSED' : 'HOME',
        closedReason: reason,
      });
    },

    subscribeToRoom: (code: string) => {
      for (const unsub of roomUnsubscribers) {
        unsub();
      }
      roomUnsubscribers = [];

      const uid = get().auth?.uid;

      if (isLocalApiMode) {
        let stopped = false;
        let inFlight = false;

        const tick = async () => {
          if (stopped || inFlight) return;
          inFlight = true;
          try {
            await pollRoomState(code);
          } finally {
            inFlight = false;
          }
        };

        void tick();
        const intervalId = window.setInterval(() => {
          void tick();
        }, 350);

        const unsub = () => {
          stopped = true;
          window.clearInterval(intervalId);
        };
        roomUnsubscribers.push(unsub);
        return unsub;
      }

      if (isLocalDevMode) {
        const bundle = readLocalBundle(code);
        if (bundle) {
          applyBundle(bundle);
        }

        let ch: BroadcastChannel | null = null;
        try {
          ch = new BroadcastChannel(LOCAL_CHANNEL_NAME);
          ch.onmessage = (ev: MessageEvent<{ code?: string }>) => {
            if (ev.data?.code === code) {
              const latest = readLocalBundle(code);
              if (latest) applyBundle(latest);
            }
          };
        } catch {
          // ignore
        }

        const onStorage = (ev: StorageEvent) => {
          if (ev.key === `${LOCAL_ROOM_PREFIX}${code}`) {
            const latest = readLocalBundle(code);
            if (latest) applyBundle(latest);
          }
        };
        window.addEventListener('storage', onStorage);

        const unsub = () => {
          ch?.close();
          window.removeEventListener('storage', onStorage);
        };
        roomUnsubscribers.push(unsub);
        return unsub;
      }

      const { db, rtdb } = getFirebaseClients();
      if (!db || !rtdb || !uid) return () => {};

      const unsubRoom = onSnapshot(doc(db, 'rooms', code), (snap) => {
        if (!snap.exists()) {
          get().leaveRoomLocally('This table is no longer available.');
          return;
        }
        const incoming = snap.data() as RoomDoc;
        if (incoming.schemaVersion !== SCHEMA_VERSION) {
          set({ schemaMismatch: true });
          get().showToast(
            'Update required: a newer version of Vowlet is live. Please reload.',
            'error',
          );
          get().leaveRoomLocally('Version mismatch — please reload Vowlet.');
          return;
        }
        const cur = get().room;
        if (cur && cur.code === incoming.code && incoming.turnVersion < cur.turnVersion) {
          return; // D3 stale-write rejection
        }
        set({ room: incoming });
        if (incoming.phase === 'CLOSED') {
          set({ route: 'CLOSED', closedReason: 'Table closed.' });
        }
      });

      const unsubPlayers = onSnapshot(collection(db, 'rooms', code, 'players'), (snap) => {
        const list = snap.docs.map((d) => d.data() as PlayerDoc);
        const me = list.find((p) => p.uid === uid);
        if (me?.banned) {
          get().leaveRoomLocally('You were removed from this table by the host.');
          return;
        }
        set({ players: list });
      });

      const unsubTurn = onSnapshot(doc(db, 'rooms', code, 'turn', 'current'), (snap) => {
        set({ turn: snap.exists() ? (snap.data() as TurnDoc) : null });
      });

      const unsubVotes = onSnapshot(collection(db, 'rooms', code, 'votes'), (snap) => {
        set({ votes: snap.docs.map((d) => d.data() as VoteDoc) });
      });

      const unsubChits = onSnapshot(collection(db, 'rooms', code, 'chits'), (snap) => {
        set({ chits: snap.docs.map((d) => ({ ...(d.data() as Omit<ChitDoc, 'id'>), id: d.id })) });
      });

      const unsubPrivate = onSnapshot(doc(db, 'rooms', code, 'private', uid), (snap) => {
        set({ privatePrompt: snap.exists() ? (snap.data() as PrivatePromptDoc) : null });
      });

      // RTDB Presence + onDisconnect + visibilitychange (D4)
      const myPresenceRef = rtdbRef(rtdb, `presence/${code}/${uid}`);
      const roomPresenceRef = rtdbRef(rtdb, `presence/${code}`);
      const connectedRef = rtdbRef(rtdb, '.info/connected');

      const unsubConn = onValue(connectedRef, (snap) => {
        const connected = Boolean(snap.val());
        set({ isOnline: connected, syncState: connected ? 'synced' : 'reconnecting' });
        if (connected) {
          onDisconnect(myPresenceRef).set({
            online: false,
            away: false,
            lastSeen: Date.now(),
          });
          rtdbSet(myPresenceRef, {
            online: true,
            away: document.visibilityState === 'hidden' && !get().shareSheetOpen,
            lastSeen: Date.now(),
          }).catch(() => {});
        }
      });

      const unsubPresence = onValue(roomPresenceRef, (snap) => {
        const val = (snap.val() as Record<string, PresenceNode> | null) ?? {};
        set({ presence: val });
      });

      const onVisChange = () => {
        if (get().shareSheetOpen) return; // D4 share-sheet exempt
        rtdbUpdate(myPresenceRef, {
          away: document.visibilityState === 'hidden',
          lastSeen: Date.now(),
        }).catch(() => {});
      };
      document.addEventListener('visibilitychange', onVisChange);

      const cleanup = () => {
        unsubRoom();
        unsubPlayers();
        unsubTurn();
        unsubVotes();
        unsubChits();
        unsubPrivate();
        unsubConn();
        unsubPresence();
        document.removeEventListener('visibilitychange', onVisChange);
      };
      roomUnsubscribers.push(cleanup);
      return cleanup;
    },

    createRoom: async ({ name, settings }) => {
      const uid = get().auth?.uid ?? 'local-guest';
      get().setDisplayName(name);

      try {
        const res = await callArbiter<{ code: string }>('/api/room/create', {
          name,
          avatar: '🦉',
          schemaVersion: SCHEMA_VERSION,
          settings,
        });
        get().subscribeToRoom(res.code);
        set({ route: 'ROOM' });
        return res.code;
      } catch (err) {
        if (!(err instanceof Error && err.message === 'LOCAL_FALLBACK')) {
          throw err;
        }
        const code = generateRoomCode();
        const now = Date.now();
        const fullSettings: RoomSettings = {
          maxPlayers: settings.maxPlayers ?? 8,
          rounds: settings.rounds ?? 10,
          quickPlay: settings.quickPlay ?? false,
          writingDeadlineSec: settings.writingDeadlineSec ?? 120,
          chooseDeadlineSec: settings.chooseDeadlineSec ?? 15,
          voteDeadlineSec: settings.voteDeadlineSec ?? 20,
          packIds: settings.packIds ?? ['friends'],
          tableMode: settings.tableMode ?? false,
        };
        const bundle: LocalRoomBundle = {
          room: {
            code,
            hostUid: uid,
            phase: 'LOBBY',
            round: 0,
            totalRounds: fullSettings.rounds,
            turnVersion: 0,
            schemaVersion: SCHEMA_VERSION,
            callLink: null,
            settings: fullSettings,
            createdAt: now,
            updatedAt: now,
            expiresAt: now + 4 * 3600 * 1000,
          },
          players: [
            {
              uid,
              name,
              avatar: '🦉',
              seat: 0,
              joinedAt: now,
              ready: false,
              banned: false,
              spectator: false,
              turnsTaken: 0,
              sessionScore: 0,
              streak: 0,
              swapUsed: false,
            },
          ],
          turn: null,
          votes: [],
          chits: [],
          privatePrompts: {},
          presence: {
            [uid]: { online: true, away: false, lastSeen: now },
          },
        };
        writeLocalBundle(code, bundle);
        get().subscribeToRoom(code);
        set({ route: 'ROOM' });
        return code;
      }
    },

    joinRoom: async ({ code, name, spectator = false }) => {
      const normalizedCode = code.trim().toUpperCase();
      const uid = get().auth?.uid ?? 'local-guest';
      get().setDisplayName(name);

      try {
        await callArbiter('/api/room/join', {
          code: normalizedCode,
          name,
          avatar: '🦊',
          schemaVersion: SCHEMA_VERSION,
          spectator,
        });
        get().subscribeToRoom(normalizedCode);
        set({ route: 'ROOM' });
      } catch (err) {
        if (!(err instanceof Error && err.message === 'LOCAL_FALLBACK')) {
          throw err;
        }
        const bundle = readLocalBundle(normalizedCode);
        if (!bundle) {
          throw new Error('Table not found. Check the 6-character code.');
        }
        if (bundle.room.schemaVersion !== SCHEMA_VERSION) {
          throw new Error('Version mismatch — please reload.');
        }
        const existing = bundle.players.find((p) => p.uid === uid);
        if (existing?.banned) {
          throw new Error('You were removed from this table.');
        }
        if (!existing) {
          const activeCount = bundle.players.filter((p) => !p.banned && !p.spectator).length;
          if (!spectator && activeCount >= bundle.room.settings.maxPlayers) {
            throw new Error('This table is full (max 8 seats).');
          }
          const seat = activeCount;
          bundle.players.push({
            uid,
            name,
            avatar: ['🦊', '🐻', '🐸', '🦁', '🐼', '🐨', '🐯'][seat % 7] ?? '🦊',
            seat,
            joinedAt: Date.now(),
            ready: false,
            banned: false,
            spectator,
            turnsTaken: 0,
            sessionScore: 0,
            streak: 0,
            swapUsed: false,
          });
        }
        bundle.presence[uid] = { online: true, away: false, lastSeen: Date.now() };
        bundle.room.turnVersion += 1;
        writeLocalBundle(normalizedCode, bundle);
        get().subscribeToRoom(normalizedCode);
        set({ route: 'ROOM' });
      }
    },

    leaveRoom: async () => {
      const { room, auth } = get();
      if (!room) {
        get().leaveRoomLocally();
        return;
      }
      try {
        await callArbiter('/api/room/leave', {
          code: room.code,
          expectedPhase: room.phase,
          expectedVersion: room.turnVersion,
        });
      } catch (err) {
        if (err instanceof Error && err.message === 'LOCAL_FALLBACK' && auth) {
          const bundle = readLocalBundle(room.code);
          if (bundle) {
            bundle.players = bundle.players.filter((p) => p.uid !== auth.uid);
            delete bundle.presence[auth.uid];
            if (bundle.room.hostUid === auth.uid && bundle.players[0]) {
              bundle.room.hostUid = bundle.players[0].uid;
            }
            bundle.room.turnVersion += 1;
            writeLocalBundle(room.code, bundle);
          }
        }
      }
      get().leaveRoomLocally();
    },

    kickPlayer: async (targetUid: string) => {
      const { room } = get();
      if (!room) return;
      try {
        await callArbiter('/api/room/kick', {
          code: room.code,
          targetUid,
          expectedPhase: room.phase,
          expectedVersion: room.turnVersion,
        });
      } catch (err) {
        if (!(err instanceof Error && err.message === 'LOCAL_FALLBACK')) throw err;
        const bundle = readLocalBundle(room.code);
        if (!bundle) return;
        bundle.players = bundle.players.map((p) =>
          p.uid === targetUid ? { ...p, banned: true } : p,
        );
        bundle.room.turnVersion += 1;
        writeLocalBundle(room.code, bundle);
        applyBundle(bundle);
      }
    },

    updateSettings: async (patch) => {
      const { room, auth } = get();
      if (!room || !auth) return;
      try {
        await callArbiter('/api/room/settings', {
          code: room.code,
          expectedPhase: room.phase,
          expectedVersion: room.turnVersion,
          ...patch,
        });
      } catch (err) {
        if (isExpectedConflict(err) || (err instanceof ArbiterError && err.status === 426)) {
          return;
        }
        if (!(err instanceof Error && err.message === 'LOCAL_FALLBACK')) throw err;
        const bundle = readLocalBundle(room.code);
        if (!bundle) return;
        if (patch.settings) {
          bundle.room.settings = { ...bundle.room.settings, ...patch.settings };
          if (patch.settings.rounds) {
            bundle.room.totalRounds = patch.settings.rounds;
          }
        }
        if (patch.callLink !== undefined) {
          bundle.room.callLink = patch.callLink;
        }
        if (patch.ready !== undefined) {
          bundle.players = bundle.players.map((p) =>
            p.uid === auth.uid ? { ...p, ready: Boolean(patch.ready) } : p,
          );
        }
        bundle.room.turnVersion += 1;
        writeLocalBundle(room.code, bundle);
        applyBundle(bundle);
      }
    },

    startGame: async () => {
      const { room } = get();
      if (!room) return;
      try {
        await callArbiter('/api/room/start', {
          code: room.code,
          expectedPhase: room.phase,
          expectedVersion: room.turnVersion,
        });
      } catch (err) {
        if (!(err instanceof Error && err.message === 'LOCAL_FALLBACK')) throw err;
        const bundle = readLocalBundle(room.code);
        if (!bundle) return;
        const now = Date.now();

        if (bundle.room.phase === 'PODIUM') {
          // Rematch -> back to LOBBY
          bundle.room.phase = 'LOBBY';
          bundle.room.round = 0;
          bundle.players = bundle.players.map((p) => ({
            ...p,
            sessionScore: 0,
            streak: 0,
            turnsTaken: 0,
            swapUsed: false,
            ready: false,
          }));
          bundle.turn = null;
          bundle.votes = [];
          bundle.room.turnVersion += 1;
          writeLocalBundle(room.code, bundle);
          applyBundle(bundle);
          return;
        }

        if (bundle.room.settings.quickPlay) {
          const picked = selectNextPerformerSeat(
            bundle.players.map((p) => ({
              uid: p.uid,
              seat: p.seat,
              online: bundle.presence[p.uid]?.online ?? true,
              banned: p.banned,
              spectator: p.spectator,
              turnsTaken: p.turnsTaken,
            })),
            null,
          );
          if (!picked) throw new Error('Need at least 3 present players');
          bundle.room.phase = 'SPIN';
          bundle.room.round = 1;
          bundle.room.turnVersion += 1;
          bundle.turn = {
            turnVersion: bundle.room.turnVersion,
            round: 1,
            performerUid: picked.uid,
            performerSeat: picked.seat,
            phase: 'SPIN',
            deadlineAt: now + 4500,
            startedAt: null,
            choice: null,
            kind: null,
            dareType: null,
            chitId: null,
            resultStamp: null,
            stallVotes: [],
            sessionScoreDelta: null,
            owlLine: null,
          };
        } else {
          bundle.room.phase = 'WRITING';
          bundle.room.round = 0;
          bundle.room.turnVersion += 1;
          bundle.turn = null;
          // Store writing deadline in room.updatedAt + settings for local mode
          bundle.room.updatedAt = now;
        }
        writeLocalBundle(room.code, bundle);
        applyBundle(bundle);
      }
    },

    submitChit: async ({ kind, dareType, text }) => {
      const { room } = get();
      if (!room) throw new Error('Not in a room');
      try {
        const res = await callArbiter<{
          verdict: JudgeVerdict;
          owlReason: string;
          status: string;
        }>('/api/chit/submit', {
          code: room.code,
          kind,
          dareType,
          text,
          expectedPhase: room.phase,
          expectedVersion: room.turnVersion,
        });
        return res;
      } catch (err) {
        if (!(err instanceof Error && err.message === 'LOCAL_FALLBACK')) throw err;
        const mod = checkDeterministicModeration(text);
        if (!mod.allowed) {
          return {
            verdict: 'NOPE',
            owlReason: mod.reason || 'That prompt breaks table rules.',
            status: 'REJECTED',
          };
        }
        if (text.trim().length < 10) {
          return {
            verdict: 'TOO_MILD',
            owlReason: 'Give the table a little more detail to work with!',
            status: 'PENDING',
          };
        }
        const bundle = readLocalBundle(room.code);
        if (bundle) {
          bundle.chits.push({
            id: crypto.randomUUID(),
            kind,
            tier: 'MILD',
            dareType: kind === 'DARE' ? (dareType ?? 'INSTANT') : null,
            status: 'SEALED',
            judgeVerdict: 'FINE',
            owlReason: 'Sealed! The Owl approves.',
          });
          writeLocalBundle(room.code, bundle);
          applyBundle(bundle);
        }
        return {
          verdict: 'FINE',
          owlReason: 'Sealed! The Owl approves.',
          status: 'SEALED',
        };
      }
    },

    advanceTurn: async () => {
      const { room } = get();
      if (!room) return;
      try {
        await callArbiter('/api/turn/advance', {
          code: room.code,
          expectedPhase: room.phase,
          expectedVersion: room.turnVersion,
        });
      } catch (err) {
        if (isExpectedConflict(err) || (err instanceof ArbiterError && err.status === 426)) {
          return;
        }
        if (!(err instanceof Error && err.message === 'LOCAL_FALLBACK')) throw err;
        const bundle = readLocalBundle(room.code);
        if (!bundle) return;
        const now = Date.now();

        if (bundle.room.phase === 'WRITING') {
          const picked = selectNextPerformerSeat(
            bundle.players.map((p) => ({
              uid: p.uid,
              seat: p.seat,
              online: bundle.presence[p.uid]?.online ?? true,
              banned: p.banned,
              spectator: p.spectator,
              turnsTaken: p.turnsTaken,
            })),
            null,
          );
          if (!picked) return;
          bundle.room.phase = 'SPIN';
          bundle.room.round = 1;
          bundle.room.turnVersion += 1;
          bundle.turn = {
            turnVersion: bundle.room.turnVersion,
            round: 1,
            performerUid: picked.uid,
            performerSeat: picked.seat,
            phase: 'SPIN',
            deadlineAt: now + 4500,
            startedAt: null,
            choice: null,
            kind: null,
            dareType: null,
            chitId: null,
            resultStamp: null,
            stallVotes: [],
            sessionScoreDelta: null,
            owlLine: null,
          };
        } else if (bundle.room.phase === 'SPIN' && bundle.turn) {
          bundle.room.phase = 'CHOOSE';
          bundle.room.turnVersion += 1;
          bundle.turn = {
            ...bundle.turn,
            phase: 'CHOOSE',
            turnVersion: bundle.room.turnVersion,
            deadlineAt: now + bundle.room.settings.chooseDeadlineSec * 1000,
          };
        } else if (bundle.room.phase === 'CHOOSE' && bundle.turn) {
          // Timeout -> auto-Truth
          const promptText = pickRandom(STARTER_TRUTHS);
          bundle.room.phase = 'PERFORM';
          bundle.room.turnVersion += 1;
          bundle.turn = {
            ...bundle.turn,
            phase: 'PERFORM',
            turnVersion: bundle.room.turnVersion,
            choice: 'TRUTH',
            kind: 'TRUTH',
            dareType: null,
            deadlineAt: null,
            startedAt: now,
          };
          bundle.privatePrompts[bundle.turn.performerUid] = {
            chitId: 'starter-truth',
            text: promptText,
            kind: 'TRUTH',
            tier: 'MILD',
            dareType: null,
            turnVersion: bundle.room.turnVersion,
          };
          get().showToast("Time's up — Truth chosen!", 'info');
        } else if (bundle.room.phase === 'VOTE' && bundle.turn) {
          const witnesses = bundle.players.filter(
            (p) => !p.banned && !p.spectator && p.uid !== bundle.turn?.performerUid,
          );
          const approveCount = bundle.votes.filter((v) => v.verdict === 'APPROVE').length;
          const rejectCount = bundle.votes.filter((v) => v.verdict === 'REJECT').length;
          const tally = tallyVotes({
            approveCount,
            rejectCount,
            witnessCount: witnesses.length,
            stalled: bundle.turn.stalled,
          });
          const perf = bundle.players.find((p) => p.uid === bundle.turn?.performerUid);
          const outcome = calculateTurnSessionDelta(tally.stamp, perf?.streak ?? 0);
          bundle.players = bundle.players.map((p) =>
            p.uid === bundle.turn?.performerUid
              ? {
                  ...p,
                  turnsTaken: p.turnsTaken + 1,
                  sessionScore: p.sessionScore + outcome.sessionDelta,
                  streak: outcome.nextStreak,
                }
              : p,
          );
          bundle.room.phase = 'RESULT';
          bundle.room.turnVersion += 1;
          bundle.turn = {
            ...bundle.turn,
            phase: 'RESULT',
            turnVersion: bundle.room.turnVersion,
            resultStamp: tally.stamp,
            sessionScoreDelta: outcome.sessionDelta,
            owlLine: pickRandom(OWL_LINES_BY_STAMP[tally.stamp]),
            deadlineAt: now + 6000,
          };
        } else if (bundle.room.phase === 'RESULT') {
          if (bundle.room.round >= bundle.room.totalRounds) {
            bundle.room.phase = 'PODIUM';
            bundle.room.turnVersion += 1;
          } else {
            const picked = selectNextPerformerSeat(
              bundle.players.map((p) => ({
                uid: p.uid,
                seat: p.seat,
                online: bundle.presence[p.uid]?.online ?? true,
                banned: p.banned,
                spectator: p.spectator,
                turnsTaken: p.turnsTaken,
              })),
              bundle.turn?.performerUid ?? null,
            );
            if (picked) {
              bundle.room.round += 1;
              bundle.room.phase = 'SPIN';
              bundle.room.turnVersion += 1;
              bundle.votes = [];
              bundle.turn = {
                turnVersion: bundle.room.turnVersion,
                round: bundle.room.round,
                performerUid: picked.uid,
                performerSeat: picked.seat,
                phase: 'SPIN',
                deadlineAt: now + 4500,
                startedAt: null,
                choice: null,
                kind: null,
                dareType: null,
                chitId: null,
                resultStamp: null,
                stallVotes: [],
                sessionScoreDelta: null,
                owlLine: null,
              };
            }
          }
        } else if (bundle.room.phase === 'SUMMARY') {
          bundle.room.phase = 'PODIUM';
          bundle.room.turnVersion += 1;
        }

        writeLocalBundle(room.code, bundle);
        applyBundle(bundle);
      }
    },

    choosePromptKind: async (choice) => {
      const { room } = get();
      if (!room) return;
      try {
        await callArbiter('/api/turn/choose', {
          code: room.code,
          choice,
          expectedPhase: 'CHOOSE',
          expectedVersion: room.turnVersion,
        });
      } catch (err) {
        if (!(err instanceof Error && err.message === 'LOCAL_FALLBACK')) throw err;
        const bundle = readLocalBundle(room.code);
        if (!bundle || !bundle.turn) return;
        const now = Date.now();
        const darePick = pickRandom(STARTER_DARES);
        const promptText = choice === 'TRUTH' ? pickRandom(STARTER_TRUTHS) : darePick.text;
        const dareType = choice === 'DARE' ? darePick.dareType : null;

        bundle.room.phase = 'PERFORM';
        bundle.room.turnVersion += 1;
        bundle.turn = {
          ...bundle.turn,
          phase: 'PERFORM',
          turnVersion: bundle.room.turnVersion,
          choice,
          kind: choice,
          dareType,
          deadlineAt: null,
          startedAt: now,
        };
        bundle.privatePrompts[bundle.turn.performerUid] = {
          chitId: `local-${bundle.room.turnVersion}`,
          text: promptText,
          kind: choice,
          tier: 'MILD',
          dareType,
          turnVersion: bundle.room.turnVersion,
        };
        writeLocalBundle(room.code, bundle);
        applyBundle(bundle);
      }
    },

    performDone: async () => {
      const { room } = get();
      if (!room) return;
      try {
        await callArbiter('/api/turn/perform/done', {
          code: room.code,
          expectedPhase: 'PERFORM',
          expectedVersion: room.turnVersion,
        });
      } catch (err) {
        if (!(err instanceof Error && err.message === 'LOCAL_FALLBACK')) throw err;
        const bundle = readLocalBundle(room.code);
        if (!bundle || !bundle.turn) return;
        const now = Date.now();
        bundle.room.phase = 'VOTE';
        bundle.room.turnVersion += 1;
        bundle.votes = [];
        bundle.turn = {
          ...bundle.turn,
          phase: 'VOTE',
          turnVersion: bundle.room.turnVersion,
          deadlineAt: now + bundle.room.settings.voteDeadlineSec * 1000,
        };
        writeLocalBundle(room.code, bundle);
        applyBundle(bundle);
      }
    },

    performSkip: async () => {
      const { room } = get();
      if (!room) return;
      try {
        await callArbiter('/api/turn/perform/skip', {
          code: room.code,
          expectedPhase: 'PERFORM',
          expectedVersion: room.turnVersion,
        });
      } catch (err) {
        if (!(err instanceof Error && err.message === 'LOCAL_FALLBACK')) throw err;
        const bundle = readLocalBundle(room.code);
        if (!bundle || !bundle.turn) return;
        const now = Date.now();
        bundle.players = bundle.players.map((p) =>
          p.uid === bundle.turn?.performerUid
            ? {
                ...p,
                turnsTaken: p.turnsTaken + 1,
                sessionScore: p.sessionScore - 30,
                streak: 0,
              }
            : p,
        );
        bundle.room.phase = 'RESULT';
        bundle.room.turnVersion += 1;
        bundle.turn = {
          ...bundle.turn,
          phase: 'RESULT',
          turnVersion: bundle.room.turnVersion,
          resultStamp: 'SKIPPED',
          sessionScoreDelta: -30,
          owlLine: pickRandom(OWL_LINES_BY_STAMP.SKIPPED),
          deadlineAt: now + 6000,
        };
        writeLocalBundle(room.code, bundle);
        applyBundle(bundle);
      }
    },

    performSwap: async () => {
      const { room, auth } = get();
      if (!room || !auth) return;
      try {
        await callArbiter('/api/chit/swap', {
          code: room.code,
          expectedPhase: 'PERFORM',
          expectedVersion: room.turnVersion,
        });
      } catch (err) {
        if (!(err instanceof Error && err.message === 'LOCAL_FALLBACK')) throw err;
        const bundle = readLocalBundle(room.code);
        if (!bundle || !bundle.turn) return;
        const kind = bundle.turn.kind ?? 'TRUTH';
        const darePick = pickRandom(STARTER_DARES);
        const newText = kind === 'TRUTH' ? pickRandom(STARTER_TRUTHS) : darePick.text;
        bundle.players = bundle.players.map((p) =>
          p.uid === auth.uid ? { ...p, swapUsed: true } : p,
        );
        bundle.room.turnVersion += 1;
        bundle.privatePrompts[auth.uid] = {
          chitId: `swap-${bundle.room.turnVersion}`,
          text: newText,
          kind,
          tier: 'MILD',
          dareType: kind === 'DARE' ? darePick.dareType : null,
          turnVersion: bundle.room.turnVersion,
        };
        writeLocalBundle(room.code, bundle);
        applyBundle(bundle);
        get().showToast('Swapped for a fresh prompt!', 'success');
      }
    },

    performStall: async () => {
      const { room, auth } = get();
      if (!room || !auth) return;
      try {
        await callArbiter('/api/turn/perform/stall', {
          code: room.code,
          expectedPhase: 'PERFORM',
          expectedVersion: room.turnVersion,
        });
      } catch (err) {
        if (!(err instanceof Error && err.message === 'LOCAL_FALLBACK')) throw err;
        const bundle = readLocalBundle(room.code);
        if (!bundle || !bundle.turn) return;
        const stallSet = new Set(bundle.turn.stallVotes);
        stallSet.add(auth.uid);
        const stallVotes = Array.from(stallSet);
        const witnesses = bundle.players.filter(
          (p) => !p.banned && !p.spectator && p.uid !== bundle.turn?.performerUid,
        );
        const thresholdExceeded = stallVotes.length > Math.floor(witnesses.length / 2);
        if (thresholdExceeded) {
          bundle.room.phase = 'VOTE';
          bundle.room.turnVersion += 1;
          bundle.votes = [];
          bundle.turn = {
            ...bundle.turn,
            phase: 'VOTE',
            turnVersion: bundle.room.turnVersion,
            stallVotes,
            stalled: true,
            deadlineAt: Date.now() + bundle.room.settings.voteDeadlineSec * 1000,
          };
        } else {
          bundle.turn = { ...bundle.turn, stallVotes };
        }
        writeLocalBundle(room.code, bundle);
        applyBundle(bundle);
      }
    },

    castVote: async (verdict) => {
      const { room, auth, turn } = get();
      if (!room || !auth || !turn) return;

      if (isLocalApiMode) {
        const res = await callArbiter<{
          ok: boolean;
          allVoted?: boolean;
        }>('/api/turn/vote', {
          code: room.code,
          expectedPhase: 'VOTE',
          expectedVersion: room.turnVersion,
          verdict,
        });
        if (res.allVoted) {
          try {
            await get().advanceTurn();
          } catch {
            // Another witness or timer may have already advanced the turn
          }
        }
        return;
      }

      if (isLocalDevMode) {
        const bundle = readLocalBundle(room.code);
        if (!bundle || !bundle.turn) return;
        const nextVotes = bundle.votes.filter((v) => v.uid !== auth.uid);
        nextVotes.push({
          uid: auth.uid,
          verdict,
          turnVersion: bundle.room.turnVersion,
          createdAt: Date.now(),
        });
        bundle.votes = nextVotes;
        writeLocalBundle(room.code, bundle);
        applyBundle(bundle);

        const witnesses = bundle.players.filter(
          (p) => !p.banned && !p.spectator && p.uid !== bundle.turn?.performerUid,
        );
        if (nextVotes.length >= witnesses.length && witnesses.length > 0) {
          await get().advanceTurn();
        }
        return;
      }

      const { db } = getFirebaseClients();
      if (!db) return;
      await setDoc(doc(db, 'rooms', room.code, 'votes', auth.uid), {
        uid: auth.uid,
        verdict,
        turnVersion: room.turnVersion,
        createdAt: Date.now(),
      });
    },

    submitReport: async (input) => {
      const { room } = get();
      try {
        await callArbiter('/api/report', {
          roomCode: room?.code ?? null,
          ...input,
        });
      } catch (err) {
        if (!(err instanceof Error && err.message === 'LOCAL_FALLBACK')) throw err;
      }
      get().showToast('Report submitted. Thank you for keeping the table safe.', 'success');
    },
  };
});
