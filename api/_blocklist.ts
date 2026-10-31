/**
 * Server-only prefilter blocklist (PACK.md 5.8, CHIT-6).
 * Kept completely out of client bundle.
 */

// Normalization: lower-case, remove accents, map look-alikes, collapse whitespace
export function normalizeChitText(raw: string): string {
  let text = raw.toLowerCase().trim();

  // Remove diacritics / accents
  text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Map look-alike characters (0 to o, 1 to i, 3 to e, 4 to a, 5 to s, @ to a, $ to s)
  text = text
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/@/g, 'a')
    .replace(/\$/g, 's');

  // Collapse whitespace
  text = text.replace(/\s+/g, ' ');

  return text;
}

// Regex patterns for CHIT-6: phone numbers, emails, URLs, social handles, addresses
const PHONE_PATTERN = /(\+?\d{1,4}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/;
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const URL_PATTERN = /(https?:\/\/|www\.)[^\s]+|[a-zA-Z0-9.-]+\.(com|org|net|io|co|in|app)\b/i;
const HANDLE_PATTERN = /@[a-zA-Z0-9_]{3,}/;

// Blocked keywords/phrases categories: physical danger, illegal, explicit, harassment, self-harm, alcohol, drugs
const PROHIBITED_WORDS = [
  // Violence & physical danger
  'kill', 'murder', 'stab', 'poison', 'jump off', 'cut yourself', 'burn', 'strangle', 'choke',
  'punch', 'slap hard', 'bleed', 'weapon', 'gun', 'knife', 'dish soap', 'detergent', 'bleach',
  'drive your car', 'eyes closed while driving',
  // Self-harm
  'suicide', 'self harm', 'end my life', 'slit',
  // Sexual & explicit content
  'naked', 'nude', 'strip', 'sex', 'blowjob', 'handjob', 'orgasm', 'porn', 'undress', 'genitals', 'dick', 'pussy', 'penis', 'vagina', 'send nudes', 'take off all your clothes', 'take off your clothes',
  // Drugs & Alcohol (Rule 8: Zero alcohol or drinking)
  'alcohol', 'beer', 'vodka', 'whiskey', 'rum', 'tequila', 'wine', 'shots', 'drunk', 'drink a glass of wine',
  'drugs', 'cocaine', 'weed', 'marijuana', 'heroin', 'ecstasy', 'vape', 'smoke',
  // Third-party harassment & humiliation
  'call your ex', 'text your ex', 'call your mom and tell her you are pregnant', 'call your boss', 'text your boss', 'quit your job', '911', 'prank call', 'prank call 911', 'prank call police', 'harass',
  // Minors exploitation
  'underage', 'with a minor', 'touch a minor',
];

export interface PrefilterResult {
  blocked: boolean;
  reason?: string;
  category?: 'danger' | 'explicit' | 'substances' | 'pii' | 'harassment';
}

export function checkBlocklist(rawText: string): PrefilterResult {
  const norm = normalizeChitText(rawText);

  // CHIT-6: Check PII (Phone, Email, Link, Handle)
  if (PHONE_PATTERN.test(rawText)) {
    return { blocked: true, reason: 'Chits cannot include phone numbers (CHIT-6).', category: 'pii' };
  }
  if (EMAIL_PATTERN.test(rawText)) {
    return { blocked: true, reason: 'Chits cannot include email addresses (CHIT-6).', category: 'pii' };
  }
  if (URL_PATTERN.test(rawText)) {
    return { blocked: true, reason: 'Chits cannot include external links (CHIT-6).', category: 'pii' };
  }
  if (HANDLE_PATTERN.test(rawText)) {
    return { blocked: true, reason: 'Chits cannot include social handles or usernames (CHIT-6).', category: 'pii' };
  }

  // Check prohibited words
  for (const word of PROHIBITED_WORDS) {
    const wordPattern = new RegExp(`\\b${word}\\b`, 'i');
    if (wordPattern.test(norm) || norm.includes(word)) {
      if (word.includes('beer') || word.includes('alcohol') || word.includes('drunk') || word.includes('shots') || word.includes('wine')) {
        return { blocked: true, reason: 'Drinking and alcohol content is strictly prohibited.', category: 'substances' };
      }
      if (word.includes('kill') || word.includes('stab') || word.includes('cut') || word.includes('suicide') || word.includes('choke')) {
        return { blocked: true, reason: 'Physical danger and self-harm chits are strictly forbidden.', category: 'danger' };
      }
      if (word.includes('naked') || word.includes('nude') || word.includes('strip') || word.includes('sex')) {
        return { blocked: true, reason: 'Explicit and nudity content is not allowed.', category: 'explicit' };
      }
      return { blocked: true, reason: 'Nope. Someone ends up in the ER with this one.', category: 'danger' };
    }
  }

  return { blocked: false };
}
