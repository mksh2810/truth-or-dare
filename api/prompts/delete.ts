import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { IdempotencyKeySchema } from '@vowlet/shared';
import { withArbiterAuth } from '../_lib/middleware.js';
import { deleteCommunityPromptRecord } from './community.js';

const DeletePromptSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  promptId: z.string().trim().min(1).max(128),
});

/**
 * `POST /api/prompts/delete`
 * Author-only deletion of an opt-in community prompt (D28).
 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await withArbiterAuth(req, res, DeletePromptSchema, async ({ uid, body }) => {
    await deleteCommunityPromptRecord(body.promptId, uid);
    return {
      status: 200,
      body: {
        ok: true,
        promptId: body.promptId,
        deleted: true,
      },
    };
  });
}
