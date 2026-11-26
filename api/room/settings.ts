import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import {
  PhaseSchema,
  RoomSettingsSchema,
  UpdateSettingsSchema,
} from '@vowlet/shared';
import { withArbiterAuth } from '../_lib/middleware.js';
import {
  assertExpectedState,
  refreshRoomTimestamps,
  requireRoom,
} from '../_lib/roomHelpers.js';
import { ArbiterError } from '../_lib/store.js';

const SettingsRequestSchema = UpdateSettingsSchema.extend({
  settings: RoomSettingsSchema.partial().optional(),
  ready: z.boolean().optional(),
  expectedPhase: PhaseSchema.optional(),
  expectedVersion: z.number().int().nonnegative().optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await withArbiterAuth(req, res, SettingsRequestSchema, async ({ uid, body, store }) => {
    const result = await store.runTransaction(async (tx) => {
      const nowMs = tx.now();
      const room = await requireRoom(tx, body.roomCode);

      if (body.expectedPhase !== undefined && body.expectedVersion !== undefined) {
        assertExpectedState(room, body.expectedPhase, body.expectedVersion);
      }

      if (room.phase !== 'LOBBY') {
        throw new ArbiterError(
          409,
          'VERSION_MISMATCH',
          'Settings can only be updated in LOBBY',
          { phase: room.phase, turnVersion: room.turnVersion },
        );
      }

      const players = await tx.getPlayers(body.roomCode);
      const caller = players.find((p) => p.uid === uid && !p.banned);
      if (!caller) {
        throw new ArbiterError(403, 'FORBIDDEN', 'Player is not an active member of this room');
      }

      const hasHostFields =
        (body.settings !== undefined && Object.keys(body.settings).length > 0) ||
        body.callLink !== undefined;

      if (hasHostFields && room.hostUid !== uid) {
        throw new ArbiterError(403, 'FORBIDDEN', 'Only the host can update room settings');
      }

      const nextSettings = body.settings
        ? RoomSettingsSchema.parse({ ...room.settings, ...body.settings })
        : room.settings;

      if (body.ready !== undefined) {
        tx.setPlayer(body.roomCode, uid, {
          ...caller,
          ready: body.ready,
        });
      }

      const nextVersion = room.turnVersion + 1;
      tx.setRoom(
        body.roomCode,
        refreshRoomTimestamps(
          {
            ...room,
            settings: nextSettings,
            totalRounds: nextSettings.rounds,
            callLink: body.callLink !== undefined ? body.callLink : room.callLink,
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
