import type { VercelRequest, VercelResponse } from '@vercel/node';
import { TurnChooseSchema } from '@vowlet/shared';
import { withArbiterAuth } from '../_lib/middleware.js';
import {
  assertExpectedState,
  drawAndSealPrompt,
  refreshRoomTimestamps,
  requireRoom,
} from '../_lib/roomHelpers.js';
import { ArbiterError } from '../_lib/store.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await withArbiterAuth(req, res, TurnChooseSchema, async ({ uid, body, store }) => {
    const result = await store.runTransaction(async (tx) => {
      const nowMs = tx.now();
      const room = await requireRoom(tx, body.roomCode);

      assertExpectedState(room, body.expectedPhase, body.expectedVersion);

      const turn = await tx.getTurn(body.roomCode);
      if (!turn || turn.phase !== 'CHOOSE') {
        throw new ArbiterError(409, 'VERSION_MISMATCH', 'No active CHOOSE turn', {
          phase: room.phase,
          turnVersion: room.turnVersion,
        });
      }

      if (turn.performerUid !== uid) {
        throw new ArbiterError(403, 'FORBIDDEN', 'Only the active performer can choose');
      }

      const nextVersion = room.turnVersion + 1;
      const drawn = await drawAndSealPrompt(
        tx,
        body.roomCode,
        body.choice,
        uid,
        nextVersion,
        room.settings.packIds,
      );

      tx.setTurn(body.roomCode, {
        ...turn,
        turnVersion: nextVersion,
        phase: 'PERFORM',
        choice: body.choice,
        kind: drawn.kind,
        dareType: drawn.dareType,
        chitId: drawn.id,
        startedAt: nowMs,
        deadlineAt: null,
        stallVotes: [],
        stalled: false,
      });

      tx.setRoom(
        body.roomCode,
        refreshRoomTimestamps(
          {
            ...room,
            phase: 'PERFORM',
            turnVersion: nextVersion,
          },
          nowMs,
        ),
      );

      return {
        ok: true,
        phase: 'PERFORM' as const,
        turnVersion: nextVersion,
        startedAt: nowMs,
      };
    });

    return { status: 200, body: result };
  });
}
