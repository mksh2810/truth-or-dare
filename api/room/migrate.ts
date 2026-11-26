import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import {
  IdempotencyKeySchema,
  PhaseSchema,
  RoomCodeSchema,
} from '@vowlet/shared';
import {
  electDeterministicHost,
  isPlayerPresent as isSharedPlayerPresent,
} from '../../packages/shared/src/presence.js';
import { withArbiterAuth } from '../_lib/middleware.js';
import { assertExpectedState, refreshRoomTimestamps, requireRoom } from '../_lib/roomHelpers.js';
import { ArbiterError } from '../_lib/store.js';

const MigrateHostSchema = z.object({
  roomCode: RoomCodeSchema,
  expectedPhase: PhaseSchema,
  expectedVersion: z.number().int().nonnegative(),
  idempotencyKey: IdempotencyKeySchema,
});

/**
 * Deterministic host migration (D5):
 * - Enforces expectedPhase + expectedVersion (409 VERSION_MISMATCH on stale state).
 * - If the current host is still present and eligible, keeps them as host
 *   (ensuring a returning old host stays demoted).
 * - Otherwise elects the earliest `joinedAt` among present, non-banned, non-spectator
 *   players via `electDeterministicHost`.
 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await withArbiterAuth(req, res, MigrateHostSchema, async ({ uid, body, store }) => {
    const result = await store.runTransaction(async (tx) => {
      const nowMs = tx.now();
      const room = await requireRoom(tx, body.roomCode);
      assertExpectedState(room, body.expectedPhase, body.expectedVersion);

      const players = await tx.getPlayers(body.roomCode);
      const caller = players.find((p) => p.uid === uid);
      if (!caller || caller.banned) {
        throw new ArbiterError(
          403,
          'FORBIDDEN',
          'Only active room members can trigger host migration',
        );
      }

      const presence = await tx.getPresence(body.roomCode);
      const currentHost = players.find((p) => p.uid === room.hostUid);
      const currentHostEligible = Boolean(
        currentHost &&
          !currentHost.banned &&
          !currentHost.spectator &&
          isSharedPlayerPresent(presence[currentHost.uid], nowMs),
      );

      if (currentHostEligible) {
        return {
          ok: true,
          migrated: false,
          hostUid: room.hostUid,
          previousHostUid: room.hostUid,
          demotedHostUid: null,
          phase: room.phase,
          turnVersion: room.turnVersion,
        };
      }

      const elected = electDeterministicHost(players, presence, nowMs);
      if (!elected) {
        throw new ArbiterError(
          409,
          'NO_ELIGIBLE_HOST',
          'No present non-banned player is available to host',
          { phase: room.phase, turnVersion: room.turnVersion },
        );
      }

      if (elected.uid === room.hostUid) {
        return {
          ok: true,
          migrated: false,
          hostUid: room.hostUid,
          previousHostUid: room.hostUid,
          demotedHostUid: null,
          phase: room.phase,
          turnVersion: room.turnVersion,
        };
      }

      const previousHostUid = room.hostUid;
      const nextVersion = room.turnVersion + 1;
      const turn = await tx.getTurn(body.roomCode);
      if (turn) {
        tx.setTurn(body.roomCode, { ...turn, turnVersion: nextVersion });
      }

      tx.setRoom(
        body.roomCode,
        refreshRoomTimestamps(
          {
            ...room,
            hostUid: elected.uid,
            turnVersion: nextVersion,
          },
          nowMs,
        ),
      );

      return {
        ok: true,
        migrated: true,
        hostUid: elected.uid,
        previousHostUid,
        demotedHostUid: previousHostUid,
        phase: room.phase,
        turnVersion: nextVersion,
      };
    });

    return { status: 200, body: result };
  });
}
