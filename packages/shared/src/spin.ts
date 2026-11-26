export interface SpinCandidate {
  uid: string;
  seat: number;
  online: boolean;
  away?: boolean;
  banned: boolean;
  spectator?: boolean;
  turnsTaken: number;
}

export interface SpinSelection {
  uid: string;
  seat: number;
}

/**
 * Selects the next performer seat on entry to SPIN.
 * - Excludes offline, banned, or spectator players.
 * - Never selects the same performer twice in a row when >= 2 eligible players exist.
 * - Weights selection inversely by `turnsTaken` so players with fewer turns are favoured.
 */
export function selectNextPerformerSeat(
  candidates: readonly SpinCandidate[],
  lastPerformerUid: string | null,
  rng: () => number = Math.random,
): SpinSelection | null {
  const eligible = candidates.filter(
    (c) =>
      c.online &&
      !c.banned &&
      !c.spectator &&
      Number.isInteger(c.seat) &&
      c.seat >= 0 &&
      c.seat <= 7,
  );

  if (eligible.length === 0) {
    return null;
  }

  const filtered =
    eligible.length >= 2 && lastPerformerUid !== null
      ? eligible.filter((c) => c.uid !== lastPerformerUid)
      : eligible;

  const pool = filtered.length > 0 ? filtered : eligible;
  const first = pool[0] as SpinCandidate;

  const minTurns = Math.min(...pool.map((c) => c.turnsTaken));
  const weighted = pool.map((candidate) => ({
    candidate,
    weight: 1 / Math.pow(1 + Math.max(0, candidate.turnsTaken - minTurns), 2),
  }));

  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
  const target = rng() * totalWeight;
  let cumulative = 0;

  for (const item of weighted) {
    cumulative += item.weight;
    if (target < cumulative) {
      return { uid: item.candidate.uid, seat: item.candidate.seat };
    }
  }

  return { uid: first.uid, seat: first.seat };
}

/**
 * Computes the cumulative bottle rotation angle (in degrees) so the bottle
 * always spins forward with extra full turns and never reverses across 350 -> 10 deg.
 * Each device rotates its radial table so `mySeatIndex` sits at the bottom (180 deg).
 */
export function computeTargetAngle(
  currentAngle: number,
  targetSeatIndex: number,
  mySeatIndex: number,
  totalSeats: number,
  extraTurns: number = 4,
): number {
  const safeTotalSeats = Math.max(1, Math.floor(totalSeats));
  const relativeSeat =
    (((targetSeatIndex - mySeatIndex) % safeTotalSeats) + safeTotalSeats) % safeTotalSeats;
  const stepDeg = 360 / safeTotalSeats;
  const desiredMod = (180 + relativeSeat * stepDeg) % 360;

  const currentMod = ((currentAngle % 360) + 360) % 360;
  const deltaMod = (desiredMod - currentMod + 360) % 360;
  const turns = Math.max(1, Math.floor(extraTurns));

  return currentAngle + turns * 360 + deltaMod;
}
