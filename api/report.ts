import { randomUUID } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { z } from 'zod';
import {
  IdempotencyKeySchema,
  ReportSchema,
  type ReportDoc,
  type UserDoc,
} from '@vowlet/shared';
import { getEnvConfig } from './_lib/env.js';
import { withArbiterAuth } from './_lib/middleware.js';
import { ArbiterError, type RoomRecord } from './_lib/store.js';

const ReportRequestSchema = ReportSchema.extend({
  idempotencyKey: IdempotencyKeySchema,
  block: z.boolean().optional().default(false),
});

type UserWithBlocks = UserDoc & { blockedUids?: string[] };
type RoomWithBlocks = RoomRecord & { blockedUids?: string[] };

const memoryReports = new Map<string, ReportDoc>();

export function getMemoryReports(): ReportDoc[] {
  return Array.from(memoryReports.values()).map((r) => structuredClone(r));
}

export function resetMemoryReports(): void {
  memoryReports.clear();
}

/**
 * `POST /api/report`
 * Submits a player or prompt abuse report into `reports/{reportId}` and
 * optionally adds `targetUid` to the reporter's block list (and room block list
 * if the reporter is the room host).
 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await withArbiterAuth(
    req,
    res,
    ReportRequestSchema,
    async ({ uid, body, store }) => {
      const targetUid = body.targetUid ?? null;
      const roomCode = body.roomCode ?? null;
      const promptId = body.promptId ?? null;

      if (!targetUid && !promptId && !roomCode) {
        throw new ArbiterError(
          400,
          'VALIDATION_ERROR',
          'At least one of targetUid, promptId, or roomCode is required',
        );
      }

      if (targetUid && targetUid === uid) {
        throw new ArbiterError(400, 'VALIDATION_ERROR', 'Cannot report yourself');
      }

      const reportId = randomUUID();
      const nowMs = Date.now();
      const reportDoc: ReportDoc = {
        id: reportId,
        reporterUid: uid,
        targetUid,
        roomCode,
        promptId,
        reason: body.reason,
        details: body.details ?? '',
        createdAt: nowMs,
      };

      const env = getEnvConfig();
      if (env.useMemoryStore) {
        memoryReports.set(reportId, structuredClone(reportDoc));
      } else {
        if (getApps().length === 0) {
          initializeApp();
        }
        const db = getFirestore();
        await db.collection('reports').doc(reportId).set({
          ...reportDoc,
          createdAt: FieldValue.serverTimestamp(),
        });
      }

      let blocked = false;
      if (body.block && targetUid) {
        await store.runTransaction(async (tx) => {
          const txNow = tx.now();
          const existingUser = (await tx.getUser(uid)) as UserWithBlocks | null;
          const prevBlocked = Array.isArray(existingUser?.blockedUids)
            ? existingUser.blockedUids
            : [];
          const nextBlocked = Array.from(new Set([...prevBlocked, targetUid]));

          const nextUser: UserWithBlocks = existingUser
            ? {
                ...existingUser,
                blockedUids: nextBlocked,
                updatedAt: txNow,
              }
            : {
                uid,
                lifetimeXp: 0,
                level: 1,
                skins: [],
                optIns: {
                  communityDeck: false,
                  analytics: false,
                },
                blockedUids: nextBlocked,
                updatedAt: txNow,
              };

          tx.setUser(uid, nextUser);

          if (roomCode) {
            const room = (await tx.getRoom(roomCode)) as RoomWithBlocks | null;
            if (room && room.hostUid === uid) {
              const roomBlocked = Array.isArray(room.blockedUids) ? room.blockedUids : [];
              tx.setRoom(roomCode, {
                ...room,
                blockedUids: Array.from(new Set([...roomBlocked, targetUid])),
                updatedAt: txNow,
              } as RoomWithBlocks);
            }
          }
        });
        blocked = true;
      }

      return {
        status: 201,
        body: {
          ok: true,
          reportId,
          blocked,
        },
      };
    },
    {
      rateLimit: {
        routeGroup: 'report',
        limit: 10,
        windowMs: 60_000,
      },
    },
  );
}
