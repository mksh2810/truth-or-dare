import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { z } from 'zod';
import {
  IdempotencyKeySchema,
  RoomCodeSchema,
  type PlayerDoc,
} from '@vowlet/shared';
import { getEnvConfig } from '../_lib/env.js';
import { withArbiterAuth } from '../_lib/middleware.js';
import type { ArbiterStore } from '../_lib/store.js';

const DeleteUserSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  roomCodes: z.array(RoomCodeSchema).max(20).optional().default([]),
});

interface MemoryBucketLike {
  players: Map<string, PlayerDoc>;
  privates: Map<string, unknown>;
}

interface MemoryStoreInternal {
  state?: {
    users?: Map<string, unknown>;
    rooms?: Map<string, MemoryBucketLike>;
  };
}

function anonymizePlayerDoc(player: PlayerDoc): PlayerDoc & { anonymized?: boolean } {
  return {
    ...player,
    name: 'Deleted Player',
    avatar: 'deleted',
    ready: false,
    anonymized: true,
  };
}

async function deleteInMemoryStore(
  store: ArbiterStore,
  uid: string,
  requestedRoomCodes: readonly string[],
): Promise<string[]> {
  const internal = store as unknown as MemoryStoreInternal;
  const candidateCodes = new Set<string>(requestedRoomCodes);

  if (internal.state?.rooms) {
    for (const [code, bucket] of internal.state.rooms.entries()) {
      if (bucket.players.has(uid)) {
        candidateCodes.add(code);
      }
    }
  }

  const anonymizedRooms: string[] = [];

  await store.runTransaction(async (tx) => {
    for (const code of candidateCodes) {
      const players = await tx.getPlayers(code);
      const target = players.find((p) => p.uid === uid);
      if (target) {
        tx.setPlayer(code, uid, anonymizePlayerDoc(target));
        tx.deletePrivatePrompt(code, uid);
        anonymizedRooms.push(code);
      }
    }
  });

  internal.state?.users?.delete(uid);
  return anonymizedRooms;
}

async function deleteInFirestore(
  uid: string,
  requestedRoomCodes: readonly string[],
): Promise<string[]> {
  if (getApps().length === 0) {
    initializeApp();
  }
  const db = getFirestore();
  await db.collection('users').doc(uid).delete();

  const anonymizedRooms = new Set<string>();
  const playerSnap = await db.collectionGroup('players').where('uid', '==', uid).get();

  const batch = db.batch();
  for (const doc of playerSnap.docs) {
    const roomRef = doc.ref.parent.parent;
    if (roomRef) {
      anonymizedRooms.add(roomRef.id);
      batch.delete(roomRef.collection('private').doc(uid));
    }
    batch.set(
      doc.ref,
      {
        name: 'Deleted Player',
        avatar: 'deleted',
        ready: false,
        anonymized: true,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  for (const code of requestedRoomCodes) {
    if (!anonymizedRooms.has(code)) {
      const ref = db.collection('rooms').doc(code).collection('players').doc(uid);
      const snap = await ref.get();
      if (snap.exists) {
        anonymizedRooms.add(code);
        batch.set(
          ref,
          {
            name: 'Deleted Player',
            avatar: 'deleted',
            ready: false,
            anonymized: true,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
        batch.delete(db.collection('rooms').doc(code).collection('private').doc(uid));
      }
    }
  }

  await batch.commit();
  return Array.from(anonymizedRooms);
}

/**
 * `POST /api/user/delete`
 * Implements the Delete My Data SOP:
 * - Deletes `users/{uid}`
 * - Anonymizes the user's player records across active/recent rooms
 * - Deletes any sealed `private/{uid}` prompt documents
 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await withArbiterAuth(
    req,
    res,
    DeleteUserSchema,
    async ({ uid, body, store }) => {
      const env = getEnvConfig();
      const anonymizedRooms = env.useMemoryStore
        ? await deleteInMemoryStore(store, uid, body.roomCodes)
        : await deleteInFirestore(uid, body.roomCodes);

      return {
        status: 200,
        body: {
          ok: true,
          deletedUser: true,
          anonymizedRooms,
        },
      };
    },
    {
      rateLimit: {
        routeGroup: 'user_delete',
        limit: 5,
        windowMs: 60_000,
      },
    },
  );
}
