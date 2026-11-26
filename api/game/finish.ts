import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import {
  calculateLevel,
  IdempotencyKeySchema,
  RoomCodeSchema,
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

export interface PlayerAward {
  xpGained: number;
  newLifetimeXp: number;
  newLevel: number;
  unlockedSkins: string[];
}

function computeUnlockedSkins(level: number, existingSkins: readonly string[]): string[] {
  const skins = new Set(existingSkins);
  skins.add('owl-classic');
  if (level >= 2) skins.add('brass-bottle');
  if (level >= 3) skins.add('velvet-owl');
  if (level >= 5) skins.add('midnight-amber');
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

      const xpByUid = new Map<string, number>();
      for (const p of players) {
        if (!p.banned && !p.spectator) {
          xpByUid.set(p.uid, 0);
        }
      }

      for (const rec of pendingRecords) {
        const delta = Math.max(0, rec.lifetimeXpDelta);
        xpByUid.set(rec.performerUid, (xpByUid.get(rec.performerUid) ?? 0) + delta);
        alreadyAwarded.add(rec.turnVersion);
      }

      const awards: Record<string, PlayerAward> = {};
      for (const [playerUid, xpGained] of xpByUid.entries()) {
        const existingUser = await tx.getUser(playerUid);
        const prevXp = existingUser?.lifetimeXp ?? 0;
        const newLifetimeXp = prevXp + Math.max(0, xpGained);
        const newLevel = calculateLevel(newLifetimeXp);
        const unlockedSkins = computeUnlockedSkins(newLevel, existingUser?.skins ?? []);

        tx.setUser(playerUid, {
          uid: playerUid,
          lifetimeXp: newLifetimeXp,
          level: newLevel,
          skins: unlockedSkins,
          optIns: existingUser?.optIns ?? { communityDeck: false, analytics: true },
          updatedAt: nowMs,
        });

        awards[playerUid] = {
          xpGained,
          newLifetimeXp,
          newLevel,
          unlockedSkins,
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
