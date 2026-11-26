import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  canTransition,
  PHASE_DURATIONS_MS,
  StartGameSchema,
} from '@vowlet/shared';
import { withArbiterAuth } from '../_lib/middleware.js';
import {
  assertExpectedState,
  ensureStarterChitsLoaded,
  getPresentActivePlayers,
  pickPerformerFromPlayers,
  refreshRoomTimestamps,
  requireRoom,
} from '../_lib/roomHelpers.js';
import { ArbiterError } from '../_lib/store.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await withArbiterAuth(req, res, StartGameSchema, async ({ uid, body, store }) => {
    const result = await store.runTransaction(async (tx) => {
      const nowMs = tx.now();
      const room = await requireRoom(tx, body.roomCode);

      assertExpectedState(room, body.expectedPhase, body.expectedVersion);

      if (room.hostUid !== uid) {
        throw new ArbiterError(403, 'FORBIDDEN', 'Only the host can start the game');
      }

      if (room.phase !== 'LOBBY' && room.phase !== 'PODIUM') {
        throw new ArbiterError(
          409,
          'VERSION_MISMATCH',
          `Cannot start game from phase ${room.phase}`,
          { phase: room.phase, turnVersion: room.turnVersion },
        );
      }

      const players = await tx.getPlayers(body.roomCode);
      const presence = await tx.getPresence(body.roomCode);
      const presentPlayers = getPresentActivePlayers(players, presence, nowMs);

      if (presentPlayers.length < 3) {
        throw new ArbiterError(
          409,
          'NOT_ENOUGH_PLAYERS',
          'At least 3 present players are required to start',
        );
      }

      // If rematching from PODIUM, reset session state
      if (room.phase === 'PODIUM') {
        for (const p of players) {
          if (!p.banned) {
            tx.setPlayer(body.roomCode, p.uid, {
              ...p,
              sessionScore: 0,
              streak: 0,
              turnsTaken: 0,
              swapUsed: false,
              ready: false,
            });
          }
        }
      }

      // Load curated starter deck into room chits/secret
      await ensureStarterChitsLoaded(tx, body.roomCode, room.settings.packIds);

      const nextVersion = room.turnVersion + 1;

      if (room.phase === 'PODIUM') {
        // PODIUM -> LOBBY rematch reset
        if (!canTransition('PODIUM', 'LOBBY', { presentPlayers: presentPlayers.length })) {
          throw new ArbiterError(409, 'INVALID_TRANSITION', 'Cannot rematch from PODIUM');
        }
        tx.setTurn(body.roomCode, null);
        tx.setRoom(
          body.roomCode,
          refreshRoomTimestamps(
            {
              ...room,
              phase: 'LOBBY',
              round: 0,
              turnVersion: nextVersion,
              awardedTurnVersions: [],
              lowPlayerSince: null,
            },
            nowMs,
          ),
        );
        return {
          ok: true,
          phase: 'LOBBY' as const,
          turnVersion: nextVersion,
          deadlineAt: null,
        };
      }

      // LOBBY -> WRITING or SPIN (Quick Play)
      if (room.settings.quickPlay) {
        const performer = pickPerformerFromPlayers(players, presence, nowMs, null);
        const deadlineAt = nowMs + PHASE_DURATIONS_MS.SPIN;

        tx.setTurn(body.roomCode, {
          turnVersion: nextVersion,
          round: 1,
          performerUid: performer.uid,
          performerSeat: performer.seat,
          phase: 'SPIN',
          deadlineAt,
          startedAt: null,
          choice: null,
          kind: null,
          dareType: null,
          chitId: null,
          resultStamp: null,
          stallVotes: [],
          sessionScoreDelta: null,
          owlLine: null,
        });

        tx.setRoom(
          body.roomCode,
          refreshRoomTimestamps(
            {
              ...room,
              phase: 'SPIN',
              round: 1,
              turnVersion: nextVersion,
              lowPlayerSince: null,
              phaseDeadlineAt: deadlineAt,
            },
            nowMs,
          ),
        );

        return {
          ok: true,
          phase: 'SPIN' as const,
          turnVersion: nextVersion,
          deadlineAt,
          performerSeat: performer.seat,
          performerUid: performer.uid,
        };
      }

      const writingDeadlineAt = nowMs + room.settings.writingDeadlineSec * 1000;
      tx.setTurn(body.roomCode, null);
      tx.setRoom(
        body.roomCode,
        refreshRoomTimestamps(
          {
            ...room,
            phase: 'WRITING',
            round: 0,
            turnVersion: nextVersion,
            lowPlayerSince: null,
            phaseDeadlineAt: writingDeadlineAt,
          },
          nowMs,
        ),
      );

      return {
        ok: true,
        phase: 'WRITING' as const,
        turnVersion: nextVersion,
        deadlineAt: writingDeadlineAt,
      };
    });

    return { status: 200, body: result };
  });
}
