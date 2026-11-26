# Vowlet State Machine & Phases Contract

- **Version:** `1.0.0`
- **Shared Implementation:** `/packages/shared` (pure transition guards & state derivation) + `/api/*` (authoritative Firestore transaction execution).

---

## 1. Concurrency & Idempotency Rules

Every state transition endpoint MUST enforce:
1. **`expectedPhase`**: The client's observed `rooms/{code}.phase`.
2. **`expectedVersion`**: The client's observed `rooms/{code}.turnVersion`.
3. **`idempotencyKey`**: Client-generated UUID per user action; duplicate requests with the same key return the cached response without re-applying the transition.
4. **Transaction Guard**: Inside a Firestore transaction, if `room.phase !== expectedPhase || room.turnVersion !== expectedVersion`, **mutate nothing** and return `200 OK` (or `409` with `currentState` payload — see `api.md`) containing the authoritative current state so the client reconciles immediately.
5. **Monotonic Version**: Every successful state transition increments `turnVersion` by `1` and refreshes `updatedAt` and `expiresAt` (`now + 4 hours`).

---

## 2. Phase Transition Table

| From | To | Trigger / Endpoint | Guard / Condition | Deadline (`deadlineAt`) | Side Effects |
| --- | --- | --- | --- | --- | --- |
| `LOBBY` | `WRITING` | Host calls `/api/room/start` | `quickPlay == false`, `presentPlayers >= 3` | `now + 120s` | `round = 0`; initialize deck |
| `LOBBY` | `SPIN` | Host calls `/api/room/start` | `quickPlay == true`, `presentPlayers >= 3` | `now + 4.5s` | `round = 1`; auto-fill deck from starter pack; server selects `performerSeat` & `performerUid` |
| `WRITING` | `SPIN` | `/api/turn/advance` (or auto on last chit seal) | All present players sealed OR `now >= deadlineAt` | `now + 4.5s` | `round = 1`; auto-fill missing chits from starter deck; server selects `performerSeat` & `performerUid` |
| `SPIN` | `CHOOSE` | Any present player calls `/api/turn/advance` | `now >= deadlineAt` (4.5s) | `now + 15s` | Clear spin animation state; performer sees blind Truth/Dare choice |
| `CHOOSE` | `PERFORM` | Performer calls `/api/turn/choose` OR any present player calls `/api/turn/advance` after deadline | Choice is `'TRUTH' \| 'DARE'`, or `now >= deadlineAt` (auto-Truth) | `null` (no cutoff) | Draw chit matching choice from pool; write `private/{performerUid}`; set `startedAt = now`; mark chit `USED` |
| `PERFORM` | `VOTE` | Performer calls `/api/turn/perform/done` | `uid == performerUid` | `now + 20s` | Clear `private/{performerUid}`? (kept readable until `RESULT` ends); open `votes` subcollection for `turnVersion` |
| `PERFORM` | `VOTE` | Witness calls `/api/turn/perform/stall` | `stallVotes.length > floor(witnessCount / 2)` | `now + 20s` | Flag turn `resultStamp = 'STALLED'` (pre-flag); open `votes` |
| `PERFORM` | `RESULT` | Performer calls `/api/turn/perform/skip` | `uid == performerUid` | `now + 6s` | `resultStamp = 'SKIPPED'`; `sessionScoreDelta = -30`; `streak = 0`; assign Owl line |
| `PERFORM` | `RESULT` | Performer disconnects/leaves (>25s grace) | `performerUid` no longer present | `now + 6s` | `resultStamp = 'SKIPPED'`; `sessionScoreDelta = 0` (no penalty per D20) |
| `VOTE` | `RESULT` | Auto on last witness vote OR any present player calls `/api/turn/advance` | All eligible witnesses voted OR `now >= deadlineAt` | `now + 6s` | Tally cast votes (see Section 4); compute `resultStamp`, `sessionScoreDelta`, `streak`; assign Owl line |
| `RESULT` | `SPIN` | Any present player calls `/api/turn/advance` | `round < totalRounds` AND (`now >= deadlineAt` OR host/performer tap) | `now + 4.5s` | `round += 1`; clear `votes` & `private/{uid}`; server selects next `performerSeat` & `performerUid` |
| `RESULT` | `SUMMARY` | Any present player calls `/api/turn/advance` | `round >= totalRounds` AND (`now >= deadlineAt` OR tap) | `null` | Trigger `/api/game/finish` eligibility; summarize session |
| `SUMMARY` | `PODIUM` | Any present player calls `/api/turn/advance` | — | `null` | Rank top 3 players by `sessionScore` |
| `PODIUM` | `LOBBY` | Host calls `/api/room/start` (Rematch) | `presentPlayers >= 3` | `null` | Reset `round = 0`, `sessionScore = 0`, `streak = 0`, `turnsTaken = 0`, `swapUsed = false`, `ready = false` |
| `ANY` | `CLOSED` | System / `/api/room/leave` | Present players `< 3` for `> 60s`, OR host closes, OR `expiresAt` TTL | — | Mark room `CLOSED`; no further transitions allowed |

---

## 3. Spin Seat Selection Algorithm (Server-Only)

Executed on entry to `SPIN`:
1. Filter `players` to those who are **present** (online in RTDB or within 25s grace), not `banned`, and not `spectator`.
2. Exclude the previous `performerUid` (never the same performer twice in a row, unless fewer than 2 eligible players exist).
3. Weight selection inversely by `turnsTaken` (favour players with fewer turns; e.g. weight = `1 / (1 + turnsTaken)` or pool of minimum `turnsTaken` candidates).
4. Store `performerSeat` (`0..7`) and `performerUid` in `rooms/{code}/turn/current`.
5. Clients animate the bottle using cumulative angle to `performerSeat` rotated relative to each client's own seat at the bottom.

---

## 4. Voting, Quorum & Scoring Rules

- **Eligible Witnesses:** Active, present, non-banned, non-spectator players where `uid !== performerUid`.
- **Quorum:** `castVotes > Math.floor(eligibleWitnesses / 2)` (strictly more than half of witnesses).
- **Result Stamp Resolution:**
  - If `castVotes` does not meet quorum → **`SPLIT`** (half XP, streak kept).
  - If `approveCount === rejectCount` (exact tie) → **`SPLIT`** (half XP, streak kept).
  - If `approveCount > rejectCount` → **`PASSED`** (if stalled flag was set, still `PASSED` if approved, or `STALLED` if rejected/no-quorum).
  - If `rejectCount > approveCount`:
    - If turn was flagged `STALLED` → **`STALLED`** (0 XP, streak kept or reset per GD spec).
    - Otherwise → **`NOT IT`** (0 XP, streak reset to 0).
- **Session Score & Streak:**
  - `PASSED`: `+50` base + streak bonus (`min(streak * 10, 30)`, total up to `+80`); `streak += 1`.
  - `SPLIT`: `Math.floor((50 + streakBonus) / 2)`; `streak` unchanged.
  - `NOT IT`: `0`; `streak = 0`.
  - `SKIPPED` (voluntary): `-30`; `streak = 0`.
  - `SKIPPED` (leaver): `0`; `streak` unchanged.
  - `STALLED`: `0`; `streak` unchanged.
- **Chit Swap:** Each player has `swapUsed: boolean` (1 free swap per game via `/api/chit/swap` during `PERFORM` before `Done`/`Skip`).
