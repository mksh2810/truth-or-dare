import {
  drawChit,
  fnv1aHash,
  PRESENCE_GRACE_MS,
  ROOM_TTL_MS,
  selectNextPerformerSeat,
  type ChitDoc,
  type DeckChit,
  type Phase,
  type PlayerDoc,
  type PresenceNode,
  type PromptKind,
  type SpinCandidate,
} from '@vowlet/shared';
import { getStarterDeckForPacks } from './starterDeck.js';
import { ArbiterError, type ArbiterTransaction, type RoomRecord } from './store.js';
import { toMillis } from './time.js';

export function assertExpectedState(
  room: RoomRecord,
  expectedPhase: Phase,
  expectedVersion: number,
): void {
  if (room.phase !== expectedPhase || room.turnVersion !== expectedVersion) {
    throw new ArbiterError(
      409,
      'VERSION_MISMATCH',
      `Expected phase ${expectedPhase} v${expectedVersion}, got ${room.phase} v${room.turnVersion}`,
      { phase: room.phase, turnVersion: room.turnVersion },
    );
  }
}

export async function requireRoom(
  tx: ArbiterTransaction,
  code: string,
  allowClosed = false,
): Promise<RoomRecord> {
  const room = await tx.getRoom(code);
  if (!room) {
    throw new ArbiterError(404, 'NOT_FOUND', `Room ${code} not found`);
  }
  if (!allowClosed && room.phase === 'CLOSED') {
    throw new ArbiterError(410, 'ROOM_CLOSED', `Room ${code} is closed`);
  }
  return room;
}

export function isPlayerPresent(
  uid: string,
  presenceMap: Record<string, PresenceNode>,
  nowMs: number,
): boolean {
  const node = presenceMap[uid];
  if (!node) {
    // In memory mode or before RTDB node is written, newly joined players are treated as online.
    return true;
  }
  if (node.online) {
    return true;
  }
  return nowMs - node.lastSeen <= PRESENCE_GRACE_MS;
}

export function getPresentActivePlayers(
  players: readonly PlayerDoc[],
  presenceMap: Record<string, PresenceNode>,
  nowMs: number,
): PlayerDoc[] {
  return players.filter(
    (p) => !p.banned && !p.spectator && isPlayerPresent(p.uid, presenceMap, nowMs),
  );
}

export function electHostUid(
  players: readonly PlayerDoc[],
  presenceMap: Record<string, PresenceNode>,
  nowMs: number,
): string | null {
  const present = getPresentActivePlayers(players, presenceMap, nowMs);
  const pool =
    present.length > 0 ? present : players.filter((p) => !p.banned && !p.spectator);
  if (pool.length === 0) {
    return null;
  }
  const sorted = [...pool].sort((a, b) => {
    const aMs = toMillis(a.joinedAt) ?? 0;
    const bMs = toMillis(b.joinedAt) ?? 0;
    if (aMs !== bMs) return aMs - bMs;
    return a.seat - b.seat;
  });
  return sorted[0]?.uid ?? null;
}

export function refreshRoomTimestamps(room: RoomRecord, nowMs: number): RoomRecord {
  return {
    ...room,
    updatedAt: nowMs,
    expiresAt: nowMs + ROOM_TTL_MS,
  };
}

export function buildStarterDeckChits(packIds: readonly string[]): {
  chits: ChitDoc[];
  secrets: Record<string, { text: string; authorUid: string; verdict: 'FINE'; normalizedHash: string }>;
} {
  const prompts = getStarterDeckForPacks(packIds);
  const chits: ChitDoc[] = [];
  const secrets: Record<
    string,
    { text: string; authorUid: string; verdict: 'FINE'; normalizedHash: string }
  > = {};

  for (const p of prompts) {
    chits.push({
      id: p.id,
      kind: p.kind,
      tier: p.tier,
      dareType: p.dareType,
      status: 'SEALED',
      judgeVerdict: 'FINE',
      owlReason: 'Curated starter deck prompt.',
    });
    secrets[p.id] = {
      text: p.text,
      authorUid: 'SYSTEM',
      verdict: 'FINE',
      normalizedHash: fnv1aHash(p.text),
    };
  }

  return { chits, secrets };
}

export async function ensureStarterChitsLoaded(
  tx: ArbiterTransaction,
  code: string,
  packIds: readonly string[],
): Promise<ChitDoc[]> {
  const existing = await tx.getChits(code);
  if (existing.length > 0) {
    return existing;
  }

  const { chits, secrets } = buildStarterDeckChits(packIds);
  for (const c of chits) {
    tx.setChit(code, c);
  }
  for (const [id, secret] of Object.entries(secrets)) {
    tx.setSecret(code, id, secret);
  }
  return chits;
}

export async function drawAndSealPrompt(
  tx: ArbiterTransaction,
  code: string,
  kind: PromptKind,
  performerUid: string,
  turnVersion: number,
  packIds: readonly string[],
  excludeChitId?: string | null,
): Promise<DeckChit> {
  const existingChits = await ensureStarterChitsLoaded(tx, code, packIds);
  const { chits: starterDeckChits, secrets: starterSecrets } = buildStarterDeckChits(packIds);

  const pool: DeckChit[] = existingChits.map((c) => ({
    id: c.id,
    kind: c.kind,
    tier: c.tier,
    dareType: c.dareType,
    status: c.status,
  }));

  const { drawn, updatedPool } = drawChit(pool, kind, starterDeckChits, excludeChitId);
  if (!drawn) {
    throw new ArbiterError(500, 'NO_CHIT_AVAILABLE', `No ${kind} prompts available`);
  }

  // Persist any newly refilled chits and their secrets
  const existingMap = new Map(existingChits.map((c) => [c.id, c]));
  const starterSecretByBase = new Map(Object.entries(starterSecrets));

  for (const item of updatedPool) {
    const prev = existingMap.get(item.id);
    if (!prev) {
      tx.setChit(code, {
        id: item.id,
        kind: item.kind,
        tier: item.tier,
        dareType: item.dareType,
        status: item.status,
        judgeVerdict: 'FINE',
        owlReason: 'Starter deck refill.',
      });
      const baseId = item.id.split('_refill_')[0] ?? item.id;
      const secret = starterSecretByBase.get(baseId);
      if (secret) {
        tx.setSecret(code, item.id, secret);
      }
    } else if (prev.status !== item.status) {
      tx.setChit(code, { ...prev, status: item.status });
    }
  }

  // Resolve prompt text from secret/{drawn.id} or starter fallback
  const existingSecret = await tx.getSecret(code, drawn.id);
  const baseId = drawn.id.split('_refill_')[0] ?? drawn.id;
  const fallbackSecret = starterSecretByBase.get(baseId);
  const promptText =
    existingSecret?.text ?? fallbackSecret?.text ?? 'Share a fun story from this week.';

  tx.setPrivatePrompt(code, performerUid, {
    chitId: drawn.id,
    text: promptText,
    kind: drawn.kind,
    tier: drawn.tier,
    dareType: drawn.dareType,
    turnVersion,
  });

  return drawn;
}

export function pickPerformerFromPlayers(
  players: readonly PlayerDoc[],
  presenceMap: Record<string, PresenceNode>,
  nowMs: number,
  lastPerformerUid: string | null,
): { uid: string; seat: number } {
  const candidates: SpinCandidate[] = players.map((p) => ({
    uid: p.uid,
    seat: p.seat,
    online: isPlayerPresent(p.uid, presenceMap, nowMs),
    away: presenceMap[p.uid]?.away ?? false,
    banned: p.banned,
    spectator: p.spectator,
    turnsTaken: p.turnsTaken,
  }));

  const selected = selectNextPerformerSeat(candidates, lastPerformerUid);
  if (!selected) {
    throw new ArbiterError(409, 'NOT_ENOUGH_PLAYERS', 'No eligible performer available');
  }
  return selected;
}
