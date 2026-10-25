export interface RankTier {
  minLevel: number;
  maxLevel: number;
  title: string;
}

export const RANKS: RankTier[] = [
  { minLevel: 1, maxLevel: 2, title: 'Fresh Chit' },
  { minLevel: 3, maxLevel: 4, title: 'Table Warmer' },
  { minLevel: 5, maxLevel: 7, title: 'Mild Troublemaker' },
  { minLevel: 8, maxLevel: 10, title: 'Certified Menace' },
  { minLevel: 11, maxLevel: 14, title: 'Spice Merchant' },
  { minLevel: 15, maxLevel: 19, title: 'Dare Devil' },
  { minLevel: 20, maxLevel: 999, title: 'Legend of the Table' },
];

export function getRankTitle(level: number): string {
  const match = RANKS.find((r) => level >= r.minLevel && level <= r.maxLevel);
  return match ? match.title : 'Legend of the Table';
}

export interface CosmeticUnlock {
  level: number;
  type: 'bottle' | 'stamp' | 'chitColor';
  name: string;
  description: string;
}

export const COSMETIC_UNLOCKS: CosmeticUnlock[] = [
  { level: 2, type: 'bottle', name: 'Green Glass Bottle', description: 'Fresh green glass with tavern charm' },
  { level: 4, type: 'bottle', name: 'Amber Bottle', description: 'Warm apothecary amber vintage' },
  { level: 6, type: 'chitColor', name: 'Pastel Chit Pack', description: 'Soft mint and lavender chit paper' },
  { level: 8, type: 'stamp', name: 'Extra Stamp Pack', description: 'Retro grunge inked seals' },
  { level: 10, type: 'bottle', name: 'Golden Bottle', description: 'Gilded bottle with legendary shine' },
];
