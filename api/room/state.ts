import type { VercelRequest, VercelResponse } from '@vercel/node';
import { RoomCodeSchema } from '@vowlet/shared';
import { withArbiterGet } from '../_lib/middleware.js';
import { requireRoom } from '../_lib/roomHelpers.js';
import { ArbiterError } from '../_lib/store.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await withArbiterGet(req, res, async ({ req: r, uid, store }) => {
    const rawCode = r.query.roomCode ?? r.query.code;
    const codeStr = Array.isArray(rawCode) ? rawCode[0] : rawCode;
    const parsedCode = RoomCodeSchema.safeParse(codeStr);
    if (!parsedCode.success) {
      throw new ArbiterError(400, 'VALIDATION_ERROR', 'Invalid or missing roomCode query param');
    }

    const code = parsedCode.data;
    const state = await store.runTransaction(async (tx) => {
      const room = await requireRoom(tx, code, true);
      const players = await tx.getPlayers(code);
      const caller = players.find((p) => p.uid === uid);
      if (!caller || caller.banned) {
        throw new ArbiterError(403, 'FORBIDDEN', 'Only room members can read room state');
      }

      const turn = await tx.getTurn(code);
      const votes = await tx.getVotes(code);
      const chits = await tx.getChits(code);
      const presence = await tx.getPresence(code);

      const canReadPrivate =
        turn !== null &&
        turn.performerUid === uid &&
        (room.phase === 'PERFORM' || room.phase === 'VOTE' || room.phase === 'RESULT');

      const privatePrompt = canReadPrivate ? await tx.getPrivatePrompt(code, uid) : null;
      const myVote = votes.find((v) => v.uid === uid && v.turnVersion === turn?.turnVersion) ?? null;
      const currentVotesCount = votes.filter((v) => v.turnVersion === turn?.turnVersion).length;

      // Never expose internal fields or secret collection
      const { awardedTurnVersions: _a, lowPlayerSince: _l, ...publicRoom } = room;

      return {
        ok: true,
        room: publicRoom,
        players,
        turn,
        chits,
        presence,
        voteCount: currentVotesCount,
        myVote,
        privatePrompt,
      };
    });

    return { status: 200, body: state };
  }, {
    rateLimit: { routeGroup: 'room-state', limit: 600, windowMs: 60_000 },
  });
}
