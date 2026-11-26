import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  JoinRoomSchema,
  SCHEMA_VERSION,
  validatePlayerName,
} from '@vowlet/shared';
import { withArbiterAuth } from '../_lib/middleware.js';
import { refreshRoomTimestamps, requireRoom } from '../_lib/roomHelpers.js';
import { ArbiterError } from '../_lib/store.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await withArbiterAuth(
    req,
    res,
    JoinRoomSchema,
    async ({ uid, body, store }) => {
      if (body.schemaVersion !== SCHEMA_VERSION) {
        throw new ArbiterError(
          409,
          'SCHEMA_MISMATCH',
          `Client schemaVersion ${body.schemaVersion} does not match server ${SCHEMA_VERSION}`,
        );
      }

      const result = await store.runTransaction(async (tx) => {
        const nowMs = tx.now();
        const room = await requireRoom(tx, body.roomCode);
        const players = await tx.getPlayers(body.roomCode);

        const existingPlayer = players.find((p) => p.uid === uid);
        if (existingPlayer) {
          if (existingPlayer.banned) {
            throw new ArbiterError(403, 'BANNED', 'You have been removed from this room');
          }
          // Rejoin with same UID
          tx.setRoom(body.roomCode, refreshRoomTimestamps(room, nowMs));
          return {
            ok: true,
            code: room.code,
            roomCode: room.code,
            uid,
            seat: existingPlayer.seat,
            spectator: existingPlayer.spectator,
            phase: room.phase,
            turnVersion: room.turnVersion,
          };
        }

        const activePlayers = players.filter((p) => !p.banned && !p.spectator);
        const isInProgress = room.phase !== 'LOBBY';

        if (!isInProgress && activePlayers.length >= room.settings.maxPlayers) {
          throw new ArbiterError(409, 'ROOM_FULL', 'Room is at maximum capacity');
        }

        const existingNames = players.filter((p) => !p.banned).map((p) => p.name);
        const nameCheck = validatePlayerName(body.name, existingNames);
        if (!nameCheck.valid) {
          let code = 'VALIDATION_ERROR';
          if (nameCheck.reason.includes('taken')) code = 'NAME_TAKEN';
          else if (nameCheck.reason.includes('reserved')) code = 'NAME_RESERVED';
          throw new ArbiterError(400, code, nameCheck.reason);
        }

        const usedSeats = new Set(activePlayers.map((p) => p.seat));
        let seat = -1;
        if (!isInProgress) {
          for (let s = 0; s < 8; s += 1) {
            if (!usedSeats.has(s)) {
              seat = s;
              break;
            }
          }
          if (seat === -1) {
            throw new ArbiterError(409, 'ROOM_FULL', 'No seats available');
          }
        }

        const spectator = isInProgress;
        tx.setPlayer(body.roomCode, uid, {
          uid,
          name: nameCheck.name,
          avatar: body.avatar,
          seat,
          joinedAt: nowMs,
          ready: false,
          banned: false,
          spectator,
          turnsTaken: 0,
          sessionScore: 0,
          streak: 0,
          swapUsed: false,
        });

        tx.setRoom(body.roomCode, refreshRoomTimestamps(room, nowMs));

        return {
          ok: true,
          code: room.code,
          roomCode: room.code,
          uid,
          seat,
          spectator,
          phase: room.phase,
          turnVersion: room.turnVersion,
        };
      });

      return { status: 200, body: result };
    },
    {
      rateLimit: {
        routeGroup: 'room_join',
        limit: 10,
        windowMs: 60_000,
      },
    },
  );
}
