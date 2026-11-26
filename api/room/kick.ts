import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { KickPlayerSchema, PHASE_DURATIONS_MS, PhaseSchema } from '@vowlet/shared';
import { withArbiterAuth } from '../_lib/middleware.js';
import {
  assertExpectedState,
  refreshRoomTimestamps,
  requireRoom,
} from '../_lib/roomHelpers.js';
import { pickOwlLine } from '../_lib/starterDeck.js';
import { ArbiterError } from '../_lib/store.js';

const KickRequestSchema = KickPlayerSchema.extend({
  expectedPhase: PhaseSchema.optional(),
  expectedVersion: z.number().int().nonnegative().optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await withArbiterAuth(req, res, KickRequestSchema, async ({ uid, body, store }) => {
    const result = await store.runTransaction(async (tx) => {
      const nowMs = tx.now();
      const room = await requireRoom(tx, body.roomCode);

      if (body.expectedPhase !== undefined && body.expectedVersion !== undefined) {
        assertExpectedState(room, body.expectedPhase, body.expectedVersion);
      }

      if (room.hostUid !== uid) {
        throw new ArbiterError(403, 'FORBIDDEN', 'Only the host can kick players');
      }

      if (body.targetUid === uid) {
        throw new ArbiterError(400, 'VALIDATION_ERROR', 'Host cannot kick themselves');
      }

      const players = await tx.getPlayers(body.roomCode);
      const target = players.find((p) => p.uid === body.targetUid);
      if (!target) {
        throw new ArbiterError(404, 'NOT_FOUND', 'Target player not found in room');
      }

      const turn = await tx.getTurn(body.roomCode);
      const votes = await tx.getVotes(body.roomCode);

      tx.setPlayer(body.roomCode, body.targetUid, {
        ...target,
        banned: true,
        ready: false,
      });

      if (votes.some((v) => v.uid === body.targetUid)) {
        tx.deleteVote(body.roomCode, body.targetUid);
      }

      let nextPhase = room.phase;
      const nextVersion = room.turnVersion + 1;
      let updatedTurn = turn;

      if (
        room.phase === 'PERFORM' &&
        updatedTurn &&
        updatedTurn.performerUid === body.targetUid
      ) {
        nextPhase = 'RESULT';
        updatedTurn = {
          ...updatedTurn,
          turnVersion: nextVersion,
          phase: 'RESULT',
          resultStamp: 'SKIPPED',
          sessionScoreDelta: 0,
          deadlineAt: nowMs + PHASE_DURATIONS_MS.RESULT,
          owlLine: pickOwlLine('SKIPPED', nextVersion),
        };
      }

      if (updatedTurn) {
        tx.setTurn(body.roomCode, { ...updatedTurn, turnVersion: nextVersion });
      }

      tx.setRoom(
        body.roomCode,
        refreshRoomTimestamps(
          {
            ...room,
            phase: nextPhase,
            turnVersion: nextVersion,
          },
          nowMs,
        ),
      );

      return {
        ok: true,
        turnVersion: nextVersion,
      };
    });

    return { status: 200, body: result };
  });
}
