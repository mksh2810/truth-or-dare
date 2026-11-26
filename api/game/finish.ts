import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import {
  calculateLevel,
  IdempotencyKeySchema,
  RoomCodeSchema,
  type UserDoc,
} from '@vowlet/shared';
import { withArbiterAuth } from '../_lib/middleware.js';
import {
  assertExpectedState,
  refreshRoomTimestamps,
  requireRoom,
} from '../_lib/roomHelpers.js';
import { ArbiterError } from '../_lib/store.js';

const GameFinishSchema = z.object({
  roomCode: RoomCodeSchema,
  expectedPhase: z.enum(['SUMMARY', 'PODIUM']),
  expectedVersion: z.number().int().nonnegative(),
  idempotencyKey: IdempotencyKeySchema,
});

export interface TableHistoryEntry {
  roomCode: string;
  finishedAt: number;
  roundsPlayed: number;
  sessionScore: number;
  xpGained: number;
  rank: number;
  playerCount: number;
}

export type UserDocWithHistory = UserDoc & {
  tableHistory?: TableHistoryEntry[];
};

export interface PlayerAward {
  xpGained: number;
  newLifetimeXp: number;
  newLevel: number;
  unlockedSkins: string[];
  tableHistory: TableHistoryEntry[];
}

export const BOTTLE_SKIN_MILESTONES: ReadonlyArray<{ level: number; skin: string }> = [
  { level: 1, skin: 'amber' },
  { level: 2, skin: 'brass' },
  { level: 3, skin: 'emerald' },
  { level: 5, skin: 'crimson' },
];

export function computeUnlockedSkins(level: number, existingSkins: readonly string[]): string[] {
  const skins = new Set(existingSkins);
  for (const milestone of BOTTLE_SKIN_MILESTONES) {
    if (level >= milestone.level) {
      skins.add(milestone.skin);
    }
  }
  return Array.from(skins);
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await withArbiterAuth(req, res, GameFinishSchema, async ({ uid, body, store }) => {
    const result = await store.runTransaction(async (tx) => {
      const nowMs = tx.now();
      const room = await requireRoom(tx, body.roomCode);

      assertExpectedState(room, body.expectedPhase, body.expectedVersion);

      const players = await tx.getPlayers(body.roomCode);
      if (!players.some((p) => p.uid === uid && !p.banned)) {
        throw new ArbiterError(403, 'FORBIDDEN', 'Only room members can finalize game awards');
      }

      const records = await tx.getTurnRecords(body.roomCode);
      const alreadyAwarded = new Set(room.awardedTurnVersions ?? []);
      const pendingRecords = records.filter((r) => !alreadyAwarded.has(r.turnVersion));

      const activePlayers = players
        .filter((p) => !p.banned && !p.spectator)
        .sort((a, b) => b.sessionScore - a.sessionScore || a.seat - b.seat);

      const rankByUid = new Map<string, number>();
      activePlayers.forEach((p, idx) => {
        rankByUid.set(p.uid, idx + 1);
      });

      const xpByUid = new Map<string, number>();
      for (const p of activePlayers) {
        xpByUid.set(p.uid, 0);
      }

      for (const rec of pendingRecords) {
        const delta = Math.max(0, rec.lifetimeXpDelta);
        xpByUid.set(rec.performerUid, (xpByUid.get(rec.performerUid) ?? 0) + delta);
        alreadyAwarded.add(rec.turnVersion);
      }

      const playerByUid = new Map(activePlayers.map((p) => [p.uid, p]));
      const awards: Record<string, PlayerAward> = {};
      const roomCreatedAtMs = typeof room.createdAt === 'number' ? room.createdAt : 0;

      for (const [playerUid, xpGained] of xpByUid.entries()) {
        const existingUser = (await tx.getUser(playerUid)) as UserDocWithHistory | null;
        const prevXp = Math.max(0, existingUser?.lifetimeXp ?? 0);
        const safeGain = Math.max(0, xpGained);
        const newLifetimeXp = Math.max(prevXp, prevXp + safeGain);
        const newLevel = calculateLevel(newLifetimeXp);
        const unlockedSkins = computeUnlockedSkins(newLevel, existingUser?.skins ?? []);

        const prevHistory = Array.isArray(existingUser?.tableHistory)
          ? existingUser.tableHistory
          : [];
        const player = playerByUid.get(playerUid);
        const existingIdx = prevHistory.findIndex(
          (entry) => entry.roomCode === body.roomCode && entry.finishedAt >= roomCreatedAtMs,
        );

        let nextHistory: TableHistoryEntry[];
        if (existingIdx >= 0) {
          nextHistory = prevHistory.map((entry, idx) =>
            idx === existingIdx
              ? {
                  ...entry,
                  finishedAt: nowMs,
                  roundsPlayed: room.round,
                  sessionScore: player?.sessionScore ?? entry.sessionScore,
                  xpGained: entry.xpGained + safeGain,
                  rank: rankByUid.get(playerUid) ?? entry.rank,
                  playerCount: activePlayers.length,
                }
              : entry,
          );
        } else {
          const newEntry: TableHistoryEntry = {
            roomCode: body.roomCode,
            finishedAt: nowMs,
            roundsPlayed: room.round,
            sessionScore: player?.sessionScore ?? 0,
            xpGained: safeGain,
            rank: rankByUid.get(playerUid) ?? activePlayers.length,
            playerCount: activePlayers.length,
          };
          nextHistory = [newEntry, ...prevHistory].slice(0, 20);
        }

        const updatedUser: UserDocWithHistory = {
          uid: playerUid,
          lifetimeXp: newLifetimeXp,
          level: newLevel,
          skins: unlockedSkins,
          optIns: existingUser?.optIns ?? { communityDeck: false, analytics: true },
          tableHistory: nextHistory,
          updatedAt: nowMs,
        };

        tx.setUser(playerUid, updatedUser);

        awards[playerUid] = {
          xpGained: safeGain,
          newLifetimeXp,
          newLevel,
          unlockedSkins,
          tableHistory: nextHistory,
        };
      }

      const nextVersion = room.turnVersion + 1;
      tx.setRoom(
        body.roomCode,
        refreshRoomTimestamps(
          {
            ...room,
            turnVersion: nextVersion,
            awardedTurnVersions: Array.from(alreadyAwarded),
          },
          nowMs,
        ),
      );

      return {
        ok: true,
        turnVersion: nextVersion,
        awards,
      };
    });

    return { status: 200, body: result };
  });
}
