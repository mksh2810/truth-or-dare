import { randomUUID } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { PhaseSchema, SubmitChitSchema } from '@vowlet/shared';
import { runJudgePipeline } from '../judge/pipeline.js';
import { withArbiterAuth } from '../_lib/middleware.js';
import {
  assertExpectedState,
  refreshRoomTimestamps,
  requireRoom,
} from '../_lib/roomHelpers.js';
import { ArbiterError } from '../_lib/store.js';

const SubmitChitRequestSchema = SubmitChitSchema.and(
  z.object({
    expectedPhase: PhaseSchema.optional(),
    expectedVersion: z.number().int().nonnegative().optional(),
  }),
);

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await withArbiterAuth(req, res, SubmitChitRequestSchema, async ({ uid, body, store }) => {
    const requestedDareType = body.kind === 'DARE' ? body.dareType : null;

    // Run Judge Owl pipeline outside the Firestore transaction so network/LLM calls never hold tx locks.
    const judge = await runJudgePipeline({
      text: body.text,
      kind: body.kind,
      tier: body.tier,
      dareType: requestedDareType,
    });

    const result = await store.runTransaction(async (tx) => {
      const nowMs = tx.now();
      const room = await requireRoom(tx, body.roomCode);

      if (body.expectedPhase !== undefined && body.expectedVersion !== undefined) {
        assertExpectedState(room, body.expectedPhase, body.expectedVersion);
      }

      if (room.phase !== 'WRITING' && room.phase !== 'LOBBY') {
        throw new ArbiterError(
          409,
          'VERSION_MISMATCH',
          `Cannot submit chits in phase ${room.phase}`,
          { phase: room.phase, turnVersion: room.turnVersion },
        );
      }

      const players = await tx.getPlayers(body.roomCode);
      const player = players.find((p) => p.uid === uid && !p.banned && !p.spectator);
      if (!player) {
        throw new ArbiterError(403, 'FORBIDDEN', 'Only active players can submit chits');
      }

      const chitId = `chit_${randomUUID().replace(/-/g, '').slice(0, 12)}`;

      if (judge.outcome !== 'APPROVED' || judge.verdict !== 'FINE') {
        return {
          ok: true,
          chitId,
          verdict: judge.verdict,
          tier: judge.tier,
          dareType: judge.dareType,
          owlReason: judge.owlReason,
          status: judge.status,
          fallbackAction: judge.fallbackAction,
        };
      }

      // Public chit doc: never stores text or authorUid (D9)
      tx.setChit(body.roomCode, {
        id: chitId,
        kind: body.kind,
        tier: judge.tier,
        dareType: judge.dareType,
        status: 'SEALED',
        judgeVerdict: 'FINE',
        owlReason: judge.owlReason,
      });

      // Secret doc: strictly server-only
      tx.setSecret(body.roomCode, chitId, {
        text: body.text.trim(),
        authorUid: uid,
        verdict: 'FINE',
        normalizedHash: judge.normalizedHash,
      });

      tx.setRoom(body.roomCode, refreshRoomTimestamps(room, nowMs));

      return {
        ok: true,
        chitId,
        verdict: 'FINE' as const,
        tier: judge.tier,
        dareType: judge.dareType,
        owlReason: judge.owlReason,
        status: 'SEALED' as const,
        fallbackAction: 'NONE' as const,
      };
    });

    return { status: 200, body: result };
  });
}
