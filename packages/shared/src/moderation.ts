export const MAX_CHIT_LENGTH = 140;

export type ModerationCategory =
  | 'LENGTH'
  | 'PII'
  | 'ALCOHOL_DRUGS'
  | 'MINORS'
  | 'SEXUAL'
  | 'VIOLENCE_SELF_HARM'
  | 'UNSAFE_DARE'
  | 'HATE_SLURS';

export interface ModerationResult {
  allowed: boolean;
  reason: string | null;
  categories: ModerationCategory[];
}

/**
 * Normalizes prompt text for deterministic hashing and near-duplicate detection.
 */
export function normalizeTextForHash(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Synchronous 32-bit FNV-1a hex hash for fast client/server normalized-text keys.
 */
export function fnv1aHash(text: string): string {
  const normalized = normalizeTextForHash(text);
  let hash = 0x811c9dc5;
  for (let i = 0; i < normalized.length; i += 1) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Computes SHA-256 hex digest of normalized text using Web Crypto API.
 */
export async function sha256Hex(text: string): Promise<string> {
  const normalized = normalizeTextForHash(text);
  const bytes = new TextEncoder().encode(normalized);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

const PII_PATTERNS: readonly RegExp[] = [
  // Email addresses
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i,
  // Phone numbers (7+ digits with optional +, spaces, hyphens, parens; covers 5+5 Indian & 3+3+4 US formats)
  /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,5}[\s.-]?\d{4,5}\b/,
  // Street addresses
  /\b\d{1,5}\s+[a-zA-Z]{2,}\s+(?:st|street|ave|avenue|rd|road|blvd|boulevard|ln|lane|dr|drive|sector|marg|nagar)\b/i,
];

const ALCOHOL_DRUG_PATTERN =
  /\b(?:beer|vodka|tequila|whiskey|whisky|rum|gin|wine|shots?|drunk|wasted|chug|weed|ganja|marijuana|charas|bhang|cocaine|meth|mdma|ecstasy|lsd|vape|cigarette|smoke|daru|daaru|sharab|sharaab|sutta|nashe|nasha|botal|theka)\b/i;

const MINORS_PATTERN =
  /\b(?:minor|underage|child|children|kid|kids|schoolgirl|schoolboy|loli|baccha|bacha|bachi|bacchi|teenage|teen)\b/i;

const SEXUAL_PATTERN =
  /\b(?:porn|nude|nudes|naked|sext|sexting|blowjob|handjob|intercourse|orgy|strip|topless|lingerie|boobs|tits|dick|cock|pussy|chut|lund|land|chudai|randi|kotha|suhaagrat)\b/i;

const VIOLENCE_SELF_HARM_PATTERN =
  /\b(?:kill|murder|stab|shoot|suicide|self[- ]?harm|cut yourself|overdose|hang yourself|slit|bleed|mar ja|marja|jaan le|khoon|aatmahatya)\b/i;

const UNSAFE_DARE_PATTERN =
  /\b(?:trespass|break into|drive drunk|drunk driving|set fire|lighter|burn|climb (?:the )?roof|jump off|balcony|ledge|swallow|eat soap|bleach|detergent|tide pod|harass|slap a stranger|steal|shoplift|flash someone)\b/i;

const HATE_SLUR_PATTERN =
  /\b(?:bhenchod|behenchod|madarchod|chutiya|bhosdike|bsdk|mc|bc|gandu|harami|kamina|kutta|chakka|faggot|nigger|retard)\b/i;

/**
 * Deterministic Stage-1 Judge Owl safety filter (D11 / Section 5.5 step 1).
 * Covers max 140 chars, PII, alcohol/drugs, minors, sexual content,
 * violence/self-harm, unsafe dares, and English + Hinglish slurs.
 */
export function checkDeterministicModeration(text: string): ModerationResult {
  const trimmed = text.trim();
  const categories: ModerationCategory[] = [];

  if (trimmed.length === 0 || trimmed.length > MAX_CHIT_LENGTH) {
    categories.push('LENGTH');
  }

  if (PII_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    categories.push('PII');
  }

  if (ALCOHOL_DRUG_PATTERN.test(trimmed)) {
    categories.push('ALCOHOL_DRUGS');
  }

  if (MINORS_PATTERN.test(trimmed)) {
    categories.push('MINORS');
  }

  if (SEXUAL_PATTERN.test(trimmed)) {
    categories.push('SEXUAL');
  }

  if (VIOLENCE_SELF_HARM_PATTERN.test(trimmed)) {
    categories.push('VIOLENCE_SELF_HARM');
  }

  if (UNSAFE_DARE_PATTERN.test(trimmed)) {
    categories.push('UNSAFE_DARE');
  }

  if (HATE_SLUR_PATTERN.test(trimmed)) {
    categories.push('HATE_SLURS');
  }

  if (categories.length === 0) {
    return { allowed: true, reason: null, categories: [] };
  }

  const reasonMap: Record<ModerationCategory, string> = {
    LENGTH: 'Keep chits between 1 and 140 characters.',
    PII: 'No phone numbers, emails, or addresses on the table.',
    ALCOHOL_DRUGS: 'Vowlet tables stay alcohol- and drug-free.',
    MINORS: 'Keep prompts strictly 18+ and never involve minors.',
    SEXUAL: 'Keep prompts spicy without crossing into explicit sexual content.',
    VIOLENCE_SELF_HARM: 'No violence or self-harm allowed.',
    UNSAFE_DARE: 'Dares must be safe—no trespass, fire, heights, or harm.',
    HATE_SLURS: 'Keep the table friendly—no slurs or hate speech.',
  };

  const primary = categories[0] as ModerationCategory;
  return {
    allowed: false,
    reason: reasonMap[primary],
    categories,
  };
}
