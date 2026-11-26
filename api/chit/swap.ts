import type { VercelRequest, VercelResponse } from '@vercel/node';
import { swapChit, SwapChitSchema, type DeckChit } from '@vowlet/shared';
import { withArbiterAuth } from '../_lib/middleware.js';
import {
  assertExpectedState,
  buildStarterDeckChits,
  ensureStarterChitsLoaded,
  refreshRoomTimestamps,
  requireRoom,
} from '../_lib/roomHelpers.js';
import { ArbiterError } from '../_lib/store.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await withArbiterAuth(req, res, SwapChitSchema, async ({ uid, body, store }) => {
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
        throw new ArbiterError(403, 'FORBIDDEN', 'Only the active performer can swap a chit');
      }

      const players = await tx.getPlayers(body.roomCode);
      const performer = players.find((p) => p.uid === uid && !p.banned);
      if (!performer) {
        throw new ArbiterError(404, 'NOT_FOUND', 'Performer not found');
      }

      if (performer.swapUsed) {
        throw new ArbiterError(409, 'NO_SWAPS_LEFT', 'You have already used your free swap');
      }

      const existingChits = await ensureStarterChitsLoaded(tx, body.roomCode, room.settings.packIds);
      const { chits: starterDeckChits, secrets: starterSecrets } = buildStarterDeckChits(
        room.settings.packIds,
      );

      const pool: DeckChit[] = existingChits.map((c) => ({
        id: c.id,
        kind: c.kind,
        tier: c.tier,
        dareType: c.dareType,
        status: c.status,
      }));

      const kind = turn.kind ?? 'TRUTH';
      const currentChitId = turn.chitId ?? '';
      const swapResult = swapChit(pool, currentChitId, kind, starterDeckChits, 1);

      if (!swapResult.ok) {
        throw new ArbiterError(409, swapResult.reason, 'Unable to swap chit');
      }

      const existingMap = new Map(existingChits.map((c) => [c.id, c]));
      const starterSecretByBase = new Map(Object.entries(starterSecrets));

      for (const item of swapResult.updatedPool) {
        const prev = existingMap.get(item.id);
        if (!prev) {
          tx.setChit(body.roomCode, {
            id: item.id,
            kind: item.kind,
            tier: item.tier,
            dareType: item.dareType,
            status: item.status,
            judgeVerdict: 'FINE',
            owlReason: 'Starter deck refill.',
          });
          const baseId = item.id.split('_refill_')[0] ?? item.id;
          const secret = starterSecretByBase.get(baseId);
          if (secret) {
            tx.setSecret(body.roomCode, item.id, secret);
          }
        } else if (prev.status !== item.status) {
          tx.setChit(body.roomCode, { ...prev, status: item.status });
        }
      }

      const nextVersion = room.turnVersion + 1;
      const drawn = swapResult.drawn;
      const drawnSecret = await tx.getSecret(body.roomCode, drawn.id);
      const baseId = drawn.id.split('_refill_')[0] ?? drawn.id;
      const fallbackSecret = starterSecretByBase.get(baseId);
      const promptText =
        drawnSecret?.text ?? fallbackSecret?.text ?? 'Share a fun story from this week.';

      tx.setPrivatePrompt(body.roomCode, uid, {
        chitId: drawn.id,
        text: promptText,
        kind: drawn.kind,
        tier: drawn.tier,
        dareType: drawn.dareType,
        turnVersion: nextVersion,
      });

      tx.setPlayer(body.roomCode, uid, {
        ...performer,
        swapUsed: true,
      });

      tx.setTurn(body.roomCode, {
        ...turn,
        turnVersion: nextVersion,
        chitId: drawn.id,
        dareType: drawn.dareType,
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
        chitId: drawn.id,
        turnVersion: nextVersion,
      };
    });

    return { status: 200, body: result };
  });
}
