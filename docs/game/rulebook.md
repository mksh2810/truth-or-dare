# Vowlet — Game Rulebook & Property Test Specifications

**Source of Truth:** `/docs/MASTER_PLAN.md` (Sections 2–6)  
**Shared Implementation:** `/packages/shared/{xp,vote,spin,deck}`  
**Design Principle:** Every rule below is deterministic/pure in `/packages/shared` so client previews match server arbiter (`firebase-admin`) transitions identically.

---

## 1. Lobby & Room Lifecycle

- **Player Count:** Minimum **3**, maximum **8** seated players (`seat` in `0..7`).
- **Join Rules:**
  - Unique, sanitized display name per room; reserved words (`Host`, `Owl`, `Admin`, `Vowlet`) and impersonation patterns rejected.
  - Banned `uid`s cannot rejoin; reconnecting players may rejoin only with their original `uid`.
  - Spectators are supported when a room is full or mid-game (`D20`).
- **Host Authority:**
  - Host controls **lobby settings** and **kick** only. Host has **no** tie-break power in voting and cannot override turn timers.
  - **Host Migration (`D5`):** If the host disconnects past the **25s** RTDB grace period, host migrates deterministically to the present player with the **earliest `joinedAt`** timestamp (version-checked). A returning former host is demoted to regular player.
- **Game Length Presets (`B5`):**
  - `Short`: **5** turns
  - `Standard`: **10** turns
  - `Long`: **15** turns
- **Starting the Game:**
  - Host taps **Start** when **>= 3 present players** are in the lobby (with ready state).
  - If **Quick Play** is ON: `LOBBY -> SPIN`.
  - If **Quick Play** is OFF: `LOBBY -> WRITING`.
- **Low-Player Pause (`D20`):**
  - If present players drop below **3** during an active game, the room pauses for **60s**. If fewer than 3 present players remain after 60s, the room transitions to `CLOSED`.
- **Room TTL:** Rooms expire **4 hours** after last activity (`expiresAt`).

---

## 2. Quick Play vs. Chit Writing

- **Quick Play:** Skips `WRITING` completely and draws prompts from the curated starter deck (and unlocked Community Deck prompts in Phase 3).
- **Writing Mode (`WRITING`):**
  - **Deadline:** **120 seconds** (`deadlineAt` set by server on entry).
  - **Submission:** Players write Truths or Dares (max **140 characters**) via `POST /api/chit/submit`.
  - **Dare Types:** Author selects **`Instant`** or **`Social/External`**; Judge Owl confirms or reclassifies. (Multi-turn `N = 1..3` is Phase 4 only.)
  - **Anonymity:** `chits/{id}` stores only `{kind, tier, dareType, status}`. `authorUid` lives in `secret/{id}` (zero client read).
  - **Completion:** Transitions `WRITING -> SPIN` when all players seal their chits **or** at the 120s deadline. Any missing chits are **auto-filled** from the starter deck.
- **Deck Exhaustion (`D20`):**
  - If the room's chit pool is exhausted mid-game, the server automatically refills from the starter deck (matching room pack/tier settings) without interrupting play.

---

## 3. Bottle Spin (`SPIN`)

- **Authority:** On entry to `SPIN`, the server arbiter deterministically/weighted-randomly selects the target **`seatIndex`** and stores it on `turn/current`.
- **Spin Weighting Rules (Locked Decision 11):**
  1. **Eligible Pool:** Include only **present** (online/away, not offline past grace, not kicked/banned) seated players.
  2. **No Repeat Performer:** Exclude `lastPerformerUid` (never the same performer twice in a row). *Edge case:* if only 1 eligible player remains, that should already trigger the <3-player pause; if 2 remain, the non-last performer is chosen with weight 1.0.
  3. **Favour Fewer Turns:** Weight eligible players inversely by `turnsTaken` so players with fewer turns are favoured.
     - Recommended formula: `weight(p) = 1 / (1 + p.turnsTaken - minTurnsTaken)^2` (where `minTurnsTaken` is the minimum `turnsTaken` among eligible candidates). All eligible candidates retain strictly positive weight `> 0`.
- **Animation & Table Rotation (`D17`):**
  - Duration: **4.5 seconds** (`deadlineAt = now + 4500ms`), ease-out. No skip button.
  - Each client rotates the radial table so **its own seat is at the bottom**.
  - Bottle uses a **cumulative angle** (base target angle + extra full `360°` turns) so it never spins backwards across `350° -> 10°`.
  - Reconnecting clients snap immediately to the stored final angle.
  - Any present player may call `/api/turn/advance` after `deadlineAt` to move `SPIN -> CHOOSE`.

---

## 4. Blind Choose (`CHOOSE`)

- **Duration:** **15 seconds** (`deadlineAt = now + 15000ms`).
- **Performer View:** Blind choice between **Truth** and **Dare** (no prompt text shown yet), with a 15s countdown ring.
- **Witness View:** *"{name} is choosing..."*
- **Timeout:** If 15s elapses without a choice, `/api/turn/advance` **auto-selects `Truth`** and displays a toast notification.
- **Prompt Sealing (`D8`):** Upon transitioning `CHOOSE -> PERFORM`, the server selects a matching chit, writes the text into `rooms/{code}/private/{performerUid}` (readable **only** by `performerUid`), and records `startedAt`.

---

## 5. Perform (`PERFORM`)

- **No Cutoff Timer:** `PERFORM` has **no automatic timeout**. An elapsed stopwatch runs client-side from `turn.startedAt`.
- **Performer Actions:**
  - **Done (`/api/turn/perform/done`):** Transitions `PERFORM -> VOTE`.
  - **Swap (`/api/chit/swap`):** Each player gets **1 free Swap per game**. Replaces the sealed prompt with another unplayed chit of the same `kind` (`Truth` or `Dare`) without penalty.
  - **Skip (`/api/turn/perform/skip`):** Declining a prompt transitions `PERFORM -> RESULT` with stamp **`SKIPPED`** and applies a flat **`-30` session score** penalty (streak resets to `0`).
- **Taking Too Long (`/api/turn/perform/stall`):**
  - Witnesses may press **Taking Too Long**.
  - If **strictly more than 50%** of witnesses (`stallVotes.length > witnessCount / 2`) press it, the turn immediately transitions `PERFORM -> VOTE` with **`stalled = true`** (or flagged for `STALLED` result).
- **Performer Leaves Mid-Turn (`D20`):**
  - If the performer disconnects past grace or leaves mid-turn, the turn resolves as **`SKIPPED` with no XP/score penalty**.

---

## 6. Witness Vote (`VOTE`) & Result (`RESULT`)

- **Vocabulary (Locked Decision 6):**
  - Vote choices: **`Approve`** | **`Reject`** (never "Pass").
  - Result stamps: **`PASSED`** | **`NOT IT`** | **`SPLIT`** | **`SKIPPED`** | **`STALLED`**.
- **Voting Window:** **20 seconds** (`deadlineAt = now + 20000ms`) or until **all witness votes** are cast.
- **Anonymity:** Witnesses see `Approve` / `Reject` buttons (icon + label) and a **total vote count only** — never who voted how. Performer sees a waiting state.
- **Quorum & Resolution (Locked Decision 7):**
  - Let `W` = number of present witnesses (all present seated players excluding the performer).
  - Let `C = approveCount + rejectCount` (only cast votes count; abstentions do not count as Reject).
  - **Quorum:** Strictly more than half of witnesses must cast a vote: **`C > W / 2`** (i.e., `C >= floor(W / 2) + 1`).
  - **Stalled Turn:** If the turn entered `VOTE` via Taking Too Long (`stalled === true`) and fails to achieve majority `Approve`, or per stalled flag, stamp is **`STALLED`** (0 completion XP; streak reset; no `-30` Skip penalty).
  - **No Quorum (`C <= W / 2`) or Exact Tie (`approveCount === rejectCount`):** Result is **`SPLIT`** (half XP, streak kept). **No host tie-break.**
  - **Majority Approve (`approveCount > rejectCount` with quorum):** Result is **`PASSED`**.
  - **Majority Reject (`rejectCount > approveCount` with quorum):** Result is **`NOT IT`** (0 completion XP, streak resets to `0`).
- **Result Phase (`RESULT`):**
  - Displays wax-seal stamp, session-score delta, and a warm Vowlet Owl line for **6 seconds** (or tap to advance).
  - Transitions `RESULT -> SPIN` if `round < totalRounds`, else `RESULT -> SUMMARY`.

---

## 7. XP, Session Score, Levels & Skins

**Strict Separation (Locked Decision 8):**
- **Session Score** drives the game **Podium** and resets every game.
- **Lifetime XP** persists for signed-in users (`users/{uid}`), **only ever increases (monotonic)**, and is computed **server-side** at game end (`POST /api/game/finish`) from verified turn records (`D15`). Client XP values are display-only.

### 7.1 Session Score & Turn XP Formulas
| Outcome Stamp | Session Score Delta | Lifetime XP Contribution | Streak Effect |
|---|---|---|---|
| `PASSED` | `+(50 + streakBonus)` | `+(50 + streakBonus)` | `streak += 1` |
| `SPLIT` | `+floor((50 + streakBonus) / 2)` | `+floor((50 + streakBonus) / 2)` | **Kept** (unchanged) |
| `NOT IT` | `0` | `0` | Reset to `0` |
| `STALLED` | `0` | `0` | Reset to `0` |
| `SKIPPED` (voluntary) | `-30` | `0` (monotonic!) | Reset to `0` |
| `SKIPPED` (leaver) | `0` | `0` | Reset to `0` |

- **Streak Bonus:** Capped at **`+80`** per turn.
  - Recommended progression: `streakBonus = min(80, currentStreak * 20)` (so streak 0 -> `+0`, streak 1 -> `+20`, streak 2 -> `+40`, streak 3 -> `+60`, streak 4+ -> `+80`, max turn gain = `130`).
- **Session Score Floor:** Optional or allowed negative; lifetime XP contribution from any turn is `>= 0`.

### 7.2 Exponential Levels & Bottle Skins (`B12`)
- **Level Curve:** Exponential threshold computed server-side from `lifetimeXp`:
  - `xpForLevel(L) = floor(100 * (1.35 ^ (L - 1) - 1) / 0.35)` (Level 1 = 0 XP, Level 2 = 100 XP, Level 3 = 235 XP, Level 4 = 417 XP, etc.).
- **Bottle Skins:** Unlocked automatically at milestone levels (e.g., Classic Amber at L1, Brass Owl at L3, Lamplit Emerald at L5, Velvet Midnight at L8) and stored in `users/{uid}.skins`.

---

## 8. Table Mode & Pass-the-Phone (`B4`, Phase 3)

- **Table Mode (Shared Display + Phone Controllers):**
  - A dedicated display client joins as a **Table Display** view (non-playing spectator seat).
  - Shared screen renders the **Lamplit** radial table, cumulative bottle spin, 15s/20s countdown rings, anonymous vote count, and Result wax-seal stamps.
  - Individual phones remain personal controllers for secret **Choose**, private **Unseal**, and anonymous **Vote**.
- **Pass-the-Phone Fallback:**
  - Single-device mode for 3–8 local players when phones are unavailable/low-battery.
  - Inserts a **"Pass phone to {name}"** privacy interstitial before `CHOOSE` and `UNSEAL` so only the performer views their prompt.

---

## 9. Property Test Specifications (`/packages/shared`)

All shared modules (`xp`, `vote`, `spin`, `deck`) must be covered by Vitest property-based tests:

### 9.1 `spin` Properties
1. **Exclusion Invariant:** Selected `seatIndex` never belongs to an offline, kicked, or banned player, and never equals `lastPerformerUid` (whenever >= 2 eligible players exist).
2. **Valid Seat Bounds:** Selected `seatIndex` is always an integer in `[0, 7]` belonging to an active seated player.
3. **Fairness / Weight Monotonicity:** Over `N = 1000` simulated spins with fixed `turnsTaken`, a player with strictly fewer `turnsTaken` has strictly higher empirical selection probability than a player with more `turnsTaken`.
4. **Cumulative Angle Monotonicity:** Given `prevAngle >= 0` and any `targetSeat`, `nextAngle > prevAngle` and `(nextAngle % 360)` aligns with `targetSeat` in the device's rotated coordinate frame.

### 9.2 `vote` Properties
1. **Quorum Boundary:** For any `W >= 2`, if `approveCount + rejectCount <= W / 2`, outcome is always `SPLIT`.
2. **Tie Invariant:** Whenever `approveCount === rejectCount` (with quorum), outcome is always `SPLIT`.
3. **Strict Majority:** With quorum (`C > W / 2`), `approveCount > rejectCount` always yields `PASSED`, and `rejectCount > approveCount` always yields `NOT IT` (unless `stalled === true`).
4. **Stall Threshold:** `isStalled(stallVotes, W)` is `true` if and only if `stallVotes.length > W / 2`.

### 9.3 `xp` Properties
1. **Lifetime Monotonicity:** For any sequence of turn outcomes (`PASSED`, `SPLIT`, `NOT IT`, `SKIPPED`, `STALLED`), `computeLifetimeXpDelta(turn) >= 0`, and `nextLifetimeXp >= prevLifetimeXp`.
2. **Streak Bonus Cap:** For any `streak >= 0`, `0 <= streakBonus(streak) <= 80`, and `PASSED` delta is in `[50, 130]`.
3. **SPLIT Half-XP & Streak Preservation:** `SPLIT` delta equals `floor(passedDelta / 2)` and output `streak === inputStreak`.
4. **SKIPPED Penalty:** Voluntary `SKIPPED` session delta is always `-30` and resets `streak` to `0`.
5. **Level Monotonicity:** `levelFromXp(xp1) <= levelFromXp(xp2)` whenever `xp1 <= xp2`.

### 9.4 `deck` Properties
1. **Swap Conservation:** Using the 1 free swap replaces the active chit with a different chit of the same `kind`, decrements `swapsRemaining` from `1` to `0`, and rejects a second swap in the same game.
2. **Auto-Fill Completeness:** At `WRITING` end, total available chits equals at least the required pool size (missing slots filled from starter deck).
3. **Refill Non-Empty:** Drawing from an exhausted room deck triggers starter-deck refill and always returns a valid prompt without throwing.
