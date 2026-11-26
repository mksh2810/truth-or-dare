/**
 * Current schema version for rooms/{code} documents.
 * Clients with a mismatched version are blocked from joining.
 */
export const SCHEMA_VERSION = 1 as const;

/**
 * Timestamp representation compatible with epoch milliseconds and Firestore Timestamps.
 */
export type Timestamp = number | { toMillis(): number; seconds?: number; nanoseconds?: number };

export type Phase =
  | 'LOBBY'
  | 'WRITING'
  | 'SPIN'
  | 'CHOOSE'
  | 'PERFORM'
  | 'VOTE'
  | 'RESULT'
  | 'SUMMARY'
  | 'PODIUM'
  | 'CLOSED';

export type RoomPhase = Phase;

export type TurnPhase = 'SPIN' | 'CHOOSE' | 'PERFORM' | 'VOTE' | 'RESULT';

export type ResultStamp = 'PASSED' | 'NOT IT' | 'SPLIT' | 'SKIPPED' | 'STALLED';

export type DareType = 'INSTANT' | 'SOCIAL';

export type PromptKind = 'TRUTH' | 'DARE';

export type Tier = 'MILD' | 'SPICY' | 'LEGEND';

export type JudgeVerdict = 'FINE' | 'TOO_MILD' | 'NOPE';

export type VoteVerdict = 'APPROVE' | 'REJECT';

export type ChitStatus = 'PENDING' | 'SEALED' | 'USED' | 'RETURNED' | 'REJECTED';

export type TotalRounds = 5 | 10 | 15;

export type PackId =
  | 'friends'
  | 'couples'
  | 'office-safe'
  | 'trip'
  | 'hinglish-special'
  | 'community';

export interface RoomSettings {
  maxPlayers: number;
  rounds: TotalRounds;
  quickPlay: boolean;
  writingDeadlineSec: number;
  chooseDeadlineSec: number;
  voteDeadlineSec: number;
  packIds: string[];
  tableMode: boolean;
}

export interface RoomDoc {
  code: string;
  hostUid: string;
  phase: Phase;
  round: number;
  totalRounds: TotalRounds;
  turnVersion: number;
  schemaVersion: number;
  callLink: string | null;
  settings: RoomSettings;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  expiresAt: Timestamp;
}

export interface PlayerDoc {
  uid: string;
  name: string;
  avatar: string;
  seat: number;
  joinedAt: Timestamp;
  ready: boolean;
  banned: boolean;
  spectator: boolean;
  turnsTaken: number;
  sessionScore: number;
  streak: number;
  swapUsed: boolean;
}

export interface TurnDoc {
  turnVersion: number;
  round: number;
  performerUid: string;
  performerSeat: number;
  phase: TurnPhase;
  deadlineAt: Timestamp | null;
  startedAt: Timestamp | null;
  choice: PromptKind | null;
  kind: PromptKind | null;
  dareType: DareType | null;
  chitId: string | null;
  resultStamp: ResultStamp | null;
  stallVotes: string[];
  sessionScoreDelta: number | null;
  owlLine: string | null;
  stalled?: boolean;
}

export interface VoteDoc {
  uid: string;
  verdict: VoteVerdict;
  turnVersion: number;
  createdAt: Timestamp;
}

export interface ChitDoc {
  id: string;
  kind: PromptKind;
  tier: Tier;
  dareType: DareType | null;
  status: ChitStatus;
  judgeVerdict: JudgeVerdict | null;
  owlReason: string | null;
}

export interface SecretChitDoc {
  text: string;
  authorUid: string;
  verdict: JudgeVerdict;
  normalizedHash: string;
}

export interface PrivatePromptDoc {
  chitId: string;
  text: string;
  kind: PromptKind;
  tier: Tier;
  dareType: DareType | null;
  turnVersion: number;
}

export interface PresenceNode {
  online: boolean;
  away: boolean;
  lastSeen: number;
}

export interface UserDoc {
  uid: string;
  lifetimeXp: number;
  level: number;
  skins: string[];
  optIns: {
    communityDeck: boolean;
    analytics: boolean;
  };
  updatedAt: Timestamp;
}

export interface PromptDoc {
  id: string;
  text: string;
  kind: PromptKind;
  tier: Tier;
  dareType: DareType | null;
  pack: PackId | string;
  source: 'CURATED' | 'COMMUNITY';
  ratingAgg: {
    up: number;
    total: number;
    wilsonScore: number;
  };
  hash: string;
}

export interface ReportDoc {
  id: string;
  reporterUid: string;
  targetUid: string | null;
  roomCode: string | null;
  promptId: string | null;
  reason: string;
  details: string;
  createdAt: Timestamp;
}
