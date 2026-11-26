import type { Timestamp } from '@vowlet/shared';

/**
 * Converts a Timestamp (epoch ms or Firestore Timestamp-like object) to epoch milliseconds.
 */
export function toMillis(ts: Timestamp | null | undefined): number | null {
  if (ts === null || ts === undefined) {
    return null;
  }
  if (typeof ts === 'number') {
    return ts;
  }
  if (typeof ts.toMillis === 'function') {
    return ts.toMillis();
  }
  return null;
}
