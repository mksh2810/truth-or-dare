import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  calculateTurnSessionDelta,
  PHASE_DURATIONS_MS,
  TurnPerformActionSchema,
} from '@vowlet/shared';
import { withArbiterAuth } from '../../_lib/middleware.js';
import {
  assertExpectedState,
  refreshRoomTimestamps,
  requireRoom,
} from '../../_lib/roomHelpers.js';
import { pickOwlLine } from '../../_lib/starterDeck.js';
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
        throw new ArbiterError(403, 'FORBIDDEN', 'Only the active performer can skip');
      }

      const players = await tx.getPlayers(body.roomCode);
      const performer = players.find((p) => p.uid === uid && !p.banned);
      if (!performer) {
        throw new ArbiterError(404, 'NOT_FOUND', 'Performer not found');
      }

      const { sessionDelta, nextStreak } = calculateTurnSessionDelta('SKIPPED', performer.streak);
      const nextVersion = room.turnVersion + 1;
      const deadlineAt = nowMs + PHASE_DURATIONS_MS.RESULT;
      const owlLine = pickOwlLine('SKIPPED', nextVersion);

      tx.setPlayer(body.roomCode, uid, {
        ...performer,
        sessionScore: performer.sessionScore + sessionDelta,
        streak: nextStreak,
        turnsTaken: performer.turnsTaken + 1,
      });

      tx.addTurnRecord(body.roomCode, {
        turnVersion: nextVersion,
        round: room.round,
        performerUid: uid,
        resultStamp: 'SKIPPED',
        streakAtTurn: performer.streak,
        lifetimeXpDelta: 0,
      });

      tx.setTurn(body.roomCode, {
        ...turn,
        turnVersion: nextVersion,
        phase: 'RESULT',
        resultStamp: 'SKIPPED',
        sessionScoreDelta: sessionDelta,
        deadlineAt,
        owlLine,
      });

      tx.setRoom(
        body.roomCode,
        refreshRoomTimestamps(
          {
            ...room,
            phase: 'RESULT',
            turnVersion: nextVersion,
          },
          nowMs,
        ),
      );

      return {
        ok: true,
        phase: 'RESULT' as const,
        turnVersion: nextVersion,
        resultStamp: 'SKIPPED' as const,
        sessionScoreDelta: sessionDelta,
      };
    });

    return { status: 200, body: result };
  });
}
