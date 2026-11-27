import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  calculateLifetimeXpDelta,
  calculateTurnSessionDelta,
  nextRoundOrSummary,
  PHASE_DURATIONS_MS,
  tallyVotes,
  TurnAdvanceSchema,
} from '@vowlet/shared';
import { getEnvConfig } from '../_lib/env.js';
import { withArbiterAuth } from '../_lib/middleware.js';
import {
  assertExpectedState,
  drawAndSealPrompt,
  ensureStarterChitsLoaded,
  getPresentActivePlayers,
  pickPerformerFromPlayers,
  refreshRoomTimestamps,
  requireRoom,
} from '../_lib/roomHelpers.js';
import { pickOwlLine } from '../_lib/starterDeck.js';
import { ArbiterError } from '../_lib/store.js';
import { toMillis } from '../_lib/time.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await withArbiterAuth(req, res, TurnAdvanceSchema, async ({ uid, body, store }) => {
    const result = await store.runTransaction(async (tx) => {
      const nowMs = tx.now();
      const room = await requireRoom(tx, body.roomCode);

      assertExpectedState(room, body.expectedPhase, body.expectedVersion);

      const players = await tx.getPlayers(body.roomCode);
      const presence = await tx.getPresence(body.roomCode);
      const presentPlayers = getPresentActivePlayers(players, presence, nowMs);

      if (!presentPlayers.some((p) => p.uid === uid)) {
        throw new ArbiterError(403, 'FORBIDDEN', 'Only present active players can advance phase');
      }

      const turn = await tx.getTurn(body.roomCode);
      const nextVersion = room.turnVersion + 1;
      const env = getEnvConfig();
      const canForce = Boolean(
        body.force && env.useMemoryStore && process.env.NODE_ENV !== 'production',
      );

      switch (room.phase) {
        case 'WRITING': {
          const chits = await tx.getChits(body.roomCode);
          const secrets = await tx.getSecretsForRoom(body.roomCode);
          const sealedAuthors = new Set(
            chits
              .filter((c) => c.status === 'SEALED')
              .map((c) => secrets[c.id]?.authorUid)
              .filter((a): a is string => Boolean(a && a !== 'SYSTEM')),
          );
          const allSealed = presentPlayers.every((p) => sealedAuthors.has(p.uid));
          const deadlineMs = room.phaseDeadlineAt ?? null;
          const deadlineReached = deadlineMs !== null && nowMs >= deadlineMs;

          if (!allSealed && !deadlineReached && !canForce) {
            throw new ArbiterError(
              409,
              'DEADLINE_NOT_REACHED',
              'Writing phase deadline has not been reached yet',
            );
          }

          await ensureStarterChitsLoaded(tx, body.roomCode, room.settings.packIds);
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

        case 'SPIN': {
          if (!turn || turn.phase !== 'SPIN') {
            throw new ArbiterError(409, 'VERSION_MISMATCH', 'No active SPIN turn');
          }
          const deadlineMs = toMillis(turn.deadlineAt);
          if (deadlineMs !== null && nowMs < deadlineMs && !canForce) {
            throw new ArbiterError(
              409,
              'DEADLINE_NOT_REACHED',
              'Spin animation has not finished yet',
            );
          }

          const deadlineAt = nowMs + room.settings.chooseDeadlineSec * 1000;
          tx.setTurn(body.roomCode, {
            ...turn,
            turnVersion: nextVersion,
            phase: 'CHOOSE',
            deadlineAt,
          });

          tx.setRoom(
            body.roomCode,
            refreshRoomTimestamps(
              {
                ...room,
                phase: 'CHOOSE',
                turnVersion: nextVersion,
                phaseDeadlineAt: deadlineAt,
              },
              nowMs,
            ),
          );

          return {
            ok: true,
            phase: 'CHOOSE' as const,
            turnVersion: nextVersion,
            deadlineAt,
            performerSeat: turn.performerSeat,
            performerUid: turn.performerUid,
          };
        }

        case 'CHOOSE': {
          if (!turn || turn.phase !== 'CHOOSE') {
            throw new ArbiterError(409, 'VERSION_MISMATCH', 'No active CHOOSE turn');
          }
          const deadlineMs = toMillis(turn.deadlineAt);
          if (deadlineMs !== null && nowMs < deadlineMs && !canForce) {
            throw new ArbiterError(
              409,
              'DEADLINE_NOT_REACHED',
              'Choose deadline has not been reached yet',
            );
          }

          // Timeout auto-Truth
          const drawn = await drawAndSealPrompt(
            tx,
            body.roomCode,
            'TRUTH',
            turn.performerUid,
            nextVersion,
            room.settings.packIds,
          );

          tx.setTurn(body.roomCode, {
            ...turn,
            turnVersion: nextVersion,
            phase: 'PERFORM',
            choice: 'TRUTH',
            kind: 'TRUTH',
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
                phaseDeadlineAt: null,
              },
              nowMs,
            ),
          );

          return {
            ok: true,
            phase: 'PERFORM' as const,
            turnVersion: nextVersion,
            deadlineAt: null,
            autoTruth: true,
          };
        }

        case 'VOTE': {
          if (!turn || turn.phase !== 'VOTE') {
            throw new ArbiterError(409, 'VERSION_MISMATCH', 'No active VOTE turn');
          }

          const witnesses = presentPlayers.filter((p) => p.uid !== turn.performerUid);
          const witnessUids = new Set(witnesses.map((w) => w.uid));
          const allVotes = await tx.getVotes(body.roomCode);
          const validVotes = allVotes.filter(
            (v) => v.turnVersion === turn.turnVersion && witnessUids.has(v.uid),
          );

          const deadlineMs = toMillis(turn.deadlineAt);
          const allVoted = witnesses.length > 0 && validVotes.length >= witnesses.length;
          const deadlineReached = deadlineMs !== null && nowMs >= deadlineMs;

          if (!allVoted && !deadlineReached && !canForce) {
            throw new ArbiterError(
              409,
              'DEADLINE_NOT_REACHED',
              'Waiting for witness votes or deadline',
            );
          }

          const approveCount = validVotes.filter((v) => v.verdict === 'APPROVE').length;
          const rejectCount = validVotes.filter((v) => v.verdict === 'REJECT').length;

          const tally = tallyVotes({
            approveCount,
            rejectCount,
            witnessCount: witnesses.length,
            stalled: turn.stalled,
          });

          const performer = players.find((p) => p.uid === turn.performerUid);
          const currentStreak = performer?.streak ?? 0;
          const { sessionDelta, nextStreak } = calculateTurnSessionDelta(
            tally.stamp,
            currentStreak,
          );
          const lifetimeXpDelta = calculateLifetimeXpDelta(tally.stamp, currentStreak);

          if (performer) {
            tx.setPlayer(body.roomCode, performer.uid, {
              ...performer,
              sessionScore: performer.sessionScore + sessionDelta,
              streak: nextStreak,
              turnsTaken: performer.turnsTaken + 1,
            });
          }

          tx.addTurnRecord(body.roomCode, {
            turnVersion: nextVersion,
            round: room.round,
            performerUid: turn.performerUid,
            resultStamp: tally.stamp,
            streakAtTurn: currentStreak,
            lifetimeXpDelta,
          });

          const deadlineAt = nowMs + PHASE_DURATIONS_MS.RESULT;
          const owlLine = pickOwlLine(tally.stamp, nextVersion);

          tx.setTurn(body.roomCode, {
            ...turn,
            turnVersion: nextVersion,
            phase: 'RESULT',
            resultStamp: tally.stamp,
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
                phaseDeadlineAt: deadlineAt,
              },
              nowMs,
            ),
          );

          return {
            ok: true,
            phase: 'RESULT' as const,
            turnVersion: nextVersion,
            deadlineAt,
            resultStamp: tally.stamp,
            sessionScoreDelta: sessionDelta,
          };
        }

        case 'RESULT': {
          const deadlineMs = turn ? toMillis(turn.deadlineAt) : null;
          const isHostOrPerformer =
            uid === room.hostUid || (turn !== null && uid === turn.performerUid);
          const deadlineReached = deadlineMs === null || nowMs >= deadlineMs;

          if (!deadlineReached && !isHostOrPerformer && !canForce) {
            throw new ArbiterError(
              409,
              'DEADLINE_NOT_REACHED',
              'Result display deadline has not been reached yet',
            );
          }

          // Clear votes and private prompt from completed turn
          const oldVotes = await tx.getVotes(body.roomCode);
          for (const v of oldVotes) {
            tx.deleteVote(body.roomCode, v.uid);
          }
          if (turn) {
            tx.deletePrivatePrompt(body.roomCode, turn.performerUid);
          }

          const nextTarget = nextRoundOrSummary(room.round, room.totalRounds);

          if (nextTarget === 'SPIN') {
            const nextRound = room.round + 1;
            const performer = pickPerformerFromPlayers(
              players,
              presence,
              nowMs,
              turn?.performerUid ?? null,
            );
            const deadlineAt = nowMs + PHASE_DURATIONS_MS.SPIN;

            tx.setTurn(body.roomCode, {
              turnVersion: nextVersion,
              round: nextRound,
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
                  round: nextRound,
                  turnVersion: nextVersion,
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

          tx.setRoom(
            body.roomCode,
            refreshRoomTimestamps(
              {
                ...room,
                phase: 'SUMMARY',
                turnVersion: nextVersion,
                phaseDeadlineAt: null,
              },
              nowMs,
            ),
          );

          return {
            ok: true,
            phase: 'SUMMARY' as const,
            turnVersion: nextVersion,
            deadlineAt: null,
          };
        }

        case 'SUMMARY': {
          tx.setRoom(
            body.roomCode,
            refreshRoomTimestamps(
              {
                ...room,
                phase: 'PODIUM',
                turnVersion: nextVersion,
                phaseDeadlineAt: null,
              },
              nowMs,
            ),
          );

          return {
            ok: true,
            phase: 'PODIUM' as const,
            turnVersion: nextVersion,
            deadlineAt: null,
          };
        }

        default:
          throw new ArbiterError(
            409,
            'VERSION_MISMATCH',
            `Cannot advance from phase ${room.phase}`,
            { phase: room.phase, turnVersion: room.turnVersion },
          );
      }
    });

    return { status: 200, body: result };
  });
}
