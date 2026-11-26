# Vowlet Data Schema Contract

- **Version:** `1.0.0`
- **Schema Version Integer (`schemaVersion`):** `1`
- **Databases:** Cloud Firestore (game state, prompts, user profiles, reports) + Firebase Realtime Database (ephemeral presence only). No Postgres/SQL database is used.
- **Authority:** Server Arbiter (`/api/*` using `firebase-admin`) performs all state writes. Clients have read-only access to game state, except for their own vote document during `VOTE` and their own RTDB presence node.

---

## 1. Cloud Firestore Collections

### 1.1 `rooms/{code}`
Room metadata and top-level state.
- **Room Code Format:** 6 uppercase characters from alphabet `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (excludes `0, O, 1, I, L`).
- **Access:** Authenticated room members read; **nobody** writes from client.
- **TTL Policy:** Firestore TTL enabled on `expiresAt` (4 hours after last activity).

| Field | Type | Constraints / Notes |
| --- | --- | --- |
| `code` | `string` | 6-char room code |
| `hostUid` | `string` | Current host UID (elected by earliest `joinedAt` among present players) |
| `phase` | `RoomPhase` | `LOBBY \| WRITING \| SPIN \| CHOOSE \| PERFORM \| VOTE \| RESULT \| SUMMARY \| PODIUM \| CLOSED` |
| `round` | `number` | `0` in `LOBBY`/`WRITING`, `1..totalRounds` during gameplay |
| `totalRounds` | `5 \| 10 \| 15` | Configured game length preset |
| `turnVersion` | `number` | Monotonic integer incremented on every state transition |
| `schemaVersion` | `number` | Currently `1`; join blocked on client/server mismatch |
| `callLink` | `string \| null` | Optional external video call URL (Meet/WhatsApp/Discord) |
| `settings` | `RoomSettings` | `{ maxPlayers: 3..8, rounds: 5\|10\|15, quickPlay: boolean, writingDeadlineSec: 120, chooseDeadlineSec: 15, voteDeadlineSec: 20, packIds: string[], tableMode: boolean }` |
| `createdAt` | `Timestamp` | Server timestamp |
| `updatedAt` | `Timestamp` | Server timestamp |
| `expiresAt` | `Timestamp` | `updatedAt + 4 hours` (Firestore TTL target) |

---

### 1.2 `rooms/{code}/players/{uid}`
Player roster and session-scoped state.
- **Access:** Authenticated room members read; **nobody** writes from client.

| Field | Type | Constraints / Notes |
| --- | --- | --- |
| `uid` | `string` | Firebase Auth UID |
| `name` | `string` | Unique per room, sanitized, 2–16 chars, reserved words (`Host`, `Owl`, `Admin`, `Vowlet`) rejected |
| `avatar` | `string` | Owl/player avatar token |
| `seat` | `number` | Integer `0..7` (hard cap 8 seats) |
| `joinedAt` | `Timestamp` | Server timestamp; used for deterministic host election |
| `ready` | `boolean` | Lobby ready state |
| `banned` | `boolean` | True if kicked/banned from this room |
| `spectator` | `boolean` | True if joined mid-game as spectator |
| `turnsTaken` | `number` | Count of turns performed in this session (used for spin weighting) |
| `sessionScore` | `number` | Session-only podium score (separate from lifetime XP) |
| `streak` | `number` | Consecutive non-skipped turns |
| `swapUsed` | `boolean` | True after using the 1 free chit swap per game |

---

### 1.3 `rooms/{code}/turn/current`
Hot document representing the active turn. Split from `rooms/{code}` to keep listeners narrow.
- **Access:** Authenticated room members read; **nobody** writes from client.

| Field | Type | Constraints / Notes |
| --- | --- | --- |
| `turnVersion` | `number` | Matches `rooms/{code}.turnVersion` |
| `round` | `number` | Current round index |
| `performerUid` | `string` | UID of the chosen performer |
| `performerSeat` | `number` | Target seat index (`0..7`) selected by server on `SPIN` entry |
| `phase` | `TurnPhase` | `SPIN \| CHOOSE \| PERFORM \| VOTE \| RESULT` |
| `deadlineAt` | `Timestamp \| null` | Server timestamp for phase deadline; `null` in `PERFORM` (no cutoff) |
| `startedAt` | `Timestamp \| null` | Server timestamp when `PERFORM` begins (drives elapsed stopwatch) |
| `choice` | `'TRUTH' \| 'DARE' \| null` | Performer's blind choice |
| `kind` | `'TRUTH' \| 'DARE' \| null` | Resolved prompt kind |
| `dareType` | `'INSTANT' \| 'SOCIAL' \| null` | Author-selected / Judge-confirmed dare type |
| `chitId` | `string \| null` | Reference to `chits/{id}` (revealed only after `CHOOSE` via `private/{uid}`) |
| `resultStamp` | `ResultStamp \| null` | `'PASSED' \| 'NOT IT' \| 'SPLIT' \| 'SKIPPED' \| 'STALLED' \| null` |
| `stallVotes` | `string[]` | Array of witness UIDs who pressed "Taking Too Long" |
| `sessionScoreDelta` | `number \| null` | Session score change applied on `RESULT` |
| `owlLine` | `string \| null` | Curated/filtered Owl reaction line for `RESULT` |

---

### 1.4 `rooms/{code}/votes/{uid}`
Witness votes for the active turn.
- **Access:**
  - Read: Authenticated room members (UI displays vote **count** only, never who voted how).
  - Write: Only `request.auth.uid == uid`, only when `rooms/{code}.phase == 'VOTE'`, `uid != turn/current.performerUid`, player is an active non-banned/non-spectator member, and `request.resource.data.turnVersion == turn/current.turnVersion`.

| Field | Type | Constraints / Notes |
| --- | --- | --- |
| `uid` | `string` | Voter UID |
| `verdict` | `'APPROVE' \| 'REJECT'` | Never use "Pass" |
| `turnVersion` | `number` | Must match `turn/current.turnVersion` |
| `createdAt` | `Timestamp` | Server timestamp |

---

### 1.5 `rooms/{code}/chits/{id}`
Public metadata for chits in the room deck. **Never stores prompt text or author UID.**
- **Access:** Authenticated room members read; **nobody** writes from client.

| Field | Type | Constraints / Notes |
| --- | --- | --- |
| `id` | `string` | Chit document ID |
| `kind` | `'TRUTH' \| 'DARE'` | Prompt category |
| `tier` | `'MILD' \| 'SPICY' \| 'LEGEND'` | Intensity tier |
| `dareType` | `'INSTANT' \| 'SOCIAL' \| null` | Required when `kind == 'DARE'` |
| `status` | `ChitStatus` | `'PENDING' \| 'SEALED' \| 'USED' \| 'RETURNED' \| 'REJECTED'` |
| `judgeVerdict` | `'FINE' \| 'TOO_MILD' \| 'NOPE' \| null` | Judge Owl verdict |
| `owlReason` | `string \| null` | Friendly 1-line Owl explanation |

---

### 1.6 `rooms/{code}/secret/{id}`
Sealed chit text and author identity. Strictly isolated from all clients.
- **Access:** **NO client read or write access.** Server Arbiter (`firebase-admin`) only.

| Field | Type | Constraints / Notes |
| --- | --- | --- |
| `text` | `string` | Prompt text, max 140 chars |
| `authorUid` | `string` | Author UID or `'SYSTEM'` for starter deck auto-fill |
| `verdict` | `'FINE' \| 'TOO_MILD' \| 'NOPE'` | Judge pipeline verdict |
| `normalizedHash` | `string` | SHA-256 of normalized text for cache/dedup |

---

### 1.7 `rooms/{code}/private/{uid}`
Sealed prompt delivered exclusively to the active performer after `CHOOSE`.
- **Access:** Readable **only** by `request.auth.uid == uid` when `uid == turn/current.performerUid` and `rooms/{code}.phase in ['PERFORM', 'VOTE', 'RESULT']`. **Nobody** writes from client.

| Field | Type | Constraints / Notes |
| --- | --- | --- |
| `chitId` | `string` | Active chit ID |
| `text` | `string` | Prompt text |
| `kind` | `'TRUTH' \| 'DARE'` | Prompt kind |
| `tier` | `'MILD' \| 'SPICY' \| 'LEGEND'` | Intensity tier |
| `dareType` | `'INSTANT' \| 'SOCIAL' \| null` | Dare type if `DARE` |
| `turnVersion` | `number` | Turn version this prompt belongs to |

---

### 1.8 `users/{uid}`
Persistent user profile and lifetime progression.
- **Access:** Readable by `request.auth.uid == uid`; writes via API only.

| Field | Type | Constraints / Notes |
| --- | --- | --- |
| `uid` | `string` | Firebase Auth UID |
| `lifetimeXp` | `number` | Monotonically non-decreasing; computed server-side at game end |
| `level` | `number` | Exponential level derived server-side from `lifetimeXp` |
| `skins` | `string[]` | Unlocked bottle/owl skin IDs |
| `optIns` | `{ communityDeck: boolean, analytics: boolean }` | User consent preferences |
| `updatedAt` | `Timestamp` | Server timestamp |

---

### 1.9 `prompts/{id}`
Curated starter deck and opted-in community prompts.
- **Access:** Authenticated read; writes via API only.

| Field | Type | Constraints / Notes |
| --- | --- | --- |
| `id` | `string` | Prompt ID |
| `text` | `string` | Max 140 chars |
| `kind` | `'TRUTH' \| 'DARE'` | Prompt kind |
| `tier` | `'MILD' \| 'SPICY' \| 'LEGEND'` | Intensity tier |
| `dareType` | `'INSTANT' \| 'SOCIAL' \| null` | Dare type |
| `pack` | `string` | `friends \| couples \| office-safe \| trip \| hinglish-special \| community` |
| `source` | `'CURATED' \| 'COMMUNITY'` | Origin |
| `ratingAgg` | `{ up: number, total: number, wilsonScore: number }` | Community ranking metrics |
| `hash` | `string` | Near-duplicate perceptual/normalized hash |

---

### 1.10 `reports/{id}`
Abuse/content reports.
- **Access:** Authenticated `create` only (`request.resource.data.reporterUid == request.auth.uid`); no client read, update, or delete.

| Field | Type | Constraints / Notes |
| --- | --- | --- |
| `id` | `string` | Report ID |
| `reporterUid` | `string` | Reporter UID |
| `targetUid` | `string \| null` | Reported player UID (if applicable) |
| `roomCode` | `string \| null` | Room context |
| `promptId` | `string \| null` | Prompt context |
| `reason` | `string` | Report category |
| `details` | `string` | Optional details (max 500 chars) |
| `createdAt` | `Timestamp` | Server timestamp |

---

### 1.11 `verdictCache/{normalizedHash}` (Server-Only)
Caches Judge Owl LLM verdicts by normalized text hash to minimize free-tier API calls.
- **Access:** **NO client access.** Server only.

---

## 2. Firebase Realtime Database (Presence Only)

### 2.1 `presence/{code}/{uid}`
Ephemeral connection and tab-visibility state. Uses RTDB `onDisconnect()` with a 25-second server-side grace window before treating a disconnected player as offline.
- **Access:** Authenticated users read; write **own node only** (`auth != null && auth.uid == $uid`).

| Field | Type | Constraints / Notes |
| --- | --- | --- |
| `online` | `boolean` | Set `true` on connect; `false` via `onDisconnect` |
| `away` | `boolean` | Driven by `document.visibilitychange` ("away", not offline; share-sheet exempt) |
| `lastSeen` | `number` | RTDB `ServerValue.TIMESTAMP` |
