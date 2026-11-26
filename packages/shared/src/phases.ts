import type { Phase } from './types.js';

export type TimedPhase = 'WRITING' | 'SPIN' | 'CHOOSE' | 'VOTE' | 'RESULT';

/**
 * Authoritative phase durations in milliseconds.
 */
export const PHASE_DURATIONS_MS: Readonly<Record<TimedPhase, number>> = {
  WRITING: 120_000,
  SPIN: 4_500,
  CHOOSE: 15_000,
  VOTE: 20_000,
  RESULT: 6_000,
};

export const LOW_PLAYER_PAUSE_MS = 60_000;
export const PRESENCE_GRACE_MS = 25_000;
export const ROOM_TTL_MS = 4 * 60 * 60 * 1000;

export const ALLOWED_TRANSITIONS: Readonly<Record<Phase, readonly Phase[]>> = {
  LOBBY: ['WRITING', 'SPIN', 'CLOSED'],
  WRITING: ['SPIN', 'CLOSED'],
  SPIN: ['CHOOSE', 'CLOSED'],
  CHOOSE: ['PERFORM', 'CLOSED'],
  PERFORM: ['VOTE', 'RESULT', 'CLOSED'],
  VOTE: ['RESULT', 'CLOSED'],
  RESULT: ['SPIN', 'SUMMARY', 'CLOSED'],
  SUMMARY: ['PODIUM', 'CLOSED'],
  PODIUM: ['LOBBY', 'CLOSED'],
  CLOSED: [],
};

export interface TransitionContext {
  quickPlay?: boolean;
  presentPlayers?: number;
  allSealed?: boolean;
  deadlineReached?: boolean;
  hasChoice?: boolean;
  performerDone?: boolean;
  stalled?: boolean;
  skipped?: boolean;
  performerLeft?: boolean;
  allVoted?: boolean;
  round?: number;
  totalRounds?: number;
  tapped?: boolean;
}

/**
 * Pure state machine transition guard.
 * Validates structural transition legality and optional domain guards.
 */
export function canTransition(from: Phase, to: Phase, ctx?: TransitionContext): boolean {
  if (from === 'CLOSED') {
    return false;
  }

  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    return false;
  }

  if (to === 'CLOSED') {
    return true;
  }

  if (!ctx) {
    return true;
  }

  switch (`${from}->${to}`) {
    case 'LOBBY->WRITING':
      return (
        (ctx.quickPlay === undefined || ctx.quickPlay === false) &&
        (ctx.presentPlayers === undefined || ctx.presentPlayers >= 3)
      );
    case 'LOBBY->SPIN':
      return (
        (ctx.quickPlay === undefined || ctx.quickPlay === true) &&
        (ctx.presentPlayers === undefined || ctx.presentPlayers >= 3)
      );
    case 'WRITING->SPIN':
      if (ctx.allSealed !== undefined || ctx.deadlineReached !== undefined) {
        return Boolean(ctx.allSealed || ctx.deadlineReached);
      }
      return true;
    case 'SPIN->CHOOSE':
      if (ctx.deadlineReached !== undefined) {
        return ctx.deadlineReached === true;
      }
      return true;
    case 'CHOOSE->PERFORM':
      if (ctx.hasChoice !== undefined || ctx.deadlineReached !== undefined) {
        return Boolean(ctx.hasChoice || ctx.deadlineReached);
      }
      return true;
    case 'PERFORM->VOTE':
      if (ctx.performerDone !== undefined || ctx.stalled !== undefined) {
        return Boolean(ctx.performerDone || ctx.stalled);
      }
      return true;
    case 'PERFORM->RESULT':
      if (ctx.skipped !== undefined || ctx.performerLeft !== undefined) {
        return Boolean(ctx.skipped || ctx.performerLeft);
      }
      return true;
    case 'VOTE->RESULT':
      if (ctx.allVoted !== undefined || ctx.deadlineReached !== undefined) {
        return Boolean(ctx.allVoted || ctx.deadlineReached);
      }
      return true;
    case 'RESULT->SPIN': {
      const roundsOk =
        ctx.round === undefined || ctx.totalRounds === undefined || ctx.round < ctx.totalRounds;
      const triggerOk =
        (ctx.deadlineReached === undefined && ctx.tapped === undefined) ||
        Boolean(ctx.deadlineReached || ctx.tapped);
      return roundsOk && triggerOk;
    }
    case 'RESULT->SUMMARY': {
      const roundsOk =
        ctx.round === undefined || ctx.totalRounds === undefined || ctx.round >= ctx.totalRounds;
      const triggerOk =
        (ctx.deadlineReached === undefined && ctx.tapped === undefined) ||
        Boolean(ctx.deadlineReached || ctx.tapped);
      return roundsOk && triggerOk;
    }
    case 'PODIUM->LOBBY':
      return ctx.presentPlayers === undefined || ctx.presentPlayers >= 3;
    default:
      return true;
  }
}

/**
 * Determines whether gameplay continues to the next SPIN or advances to SUMMARY.
 */
export function nextRoundOrSummary(round: number, totalRounds: number): 'SPIN' | 'SUMMARY' {
  return round < totalRounds ? 'SPIN' : 'SUMMARY';
}

/**
 * Computes the server deadline timestamp (in ms) for a timed phase, or null for untimed phases.
 */
export function getPhaseDeadlineMs(
  phase: Phase,
  nowMs: number,
  overrides?: Partial<Record<TimedPhase, number>>,
): number | null {
  if (phase in PHASE_DURATIONS_MS) {
    const timedPhase = phase as TimedPhase;
    const duration = overrides?.[timedPhase] ?? PHASE_DURATIONS_MS[timedPhase];
    return nowMs + duration;
  }
  return null;
}

/**
 * Checks expectedPhase and expectedVersion for optimistic concurrency control.
 */
export function validateExpectedState(
  currentPhase: Phase,
  currentVersion: number,
  expectedPhase: Phase,
  expectedVersion: number,
): boolean {
  return currentPhase === expectedPhase && currentVersion === expectedVersion;
}
