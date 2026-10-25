/**
 * Returns a stable, deterministic rotation in degrees between min and max
 * derived from a string ID so it never jitters between renders.
 */
export function getSeededTilt(id: string = '', min = -2.5, max = 2.5): number {
  if (!id) return 0;
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const normalized = Math.abs(hash % 1000) / 1000; // 0 to 1
  return Number((min + normalized * (max - min)).toFixed(1));
}
