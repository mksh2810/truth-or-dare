# Vowlet — Phased Backlog & User Stories (Phases 0–3)

**Source of Truth:** `/docs/MASTER_PLAN.md` (Sections 2–6, 8–9)  
**Scope:** User stories for Phases 0–3 with testable Acceptance Criteria (AC), mapped to Fix Checklist IDs (`D1`–`D29`, `B1`–`B15`; note `D21` is not defined in `MASTER_PLAN.md`, and `D13`/`D22`/`B1` are explicitly mapped to Phase 4/5).

---

## Phase 0: Foundations & Contracts

### Story P0-1: Monorepo, CI/CD & Emulator Harness (`D26`, `B15`)
**As a** developer on the Vowlet team, **I want** a pnpm monorepo with TypeScript strict mode, Firebase Emulator Suite, CI checks, and staging configuration **so that** all lanes can build and test locally without paid keys.
- **Acceptance Criteria:**
  - `pnpm install`, `pnpm typecheck`, `pnpm lint`, and `pnpm test` pass cleanly from repo root.
  - Firebase Emulator Suite starts Firestore, RTDB, and Auth locally with mock LLM adapter active.
  - `.github` CI workflow runs unit/property tests, rules tests, and typecheck on every PR.
  - `/docs/orchestration/gates/phase-N.md` and phased roadmap (`B15`) are initialized.

### Story P0-2: Architecture Contracts & Shared State Machine (`D1`, `D18`, `B15`)
**As a** platform engineer, **I want** versioned contracts (`/docs/contracts/{api,schema,phases,events}.md`) and shared pure logic in `/packages/shared` **so that** client previews match server arbiter decisions.
- **Acceptance Criteria:**
  - Contracts define `rooms/{code}`, `players/{uid}`, `turn/current`, `votes/{uid}`, `chits/{id}`, `secret/{id}`, `private/{uid}`, `users/{uid}`, `prompts/{id}`, `reports/{id}`, and RTDB `presence/{code}/{uid}`.
  - `/packages/shared` exports pure functions for phase transitions, XP, voting, spin weighting, deck refill, validators, and moderation filters.
  - Unit and property tests in Vitest cover all state machine transitions (`expectedPhase` + `expectedVersion`).

### Story P0-3: Quota Tracking & Kill-Switch Scaffolding (`B11`)
**As an** operator, **I want** `/ops/quotas.md` and Remote Config kill switches defined **so that** Vowlet stays within free-tier limits.
- **Acceptance Criteria:**
  - `/ops/quotas.md` documents verified free-tier limits for Firebase, Vercel Hobby (non-commercial), and Google AI Studio.
  - Remote Config schema includes kill switches for LLM Judge and Private Beta (`PRIVATE_BETA=true`).
  - Alert thresholds are documented at 60% and 80% of daily/monthly quotas.

---

## Phase 1: Core In-Person Loop

### Story P1-1: First-Run Age Gate & Consent Screen (`B10`, `Decision 14`)
**As a** new player, **I want** to see a clear first-run consent screen with 18+ self-declaration, table rules, and a recording notice **so that** I understand expectations before joining a game.
- **Acceptance Criteria:**
  - First-run screen displays 18+ self-declaration checkbox/action (never labelled "age verification"), summary of Safe Dares table rules, and explicit notice: *"Others can record video calls"*.
  - Player cannot proceed to create or join a room without acknowledging consent; acknowledgement is persisted locally.

### Story P1-2: Guest & Google Auth + 3-Tap Join Flow (`B3`, `D6`, `D14`)
**As a** party guest, **I want** to join a table via link, QR, or room code in 3 taps or fewer with just a display name (or optional Google Sign-In) **so that** in-person setup is frictionless.
- **Acceptance Criteria:**
  - Joining via deep link/QR or entering a room code completes in <= 3 taps.
  - Anonymous auth requires only a display name; Google Sign-In is optional.
  - In-app browsers (Instagram, WhatsApp, etc.) trigger a detector banner with "Open in browser" instructions.
  - Transactional join (`POST /api/room/join`) enforces max 8 players, unique sanitized name per room, length/charset limits, reserved word rejection (`Host`, `Owl`, `Admin`, `Vowlet`), impersonation checks, UID ban list, and rejoin only with matching `uid`.

### Story P1-3: Room Creation, Code Generation & TTL (`D7`, `D12`, `D18`)
**As a** host, **I want** to create a room with a readable code and automatic 4-hour idle expiration **so that** rooms are easy to share and don't leak stale data.
- **Acceptance Criteria:**
  - `POST /api/room/create` generates a room code transactionally from an alphabet excluding `0, O, 1, I, L`.
  - `expiresAt` is set to 4 hours after last activity for Firestore TTL cleanup.
  - Every API route validates Firebase ID token, App Check token, `zod` request schema, per-uid rate limit (including code-probing protection), idempotency key, and locked CORS.
  - Split documents (`rooms`, `players`, `turn/current`, `votes`) are readable by room members only; client writes are denied by Firestore rules (`D1`).

### Story P1-4: Lobby, Settings, Presets & Presence (`D4`, `B5`, `B6`)
**As a** host or player in the lobby, **I want** a radial 3–8 seat table, ready toggle, Quick Play/length/timer presets, and live presence **so that** we can configure and start our game smoothly.
- **Acceptance Criteria:**
  - Radial table displays 3–8 seats at 360px width with zero horizontal overflow.
  - Host can toggle Quick Play, game length (`Short 5` / `Standard 10` / `Long 15` turns), timer presets, paste an external call link (Meet/WhatsApp/Discord), or kick a player.
  - Players can toggle self-ready; Start requires >= 3 present players.
  - RTDB `onDisconnect` marks disconnected players after a 25s grace period; `visibilitychange` marks "away" (not offline); share-sheet open is exempt from away/offline penalties.
  - Home screen shows "Vowlet" wordmark, tagline, settings gear, and level chip only when signed in (guests see *"Sign in to keep progress"*).

### Story P1-5: Optional Chit Writing & Filter-Only Moderation (`D9`, `D10`, `B7`)
**As a** player, **I want** to optionally write custom Truths or Dares (or skip writing / use Quick Play) **so that** our table has personalized prompts without slowing down the party.
- **Acceptance Criteria:**
  - Quick Play skips `WRITING` and transitions `LOBBY -> SPIN`, drawing from >= 150 curated starter prompts (`B7` P1 subset).
  - In Writing mode, a 120s server `deadlineAt` timer runs; missing chits are auto-filled from the starter deck at deadline or when all players seal.
  - Players select Truth/Dare and Dare Type (`Instant` or `Social/External`), enter up to 140 chars, and see a consent-safe example (never "propose to your crush").
  - Chits are submitted only via `POST /api/chit/submit`; `authorUid` is stored in `secret/{id}` (no client read); `chits/{id}` exposes only `kind`, `tier`, `dareType`, `status`.
  - Phase 1 applies deterministic English + Hinglish blocklist and unsafe-dare/PII filters (`D10` filter-only).

### Story P1-6: Server-Weighted Bottle Spin & Table Rotation (`D2`, `D3`, `D17`, `B6`)
**As a** player, **I want** the bottle to spin fairly and land on the chosen player from my seat's perspective **so that** everyone gets turns and the table feels physical.
- **Acceptance Criteria:**
  - Server picks target `seatIndex` on `SPIN` entry: excludes offline/kicked players, never picks the same performer twice in a row, and favours players with fewer `turnsTaken`.
  - Each device rotates the table so its own seat is at the bottom; bottle animates using a cumulative angle (extra full turns, 4.5s ease-out) and never reverses across 350°–10°.
  - Reconnecting clients snap to the stored final angle.
  - Personalized text reads *"The bottle has chosen {name}"*; sound toggle and haptic on landing are present; no skip button.
  - Memory cache rejects stale writes and displays a visible sync indicator (`D3`). Timers derive from `deadlineAt` + clock-offset on every render (`D2`).

### Story P1-7: Blind Choose & Sealed Perform (`D8`, `D20`, `Decision 9`, `Decision 10`)
**As the** chosen performer, **I want** 15 seconds to blindly pick Truth or Dare and then privately unseal my prompt **so that** nobody else sees the prompt before I perform.
- **Acceptance Criteria:**
  - In `CHOOSE`, performer sees 15s ring; others see *"{name} is choosing..."*. Timeout auto-selects Truth with a toast via `/api/turn/advance`.
  - Prompt text is written to `private/{uid}` only after `CHOOSE` and is readable only by `performerUid` (`D8`).
  - In `PERFORM`, others see *"{name} is unsealing a Dare/Truth..."*. An elapsed stopwatch runs from `startedAt` with no cutoff.
  - Performer can tap **Done**, **Skip** (`-30` session points, `SKIPPED` stamp), or **Swap** (1 free swap per game).
  - If >50% of witnesses tap **Taking Too Long** (`/api/turn/perform/stall`), turn transitions to `VOTE` flagged `STALLED`.
  - Deck refills automatically on exhaustion (`D20` P1).

### Story P1-8: Witness Vote, Result Seal & Podium (`Decision 6`, `Decision 7`, `B6`)
**As a** witness, **I want** to vote Approve or Reject anonymously within 20 seconds and see the stamped result **so that** turns resolve fairly.
- **Acceptance Criteria:**
  - `VOTE` lasts 20s or until all witness votes are cast.
  - Witnesses see `Approve` / `Reject` buttons with icon + label; UI shows vote COUNT only, never who voted how. Performer sees a waiting state.
  - Quorum = >50% of witnesses. Exact tie or no quorum = `SPLIT` (half XP, streak kept); no host tie-break.
  - Result screen (6s or tap) displays wax-seal stamp (`PASSED`, `NOT IT`, `SPLIT`, `SKIPPED`, `STALLED`), session-score delta, and a warm, teasing-never-shaming Owl line (`B6`).
  - `SUMMARY` / `PODIUM` displays top 3 players cleanly for both 3-player and 8-player rooms, with `Rematch` returning to `LOBBY`.

---

## Phase 2: Robustness, Trust & Safety

### Story P2-1: Full Judge Owl LLM Pipeline & Calibration (`D11`, `D27`, `D29`, `B11`)
**As a** player or moderator, **I want** custom chits and dynamic Owl roasts evaluated by the Judge Owl pipeline **so that** unsafe, Hinglish-obfuscated, or prompt-injected content is blocked.
- **Acceptance Criteria:**
  - `POST /api/chit/submit` runs deterministic filter -> LLM classifier adapter (Google AI Studio free tier in staging, mock in local/CI) with chit passed as quoted DATA.
  - LLM output validates against `{verdict: FINE | TOO_MILD | NOPE, tier, dareType, reason}`; verdicts are cached by normalized-text hash (`B11`).
  - Fail-closed: timeout, rate limit, or malformed output keeps chit pending, retries once, then prompts author to rewrite or pick a starter prompt (never auto-approves).
  - Owl roasts use curated templates; any free-text roast uses the same pipeline (`D27`).
  - Tier rubric and calibration set of 300+ labelled chits (including prompt injections and Hinglish) pass the eval harness (`D29`).
  - Remote Config kill switch disables LLM stage and falls back to filter + starter deck (`B11`).

### Story P2-2: Deterministic Host Migration & Leaver Rules (`D5`, `D20`)
**As a** player in a live room, **I want** the game to recover gracefully if the host or any player disconnects or leaves **so that** one dropped phone doesn't ruin the night.
- **Acceptance Criteria:**
  - When host goes offline past the 25s grace period, host migrates deterministically to the present player with earliest `joinedAt` (version-checked); returning old host is demoted (`D5`).
  - Leaving player's unplayed chits return to pool; pending vote is dropped; active dare is cancelled; if performer leaves mid-turn, turn resolves as `SKIPPED` with no penalty (`D20`).
  - If fewer than 3 present players remain, room pauses for 60s; if still < 3, room closes cleanly. Spectators are supported.

### Story P2-3: Version Skew, Service Worker Update & Offline UX (`D16`)
**As a** player, **I want** clear prompts when a new app version ships or my connection drops **so that** I never play on a broken/mismatched client.
- **Acceptance Criteria:**
  - `rooms/{code}` stores `schemaVersion`; `join` blocks mismatched clients with an update prompt.
  - Service worker detects new build and shows an "Update available" toast.
  - Reconnecting/offline banner appears on network loss; room-closed and error pages render cleanly.

### Story P2-4: Legal Pages, Report/Block & Delete My Data (`B10`)
**As a** player, **I want** access to Terms, Privacy, Safe Dares, Content Policy, Report/Block, and Delete My Data **so that** I can protect my safety and privacy.
- **Acceptance Criteria:**
  - All legal pages render from `/docs/legal` with prominent **"DRAFT - NOT LEGALLY REVIEWED"** header.
  - Report/Block sheet submits to `reports/{id}` (create-only) and blocks reported user locally/in-room per SOP.
  - Settings screen includes working **Delete My Data** flow matching `/docs/legal/sop.md`.

### Story P2-5: Chaos Suite, Accessibility, Performance & PWA Matrix (`D24`, `D25`, `D26`, `B14`)
**As a** QA/PERF engineer, **I want** all 14 chaos scenarios, accessibility audits, performance budgets, and PWA browser matrix verified **so that** the core loop is rock-solid on real mobile devices.
- **Acceptance Criteria:**
  - All 14 chaos scenarios pass in Playwright multi-client + bot suite (20x runs) and Sentry privacy scrubber is active (`D26`).
  - Initial JS <= 200KB gzipped, scene WebPs <= 150KB, mobile Lighthouse LCP <= 2.5s, CLS <= 0.1, a11y >= 95, axe zero critical issues, >= 44px touch targets, 4.5:1 contrast, `prefers-reduced-motion` verified (`D24`, `D25`).
  - `/docs/quality` includes PWA support matrix for iOS Safari, Android Chrome, and in-app browsers (`B14`).

---

## Phase 3: Retention, Growth & Validation Readiness

### Story P3-1: Server-Side Lifetime XP, Levels, Skins & Table History (`D15`, `B12`)
**As a** returning signed-in player, **I want** my lifetime XP, exponential level, bottle skins, streaks, and Table history computed and saved **so that** my progress persists across game nights.
- **Acceptance Criteria:**
  - `POST /api/game/finish` computes lifetime XP monotonically server-side from verified turn records (`D15`); client XP display is read-only.
  - Exponential level curve, bottle skin unlocks, streaks, and saved Table history persist in `users/{uid}` (`B12`).

### Story P3-2: Night Recap, Share Sheet, Rematch & Saved Tables (`D23`, `B2`, `B8`)
**As a** player at the end of a game, **I want** to share a Night Recap card, tap Rematch, or save my Table **so that** we can celebrate and play again easily.
- **Acceptance Criteria:**
  - Share sheet uses copy-to-clipboard + Web Share API with no promises about social tags (`D23`).
  - Podium offers one-tap Rematch, Share Recap card, and Save Table (for signed-in users) plus occasion packs (`B2`).
  - Private Beta landing page includes join-by-code (`noindex` while `PRIVATE_BETA=true`), recap sharing, 15–30s clip template, and creator kit (`B8`).

### Story P3-3: Community Deck, Ratings & Full Content Library (`D19`, `D28`, `B7`, `B9`)
**As a** player, **I want** access to 450+ curated prompts across 5 packs and an opt-in, rated Community Deck **so that** prompts stay fresh over many game nights.
- **Acceptance Criteria:**
  - 450+ curated prompts (Mild/Spicy/Legend) across 5 packs (`Friends`, `Couples`, `Office-safe`, `Trip`, `Hinglish Special`) and 150 Owl lines are live (`B7`).
  - Community submission is opt-in per chit with automated PII scrub and author delete (`D28`).
  - `POST /api/prompts/rate` enforces one rating per `uid` per prompt, Wilson lower-bound ranking, and near-duplicate hashing (`D19`).
  - Community deck unlocks only after 20+ ratings per prompt; starter deck fills gaps (`B9`).

### Story P3-4: Table Mode & Pass-the-Phone Fallback (`B4`)
**As an** in-person group with a TV/tablet or low-battery phones, **I want** a shared Table Mode display and a Pass-the-Phone fallback **so that** everyone can play regardless of device constraints.
- **Acceptance Criteria:**
  - Table Mode displays the shared bottle, timers, and results on one screen while phones act as controllers.
  - Pass-the-Phone fallback allows 3–8 players to play on a single shared device with privacy handoff prompts between Choose/Unseal turns.

### Story P3-5: Analytics Spec, KPI Dashboard & Validation Protocol (`B13`)
**As a** product manager, **I want** analytics events instrumented and a KPI/validation protocol documented **so that** we can measure real playtest retention and safety before Phase 4.
- **Acceptance Criteria:**
  - Analytics events match `/docs/contracts/events.md` and `/docs/business` specs without PII leakage.
  - KPI dashboard spec and human playtest validation protocol are ready for Private Beta testing.

---

## Fix Checklist Traceability Matrix (`D1`–`D29`, `B1`–`B15`)

| ID | Summary | Target Phase | Story / Disposition |
|---|---|---|---|
| D1 | Arbiter API + deny-by-default rules | P1 | P0-2, P1-3 |
| D2 | `deadlineAt` + clock-offset timers | P1 | P1-6 |
| D3 | Memory cache, stale-write reject, sync indicator | P1 | P1-6 |
| D4 | RTDB `onDisconnect`, 25s grace, `visibilitychange` away | P1 | P1-4 |
| D5 | Deterministic host election & demotion | P2 | P2-2 |
| D6 | Transactional join, ban list, same-uid rejoin | P1 | P1-2 |
| D7 | Transactional room code (no 0/O/1/I/L), 4h TTL, rate limit | P1 | P1-3 |
| D8 | Sealed prompt in `private/{uid}` | P1 | P1-7 |
| D9 | `authorUid` in no-client-read `secret/{id}` | P1 | P1-5 |
| D10 | Chits via `/api/chit/submit` (P1 filter, P2 full) | P1–P2 | P1-5, P2-1 |
| D11 | Judge pipeline, fail-closed | P2 | P2-1 |
| D12 | ID token + App Check + zod + rate limit + CORS | P1 | P1-3 |
| D13 | LiveKit token (membership, performer publish, 2m TTL) | P4 | Deferred to Phase 4 (`GO PHASE 4`) |
| D14 | Unique sanitized names, reserved words, impersonation | P1 | P1-2 |
| D15 | Server-side lifetime XP | P3 | P3-1 |
| D16 | `schemaVersion`, SW update prompt, mismatch block | P2 | P2-3 |
| D17 | Seat-index spin, table rotation, cumulative angle, cap 8 | P1 | P1-6 |
| D18 | Split docs (`rooms`, `turn`, `votes`, RTDB `presence`) | P1 | P0-2, P1-3 |
| D19 | Ratings (1/uid/prompt), Wilson ranking, near-dup hash | P3 | P3-3 |
| D20 | Deck refill, spectators, leaver rules | P1–P2 | P1-7, P2-2 |
| D22 | Phase 4 video fallback, pre-flight, echo, recording notice | P4 | Deferred to Phase 4 (`GO PHASE 4`) |
| D23 | Share = clipboard + Web Share | P3 | P3-2 |
| D24 | Accessibility (Section 6.4) | P2 | P2-5 |
| D25 | Performance budgets (Section 9.4) | P2 | P2-5 |
| D26 | Emulator, Playwright, bots, chaos, Sentry, CI, staging | P0–P2 | P0-1, P2-5 |
| D27 | Curated Owl roasts + pipeline for free-text | P2 | P2-1 |
| D28 | Opt-in Community deck, PII scrub, author delete | P3 | P3-3 |
| D29 | Tier rubric + 300+ calibration set (injections, Hinglish) | P2 | P2-1 |
| B1 | Monetization decision memo (3+ options, no payment code) | P5 | Deferred to Phase 5 |
| B2 | Night Recap card, Rematch, Save Table, occasion packs | P3 | P3-2 |
| B3 | <=3-tap join, guest name-only, Google optional, IAB help | P1 | P1-2 |
| B4 | Table Mode + Pass-the-Phone fallback | P3 | P3-4 |
| B5 | Quick Play, timer presets, Short/Standard/Long presets | P1 | P1-4 |
| B6 | Warm Owl copy, non-punitive XP | P1 | P1-4, P1-6, P1-8 |
| B7 | 450+ prompts (5 packs), 150 Owl lines | P1 / P3 | P1-5 (150), P3-3 (full) |
| B8 | Landing page (`noindex`), recap share, clip template, creator kit | P3 | P3-2 |
| B9 | Community deck unlocks at 20+ ratings/prompt | P3 | P3-3 |
| B10 | Consent, Terms, Privacy, Content, Safe Dares, Delete, Report (`DRAFT`) | P2 | P1-1, P2-4 |
| B11 | Quota dashboard (60%/80%), kill switches, LLM cache | P1–P4 | P0-3, P2-1 |
| B12 | Exponential levels, bottle skins, streaks, Table history | P3 | P3-1 |
| B13 | Analytics event spec, KPI dashboard, validation protocol | P3 | P3-5 |
| B14 | PWA support matrix (iOS Safari, Android Chrome, IAB) | P2 | P2-5 |
| B15 | Phased roadmap with hard gates | All | P0-1, P0-2 |
