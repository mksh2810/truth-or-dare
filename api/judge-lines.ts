import { validateOwlTake, detectLanguage } from '../src/game/line-moderation';
import { getEmbedding } from './_embed';

// Rate limiter: in-memory tracking of recent takes per user (max 5 per user per hour)
const takeRateLimitMap = new Map<string, number[]>();

export function checkTakeRateLimit(uid: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  const timestamps = (takeRateLimitMap.get(uid) || []).filter((t) => now - t < windowMs);

  if (timestamps.length >= 5) {
    return false; // Rate limit exceeded (LEARN-9: 5 takes/user/hr)
  }

  timestamps.push(now);
  takeRateLimitMap.set(uid, timestamps);
  return true;
}

export interface SubmitTakePayload {
  authorUid: string;
  chitText: string;
  takeText: string;
  verdictContext: 'FINE' | 'NOPE' | 'TOO_MILD' | 'NOT_DOABLE';
  tier: 'mild' | 'spicy' | 'legend';
}

/**
 * Handles validation and storage of player-submitted Owl roast lines (LEARN-7).
 */
export async function processOwlTake(payload: SubmitTakePayload) {
  // Check server-side kill switch (LEARN-9)
  const learningEnabled = process.env.LEARNING_ENABLED !== 'false';
  if (!learningEnabled) {
    return { success: false, reason: 'Learning system is temporarily disabled' };
  }

  // Rate limit check
  if (!checkTakeRateLimit(payload.authorUid)) {
    return { success: false, reason: 'Rate limit reached: Max 5 owl takes per hour' };
  }

  // Pure validation: length, injection, personal attacks
  const valResult = validateOwlTake(payload.takeText);
  if (!valResult.valid) {
    return { success: false, reason: valResult.reason };
  }

  const language = detectLanguage(payload.takeText);
  const embedding = await getEmbedding(payload.takeText);

  const candidateRecord = {
    text: payload.takeText.trim(),
    language,
    verdictContext: payload.verdictContext,
    tier: payload.tier,
    embedding,
    up: 0,
    down: 0,
    distinctRaters: 0,
    voterUids: [],
    uses: 0,
    reports: 0,
    status: 'candidate',
    createdAt: new Date().toISOString(),
  };

  return {
    success: true,
    candidate: candidateRecord,
  };
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const result = await processOwlTake(payload);
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
