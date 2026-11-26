# Vowlet HTTP API Contract

- **Version:** `1.0.0`
- **Base Path:** `/api` (Vercel Serverless Functions in `/api`)
- **Shared Validation:** `zod` schemas in `/packages/shared`

---

## 1. Common Security & Request Requirements

Every route in `/api/*` MUST enforce:
1. **CORS:** Locked to configured origin(s) (`https://vowlet.app`, Vercel preview, `http://localhost:5173` in dev).
2. **Authentication:** `Authorization: Bearer <firebase-id-token>` verified via `firebase-admin` Auth.
3. **App Check:** `X-Firebase-AppCheck: <token>` verified via `firebase-admin` App Check (bypassed only in local emulator mode).
4. **Rate Limiting:** Per-UID sliding-window rate limit (stricter on `/api/room/join` and `/api/room/create` to prevent room-code probing).
5. **Validation:** Strict `zod` request body/query parsing; unknown fields stripped or rejected.
6. **Idempotency:** All `POST` routes require `idempotencyKey` (UUID v4) in the JSON body (or `Idempotency-Key` header). Duplicate requests return the original response without re-executing.
7. **Optimistic Concurrency:** All room/turn transition routes require `expectedPhase` and `expectedVersion`. On mismatch, the server mutates nothing and returns `409 Conflict` with `{ code: 'VERSION_MISMATCH', currentState: { phase, turnVersion } }`.

### Standard Error Envelope
```json
{
  "error": {
    "code": "STRING_CODE",
    "message": "Human-readable message",
    "currentState": { "phase": "SPIN", "turnVersion": 4 }
  }
}
```
Common codes: `UNAUTHORIZED`, `APP_CHECK_FAILED`, `RATE_LIMITED`, `VALIDATION_ERROR`, `FORBIDDEN`, `NOT_FOUND`, `VERSION_MISMATCH`, `ROOM_FULL`, `BANNED`, `SCHEMA_MISMATCH`, `NAME_TAKEN`, `NAME_RESERVED`.

---

## 2. Room Management Routes

### `POST /api/room/create`
Creates a new room in a transaction, generating a 6-char code without `0/O/1/I/L`.
- **Body:** `{ idempotencyKey, name, avatar, schemaVersion, settings?: Partial<RoomSettings>, callLink?: string }`
- **Response `201`:** `{ code, uid, seat: 0, phase: 'LOBBY', turnVersion: 0 }`

### `POST /api/room/join`
Transactional join. Enforces `schemaVersion` match, `maxPlayers <= 8`, unique sanitized name, reserved-word block, UID ban list, and rejoin-only-with-same-UID.
- **Body:** `{ idempotencyKey, code, name, avatar, schemaVersion }`
- **Response `200`:** `{ code, uid, seat, spectator, phase, turnVersion }`

### `POST /api/room/leave`
Removes player from active roster. Handles leaver rules (D20): returns player's unused chits to pool, drops pending vote, cancels active dare if performer (`SKIPPED`, 0 penalty), triggers host migration if host left, pauses 60s / closes if `< 3` present.
- **Body:** `{ idempotencyKey, code, expectedPhase, expectedVersion }`
- **Response `200`:** `{ ok: true, hostUid, phase, turnVersion }`

### `POST /api/room/kick`
Host-only action to kick and ban a player UID from the room.
- **Body:** `{ idempotencyKey, code, targetUid, expectedPhase, expectedVersion }`
- **Response `200`:** `{ ok: true, turnVersion }`

### `POST /api/room/start`
Host-only action to start the game from `LOBBY` (or Rematch from `PODIUM`). Requires `>= 3` present players.
- **Body:** `{ idempotencyKey, code, expectedPhase, expectedVersion }`
- **Response `200`:** `{ phase: 'WRITING' | 'SPIN', turnVersion, deadlineAt }`

### `POST /api/room/settings`
Host-only update of lobby settings (`maxPlayers`, `rounds`, `quickPlay`, `packIds`, `callLink`, `tableMode`) or self-ready toggle (`ready`).
- **Body:** `{ idempotencyKey, code, expectedPhase, expectedVersion, settings?, callLink?, ready? }`
- **Response `200`:** `{ ok: true, turnVersion }`

---

## 3. Chit Routes

### `POST /api/chit/submit`
Submits a player-written chit through the Judge Owl pipeline (deterministic filter + LLM classifier). Direct Firestore writes to `chits` or `secret` are denied.
- **Body:** `{ idempotencyKey, code, kind: 'TRUTH' | 'DARE', dareType?: 'INSTANT' | 'SOCIAL', text, expectedPhase, expectedVersion }`
- **Response `200`:** `{ chitId, verdict: 'FINE' | 'TOO_MILD' | 'NOPE', tier, dareType, owlReason, status }`
- **Fail-closed:** If LLM times out or errors, returns `status: 'PENDING'` with retry prompt or starter-deck fallback; never auto-approves.

### `POST /api/chit/swap`
Performer-only action during `PERFORM` to swap the current prompt once per game (`swapUsed == false`).
- **Body:** `{ idempotencyKey, code, expectedPhase: 'PERFORM', expectedVersion }`
- **Response `200`:** `{ ok: true, chitId, turnVersion }` (new prompt written to `private/{uid}`).

---

## 4. Turn & Gameplay Routes

### `POST /api/turn/advance`
Idempotent phase advancer callable by **any present player** once `now >= deadlineAt` (or when `VOTE` has all votes / `RESULT` is tapped). Eliminates host dependence.
- **Body:** `{ idempotencyKey, code, expectedPhase, expectedVersion }`
- **Response `200`:** `{ phase, turnVersion, deadlineAt, performerSeat?, performerUid? }`

### `POST /api/turn/choose`
Performer-only choice during `CHOOSE`. Writes `private/{performerUid}` and enters `PERFORM` with `startedAt = now`, `deadlineAt = null`.
- **Body:** `{ idempotencyKey, code, choice: 'TRUTH' | 'DARE', expectedPhase: 'CHOOSE', expectedVersion }`
- **Response `200`:** `{ phase: 'PERFORM', turnVersion, startedAt }`

### `POST /api/turn/perform/done`
Performer-only action to finish performance and enter `VOTE` (`deadlineAt = now + 20s`).
- **Body:** `{ idempotencyKey, code, expectedPhase: 'PERFORM', expectedVersion }`
- **Response `200`:** `{ phase: 'VOTE', turnVersion, deadlineAt }`

### `POST /api/turn/perform/skip`
Performer-only action to decline prompt. Applies `-30` session score, resets streak, sets `resultStamp = 'SKIPPED'`, enters `RESULT`.
- **Body:** `{ idempotencyKey, code, expectedPhase: 'PERFORM', expectedVersion }`
- **Response `200`:** `{ phase: 'RESULT', turnVersion, resultStamp: 'SKIPPED', sessionScoreDelta: -30 }`

### `POST /api/turn/perform/stall`
Witness-only action ("Taking Too Long"). Adds `uid` to `stallVotes`. If `stallVotes.length > floor(witnessCount / 2)`, transitions `PERFORM -> VOTE` flagged `STALLED`.
- **Body:** `{ idempotencyKey, code, expectedPhase: 'PERFORM', expectedVersion }`
- **Response `200`:** `{ phase: 'PERFORM' | 'VOTE', turnVersion, stallCount, threshold }`

---

## 5. Progression, Community & Safety Routes

### `POST /api/game/finish`
Computes and persists lifetime XP, exponential level, and skin unlocks to `users/{uid}` server-side from verified turn records at `SUMMARY`/`PODIUM`.
- **Body:** `{ idempotencyKey, code, expectedPhase: 'SUMMARY' | 'PODIUM', expectedVersion }`
- **Response `200`:** `{ awards: Record<uid, { xpGained, newLifetimeXp, newLevel, unlockedSkins }> }`

### `GET /api/prompts/community`
Fetches approved community prompts ranked by Wilson lower-bound score (only prompts with `>= 20` ratings per B9).
- **Query:** `?pack=community&kind=TRUTH|DARE&tier=MILD|SPICY|LEGEND&limit=20&cursor=...`
- **Response `200`:** `{ items: Prompt[], nextCursor: string | null }`

### `POST /api/prompts/rate`
Submits one rating per UID per prompt (`up: boolean`), updating `ratingAgg` and `wilsonScore` transactionally.
- **Body:** `{ idempotencyKey, promptId, up: boolean }`
- **Response `200`:** `{ ok: true, ratingAgg }`

### `POST /api/report`
Submits an abuse/content report (also supports `reports/{id}` create rule).
- **Body:** `{ idempotencyKey, targetUid?, roomCode?, promptId?, reason, details? }`
- **Response `201`:** `{ reportId }`

---

## 6. Phase 4 Only (Gated by Remote Config)

### `POST /api/livekit/token`
**Disabled in Phases 0–3** (returns `503 FEATURE_DISABLED` when Remote Config `enableLiveKit` is `false`).
In Phase 4: verifies room membership, active-dare check, performer-only publish permission, and issues a 2-minute TTL token.
- **Body:** `{ idempotencyKey, code, expectedPhase, expectedVersion }`
- **Response `200`:** `{ token, url, ttlSeconds: 120 }`
