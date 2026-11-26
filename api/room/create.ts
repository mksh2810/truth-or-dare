import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  CreateRoomSchema,
  generateRoomCode,
  ROOM_TTL_MS,
  RoomSettingsSchema,
  SCHEMA_VERSION,
  validatePlayerName,
} from '@vowlet/shared';
import { withArbiterAuth } from '../_lib/middleware.js';
import { ArbiterError } from '../_lib/store.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await withArbiterAuth(
    req,
    res,
    CreateRoomSchema,
    async ({ uid, body, store }) => {
      if (body.schemaVersion !== SCHEMA_VERSION) {
        throw new ArbiterError(
          409,
          'SCHEMA_MISMATCH',
          `Client schemaVersion ${body.schemaVersion} does not match server ${SCHEMA_VERSION}`,
        );
      }

      const nameCheck = validatePlayerName(body.name, []);
      if (!nameCheck.valid) {
        const code = nameCheck.reason.includes('reserved') ? 'NAME_RESERVED' : 'VALIDATION_ERROR';
        throw new ArbiterError(400, code, nameCheck.reason);
      }

      const settings = RoomSettingsSchema.parse(body.settings ?? {});

      const result = await store.runTransaction(async (tx) => {
        const nowMs = tx.now();
        let code = '';
        for (let attempt = 0; attempt < 12; attempt += 1) {
          const candidate = generateRoomCode();
          const existing = await tx.getRoom(candidate);
          if (!existing) {
            code = candidate;
            break;
          }
        }

        if (!code) {
          throw new ArbiterError(500, 'INTERNAL_ERROR', 'Failed to allocate unique room code');
        }

        tx.setRoom(code, {
          code,
          hostUid: uid,
          phase: 'LOBBY',
          round: 0,
          totalRounds: settings.rounds,
          turnVersion: 0,
          schemaVersion: SCHEMA_VERSION,
          callLink: body.callLink ?? null,
          settings,
          createdAt: nowMs,
          updatedAt: nowMs,
          expiresAt: nowMs + ROOM_TTL_MS,
          awardedTurnVersions: [],
          lowPlayerSince: null,
        });

        tx.setPlayer(code, uid, {
          uid,
          name: nameCheck.name,
          avatar: body.avatar,
          seat: 0,
          joinedAt: nowMs,
          ready: false,
          banned: false,
          spectator: false,
          turnsTaken: 0,
          sessionScore: 0,
          streak: 0,
          swapUsed: false,
        });

        return {
          ok: true,
          code,
          roomCode: code,
          uid,
          seat: 0,
          phase: 'LOBBY' as const,
          turnVersion: 0,
        };
      });

      return { status: 201, body: result };
    },
    {
      rateLimit: {
        routeGroup: 'room_create',
        limit: 10,
        windowMs: 60_000,
      },
    },
  );
}
