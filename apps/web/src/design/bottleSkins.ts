export type BottleSkinId = 'amber' | 'brass' | 'emerald' | 'crimson';

export interface BottleSkinMeta {
  id: BottleSkinId;
  name: string;
  unlockLevel: number;
  bodyFill: string;
  highlightStroke: string;
  capFill: string;
  sealFill: string;
  description: string;
}

export const BOTTLE_SKINS: readonly BottleSkinMeta[] = [
  {
    id: 'amber',
    name: 'Amber Glass',
    unlockLevel: 1,
    bodyFill: '#8A4A1C',
    highlightStroke: '#F4C97A',
    capFill: '#B8893B',
    sealFill: '#C4552D',
    description: 'Classic lamplit amber bottle',
  },
  {
    id: 'brass',
    name: 'Burnished Brass',
    unlockLevel: 2,
    bodyFill: '#8A6420',
    highlightStroke: '#FCE39D',
    capFill: '#23201C',
    sealFill: '#2E5E6B',
    description: 'Unlocked at Level 2',
  },
  {
    id: 'emerald',
    name: 'Emerald Apothecary',
    unlockLevel: 4,
    bodyFill: '#235947',
    highlightStroke: '#9BE0C4',
    capFill: '#B8893B',
    sealFill: '#C4552D',
    description: 'Unlocked at Level 4',
  },
  {
    id: 'crimson',
    name: 'Crimson Velvet',
    unlockLevel: 6,
    bodyFill: '#8D2822',
    highlightStroke: '#F8A99A',
    capFill: '#B8893B',
    sealFill: '#23201C',
    description: 'Unlocked at Level 6',
  },
] as const;

export function normalizeBottleSkinId(raw: string | null | undefined): BottleSkinId {
  if (raw === 'brass' || raw === 'emerald' || raw === 'crimson' || raw === 'amber') {
    return raw;
  }
  return 'amber';
}

export function getBottleSkin(id: string | null | undefined): BottleSkinMeta {
  const normalized = normalizeBottleSkinId(id);
  return BOTTLE_SKINS.find((s) => s.id === normalized) ?? BOTTLE_SKINS[0]!;
}
