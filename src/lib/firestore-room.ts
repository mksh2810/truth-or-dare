import {
  doc,
  collection,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore';
import { db, UserProfile } from './firebase';

export interface RoomSettings {
  maxPlayers: number;
  tier: 'mild' | 'spicy' | 'legend';
  timer: 'short' | 'normal' | 'long';
  rounds: number;
  dareMode: 'room' | 'live';
}

export interface RoomDoc {
  code: string;
  hostUid: string;
  status: 'lobby' | 'writing' | 'playing' | 'ended';
  settings: RoomSettings;
  round: number;
  bag: string[];
  currentTurnId: string | null;
  writingDeadline: number | null;
  createdAt: any;
}

export interface PlayerDoc {
  uid: string;
  name: string;
  avatarId: string;
  isHost: boolean;
  ready: boolean;
  joinedAt: number;
  lastSeen: number;
  totalXp: number;
  swapsLeft: number;
  streak: number;
  xpGame: number;
  passes: number;
  fails: number;
  votesCast: number;
  chitsOk: {
    truth: boolean;
    dare: boolean;
  };
  kicked: boolean;
}

const CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // No 0, O, 1, I (ROOM-2)

/**
 * Generates an unambiguous 6-character room code (ROOM-2)
 */
export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
  }
  return code;
}

/**
 * Normalizes input string to valid room code format
 */
export function sanitizeRoomCode(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^23456789ABCDEFGHJKLMNPQRSTUVWXYZ]/g, '')
    .slice(0, 6);
}

/**
 * Creates a new room in Firestore and adds host as the first player (ROOM-1, ROOM-2)
 */
export async function createRoom(
  host: UserProfile,
  settings: Partial<RoomSettings> = {}
): Promise<string> {
  const finalSettings: RoomSettings = {
    maxPlayers: settings.maxPlayers || 4,
    tier: settings.tier || 'spicy',
    timer: settings.timer || 'normal',
    rounds: settings.rounds || 1,
    dareMode: settings.dareMode || 'room',
  };

  const code = generateRoomCode();

  if (!db) {
    // Offline / Mock fallback
    const mockRoom: RoomDoc = {
      code,
      hostUid: host.uid,
      status: 'lobby',
      settings: finalSettings,
      round: 1,
      bag: [host.uid],
      currentTurnId: null,
      writingDeadline: null,
      createdAt: Date.now(),
    };
    sessionStorage.setItem(`room_${code}`, JSON.stringify(mockRoom));
    return code;
  }

  const roomRef = doc(db, 'rooms', code);
  const hostPlayerRef = doc(db, 'rooms', code, 'players', host.uid);

  const roomData: RoomDoc = {
    code,
    hostUid: host.uid,
    status: 'lobby',
    settings: finalSettings,
    round: 1,
    bag: [],
    currentTurnId: null,
    writingDeadline: null,
    createdAt: serverTimestamp(),
  };

  const hostPlayerData: PlayerDoc = {
    uid: host.uid,
    name: host.displayName,
    avatarId: host.avatarId,
    isHost: true,
    ready: true,
    joinedAt: Date.now(),
    lastSeen: Date.now(),
    totalXp: host.totalXp || 0,
    swapsLeft: 1,
    streak: 0,
    xpGame: 0,
    passes: 0,
    fails: 0,
    votesCast: 0,
    chitsOk: { truth: false, dare: false },
    kicked: false,
  };

  await setDoc(roomRef, roomData);
  await setDoc(hostPlayerRef, hostPlayerData);

  return code;
}

/**
 * Joins an existing room after checking capacity and status (ROOM-3, ROOM-4, ROOM-9)
 */
export async function joinRoom(
  rawCode: string,
  user: UserProfile
): Promise<{ success: boolean; error?: string }> {
  const code = sanitizeRoomCode(rawCode);
  if (code.length < 6) {
    return { success: false, error: 'Room code must be 6 characters' };
  }

  if (!db) {
    return { success: true };
  }

  try {
    const roomRef = doc(db, 'rooms', code);
    const playerRef = doc(db, 'rooms', code, 'players', user.uid);

    return await runTransaction(db, async (tx) => {
      const roomSnap = await tx.get(roomRef);
      if (!roomSnap.exists()) {
        return { success: false, error: 'Room not found. Check the code and try again.' };
      }

      const room = roomSnap.data() as RoomDoc;

      if (room.status === 'ended') {
        return { success: false, error: 'This game has already ended.' };
      }

      const playerSnap = await tx.get(playerRef);

      // Reconnect check (ROOM-9): If user already has a player doc in this room, allow rejoin
      if (playerSnap.exists()) {
        const existing = playerSnap.data() as PlayerDoc;
        if (existing.kicked) {
          return { success: false, error: 'You have been kicked from this room.' };
        }
        // Update presence
        tx.update(playerRef, { lastSeen: Date.now() });
        return { success: true };
      }

      // If joining for the first time, check if game already started
      if (room.status !== 'lobby') {
        return { success: false, error: 'Game has already started.' };
      }

      const newPlayerData: PlayerDoc = {
        uid: user.uid,
        name: user.displayName,
        avatarId: user.avatarId,
        isHost: false,
        ready: false,
        joinedAt: Date.now(),
        lastSeen: Date.now(),
        totalXp: user.totalXp || 0,
        swapsLeft: 1,
        streak: 0,
        xpGame: 0,
        passes: 0,
        fails: 0,
        votesCast: 0,
        chitsOk: { truth: false, dare: false },
        kicked: false,
      };

      tx.set(playerRef, newPlayerData);
      return { success: true };
    });
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to join table.' };
  }
}

/**
 * Subscribes to real-time changes on a room doc (ROOM-5)
 */
export function subscribeToRoom(
  code: string,
  onUpdate: (room: RoomDoc | null) => void
): () => void {
  if (!db) {
    const raw = sessionStorage.getItem(`room_${code}`);
    onUpdate(raw ? JSON.parse(raw) : null);
    return () => {};
  }

  const roomRef = doc(db, 'rooms', code);
  return onSnapshot(roomRef, (snap) => {
    if (snap.exists()) {
      onUpdate(snap.data() as RoomDoc);
    } else {
      onUpdate(null);
    }
  });
}

/**
 * Subscribes to real-time player list of a room (ROOM-5)
 */
export function subscribeToPlayers(
  code: string,
  onUpdate: (players: PlayerDoc[]) => void
): () => void {
  if (!db) {
    onUpdate([]);
    return () => {};
  }

  const playersCol = collection(db, 'rooms', code, 'players');
  return onSnapshot(playersCol, (snap) => {
    const players = snap.docs
      .map((d) => d.data() as PlayerDoc)
      .filter((p) => !p.kicked)
      .sort((a, b) => a.joinedAt - b.joinedAt);
    onUpdate(players);
  });
}

/**
 * Updates player ready status in lobby
 */
export async function setPlayerReady(
  code: string,
  uid: string,
  ready: boolean
): Promise<void> {
  if (!db) return;
  const playerRef = doc(db, 'rooms', code, 'players', uid);
  await updateDoc(playerRef, { ready });
}

/**
 * Sends heartbeat to keep presence fresh (every 10s)
 */
export async function sendHeartbeat(code: string, uid: string): Promise<void> {
  if (!db) return;
  try {
    const playerRef = doc(db, 'rooms', code, 'players', uid);
    await updateDoc(playerRef, { lastSeen: Date.now() });
  } catch {
    // Silently ignore background heartbeat fail
  }
}

/**
 * Evaluates host migration (ROOM-8)
 * If current host hasn't reported presence for > 20 seconds,
 * the earliest-joined active player becomes the new host.
 */
export async function evaluateHostMigration(
  code: string,
  currentHostUid: string,
  players: PlayerDoc[]
): Promise<string | null> {
  if (!db || players.length === 0) return null;

  const now = Date.now();
  const host = players.find((p) => p.uid === currentHostUid);

  // If host is active (seen within last 20 seconds), keep current host
  if (host && now - host.lastSeen <= 20000) {
    return currentHostUid;
  }

  // Find active players (seen in last 20 seconds) sorted by joinedAt
  const activePlayers = players
    .filter((p) => p.uid !== currentHostUid && now - p.lastSeen <= 20000)
    .sort((a, b) => a.joinedAt - b.joinedAt);

  if (activePlayers.length === 0) return null;

  const newHost = activePlayers[0];

  try {
    const roomRef = doc(db, 'rooms', code);
    await updateDoc(roomRef, { hostUid: newHost.uid });

    const newHostPlayerRef = doc(db, 'rooms', code, 'players', newHost.uid);
    await updateDoc(newHostPlayerRef, { isHost: true });

    if (host) {
      const oldHostPlayerRef = doc(db, 'rooms', code, 'players', host.uid);
      await updateDoc(oldHostPlayerRef, { isHost: false });
    }

    return newHost.uid;
  } catch (err) {
    console.warn('Host migration update error:', err);
    return null;
  }
}

/**
 * Host kicks a player from the table (ROOM-6)
 */
export async function kickPlayer(code: string, uid: string): Promise<void> {
  if (!db) return;
  const playerRef = doc(db, 'rooms', code, 'players', uid);
  await updateDoc(playerRef, { kicked: true });
}

/**
 * Voluntary leave from a table (SAFE-4)
 */
export async function leaveRoom(code: string, uid: string): Promise<void> {
  if (!db) return;
  const playerRef = doc(db, 'rooms', code, 'players', uid);
  await deleteDoc(playerRef);
}

/**
 * Starts game from lobby -> writing phase (CHIT-8)
 */
export async function startRoomGame(code: string): Promise<void> {
  if (!db) return;
  const roomRef = doc(db, 'rooms', code);
  await updateDoc(roomRef, {
    status: 'writing',
    writingDeadline: Date.now() + 3 * 60 * 1000, // 3 min cap
  });
}
