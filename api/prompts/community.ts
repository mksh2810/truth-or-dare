import { randomUUID } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { z } from 'zod';
import {
  checkDeterministicModeration,
  fnv1aHash,
  IdempotencyKeySchema,
  type DareType,
  type PromptDoc,
  type PromptKind,
  type Tier,
} from '@vowlet/shared';
import { getEnvConfig } from '../_lib/env.js';
import { withArbiterAuth, withArbiterGet } from '../_lib/middleware.js';
import { STARTER_DECK } from '../_lib/starterDeck.js';
import { ArbiterError, type ArbiterStore } from '../_lib/store.js';

export const COMMUNITY_MIN_RATINGS = 20;

export interface CommunityPromptRecord extends PromptDoc {
  authorUid: string;
  createdAt: number;
  piiScrubbed?: boolean;
}

export interface PromptRatingRecord {
  promptId: string;
  uid: string;
  up: boolean;
  hash: string;
  createdAt: number;
}

const CommunityQuerySchema = z.object({
  pack: z.string().trim().min(1).max(64).optional(),
  kind: z.enum(['TRUTH', 'DARE']).optional(),
  tier: z.enum(['MILD', 'SPICY', 'LEGEND']).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  cursor: z.string().trim().min(1).max(128).optional(),
});

const SubmitCommunitySchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  text: z.string().trim().min(1).max(140),
  kind: z.enum(['TRUTH', 'DARE']),
  tier: z.enum(['MILD', 'SPICY', 'LEGEND']).optional().default('MILD'),
  dareType: z.enum(['INSTANT', 'SOCIAL']).nullable().optional().default(null),
});

/**
 * Wilson score lower bound (95% confidence by default, z = 1.96).
 * Ranks prompts with strong positive consensus and sufficient sample size above noisy small samples.
 */
export function wilsonLowerBound(upvotes: number, totalRatings: number, z = 1.96): number {
  if (!Number.isFinite(totalRatings) || totalRatings <= 0) {
    return 0;
  }
  const safeUp = Math.max(0, Math.min(totalRatings, upvotes));
  const p = safeUp / totalRatings;
  const z2 = z * z;
  const denominator = 1 + z2 / totalRatings;
  const center = p + z2 / (2 * totalRatings);
  const margin = z * Math.sqrt((p * (1 - p) + z2 / (4 * totalRatings)) / totalRatings);
  return Math.max(0, Number(((center - margin) / denominator).toFixed(6)));
}

const SCRUB_PATTERNS: readonly RegExp[] = [
  // Email addresses
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
  // URLs
  /https?:\/\/\S+/gi,
  // Phone numbers (7+ digits with optional +, spaces, hyphens, parens)
  /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,5}[\s.-]?\d{4,5}\b/g,
  // Street addresses
  /\b\d{1,5}\s+[a-zA-Z]{2,}\s+(?:st|street|ave|avenue|rd|road|blvd|boulevard|ln|lane|dr|drive|sector|marg|nagar)\b/gi,
];

/**
 * Scrubs PII (emails, phone numbers, street addresses, URLs, @handles) from opt-in community prompts (D28).
 */
export function scrubPromptPii(text: string): { text: string; piiScrubbed: boolean } {
  let scrubbed = text;
  let changed = false;

  for (const pattern of SCRUB_PATTERNS) {
    const next = scrubbed.replace(pattern, '[redacted]');
    if (next !== scrubbed) {
      changed = true;
      scrubbed = next;
    }
  }

  const handleNext = scrubbed.replace(/(^|\s)@[a-zA-Z0-9_]{2,30}\b/g, '$1[redacted]');
  if (handleNext !== scrubbed) {
    changed = true;
    scrubbed = handleNext;
  }

  const normalized = scrubbed.replace(/\s+/g, ' ').trim();
  return {
    text: normalized,
    piiScrubbed: changed,
  };
}

// ---------------------------------------------------------------------------
// Memory & Firestore Community Store Helpers
// ---------------------------------------------------------------------------

const memoryPrompts = new Map<string, CommunityPromptRecord>();
const memoryRatings = new Map<string, PromptRatingRecord>();

function ratingKey(promptId: string, uid: string): string {
  return `${promptId}:${uid}`;
}

export function resetMemoryCommunityStore(): void {
  memoryPrompts.clear();
  memoryRatings.clear();
}

export function seedMemoryCommunityPrompt(record: CommunityPromptRecord): void {
  memoryPrompts.set(record.id, structuredClone(record));
}

export function getMemoryCommunityPrompts(): CommunityPromptRecord[] {
  return Array.from(memoryPrompts.values()).map((p) => structuredClone(p));
}

function getDb() {
  if (getApps().length === 0) {
    initializeApp();
  }
  return getFirestore();
}

export async function getCommunityPromptRecord(
  promptId: string,
): Promise<CommunityPromptRecord | null> {
  if (getEnvConfig().useMemoryStore) {
    return structuredClone(memoryPrompts.get(promptId) ?? null);
  }
  const db = getDb();
  const snap = await db.collection('prompts').doc(promptId).get();
  if (!snap.exists) {
    return null;
  }
  const data = snap.data() as CommunityPromptRecord;
  const metaSnap = await db.collection('prompts_meta').doc(promptId).get();
  const meta = metaSnap.exists ? (metaSnap.data() as { authorUid?: string }) : {};
  return {
    ...data,
    authorUid: meta.authorUid ?? data.authorUid ?? '',
  };
}

export async function listCommunityPromptRecords(): Promise<CommunityPromptRecord[]> {
  if (getEnvConfig().useMemoryStore) {
    return Array.from(memoryPrompts.values()).map((p) => structuredClone(p));
  }
  const db = getDb();
  const snap = await db.collection('prompts').where('source', '==', 'COMMUNITY').get();
  return snap.docs.map((d) => d.data() as CommunityPromptRecord);
}

export async function hasDuplicatePromptHash(hash: string): Promise<boolean> {
  const starterMatch = STARTER_DECK.some((p) => fnv1aHash(p.text) === hash);
  if (starterMatch) {
    return true;
  }

  if (getEnvConfig().useMemoryStore) {
    for (const p of memoryPrompts.values()) {
      if (p.hash === hash) {
        return true;
      }
    }
    return false;
  }

  const db = getDb();
  const snap = await db.collection('prompts').where('hash', '==', hash).limit(1).get();
  return !snap.empty;
}

export async function saveCommunityPromptRecord(record: CommunityPromptRecord): Promise<void> {
  if (getEnvConfig().useMemoryStore) {
    memoryPrompts.set(record.id, structuredClone(record));
    return;
  }

  const db = getDb();
  const { authorUid, ...publicDoc } = record;
  await db.runTransaction(async (tx) => {
    tx.set(db.collection('prompts').doc(record.id), publicDoc);
    tx.set(db.collection('prompts_meta').doc(record.id), {
      authorUid,
      createdAt: record.createdAt,
    });
  });
}

export async function deleteCommunityPromptRecord(
  promptId: string,
  requesterUid: string,
): Promise<void> {
  if (getEnvConfig().useMemoryStore) {
    const existing = memoryPrompts.get(promptId);
    if (!existing) {
      throw new ArbiterError(404, 'NOT_FOUND', 'Community prompt not found');
    }
    if (existing.authorUid !== requesterUid) {
      throw new ArbiterError(403, 'FORBIDDEN', 'Only the prompt author can delete this prompt');
    }
    memoryPrompts.delete(promptId);
    for (const key of memoryRatings.keys()) {
      if (key.startsWith(`${promptId}:`)) {
        memoryRatings.delete(key);
      }
    }
    return;
  }

  const db = getDb();
  await db.runTransaction(async (tx) => {
    const promptRef = db.collection('prompts').doc(promptId);
    const metaRef = db.collection('prompts_meta').doc(promptId);
    const [promptSnap, metaSnap] = await Promise.all([tx.get(promptRef), tx.get(metaRef)]);

    if (!promptSnap.exists) {
      throw new ArbiterError(404, 'NOT_FOUND', 'Community prompt not found');
    }

    const meta = metaSnap.exists ? (metaSnap.data() as { authorUid?: string }) : {};
    const promptData = promptSnap.data() as Partial<CommunityPromptRecord>;
    const authorUid = meta.authorUid ?? promptData.authorUid;

    if (!authorUid || authorUid !== requesterUid) {
      throw new ArbiterError(403, 'FORBIDDEN', 'Only the prompt author can delete this prompt');
    }

    tx.delete(promptRef);
    tx.delete(metaRef);
  });
}

export async function rateCommunityPromptTx(
  promptId: string,
  uid: string,
  up: boolean,
): Promise<{ ok: true; ratingAgg: PromptDoc['ratingAgg'] }> {
  const nowMs = Date.now();

  if (getEnvConfig().useMemoryStore) {
    const prompt = memoryPrompts.get(promptId);
    if (!prompt) {
      throw new ArbiterError(404, 'NOT_FOUND', 'Prompt not found');
    }

    const rKey = ratingKey(promptId, uid);
    if (memoryRatings.has(rKey)) {
      throw new ArbiterError(409, 'ALREADY_RATED', 'You have already rated this prompt');
    }

    // D19: prevent rating near-duplicate prompts with the same normalized hash
    for (const existingRating of memoryRatings.values()) {
      if (existingRating.uid === uid && existingRating.hash === prompt.hash) {
        throw new ArbiterError(
          409,
          'DUPLICATE_RATING',
          'You have already rated a near-duplicate prompt',
        );
      }
    }

    const nextUp = prompt.ratingAgg.up + (up ? 1 : 0);
    const nextTotal = prompt.ratingAgg.total + 1;
    const nextAgg: PromptDoc['ratingAgg'] = {
      up: nextUp,
      total: nextTotal,
      wilsonScore: wilsonLowerBound(nextUp, nextTotal),
    };

    memoryPrompts.set(promptId, {
      ...prompt,
      ratingAgg: nextAgg,
    });
    memoryRatings.set(rKey, {
      promptId,
      uid,
      up,
      hash: prompt.hash,
      createdAt: nowMs,
    });

    return { ok: true, ratingAgg: nextAgg };
  }

  const db = getDb();
  const promptRef = db.collection('prompts').doc(promptId);
  const ratingRef = db.collection('promptRatings').doc(`${promptId}_${uid}`);

  const ratingAgg = await db.runTransaction(async (tx) => {
    const [promptSnap, ratingSnap] = await Promise.all([tx.get(promptRef), tx.get(ratingRef)]);
    if (!promptSnap.exists) {
      throw new ArbiterError(404, 'NOT_FOUND', 'Prompt not found');
    }
    if (ratingSnap.exists) {
      throw new ArbiterError(409, 'ALREADY_RATED', 'You have already rated this prompt');
    }

    const prompt = promptSnap.data() as PromptDoc;
    const dupHashSnap = await tx.get(
      db
        .collection('promptRatings')
        .where('uid', '==', uid)
        .where('hash', '==', prompt.hash)
        .limit(1),
    );
    if (!dupHashSnap.empty) {
      throw new ArbiterError(
        409,
        'DUPLICATE_RATING',
        'You have already rated a near-duplicate prompt',
      );
    }

    const nextUp = prompt.ratingAgg.up + (up ? 1 : 0);
    const nextTotal = prompt.ratingAgg.total + 1;
    const nextAgg: PromptDoc['ratingAgg'] = {
      up: nextUp,
      total: nextTotal,
      wilsonScore: wilsonLowerBound(nextUp, nextTotal),
    };

    tx.set(promptRef, { ...prompt, ratingAgg: nextAgg });
    tx.set(ratingRef, {
      promptId,
      uid,
      up,
      hash: prompt.hash,
      createdAt: nowMs,
    });

    return nextAgg;
  });

  return { ok: true, ratingAgg };
}

/**
 * Strips internal authorship fields so community prompts remain anonymous to clients (D9).
 */
export function toPublicPromptDoc(record: CommunityPromptRecord): PromptDoc {
  return {
    id: record.id,
    text: record.text,
    kind: record.kind,
    tier: record.tier,
    dareType: record.dareType,
    pack: record.pack,
    source: record.source,
    ratingAgg: { ...record.ratingAgg },
    hash: record.hash,
  };
}

/**
 * Opt-in helper to submit a prompt to the community deck with PII scrubbing,
 * deterministic moderation, and near-duplicate hash detection (D19, D28).
 */
export async function optInCommunityPrompt(params: {
  uid: string;
  text: string;
  kind: PromptKind;
  tier?: Tier;
  dareType?: DareType | null;
  store?: ArbiterStore;
}): Promise<{ prompt: PromptDoc; piiScrubbed: boolean }> {
  const { text: scrubbedText, piiScrubbed } = scrubPromptPii(params.text);

  const modResult = checkDeterministicModeration(scrubbedText);
  if (!modResult.allowed) {
    throw new ArbiterError(
      400,
      'VALIDATION_ERROR',
      modResult.reason ?? 'Prompt failed moderation',
    );
  }

  const hash = fnv1aHash(scrubbedText);
  if (await hasDuplicatePromptHash(hash)) {
    throw new ArbiterError(
      409,
      'DUPLICATE_PROMPT',
      'A matching or near-duplicate prompt already exists',
    );
  }

  const nowMs = Date.now();
  const record: CommunityPromptRecord = {
    id: `comm_${randomUUID()}`,
    text: scrubbedText,
    kind: params.kind,
    tier: params.tier ?? 'MILD',
    dareType: params.kind === 'DARE' ? (params.dareType ?? 'INSTANT') : null,
    pack: 'community',
    source: 'COMMUNITY',
    ratingAgg: {
      up: 0,
      total: 0,
      wilsonScore: 0,
    },
    hash,
    authorUid: params.uid,
    createdAt: nowMs,
    piiScrubbed,
  };

  await saveCommunityPromptRecord(record);

  if (params.store) {
    await params.store.runTransaction(async (tx) => {
      const txNow = tx.now();
      const existingUser = await tx.getUser(params.uid);
      tx.setUser(params.uid, {
        uid: params.uid,
        lifetimeXp: existingUser?.lifetimeXp ?? 0,
        level: existingUser?.level ?? 1,
        skins: existingUser?.skins ?? ['amber'],
        optIns: {
          communityDeck: true,
          analytics: existingUser?.optIns?.analytics ?? true,
        },
        updatedAt: txNow,
      });
    });
  }

  return {
    prompt: toPublicPromptDoc(record),
    piiScrubbed,
  };
}

function starterFallbackPrompts(
  count: number,
  excludeIds: ReadonlySet<string>,
  excludeHashes: ReadonlySet<string>,
  kind?: PromptKind,
  tier?: Tier,
): PromptDoc[] {
  if (count <= 0) {
    return [];
  }

  const out: PromptDoc[] = [];
  for (const starter of STARTER_DECK) {
    if (out.length >= count) break;
    if (kind && starter.kind !== kind) continue;
    if (tier && starter.tier !== tier) continue;
    if (excludeIds.has(starter.id)) continue;

    const hash = fnv1aHash(starter.text);
    if (excludeHashes.has(hash)) continue;

    out.push({
      id: starter.id,
      text: starter.text,
      kind: starter.kind,
      tier: starter.tier,
      dareType: starter.dareType,
      pack: starter.pack,
      source: 'CURATED',
      ratingAgg: {
        up: 0,
        total: 0,
        wilsonScore: 0,
      },
      hash,
    });
  }

  return out;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method === 'POST') {
    await withArbiterAuth(req, res, SubmitCommunitySchema, async ({ uid, body, store }) => {
      const created = await optInCommunityPrompt({
        uid,
        text: body.text,
        kind: body.kind,
        tier: body.tier,
        dareType: body.dareType,
        store,
      });

      return {
        status: 201,
        body: {
          ok: true,
          prompt: created.prompt,
          piiScrubbed: created.piiScrubbed,
        },
      };
    });
    return;
  }

  await withArbiterGet(req, res, async ({ req: getReq }) => {
    const parsedQuery = CommunityQuerySchema.safeParse(getReq.query ?? {});
    if (!parsedQuery.success) {
      const issue = parsedQuery.error.issues[0];
      throw new ArbiterError(
        400,
        'VALIDATION_ERROR',
        issue ? `${issue.path.join('.')}: ${issue.message}` : 'Invalid query parameters',
      );
    }

    const { kind, tier, limit, cursor } = parsedQuery.data;
    const allCommunity = await listCommunityPromptRecords();

    // B9: Community deck unlocks only prompts with 20+ ratings, ranked by Wilson lower-bound (D19)
    const eligible = allCommunity
      .filter((p) => {
        if (p.ratingAgg.total < COMMUNITY_MIN_RATINGS) return false;
        if (kind && p.kind !== kind) return false;
        if (tier && p.tier !== tier) return false;
        return true;
      })
      .map((p) => ({
        ...p,
        ratingAgg: {
          ...p.ratingAgg,
          wilsonScore: wilsonLowerBound(p.ratingAgg.up, p.ratingAgg.total),
        },
      }))
      .sort((a, b) => {
        if (b.ratingAgg.wilsonScore !== a.ratingAgg.wilsonScore) {
          return b.ratingAgg.wilsonScore - a.ratingAgg.wilsonScore;
        }
        if (b.ratingAgg.total !== a.ratingAgg.total) {
          return b.ratingAgg.total - a.ratingAgg.total;
        }
        return a.id.localeCompare(b.id);
      });

    let startIdx = 0;
    if (cursor) {
      const foundIdx = eligible.findIndex((p) => p.id === cursor);
      startIdx = foundIdx >= 0 ? foundIdx + 1 : 0;
    }

    const pageCommunity = eligible.slice(startIdx, startIdx + limit).map(toPublicPromptDoc);
    const hasMoreCommunity = startIdx + limit < eligible.length;
    const nextCursor =
      hasMoreCommunity && pageCommunity.length > 0
        ? pageCommunity[pageCommunity.length - 1]!.id
        : null;

    let items: PromptDoc[] = pageCommunity;
    if (items.length < limit && !hasMoreCommunity) {
      const excludeIds = new Set(items.map((p) => p.id));
      const excludeHashes = new Set(items.map((p) => p.hash));
      const fallback = starterFallbackPrompts(
        limit - items.length,
        excludeIds,
        excludeHashes,
        kind,
        tier,
      );
      items = [...items, ...fallback];
    }

    return {
      status: 200,
      body: {
        items,
        nextCursor,
      },
    };
  });
}
