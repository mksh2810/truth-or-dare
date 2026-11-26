import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isStalled, TurnPerformActionSchema } from '@vowlet/shared';
import { withArbiterAuth } from '../../_lib/middleware.js';
import {
  assertExpectedState,
  getPresentActivePlayers,
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

      if (turn.performerUid === uid) {
        throw new ArbiterError(403, 'FORBIDDEN', 'Performer cannot vote to stall their own turn');
      }

      const players = await tx.getPlayers(body.roomCode);
      const presence = await tx.getPresence(body.roomCode);
      const presentPlayers = getPresentActivePlayers(players, presence, nowMs);
      const witnesses = presentPlayers.filter((p) => p.uid !== turn.performerUid);

      if (!witnesses.some((w) => w.uid === uid)) {
        throw new ArbiterError(403, 'FORBIDDEN', 'Only present witnesses can vote to stall');
      }

      const stallVotes = turn.stallVotes.includes(uid)
        ? [...turn.stallVotes]
        : [...turn.stallVotes, uid];

      const stalled = isStalled(stallVotes.length, witnesses.length);
      const nextVersion = room.turnVersion + 1;
      const threshold = Math.floor(witnesses.length / 2) + 1;

      if (stalled) {
        const existingVotes = await tx.getVotes(body.roomCode);
        for (const v of existingVotes) {
          tx.deleteVote(body.roomCode, v.uid);
        }

        const deadlineAt = nowMs + room.settings.voteDeadlineSec * 1000;
        tx.setTurn(body.roomCode, {
          ...turn,
          turnVersion: nextVersion,
          phase: 'VOTE',
          stallVotes,
          stalled: true,
          resultStamp: 'STALLED',
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
          stallCount: stallVotes.length,
          threshold,
        };
      }

      tx.setTurn(body.roomCode, {
        ...turn,
        turnVersion: nextVersion,
        stallVotes,
      });

      tx.setRoom(
        body.roomCode,
        refreshRoomTimestamps(
          {
            ...room,
            turnVersion: nextVersion,
          },
          nowMs,
        ),
      );

      return {
        ok: true,
        phase: 'PERFORM' as const,
        turnVersion: nextVersion,
        stallCount: stallVotes.length,
        threshold,
      };
    });

    return { status: 200, body: result };
  });
}
