import { describe, expect, it } from 'vitest';
import {
  CreateRoomSchema,
  ROOM_CODE_ALPHABET,
  SubmitChitSchema,
  VoteSchema,
  generateRoomCode,
  isValidRoomCode,
  sanitizePlayerName,
  validatePlayerName,
} from '../validators.js';

describe('validators & room code generator', () => {
  it('generates 6-char room codes excluding 0, O, 1, I, L', () => {
    for (let i = 0; i < 100; i += 1) {
      const code = generateRoomCode();
      expect(code).toHaveLength(6);
      expect(isValidRoomCode(code)).toBe(true);
      expect(code).not.toMatch(/[0O1IL]/);
    }
    expect(ROOM_CODE_ALPHABET).not.toMatch(/[0O1IL]/);
    expect(isValidRoomCode('ABC01L')).toBe(false);
    expect(isValidRoomCode('ABC')).toBe(false);
  });

  it('sanitizes and validates player names including reserved & impersonation checks', () => {
    expect(sanitizePlayerName('  Mohit   Kumar \n')).toBe('Mohit Kumar');

    expect(validatePlayerName('A')).toMatchObject({ valid: false });
    expect(validatePlayerName('ThisNameIsWayTooLongForRoom')).toMatchObject({ valid: false });
    expect(validatePlayerName('Mohit@123!')).toMatchObject({ valid: false });

    // Reserved & impersonation
    expect(validatePlayerName('Host')).toMatchObject({ valid: false });
    expect(validatePlayerName('V0wlet')).toMatchObject({ valid: false });
    expect(validatePlayerName('Owl_Bot')).toMatchObject({ valid: false });
    expect(validatePlayerName('RoomAdmin')).toMatchObject({ valid: false });

    // Uniqueness
    expect(validatePlayerName('Riya', ['riya', 'Aman'])).toMatchObject({ valid: false });
    expect(validatePlayerName('Riya', ['Aman'])).toEqual({ valid: true, name: 'Riya' });
  });

  it('validates API zod schemas', () => {
    expect(
      CreateRoomSchema.safeParse({
        name: 'Mohit',
        settings: { maxPlayers: 6, rounds: 10, quickPlay: true },
      }).success,
    ).toBe(true);

    expect(
      SubmitChitSchema.safeParse({
        roomCode: 'ABCDEF',
        kind: 'DARE',
        tier: 'MILD',
        dareType: null,
        text: 'Do 5 jumping jacks',
        idempotencyKey: '550e8400-e29b-41d4-a716-446655440000',
      }).success,
    ).toBe(false);

    expect(
      SubmitChitSchema.safeParse({
        roomCode: 'ABCDEF',
        kind: 'DARE',
        tier: 'MILD',
        dareType: 'INSTANT',
        text: 'Do 5 jumping jacks',
        idempotencyKey: '550e8400-e29b-41d4-a716-446655440000',
      }).success,
    ).toBe(true);

    expect(
      VoteSchema.safeParse({
        roomCode: 'ABCDEF',
        verdict: 'APPROVE',
        turnVersion: 2,
      }).success,
    ).toBe(true);
  });
});
