import type { PresenceNode, Timestamp } from './types.js';

/**
 * Grace window (in milliseconds) after RTDB `onDisconnect` sets `online: false`
 * before a player is treated as offline.
 */
export const PRESENCE_GRACE_MS = 25_000 as const;

export const MIN_ACTIVE_PLAYERS = 3 as const;

export interface PresencePlayer {
  uid: string;
  joinedAt: Timestamp;
  banned?: boolean;
  spectator?: boolean;
}

export type PresenceMap = Record<string, PresenceNode | null | undefined>;

function toMillis(ts: Timestamp): number {
  return typeof ts === 'number' ? ts : ts.toMillis();
}

/**
 * Determines whether a player is currently considered present.
 * A player is present if:
 * - `online === true`, OR
 * - `away === true` (tab backgrounded / share-sheet, not offline), OR
 * - `lastSeen` is within the 25-second (`PRESENCE_GRACE_MS`) grace window.
 */
export function isPlayerPresent(
  presence: PresenceNode | null | undefined,
  nowMs: number,
): boolean {
  if (!presence) {
    return false;
  }

  if (presence.online === true || presence.away === true) {
    return true;
  }

  if (
    typeof presence.lastSeen !== 'number' ||
    !Number.isFinite(presence.lastSeen) ||
    typeof nowMs !== 'number' ||
    !Number.isFinite(nowMs)
  ) {
    return false;
  }

  return nowMs - presence.lastSeen <= PRESENCE_GRACE_MS;
}

function getEligiblePresentPlayers<T extends PresencePlayer>(
  players: readonly T[],
  presence: PresenceMap,
  nowMs: number,
): T[] {
  return players.filter(
    (player) =>
      !player.banned &&
      !player.spectator &&
      isPlayerPresent(presence[player.uid], nowMs),
  );
}

/**
 * Deterministically elects the room host as the player with the earliest `joinedAt`
 * among present, non-banned, non-spectator players.
 * Ties in `joinedAt` are broken lexicographically by `uid`.
 */
export function electDeterministicHost<T extends PresencePlayer>(
  players: readonly T[],
  presence: PresenceMap,
  nowMs: number,
): T | null {
  const candidates = getEligiblePresentPlayers(players, presence, nowMs);
  if (candidates.length === 0) {
    return null;
  }

  const sorted = [...candidates].sort((a, b) => {
    const timeDiff = toMillis(a.joinedAt) - toMillis(b.joinedAt);
    if (timeDiff !== 0) {
      return timeDiff;
    }
    return a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0;
  });

  return sorted[0] as T;
}

/**
 * Returns true when fewer than 3 active (non-banned, non-spectator) players are present,
 * triggering the 60s low-player pause before room closure.
 */
export function shouldPauseForLowPlayers(
  players: readonly PresencePlayer[],
  presence: PresenceMap,
  nowMs: number,
): boolean {
  return getEligiblePresentPlayers(players, presence, nowMs).length < MIN_ACTIVE_PLAYERS;
}
