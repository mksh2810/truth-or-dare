import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import {
  IdempotencyKeySchema,
  RoomCodeSchema,
  VoteVerdictSchema,
} from '@vowlet/shared';
import { withArbiterAuth } from '../_lib/middleware.js';
import {
  assertExpectedState,
  getPresentActivePlayers,
  requireRoom,
} from '../_lib/roomHelpers.js';
import { ArbiterError } from '../_lib/store.js';

const TurnVoteSchema = z.object({
  roomCode: RoomCodeSchema,
  expectedPhase: z.literal('VOTE'),
  expectedVersion: z.number().int().nonnegative(),
  verdict: VoteVerdictSchema,
  idempotencyKey: IdempotencyKeySchema,
});

/**
 * Records a witness's APPROVE/REJECT vote during the VOTE phase.
 * Used in local-API mode (and optionally by any client) instead of direct Firestore writes.
 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await withArbiterAuth(req, res, TurnVoteSchema, async ({ uid, body, store }) => {
    const result = await store.runTransaction(async (tx) => {
      const nowMs = tx.now();
      const room = await requireRoom(tx, body.roomCode);

      assertExpectedState(room, body.expectedPhase, body.expectedVersion);

      const turn = await tx.getTurn(body.roomCode);
      if (!turn || turn.phase !== 'VOTE') {
        throw new ArbiterError(409, 'VERSION_MISMATCH', 'No active VOTE turn', {
          phase: room.phase,
          turnVersion: room.turnVersion,
        });
      }

      if (turn.performerUid === uid) {
        throw new ArbiterError(403, 'FORBIDDEN', 'Performer cannot vote on their own turn');
      }

      const players = await tx.getPlayers(body.roomCode);
      const presence = await tx.getPresence(body.roomCode);
      const presentPlayers = getPresentActivePlayers(players, presence, nowMs);
      const witnesses = presentPlayers.filter((p) => p.uid !== turn.performerUid);

      if (!witnesses.some((w) => w.uid === uid)) {
        throw new ArbiterError(403, 'FORBIDDEN', 'Only present witnesses can vote');
      }

      const existingVotes = await tx.getVotes(body.roomCode);

      tx.setVote(body.roomCode, uid, {
        uid,
        verdict: body.verdict,
        turnVersion: turn.turnVersion,
        createdAt: nowMs,
      });

      const witnessUids = new Set(witnesses.map((w) => w.uid));
      const votedUids = new Set(
        existingVotes
          .filter((v) => v.turnVersion === turn.turnVersion && witnessUids.has(v.uid))
          .map((v) => v.uid),
      );
      votedUids.add(uid);

      const voteCount = votedUids.size;
      const allVoted = witnesses.length > 0 && voteCount >= witnesses.length;

      return {
        ok: true,
        phase: 'VOTE' as const,
        turnVersion: room.turnVersion,
        voteCount,
        allVoted,
      };
    });

    return { status: 200, body: result };
  });
}
