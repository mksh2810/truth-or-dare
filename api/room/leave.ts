import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import {
  LeaveRoomSchema,
  PHASE_DURATIONS_MS,
  PhaseSchema,
} from '@vowlet/shared';
import { withArbiterAuth } from '../_lib/middleware.js';
import {
  assertExpectedState,
  electHostUid,
  getPresentActivePlayers,
  refreshRoomTimestamps,
  requireRoom,
} from '../_lib/roomHelpers.js';
import { pickOwlLine } from '../_lib/starterDeck.js';
import { ArbiterError } from '../_lib/store.js';

const LeaveRequestSchema = LeaveRoomSchema.extend({
  expectedPhase: PhaseSchema.optional(),
  expectedVersion: z.number().int().nonnegative().optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await withArbiterAuth(req, res, LeaveRequestSchema, async ({ uid, body, store }) => {
    const result = await store.runTransaction(async (tx) => {
      const nowMs = tx.now();
      const room = await requireRoom(tx, body.roomCode);

      if (body.expectedPhase !== undefined && body.expectedVersion !== undefined) {
        assertExpectedState(room, body.expectedPhase, body.expectedVersion);
      }

      const players = await tx.getPlayers(body.roomCode);
      const leaver = players.find((p) => p.uid === uid);
      if (!leaver) {
        throw new ArbiterError(404, 'NOT_FOUND', 'Player is not in this room');
      }

      const turn = await tx.getTurn(body.roomCode);
      const votes = await tx.getVotes(body.roomCode);
      const chits = await tx.getChits(body.roomCode);
      const secrets = await tx.getSecretsForRoom(body.roomCode);
      const presence = await tx.getPresence(body.roomCode);

      // Remove player from roster
      tx.deletePlayer(body.roomCode, uid);

      // Return leaver's unused chits to pool
      for (const chit of chits) {
        const secret = secrets[chit.id];
        if (secret?.authorUid === uid && chit.status === 'SEALED') {
          tx.setChit(body.roomCode, { ...chit, status: 'RETURNED' });
        }
      }

      // Drop pending vote if any
      if (votes.some((v) => v.uid === uid)) {
        tx.deleteVote(body.roomCode, uid);
      }

      let nextPhase = room.phase;
      let nextVersion = room.turnVersion + 1;
      let updatedTurn = turn;

      // Remove leaver from stallVotes if present
      if (updatedTurn && updatedTurn.stallVotes.includes(uid)) {
        updatedTurn = {
          ...updatedTurn,
          stallVotes: updatedTurn.stallVotes.filter((v) => v !== uid),
        };
      }

      // If performer leaves during PERFORM -> RESULT (SKIPPED, 0 penalty per D20)
      if (room.phase === 'PERFORM' && updatedTurn && updatedTurn.performerUid === uid) {
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
        tx.addTurnRecord(body.roomCode, {
          turnVersion: nextVersion,
          round: room.round,
          performerUid: uid,
          resultStamp: 'SKIPPED',
          streakAtTurn: leaver.streak,
          lifetimeXpDelta: 0,
        });
      }

      const remainingPlayers = players.filter((p) => p.uid !== uid);
      const remainingPresent = getPresentActivePlayers(remainingPlayers, presence, nowMs);

      let nextHostUid = room.hostUid;
      if (room.hostUid === uid) {
        nextHostUid = electHostUid(remainingPlayers, presence, nowMs) ?? room.hostUid;
      }

      let lowPlayerSince = room.lowPlayerSince ?? null;
      if (remainingPresent.length === 0) {
        nextPhase = 'CLOSED';
      } else if (nextPhase !== 'LOBBY' && nextPhase !== 'CLOSED' && remainingPresent.length < 3) {
        if (lowPlayerSince === null) {
          lowPlayerSince = nowMs;
        } else if (nowMs - lowPlayerSince >= 60_000) {
          nextPhase = 'CLOSED';
        }
      } else {
        lowPlayerSince = null;
      }

      if (updatedTurn) {
        tx.setTurn(body.roomCode, { ...updatedTurn, turnVersion: nextVersion });
      }

      tx.setRoom(
        body.roomCode,
        refreshRoomTimestamps(
          {
            ...room,
            hostUid: nextHostUid,
            phase: nextPhase,
            turnVersion: nextVersion,
            lowPlayerSince,
          },
          nowMs,
        ),
      );

      return {
        ok: true,
        hostUid: nextHostUid,
        phase: nextPhase,
        turnVersion: nextVersion,
      };
    });

    return { status: 200, body: result };
  });
}
