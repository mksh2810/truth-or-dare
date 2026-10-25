import { TablePlayer } from '../components/TableView';

export const MOCK_USER = {
  uid: 'user-felix-123',
  displayName: 'Felix',
  avatarId: 'fox',
  isGuest: false,
  level: 6,
  xp: 420,
  neededXp: 600,
  gamesPlayed: 14,
  passes: 38,
  fails: 4,
  bestStreak: 7,
  equipped: {
    bottle: 'green',
    stamp: 'default',
  },
};

export const MOCK_PLAYERS: TablePlayer[] = [
  { uid: 'u1', name: 'Felix', avatarId: 'fox', state: 'ready', isHost: true },
  { uid: 'u2', name: 'Rohan', avatarId: 'owl', state: 'idle' },
  { uid: 'u3', name: 'Aman', avatarId: 'frog', state: 'ready' },
  { uid: 'u4', name: 'Zoya', avatarId: 'cat', state: 'ready' },
  { uid: 'u5', name: 'Priya', avatarId: 'rabbit', state: 'ready' },
];

export const MOCK_CHITS = {
  truth: {
    id: 'chit-t1',
    type: 'truth' as const,
    text: 'What is the most embarrassing thing currently in your search history?',
  },
  dare: {
    id: 'chit-d1',
    type: 'dare' as const,
    text: 'Do your best runway model walk across the room while giving a dramatic speech.',
  },
  rejected: {
    id: 'chit-rej',
    type: 'dare' as const,
    text: 'Drink two glasses of soda in five seconds.',
  },
};

export const MOCK_SUGGESTIONS = [
  'Show the last 3 photos in your camera roll to everyone.',
  'Speak in an over-the-top British royal accent for the next 2 turns.',
  'Let the player to your left send a one-word text to anyone in your contacts.',
  'Hold a plank position for 45 seconds while telling a funny story.',
];

export const MOCK_BOTTLES = [
  { id: 'default', name: 'Vintage Tavern Bottle', skin: 'default' as const, level: 1, unlocked: true },
  { id: 'green', name: 'Green Glass Bottle', skin: 'green' as const, level: 2, unlocked: true },
  { id: 'amber', name: 'Amber Apothecary Bottle', skin: 'amber' as const, level: 4, unlocked: true },
  { id: 'gold', name: 'Golden Champion Bottle', skin: 'gold' as const, level: 10, unlocked: false },
  { id: 'neon', name: 'Cyber Neon Glass', skin: 'green' as const, level: 12, unlocked: false },
  { id: 'crystal', name: 'Obsidian Crystal', skin: 'amber' as const, level: 15, unlocked: false },
];
