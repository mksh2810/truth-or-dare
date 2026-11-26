import type { DareType, PackId, PromptKind, ResultStamp, Tier } from '@vowlet/shared';

export interface StarterPrompt {
  id: string;
  text: string;
  kind: PromptKind;
  tier: Tier;
  dareType: DareType | null;
  pack: PackId;
}

export const STARTER_DECK: readonly StarterPrompt[] = [
  // TRUTHS - friends
  {
    id: 'starter_t_1',
    text: 'What is the most harmless lie you told someone at this table?',
    kind: 'TRUTH',
    tier: 'MILD',
    dareType: null,
    pack: 'friends',
  },
  {
    id: 'starter_t_2',
    text: 'Which song on your playlist would embarrass you most if it played right now?',
    kind: 'TRUTH',
    tier: 'MILD',
    dareType: null,
    pack: 'friends',
  },
  {
    id: 'starter_t_3',
    text: 'Who here would survive the longest in a zombie apocalypse, and who goes first?',
    kind: 'TRUTH',
    tier: 'MILD',
    dareType: null,
    pack: 'friends',
  },
  {
    id: 'starter_t_4',
    text: 'What is a petty opinion you will defend with your whole heart?',
    kind: 'TRUTH',
    tier: 'SPICY',
    dareType: null,
    pack: 'friends',
  },
  {
    id: 'starter_t_5',
    text: 'What is the longest you have left someone on read and why?',
    kind: 'TRUTH',
    tier: 'SPICY',
    dareType: null,
    pack: 'friends',
  },
  {
    id: 'starter_t_6',
    text: 'If you had to swap lives with one person at this table for a week, who and why?',
    kind: 'TRUTH',
    tier: 'SPICY',
    dareType: null,
    pack: 'friends',
  },
  {
    id: 'starter_t_7',
    text: 'What is the boldest thing you ever did just to impress someone?',
    kind: 'TRUTH',
    tier: 'LEGEND',
    dareType: null,
    pack: 'friends',
  },
  {
    id: 'starter_t_8',
    text: 'What is one secret talent nobody at this table knows you have?',
    kind: 'TRUTH',
    tier: 'MILD',
    dareType: null,
    pack: 'office-safe',
  },
  {
    id: 'starter_t_9',
    text: 'What was your most chaotic travel or trip mishap?',
    kind: 'TRUTH',
    tier: 'MILD',
    dareType: null,
    pack: 'trip',
  },
  {
    id: 'starter_t_10',
    text: 'Sach batao: group chat mein sabse zyada drama kaun shuru karta hai?',
    kind: 'TRUTH',
    tier: 'SPICY',
    dareType: null,
    pack: 'hinglish-special',
  },
  {
    id: 'starter_t_11',
    text: 'What is the sweetest thing someone at this table has done for you?',
    kind: 'TRUTH',
    tier: 'MILD',
    dareType: null,
    pack: 'couples',
  },
  {
    id: 'starter_t_12',
    text: 'What is one habit you thought you hid well that everyone actually notices?',
    kind: 'TRUTH',
    tier: 'SPICY',
    dareType: null,
    pack: 'friends',
  },

  // DARES - friends & others
  {
    id: 'starter_d_1',
    text: 'Give a 15-second dramatic movie trailer voiceover about the person to your left.',
    kind: 'DARE',
    tier: 'MILD',
    dareType: 'INSTANT',
    pack: 'friends',
  },
  {
    id: 'starter_d_2',
    text: 'Speak in a news-anchor voice until your next turn.',
    kind: 'DARE',
    tier: 'MILD',
    dareType: 'INSTANT',
    pack: 'friends',
  },
  {
    id: 'starter_d_3',
    text: 'Do your best impression of a celebrity chef plating a glass of water.',
    kind: 'DARE',
    tier: 'MILD',
    dareType: 'INSTANT',
    pack: 'office-safe',
  },
  {
    id: 'starter_d_4',
    text: 'Show the 4th photo in your camera roll (skip if private) and tell the backstory.',
    kind: 'DARE',
    tier: 'SPICY',
    dareType: 'INSTANT',
    pack: 'friends',
  },
  {
    id: 'starter_d_5',
    text: 'Send a voice note to a sibling or close friend saying only: "I know what you did."',
    kind: 'DARE',
    tier: 'SPICY',
    dareType: 'SOCIAL',
    pack: 'friends',
  },
  {
    id: 'starter_d_6',
    text: 'Serenade the water bottle in the center of the table for 10 seconds.',
    kind: 'DARE',
    tier: 'MILD',
    dareType: 'INSTANT',
    pack: 'friends',
  },
  {
    id: 'starter_d_7',
    text: 'Let the table pick a wholesome emoji; reply with only that emoji to your last message.',
    kind: 'DARE',
    tier: 'SPICY',
    dareType: 'SOCIAL',
    pack: 'friends',
  },
  {
    id: 'starter_d_8',
    text: 'Hold a plank or wall-sit for 20 seconds while reciting the alphabet backwards.',
    kind: 'DARE',
    tier: 'LEGEND',
    dareType: 'INSTANT',
    pack: 'trip',
  },
  {
    id: 'starter_d_9',
    text: 'Filmy style mein table ke sabse quiet player ko ek 10-second compliment do.',
    kind: 'DARE',
    tier: 'MILD',
    dareType: 'INSTANT',
    pack: 'hinglish-special',
  },
  {
    id: 'starter_d_10',
    text: 'Maintain serious eye contact with the person across from you without laughing for 15s.',
    kind: 'DARE',
    tier: 'MILD',
    dareType: 'INSTANT',
    pack: 'couples',
  },
  {
    id: 'starter_d_11',
    text: 'Read your last 3 search history entries out loud (skip anything private).',
    kind: 'DARE',
    tier: 'SPICY',
    dareType: 'INSTANT',
    pack: 'friends',
  },
  {
    id: 'starter_d_12',
    text: 'Balance a spoon or coaster on your nose for 10 seconds without using your hands.',
    kind: 'DARE',
    tier: 'MILD',
    dareType: 'INSTANT',
    pack: 'friends',
  },
];

export const OWL_RESULT_LINES: Readonly<Record<ResultStamp, readonly string[]>> = {
  PASSED: [
    'Clean execution! The Owl tips his top hat.',
    'The table approves. Boldly done!',
    'Pure grace under pressure. Points sealed!',
  ],
  'NOT IT': [
    'The witnesses squinted and said... not quite.',
    'Valiant effort, zero points. Shake it off!',
    'Oof, tough crowd tonight. Next spin awaits.',
  ],
  SPLIT: [
    'A house divided! Half points, streak intact.',
    'Too close to call — the Owl splits the difference.',
    'Halfway there! Your streak lives to fight another round.',
  ],
  SKIPPED: [
    'Discretion is the better part of valor. Onward!',
    'Passed on the trouble, kept the peace.',
    'A strategic retreat. The bottle remembers.',
  ],
  STALLED: [
    'Time slipped away while the table waited.',
    'Too slow on the draw! The Owl keeps the night moving.',
    'Clocked out by the table. Next round!',
  ],
};

export function pickOwlLine(stamp: ResultStamp, seed = 0): string {
  const lines = OWL_RESULT_LINES[stamp];
  const idx = Math.abs(seed) % lines.length;
  return lines[idx] ?? lines[0] ?? 'The Owl watches.';
}

export function getStarterDeckForPacks(packIds: readonly string[]): StarterPrompt[] {
  const filtered = STARTER_DECK.filter((p) => packIds.includes(p.pack));
  return filtered.length >= 6 ? [...filtered] : [...STARTER_DECK];
}
