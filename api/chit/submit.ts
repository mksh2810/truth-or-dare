import { randomUUID } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import {
  checkDeterministicModeration,
  fnv1aHash,
  PhaseSchema,
  SubmitChitSchema,
} from '@vowlet/shared';
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

      const mod = checkDeterministicModeration(body.text);
      const chitId = `chit_${randomUUID().replace(/-/g, '').slice(0, 12)}`;

      if (!mod.allowed) {
        return {
          ok: true,
          chitId,
          verdict: 'NOPE' as const,
          tier: body.tier,
          dareType: body.kind === 'DARE' ? body.dareType : null,
          owlReason: mod.reason ?? 'The Owl says this prompt needs a rewrite.',
          status: 'REJECTED' as const,
        };
      }

      const dareType = body.kind === 'DARE' ? body.dareType : null;
      const owlReason = 'Owl approves! Sealed onto the table.';

      // Public chit doc: never stores text or authorUid (D9)
      tx.setChit(body.roomCode, {
        id: chitId,
        kind: body.kind,
        tier: body.tier,
        dareType,
        status: 'SEALED',
        judgeVerdict: 'FINE',
        owlReason,
      });

      // Secret doc: strictly server-only
      tx.setSecret(body.roomCode, chitId, {
        text: body.text.trim(),
        authorUid: uid,
        verdict: 'FINE',
        normalizedHash: fnv1aHash(body.text),
      });

      tx.setRoom(body.roomCode, refreshRoomTimestamps(room, nowMs));

      return {
        ok: true,
        chitId,
        verdict: 'FINE' as const,
        tier: body.tier,
        dareType,
        owlReason,
        status: 'SEALED' as const,
      };
    });

    return { status: 200, body: result };
  });
}
