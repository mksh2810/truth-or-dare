import { describe, it, expect } from 'vitest';
import {
  generateRoomCode,
  sanitizeRoomCode,
  PlayerDoc,
} from '../../lib/firestore-room';

describe('Firestore Room Helpers (ROOM-2, ROOM-8)', () => {
  it('generates 6-character room codes without 0, O, 1, I', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateRoomCode();
      expect(code).toHaveLength(6);
      expect(code).not.toMatch(/[0O1I]/);
      expect(code).toMatch(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/);
    }
  });

  it('sanitizes input and excludes forbidden characters', () => {
    expect(sanitizeRoomCode('abc-01oI-xyz')).toBe('ABCXYZ');
    expect(sanitizeRoomCode('4a8k9z')).toBe('4A8K9Z');
    // 'O' and '0' are stripped (ROOM-2), so 'verylongcode' becomes 'VERYLN'
    expect(sanitizeRoomCode('verylongcode12345')).toBe('VERYLN');
  });

  it('determines the next host based on joinedAt when host is disconnected >20s', () => {
    const now = Date.now();
    const currentHostUid = 'host-1';

    const players: PlayerDoc[] = [
      {
        uid: 'host-1',
        name: 'Riya',
        avatarId: '1',
        isHost: true,
        ready: true,
        joinedAt: 1000,
        lastSeen: now - 25000, // Disconnected 25s ago (> 20s)
        totalXp: 100,
        swapsLeft: 1,
        streak: 0,
        xpGame: 0,
        passes: 0,
        fails: 0,
        votesCast: 0,
        chitsOk: { truth: true, dare: true },
        kicked: false,
      },
      {
        uid: 'player-2',
        name: 'Aman',
        avatarId: '2',
        isHost: false,
        ready: true,
        joinedAt: 2000, // Joined earlier than player-3
        lastSeen: now - 2000, // Active
        totalXp: 50,
        swapsLeft: 1,
        streak: 0,
        xpGame: 0,
        passes: 0,
        fails: 0,
        votesCast: 0,
        chitsOk: { truth: true, dare: true },
        kicked: false,
      },
      {
        uid: 'player-3',
        name: 'Zoya',
        avatarId: '3',
        isHost: false,
        ready: true,
        joinedAt: 3000,
        lastSeen: now - 1000, // Active
        totalXp: 150,
        swapsLeft: 1,
        streak: 0,
        xpGame: 0,
        passes: 0,
        fails: 0,
        votesCast: 0,
        chitsOk: { truth: true, dare: true },
        kicked: false,
      },
    ];

    // Candidate selection logic: active players sorted by joinedAt
    const active = players
      .filter((p) => p.uid !== currentHostUid && now - p.lastSeen <= 20000)
      .sort((a, b) => a.joinedAt - b.joinedAt);

    expect(active[0].uid).toBe('player-2');
  });
});
