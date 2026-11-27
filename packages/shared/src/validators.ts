import { z } from 'zod';

/**
 * Room code alphabet excluding visually ambiguous characters (0, O, 1, I, L).
 */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH = 6;

const ROOM_CODE_REGEX = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;

export const RESERVED_PLAYER_NAMES = [
  'host',
  'owl',
  'admin',
  'vowlet',
  'moderator',
  'system',
  'judge',
] as const;

const SAFE_NAME_REGEX = /^[a-zA-Z0-9 _.-]+$/;

/**
 * Generates a 6-character room code from the unambiguous alphabet.
 */
export function generateRoomCode(rng: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i += 1) {
    const idx = Math.min(
      ROOM_CODE_ALPHABET.length - 1,
      Math.max(0, Math.floor(rng() * ROOM_CODE_ALPHABET.length)),
    );
    code += ROOM_CODE_ALPHABET.charAt(idx);
  }
  return code;
}

export function isValidRoomCode(code: string): boolean {
  return ROOM_CODE_REGEX.test(code);
}

/**
 * Sanitizes a raw display name by trimming, stripping control chars,
 * and collapsing repeated whitespace.
 */
export function sanitizePlayerName(raw: string): string {
  return raw
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeForImpersonationCheck(name: string): string {
  return name
    .toLowerCase()
    .replace(/[0]/g, 'o')
    .replace(/[1!|]/g, 'i')
    .replace(/[3]/g, 'e')
    .replace(/[4@]/g, 'a')
    .replace(/[5$]/g, 's')
    .replace(/[7]/g, 't')
    .replace(/[^a-z]/g, '');
}

export type PlayerNameValidationResult =
  | { valid: true; name: string }
  | { valid: false; reason: string };

/**
 * Validates player name length (2-16), safe charset, reserved/impersonation words,
 * and room-level uniqueness.
 */
export function validatePlayerName(
  raw: string,
  existingNames: readonly string[] = [],
): PlayerNameValidationResult {
  const name = sanitizePlayerName(raw);

  if (name.length < 2 || name.length > 16) {
    return { valid: false, reason: 'Name must be 2–16 characters.' };
  }

  if (!SAFE_NAME_REGEX.test(name) || !/[a-zA-Z0-9]/.test(name)) {
    return { valid: false, reason: 'Name contains unsupported characters.' };
  }

  const normalized = normalizeForImpersonationCheck(name);
  for (const reserved of RESERVED_PLAYER_NAMES) {
    if (
      normalized === reserved ||
      normalized.startsWith(reserved) ||
      normalized.endsWith(reserved)
    ) {
      return { valid: false, reason: 'That name is reserved or looks like an official role.' };
    }
  }

  const lowerName = name.toLowerCase();
  const isDuplicate = existingNames.some((existing) => sanitizePlayerName(existing).toLowerCase() === lowerName);
  if (isDuplicate) {
    return { valid: false, reason: 'That name is already taken in this room.' };
  }

  return { valid: true, name };
}

// ---------------------------------------------------------------------------
// Zod Schemas for API Inputs
// ---------------------------------------------------------------------------

export const RoomCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(ROOM_CODE_REGEX, 'Invalid room code format');

export const PhaseSchema = z.enum([
  'LOBBY',
  'WRITING',
  'SPIN',
  'CHOOSE',
  'PERFORM',
  'VOTE',
  'RESULT',
  'SUMMARY',
  'PODIUM',
  'CLOSED',
]);

export const PromptKindSchema = z.enum(['TRUTH', 'DARE']);
export const TierSchema = z.enum(['MILD', 'SPICY', 'LEGEND']);
export const DareTypeSchema = z.enum(['INSTANT', 'SOCIAL']);
export const VoteVerdictSchema = z.enum(['APPROVE', 'REJECT']);
export const TotalRoundsSchema = z.union([z.literal(5), z.literal(10), z.literal(15)]);

export const RoomSettingsSchema = z.object({
  maxPlayers: z.number().int().min(3).max(8).default(8),
  rounds: TotalRoundsSchema.default(10),
  quickPlay: z.boolean().default(false),
  writingDeadlineSec: z.number().int().min(30).max(300).default(120),
  chooseDeadlineSec: z.number().int().min(5).max(60).default(15),
  voteDeadlineSec: z.number().int().min(10).max(60).default(20),
  packIds: z.array(z.string().min(1).max(40)).min(1).default(['friends']),
  tableMode: z.boolean().default(false),
});

export const IdempotencyKeySchema = z.string().uuid('Invalid idempotencyKey');

export const CreateRoomSchema = z.object({
  name: z.string().min(2).max(32),
  avatar: z.string().min(1).max(32).default('owl-classic'),
  callLink: z.string().url().max(300).nullable().optional(),
  settings: RoomSettingsSchema.partial().optional(),
  schemaVersion: z.number().int().positive().default(1),
});

export const JoinRoomSchema = z.object({
  roomCode: RoomCodeSchema,
  name: z.string().min(2).max(32),
  avatar: z.string().min(1).max(32).default('owl-classic'),
  schemaVersion: z.number().int().positive().default(1),
});

export const LeaveRoomSchema = z.object({
  roomCode: RoomCodeSchema,
  idempotencyKey: IdempotencyKeySchema,
});

export const KickPlayerSchema = z.object({
  roomCode: RoomCodeSchema,
  targetUid: z.string().min(1).max(128),
  idempotencyKey: IdempotencyKeySchema,
});

export const UpdateSettingsSchema = z.object({
  roomCode: RoomCodeSchema,
  settings: RoomSettingsSchema.partial(),
  callLink: z.string().url().max(300).nullable().optional(),
  idempotencyKey: IdempotencyKeySchema,
});

export const StartGameSchema = z.object({
  roomCode: RoomCodeSchema,
  expectedPhase: PhaseSchema,
  expectedVersion: z.number().int().nonnegative(),
  idempotencyKey: IdempotencyKeySchema,
});

export const SubmitChitSchema = z
  .object({
    roomCode: RoomCodeSchema,
    kind: PromptKindSchema,
    tier: TierSchema.default('MILD'),
    dareType: DareTypeSchema.nullable().default(null),
    text: z.string().trim().min(1).max(140),
    idempotencyKey: IdempotencyKeySchema,
  })
  .refine((data) => data.kind !== 'DARE' || data.dareType !== null, {
    message: 'dareType is required when kind is DARE',
    path: ['dareType'],
  });

export const SwapChitSchema = z.object({
  roomCode: RoomCodeSchema,
  expectedPhase: z.literal('PERFORM'),
  expectedVersion: z.number().int().nonnegative(),
  idempotencyKey: IdempotencyKeySchema,
});

export const TurnAdvanceSchema = z.object({
  roomCode: RoomCodeSchema,
  expectedPhase: PhaseSchema,
  expectedVersion: z.number().int().nonnegative(),
  idempotencyKey: IdempotencyKeySchema,
  force: z.boolean().optional(),
});

export const TurnChooseSchema = z.object({
  roomCode: RoomCodeSchema,
  expectedPhase: z.literal('CHOOSE'),
  expectedVersion: z.number().int().nonnegative(),
  choice: PromptKindSchema,
  idempotencyKey: IdempotencyKeySchema,
});

export const TurnPerformActionSchema = z.object({
  roomCode: RoomCodeSchema,
  expectedPhase: z.literal('PERFORM'),
  expectedVersion: z.number().int().nonnegative(),
  idempotencyKey: IdempotencyKeySchema,
  answerText: z.string().trim().max(280).optional(),
});

export const VoteSchema = z.object({
  roomCode: RoomCodeSchema,
  verdict: VoteVerdictSchema,
  turnVersion: z.number().int().nonnegative(),
});

export const RatePromptSchema = z.object({
  promptId: z.string().min(1).max(128),
  up: z.boolean(),
});

export const ReportSchema = z.object({
  targetUid: z.string().min(1).max(128).nullable().optional(),
  roomCode: RoomCodeSchema.nullable().optional(),
  promptId: z.string().min(1).max(128).nullable().optional(),
  reason: z.enum(['HARASSMENT', 'UNSAFE_DARE', 'PII', 'HATE_SPEECH', 'SEXUAL_CONTENT', 'OTHER']),
  details: z.string().trim().max(500).default(''),
});
