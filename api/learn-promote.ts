import { meetsPromotionCriteria, ChitCandidate } from '../src/game/learning-rules';
import { evaluateLineStatus, JudgeLineCandidate } from '../src/game/line-moderation';

export interface PromotionReport {
  promotedChits: ChitCandidate[];
  rejectedChits: ChitCandidate[];
  promotedLines: JudgeLineCandidate[];
  retiredLines: JudgeLineCandidate[];
}

/**
 * Serverless / Scheduled routine to promote qualifying candidates
 * to the Community Deck (LEARN-5) and Owl Lines (LEARN-8).
 */
export async function evaluatePromotions(
  candidateChits: ChitCandidate[],
  candidateLines: JudgeLineCandidate[]
): Promise<PromotionReport> {
  const promotedChits: ChitCandidate[] = [];
  const rejectedChits: ChitCandidate[] = [];
  const promotedLines: JudgeLineCandidate[] = [];
  const retiredLines: JudgeLineCandidate[] = [];

  // Evaluate chits
  for (const chit of candidateChits) {
    if (chit.status === 'candidate') {
      const check = meetsPromotionCriteria(chit);
      if (check.eligible) {
        promotedChits.push({
          ...chit,
          status: 'promoted',
          promotedAt: new Date().toISOString(),
        });
      }
    }
  }

  // Evaluate owl lines
  for (const line of candidateLines) {
    const nextStatus = evaluateLineStatus(line);
    if (nextStatus === 'promoted' && line.status !== 'promoted') {
      promotedLines.push({ ...line, status: 'promoted' });
    } else if (nextStatus === 'retired' && line.status !== 'retired') {
      retiredLines.push({ ...line, status: 'retired' });
    }
  }

  return {
    promotedChits,
    rejectedChits,
    promotedLines,
    retiredLines,
  };
}

export default async function handler(req: any, res: any) {
  try {
    const { chits = [], lines = [] } = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const report = await evaluatePromotions(chits, lines);
    return res.status(200).json(report);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
