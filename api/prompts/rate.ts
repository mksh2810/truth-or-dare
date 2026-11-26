import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { IdempotencyKeySchema } from '@vowlet/shared';
import { withArbiterAuth } from '../_lib/middleware.js';
import { rateCommunityPromptTx } from './community.js';

const RatePromptSchema = z.object({
  idempotencyKey: IdempotencyKeySchema,
  promptId: z.string().trim().min(1).max(128),
  up: z.boolean(),
});

/**
 * `POST /api/prompts/rate`
 * Submits one rating per UID per prompt (`up: boolean`), updating `ratingAgg`
 * and `wilsonScore` transactionally, with near-duplicate hash enforcement (D19).
 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await withArbiterAuth(req, res, RatePromptSchema, async ({ uid, body }) => {
    const result = await rateCommunityPromptTx(body.promptId, uid, body.up);
    return {
      status: 200,
      body: result,
    };
  });
}
