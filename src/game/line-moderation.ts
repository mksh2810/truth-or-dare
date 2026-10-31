/**
 * Pure functions for Judge Line (Owl Take) validation, moderation,
 * promotion, and runtime selection (LEARN-6 to LEARN-9).
 */

export interface JudgeLineCandidate {
  id: string;
  text: string;
  language: 'en' | 'hi';
  verdictContext: 'FINE' | 'NOPE' | 'TOO_MILD' | 'NOT_DOABLE';
  tier: 'mild' | 'spicy' | 'legend';
  embedding: number[];
  up: number;
  down: number;
  distinctRaters: number;
  voterUids: string[];
  uses: number;
  lastUsedAt?: string;
  reports: number;
  status: 'candidate' | 'promoted' | 'retired' | 'rejected';
  createdAt: string;
}

// Basic Hinglish marker words
const HINGLISH_MARKERS = [
  'bhai', 'yaar', 'isme', 'kuch', 'hoga', 'nahi', 'nani', 'thoda', 'masala',
  'karega', 'kar', 'chalta', 'hai', 'bahut', 'koi', 'aur', 'karo', 'apna',
];

/**
 * Detects whether an owl take is predominantly English or Hinglish.
 */
export function detectLanguage(text: string): 'en' | 'hi' {
  const words = text.toLowerCase().split(/\s+/);
  const matchCount = words.filter((w) => HINGLISH_MARKERS.includes(w)).length;
  return matchCount > 0 ? 'hi' : 'en';
}

// Disallowed prompt-injection markers
const INJECTION_PATTERNS = [
  /system\s*prompt/i,
  /ignore\s+(all\s+)?(previous|above)\s+instructions/i,
  /you\s+are\s+now/i,
  /<script>/i,
  /reveal\s+(the\s+)?api\s*key/i,
  /mode\s*:\s*override/i,
];

// Target words attacking the player rather than mocking the chit
const PLAYER_ATTACK_PATTERNS = [
  /you\s+are\s+(ugly|stupid|fat|dumb|idiot|loser)/i,
  /kill\s+yourself/i,
  /die/i,
  /hate\s+you/i,
];

/**
 * Validates an Owl take before LLM check.
 * Strictly enforces mocking the chit, never the player, and blocks prompt injection.
 */
export function validateOwlTake(text: string): { valid: boolean; reason?: string } {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { valid: false, reason: 'Owl take cannot be empty' };
  }
  if (trimmed.length > 80) {
    return { valid: false, reason: 'Owl take must be 80 characters or fewer' };
  }

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { valid: false, reason: 'Take contains restricted command or injection text' };
    }
  }

  for (const pattern of PLAYER_ATTACK_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { valid: false, reason: 'Roast must mock the chit, never attack the player' };
    }
  }

  return { valid: true };
}

/**
 * Evaluates whether an Owl line should be promoted or retired (LEARN-8):
 * - Promoted: up >= 3, distinctRaters >= 3, up / (up + down) >= 0.7, reports == 0
 * - Retired: after >= 8 votes, up / (up + down) < 0.4
 */
export function evaluateLineStatus(
  line: JudgeLineCandidate
): 'promoted' | 'retired' | 'candidate' | 'rejected' {
  if (line.status === 'rejected') return 'rejected';

  const total = line.up + line.down;
  if (total === 0) return 'candidate';

  const ratio = line.up / total;

  if (line.status === 'candidate') {
    if (line.up >= 3 && line.distinctRaters >= 3 && ratio >= 0.7 && line.reports === 0) {
      return 'promoted';
    }
  } else if (line.status === 'promoted') {
    if (total >= 8 && ratio < 0.4) {
      return 'retired';
    }
  }

  return line.status;
}

/**
 * Line repetition guard (LEARN-9):
 * Decides whether a promoted line can be used verbatim in a room:
 * - Similarity to current chit must be > 0.75
 * - Must not have been used in this room already
 */
export function canUseLineVerbatim(
  similarity: number,
  lineId: string,
  usedLineIdsInRoom: string[]
): boolean {
  if (usedLineIdsInRoom.includes(lineId)) return false;
  return similarity > 0.75;
}
