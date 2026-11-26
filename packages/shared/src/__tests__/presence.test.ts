import { describe, expect, it } from 'vitest';
import {
  PRESENCE_GRACE_MS,
  electDeterministicHost,
  isPlayerPresent,
  shouldPauseForLowPlayers,
  type PresenceMap,
  type PresencePlayer,
} from '../presence.js';

describe('presence', () => {
  const NOW = 1_700_000_000_000;

  describe('PRESENCE_GRACE_MS', () => {
    it('is 25,000 ms', () => {
      expect(PRESENCE_GRACE_MS).toBe(25_000);
    });
  });

  describe('isPlayerPresent', () => {
    it('returns false when presence is null or undefined', () => {
      expect(isPlayerPresent(null, NOW)).toBe(false);
      expect(isPlayerPresent(undefined, NOW)).toBe(false);
    });

    it('returns true when online is true regardless of lastSeen', () => {
      expect(
        isPlayerPresent({ online: true, away: false, lastSeen: NOW - 120_000 }, NOW),
      ).toBe(true);
    });

    it('returns true when away is true even if online is false', () => {
      expect(
        isPlayerPresent({ online: false, away: true, lastSeen: NOW - 120_000 }, NOW),
      ).toBe(true);
    });

    it('returns true within the 25s grace window including the exact boundary', () => {
      expect(
        isPlayerPresent({ online: false, away: false, lastSeen: NOW - 10_000 }, NOW),
      ).toBe(true);
      expect(
        isPlayerPresent(
          { online: false, away: false, lastSeen: NOW - PRESENCE_GRACE_MS },
          NOW,
        ),
      ).toBe(true);
    });

    it('returns false after the 25s grace window expires', () => {
      expect(
        isPlayerPresent(
          { online: false, away: false, lastSeen: NOW - PRESENCE_GRACE_MS - 1 },
          NOW,
        ),
      ).toBe(false);
    });

    it('returns false when lastSeen or nowMs is non-finite', () => {
      expect(
        isPlayerPresent(
          { online: false, away: false, lastSeen: Number.NaN },
          NOW,
        ),
      ).toBe(false);
      expect(
        isPlayerPresent(
          { online: false, away: false, lastSeen: NOW },
          Number.POSITIVE_INFINITY,
        ),
      ).toBe(false);
    });
  });

  describe('electDeterministicHost', () => {
    it('picks the earliest joinedAt among present, non-banned, non-spectator players', () => {
      const players: PresencePlayer[] = [
        { uid: 'u-offline', joinedAt: 100, banned: false, spectator: false },
        { uid: 'u-banned', joinedAt: 200, banned: true, spectator: false },
        { uid: 'u-spectator', joinedAt: 300, banned: false, spectator: true },
        { uid: 'u-late', joinedAt: 500, banned: false, spectator: false },
        { uid: 'u-host', joinedAt: { toMillis: () => 400 }, banned: false, spectator: false },
      ];
      const presence: PresenceMap = {
        'u-offline': { online: false, away: false, lastSeen: NOW - 60_000 },
        'u-banned': { online: true, away: false, lastSeen: NOW },
        'u-spectator': { online: true, away: false, lastSeen: NOW },
        'u-late': { online: true, away: false, lastSeen: NOW },
        'u-host': { online: false, away: true, lastSeen: NOW - 40_000 },
      };

      const elected = electDeterministicHost(players, presence, NOW);
      expect(elected?.uid).toBe('u-host');
    });

    it('breaks joinedAt ties deterministically by uid', () => {
      const players: PresencePlayer[] = [
        { uid: 'u-b', joinedAt: 1000 },
        { uid: 'u-a', joinedAt: 1000 },
        { uid: 'u-b', joinedAt: 1000 },
      ];
      const presence: PresenceMap = {
        'u-a': { online: true, away: false, lastSeen: NOW },
        'u-b': { online: true, away: false, lastSeen: NOW },
      };

      expect(electDeterministicHost(players, presence, NOW)?.uid).toBe('u-a');
    });

    it('breaks joinedAt ties when second uid is greater than first', () => {
      const players: PresencePlayer[] = [
        { uid: 'u-a', joinedAt: 1000 },
        { uid: 'u-c', joinedAt: 1000 },
      ];
      const presence: PresenceMap = {
        'u-a': { online: true, away: false, lastSeen: NOW },
        'u-c': { online: true, away: false, lastSeen: NOW },
      };

      expect(electDeterministicHost(players, presence, NOW)?.uid).toBe('u-a');
    });

    it('returns null when no eligible players are present', () => {
      const players: PresencePlayer[] = [
        { uid: 'u-1', joinedAt: 100, banned: true },
        { uid: 'u-2', joinedAt: 200, spectator: true },
        { uid: 'u-3', joinedAt: 300 },
      ];
      const presence: PresenceMap = {
        'u-1': { online: true, away: false, lastSeen: NOW },
        'u-2': { online: true, away: false, lastSeen: NOW },
        'u-3': { online: false, away: false, lastSeen: NOW - 30_000 },
      };

      expect(electDeterministicHost(players, presence, NOW)).toBeNull();
    });
  });

  describe('shouldPauseForLowPlayers', () => {
    it('returns true when fewer than 3 active players are present', () => {
      const players: PresencePlayer[] = [
        { uid: 'u-1', joinedAt: 100 },
        { uid: 'u-2', joinedAt: 200 },
        { uid: 'u-3', joinedAt: 300, spectator: true },
        { uid: 'u-4', joinedAt: 400, banned: true },
        { uid: 'u-5', joinedAt: 500 },
      ];
      const presence: PresenceMap = {
        'u-1': { online: true, away: false, lastSeen: NOW },
        'u-2': { online: false, away: false, lastSeen: NOW - 10_000 },
        'u-3': { online: true, away: false, lastSeen: NOW },
        'u-4': { online: true, away: false, lastSeen: NOW },
        'u-5': { online: false, away: false, lastSeen: NOW - 30_000 },
      };

      expect(shouldPauseForLowPlayers(players, presence, NOW)).toBe(true);
    });

    it('returns false when 3 or more active players are present', () => {
      const players: PresencePlayer[] = [
        { uid: 'u-1', joinedAt: 100 },
        { uid: 'u-2', joinedAt: 200 },
        { uid: 'u-3', joinedAt: 300 },
      ];
      const presence: PresenceMap = {
        'u-1': { online: true, away: false, lastSeen: NOW },
        'u-2': { online: false, away: true, lastSeen: NOW - 60_000 },
        'u-3': { online: false, away: false, lastSeen: NOW - PRESENCE_GRACE_MS },
      };

      expect(shouldPauseForLowPlayers(players, presence, NOW)).toBe(false);
    });
  });
});
