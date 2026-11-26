import { describe, expect, it } from 'vitest';
import {
  ALLOWED_TRANSITIONS,
  PHASE_DURATIONS_MS,
  canTransition,
  getPhaseDeadlineMs,
  nextRoundOrSummary,
  validateExpectedState,
} from '../phases.js';
import type { Phase } from '../types.js';

describe('phases state machine', () => {
  it('defines exact locked phase durations', () => {
    expect(PHASE_DURATIONS_MS).toEqual({
      WRITING: 120_000,
      SPIN: 4_500,
      CHOOSE: 15_000,
      VOTE: 20_000,
      RESULT: 6_000,
    });
  });

  it('allows transitions to CLOSED from any non-CLOSED phase and blocks all from CLOSED', () => {
    const phases: Phase[] = [
      'LOBBY',
      'WRITING',
      'SPIN',
      'CHOOSE',
      'PERFORM',
      'VOTE',
      'RESULT',
      'SUMMARY',
      'PODIUM',
    ];
    for (const p of phases) {
      expect(canTransition(p, 'CLOSED')).toBe(true);
      expect(canTransition('CLOSED', p)).toBe(false);
    }
    expect(canTransition('CLOSED', 'CLOSED')).toBe(false);
  });

  it('rejects structurally invalid transitions', () => {
    expect(canTransition('LOBBY', 'VOTE')).toBe(false);
    expect(canTransition('SPIN', 'RESULT')).toBe(false);
    expect(canTransition('SUMMARY', 'SPIN')).toBe(false);
    expect(canTransition('PODIUM', 'VOTE')).toBe(false);
  });

  it('allows structurally valid transitions when context is omitted', () => {
    for (const [from, targets] of Object.entries(ALLOWED_TRANSITIONS) as [Phase, readonly Phase[]][]) {
      for (const to of targets) {
        expect(canTransition(from, to)).toBe(true);
      }
    }
  });

  it('enforces LOBBY -> WRITING and LOBBY -> SPIN guards', () => {
    expect(canTransition('LOBBY', 'WRITING', { quickPlay: false, presentPlayers: 3 })).toBe(true);
    expect(canTransition('LOBBY', 'WRITING', { quickPlay: true, presentPlayers: 3 })).toBe(false);
    expect(canTransition('LOBBY', 'WRITING', { quickPlay: false, presentPlayers: 2 })).toBe(false);
    expect(canTransition('LOBBY', 'WRITING', {})).toBe(true);

    expect(canTransition('LOBBY', 'SPIN', { quickPlay: true, presentPlayers: 4 })).toBe(true);
    expect(canTransition('LOBBY', 'SPIN', { quickPlay: false, presentPlayers: 4 })).toBe(false);
    expect(canTransition('LOBBY', 'SPIN', { quickPlay: true, presentPlayers: 2 })).toBe(false);
    expect(canTransition('LOBBY', 'SPIN', {})).toBe(true);
  });

  it('enforces WRITING -> SPIN, SPIN -> CHOOSE, CHOOSE -> PERFORM guards', () => {
    expect(canTransition('WRITING', 'SPIN', { allSealed: true })).toBe(true);
    expect(canTransition('WRITING', 'SPIN', { deadlineReached: true })).toBe(true);
    expect(canTransition('WRITING', 'SPIN', { allSealed: false, deadlineReached: false })).toBe(false);
    expect(canTransition('WRITING', 'SPIN', {})).toBe(true);

    expect(canTransition('SPIN', 'CHOOSE', { deadlineReached: true })).toBe(true);
    expect(canTransition('SPIN', 'CHOOSE', { deadlineReached: false })).toBe(false);
    expect(canTransition('SPIN', 'CHOOSE', {})).toBe(true);

    expect(canTransition('CHOOSE', 'PERFORM', { hasChoice: true })).toBe(true);
    expect(canTransition('CHOOSE', 'PERFORM', { deadlineReached: true })).toBe(true);
    expect(canTransition('CHOOSE', 'PERFORM', { hasChoice: false, deadlineReached: false })).toBe(false);
    expect(canTransition('CHOOSE', 'PERFORM', {})).toBe(true);
  });

  it('enforces PERFORM -> VOTE, PERFORM -> RESULT, VOTE -> RESULT guards', () => {
    expect(canTransition('PERFORM', 'VOTE', { performerDone: true })).toBe(true);
    expect(canTransition('PERFORM', 'VOTE', { stalled: true })).toBe(true);
    expect(canTransition('PERFORM', 'VOTE', { performerDone: false, stalled: false })).toBe(false);
    expect(canTransition('PERFORM', 'VOTE', {})).toBe(true);

    expect(canTransition('PERFORM', 'RESULT', { skipped: true })).toBe(true);
    expect(canTransition('PERFORM', 'RESULT', { performerLeft: true })).toBe(true);
    expect(canTransition('PERFORM', 'RESULT', { skipped: false, performerLeft: false })).toBe(false);
    expect(canTransition('PERFORM', 'RESULT', {})).toBe(true);

    expect(canTransition('VOTE', 'RESULT', { allVoted: true })).toBe(true);
    expect(canTransition('VOTE', 'RESULT', { deadlineReached: true })).toBe(true);
    expect(canTransition('VOTE', 'RESULT', { allVoted: false, deadlineReached: false })).toBe(false);
    expect(canTransition('VOTE', 'RESULT', {})).toBe(true);
  });

  it('enforces RESULT -> SPIN, RESULT -> SUMMARY, SUMMARY -> PODIUM, PODIUM -> LOBBY guards', () => {
    expect(canTransition('RESULT', 'SPIN', { round: 2, totalRounds: 5, deadlineReached: true })).toBe(true);
    expect(canTransition('RESULT', 'SPIN', { round: 2, totalRounds: 5, tapped: true })).toBe(true);
    expect(canTransition('RESULT', 'SPIN', { round: 5, totalRounds: 5, tapped: true })).toBe(false);
    expect(canTransition('RESULT', 'SPIN', { round: 2, totalRounds: 5, deadlineReached: false, tapped: false })).toBe(false);
    expect(canTransition('RESULT', 'SPIN', {})).toBe(true);

    expect(canTransition('RESULT', 'SUMMARY', { round: 5, totalRounds: 5, deadlineReached: true })).toBe(true);
    expect(canTransition('RESULT', 'SUMMARY', { round: 5, totalRounds: 5, tapped: true })).toBe(true);
    expect(canTransition('RESULT', 'SUMMARY', { round: 3, totalRounds: 5, tapped: true })).toBe(false);
    expect(canTransition('RESULT', 'SUMMARY', { round: 5, totalRounds: 5, deadlineReached: false, tapped: false })).toBe(false);
    expect(canTransition('RESULT', 'SUMMARY', {})).toBe(true);

    expect(canTransition('SUMMARY', 'PODIUM', {})).toBe(true);
    expect(canTransition('PODIUM', 'LOBBY', { presentPlayers: 3 })).toBe(true);
    expect(canTransition('PODIUM', 'LOBBY', { presentPlayers: 2 })).toBe(false);
    expect(canTransition('PODIUM', 'LOBBY', {})).toBe(true);
  });

  it('computes nextRoundOrSummary accurately', () => {
    expect(nextRoundOrSummary(1, 5)).toBe('SPIN');
    expect(nextRoundOrSummary(4, 5)).toBe('SPIN');
    expect(nextRoundOrSummary(5, 5)).toBe('SUMMARY');
    expect(nextRoundOrSummary(10, 10)).toBe('SUMMARY');
  });

  it('computes phase deadlines and respects overrides and untimed phases', () => {
    const now = 1_700_000_000_000;
    expect(getPhaseDeadlineMs('WRITING', now)).toBe(now + 120_000);
    expect(getPhaseDeadlineMs('SPIN', now)).toBe(now + 4_500);
    expect(getPhaseDeadlineMs('CHOOSE', now)).toBe(now + 15_000);
    expect(getPhaseDeadlineMs('VOTE', now)).toBe(now + 20_000);
    expect(getPhaseDeadlineMs('RESULT', now)).toBe(now + 6_000);
    expect(getPhaseDeadlineMs('WRITING', now, { WRITING: 90_000 })).toBe(now + 90_000);

    expect(getPhaseDeadlineMs('LOBBY', now)).toBeNull();
    expect(getPhaseDeadlineMs('PERFORM', now)).toBeNull();
    expect(getPhaseDeadlineMs('SUMMARY', now)).toBeNull();
    expect(getPhaseDeadlineMs('PODIUM', now)).toBeNull();
    expect(getPhaseDeadlineMs('CLOSED', now)).toBeNull();
  });

  it('validates expectedPhase and expectedVersion', () => {
    expect(validateExpectedState('SPIN', 3, 'SPIN', 3)).toBe(true);
    expect(validateExpectedState('SPIN', 3, 'CHOOSE', 3)).toBe(false);
    expect(validateExpectedState('SPIN', 3, 'SPIN', 4)).toBe(false);
  });
});
