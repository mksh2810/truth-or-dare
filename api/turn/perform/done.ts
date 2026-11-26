import type { VercelRequest, VercelResponse } from '@vercel/node';
import { TurnPerformActionSchema } from '@vowlet/shared';
import { withArbiterAuth } from '../../_lib/middleware.js';
import {
  assertExpectedState,
  refreshRoomTimestamps,
  requireRoom,
} from '../../_lib/roomHelpers.js';
import { ArbiterError } from '../../_lib/store.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await withArbiterAuth(req, res, TurnPerformActionSchema, async ({ uid, body, store }) => {
    const result = await store.runTransaction(async (tx) => {
      const nowMs = tx.now();
      const room = await requireRoom(tx, body.roomCode);

      assertExpectedState(room, body.expectedPhase, body.expectedVersion);

      const turn = await tx.getTurn(body.roomCode);
      if (!turn || turn.phase !== 'PERFORM') {
        throw new ArbiterError(409, 'VERSION_MISMATCH', 'No active PERFORM turn', {
          phase: room.phase,
          turnVersion: room.turnVersion,
        });
      }

      if (turn.performerUid !== uid) {
        throw new ArbiterError(403, 'FORBIDDEN', 'Only the active performer can mark Done');
      }

      // Clear any stale votes from previous turns
      const existingVotes = await tx.getVotes(body.roomCode);
      for (const v of existingVotes) {
        tx.deleteVote(body.roomCode, v.uid);
      }

      const nextVersion = room.turnVersion + 1;
      const deadlineAt = nowMs + room.settings.voteDeadlineSec * 1000;

      tx.setTurn(body.roomCode, {
        ...turn,
        turnVersion: nextVersion,
        phase: 'VOTE',
        deadlineAt,
      });

      tx.setRoom(
        body.roomCode,
        refreshRoomTimestamps(
          {
            ...room,
            phase: 'VOTE',
            turnVersion: nextVersion,
          },
          nowMs,
        ),
      );

      return {
        ok: true,
        phase: 'VOTE' as const,
        turnVersion: nextVersion,
        deadlineAt,
      };
    });

    return { status: 200, body: result };
  });
}
