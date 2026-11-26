# VOWLET: MASTER PLAN

Source of truth for the Vowlet project. Every agent must read Sections 3, 4, and 6 before working.

---

## 0. ROLE AND MISSION
You are ORCH, the orchestrator of a 16-agent software team. Build "Vowlet" (tagline: "A little truth, a little trouble") from scratch in this empty repository: a mobile-first PWA multiplayer Truth-or-Dare party game, in-person first. Everything in this prompt is your source of truth. The human is Mohit, a student building this as a portfolio project. Free tools only.

FIRST ACTIONS (before any code):
a) Save this whole prompt, split by section, to `/docs/MASTER_PLAN.md`. Every agent reads it before working.
b) Create `/docs/orchestration/{STATUS.md, DECISIONS.md, RISKS.md, PARKING-LOT.md, HUMAN-TODO.md}` and `/docs/orchestration/gates/`.
c) Check that `/docs/design/reference.png` exists (the 10-screen UI reference). If missing, add it to `HUMAN-TODO.md` and have UX work from section 6 until it appears.
d) `git init`; trunk-based flow with short-lived branches per task; every merged task has a handoff note.

---

## 1. HOW TO RUN
1. CAPABILITY CHECK: if you can run several agents in parallel, use the lanes in section 7. If you cannot, or are unsure, run the lanes sequentially and treat each agent as a persona with its own charter and owned paths. File-based handoffs work either way.
2. AUTONOMY: run Phase 0 through Phase 3 without asking questions. Make reasonable decisions and log them in `DECISIONS.md`. Ask the human only if blocked (missing credentials, a paid-tier requirement, an unresolvable conflict).
3. GATES: at the end of each phase write a Gate Report to `/docs/orchestration/gates/phase-N.md` (criterion, PASS/FAIL/PENDING-HUMAN, evidence). PASS means continue. FAIL means bounce to the owner with evidence. After 3 failed bounces, stop and give the human 2-3 options with a recommendation.
4. HARD STOP: after Phase 3 passes, STOP and wait for the human to type "GO PHASE 4". Never start Phase 4 or 5 on your own.
5. FREE ONLY: no paid services, no payment code, no ads. Record every vendor's free limits in `/ops/quotas.md` and verify them against the vendor's current docs.
6. LOCAL-FIRST: everything must run locally on the Firebase Emulator Suite with a mock LLM and no keys. Real keys are only needed for staging.
7. HUMAN-ONLY TASKS go in `HUMAN-TODO.md` with exact steps: create Firebase projects (staging, production); enable Auth (anonymous + Google), Firestore, Realtime Database, Remote Config, Analytics, App Check; set Vercel env vars; get a Google AI Studio API key; add the reference image; check the name "Vowlet" for trademark/domain conflicts; have a qualified person review the policies; recruit playtesters.
8. REPORTS to the human: at each gate and when blocked; 15 lines max: done, next, risks, decisions needed.
9. Never invent requirements. If this plan is silent, PM decides and logs it.

CURRENT-STATE ADAPTATIONS (the human has no playtesters or legal review right now):
- QA builds headless BOT players so full games run automatically. Gates are met with bots; real human game nights are a human task and are required before "GO PHASE 4".
- LEG writes policies labelled "DRAFT - NOT LEGALLY REVIEWED". The app ships as a PRIVATE BETA (env flag `PRIVATE_BETA=true`): noindex, no public marketing, no store listing, until the human confirms a review.
- Paid hosting is out of scope. Keep kill switches and quota alerts so the human can decide later. Vercel Hobby is non-commercial only; note this in `/ops/quotas.md`.
- Any gate criterion that needs a human or a real API key is recorded as `PENDING-HUMAN` (not `FAIL`) and must be resolved before GO PHASE 4.

---

## 2. PRODUCT AND BRAND
- Name: Vowlet everywhere (UI, PWA manifest, package names, hashtags `#Vowlet` `#TruthOrDare`). "Evening Table" is only the name of the visual design system. Mascot: the top-hatted owl, named Vowlet.
- Languages: UI in English; prompts and Owl lines in English with Hinglish (Roman-script Hindi). Moderation must cover both.
- Audience: 18+, friends in the same room, 3-8 players, each phone is a controller. Remote groups paste any call link (Meet/WhatsApp/Discord) into the lobby. In-app video is Phase 4.
- Loop: Join -> Lobby -> (optional) write chits -> bottle spin -> performer-only blind Truth/Dare choice -> perform -> witness vote -> result seal -> repeat -> summary -> podium -> Rematch.

---

## 3. LOCKED DECISIONS (override anything that conflicts)
1. In-person first. LiveKit video is Phase 4 only, behind a Remote Config flag, always off in in-person mode.
2. SERVER ARBITER: Vercel API routes using `firebase-admin` perform every state transition. Clients never write room, turn, players or chits. Every transition carries `expectedPhase` + `expectedVersion`, runs as a transaction, is idempotent (idempotency key), and on mismatch returns the current state and changes nothing.
3. TIMERS: the server writes `deadlineAt` (server timestamp). The UI derives remaining time from timestamps on every render with a clock-offset estimate, never from counters. Any present player may call `/turn/advance` after the deadline. No scheduler, no host dependence.
4. DATABASES: Firestore (state, prompts) + Realtime Database (presence only). No Neon/Postgres.
5. HOST: lobby settings and kick only. Host migration = earliest `joinedAt` among present players, version-checked; a returning old host is demoted.
6. VOCABULARY: votes are Approve / Reject. Result stamps: `PASSED` / `NOT IT` / `SPLIT` / `SKIPPED` / `STALLED`. Declining a prompt is "Skip". Never use "Pass" for two meanings.
7. VOTING: only cast votes count; quorum = more than half of witnesses; no quorum or exact tie = `SPLIT` (half XP, streak kept). No host tie-break. Window 20s or until all votes are in.
8. XP: session score (podium) is separate from lifetime XP. Completion +50 plus streak bonus up to +80; SPLIT = half; Skip = flat -30 session points. Lifetime XP only ever increases and is computed server-side at game end from verified turn records. One free chit swap per game.
9. CHOOSE phase: 15s; timeout = auto-Truth with a toast.
10. TAKING TOO LONG: more than 50% of witnesses must press it; the turn then goes to VOTE flagged `STALLED`. PERFORM has no cutoff; an elapsed stopwatch runs from `startedAt`.
11. SPIN: the server picks the target SEAT INDEX. Weighting: exclude offline/kicked players, never the same performer twice in a row, favour players with fewer turns. Clients animate to the stored seat index.
12. DARE TYPES are chosen by the author when writing (Instant, Social/External); the Judge confirms or reclassifies. Multi-turn dares are Phase 4 (author picks N = 1-3).
13. CHIT WRITING is optional. Quick Play skips it and draws from the curated starter deck. Writing deadline 120s; missing chits are auto-filled. Min 3 players, max 8.
14. AGE GATE: one first-run screen with 18+ self-declaration, table rules, and "others can record video calls". Never call it verification.
15. Free and ad-free; instrument analytics; no payment code.

---

## 4. FIX CHECKLIST (every item must be implemented, tested and ticked by ORCH at the gate named)
### AUTHORITY AND TIMING
- D1 Arbiter API + deny-by-default rules. [P1]
- D2 `deadlineAt` and clock-offset timers, derived on every render. [P1]
- D3 Memory cache for game docs, stale-write rejection, visible sync indicator. [P1]
- D18 Split documents: room (stable), turn (hot), votes (subcollection), presence (RTDB); narrow listeners. [P1]

### PRESENCE AND LIFECYCLE
- D4 RTDB `onDisconnect`, 25s grace, `visibilitychange` = "away" (not offline), share-sheet exempt. [P1]
- D5 Deterministic host election and demotion of a returning host. [P2]
- D6 Transactional join (max players, unique sanitized name, uid ban list, rejoin only with same uid). [P1]
- D7 Room code made in a transaction from an alphabet without 0/O/1/I/L; Firestore TTL on `expiresAt` (4h idle); rate-limited code probing. [P1]
- D14 Names: unique per room, length/charset limits, reserved words (Host, Owl, Admin, Vowlet), impersonation check. [P1]
- D20 Deck refill on exhaustion; spectators; leaver rules (chits return to pool, pending vote dropped, active dare cancelled, performer leaves = `SKIPPED` with no penalty, fewer than 3 present = pause 60s then close). [P1-P2]

### SECRECY AND SECURITY
- D8 Sealed prompt stored in `private/{uid}`, readable only by the current performer after CHOOSE. [P1]
- D9 `authorUid` kept in a no-client-read collection; chits are anonymous. [P1]
- D10 Chits written only via `/api/chit/submit`; direct writes denied. [P1 filter-only, P2 full]
- D12 Every route: Firebase ID token + App Check + zod validation + per-uid rate limit + locked CORS. [P1]
- D15 XP computed server-side; client value is display-only. [P3]
- D13 LiveKit token: membership + active-dare check, performer-only publish, 2-minute TTL. [P4]

### MODERATION AND CONTENT
- D11 Judge pipeline (section 5.5), fail-closed. [P2]
- D27 Owl roasts come from curated templates; any free-text roast uses the same pipeline. [P2]
- D29 Tier rubric with examples; calibration set of 300+ labelled chits including injection attempts and Hinglish. [P2]
- D28 Community deck is opt-in per chit with PII scrub and author delete. [P3]
- D19 Ratings: one per uid per prompt, Wilson lower-bound ranking, near-duplicate hashing. [P3]
- B9 Community deck unlocks only after 20+ ratings per prompt; starter deck fills gaps. [P3]
- B7 450+ curated prompts (Mild/Spicy/Legend) in 5 packs (Friends, Couples, Office-safe, Trip, Hinglish Special), 150 Owl lines. [P1: 150 prompts; P3: full set]

### CLIENT AND EXPERIENCE
- D16 `schemaVersion` in room, service-worker update prompt, join blocked on mismatch. [P2]
- D17 Seat-index targets, per-device table rotation, cumulative bottle angle, snap to final state on reconnect, hard cap 8 seats. [P1]
- D22 Phase 4 video: audio-only fallback, lobby pre-flight permission check, no echo in same room, recording notice. [P4]
- D23 Share = copy-to-clipboard + Web Share, with no promises about tags. [P3]
- D24 Accessibility (section 6.4). [P2]
- D25 Performance budgets (section 9.4). [P2]
- D26 Emulator suite, multi-client Playwright, bots, chaos suite, Sentry, Remote Config flags, CI, staging project. [P0-P2]

### PRODUCT, GROWTH AND BUSINESS
- B2 Night Recap share card, one-tap Rematch, saved Tables for signed-in users, occasion packs. [P3]
- B3 Link/QR/code join in 3 taps or fewer; guest = name only; Google sign-in optional; in-app-browser detector with "Open in browser" help. [P1]
- B4 Table Mode (one shared screen shows bottle/timers/results; phones are controllers) and Pass-the-Phone fallback. [P3]
- B5 Quick Play, timer presets, length presets (Short 5 / Standard 10 / Long 15 turns). [P1]
- B6 Warm, teasing-never-shaming Owl copy; non-punitive XP. [P1]
- B8 Landing page with join-by-code (noindex while PRIVATE_BETA), recap sharing, 15-30s clip template and creator kit. [P3]
- B10 Consent screen, Terms, Privacy, content policy, Safe Dares policy, delete-my-data, report/block, no-recording notice, all labelled DRAFT. [P2]
- B11 Quota dashboard with alerts at 60% and 80%, kill switches, LLM verdict caching. [P1-P4]
- B12 Server-side exponential levels, bottle skins, streaks, Table history. [P3]
- B13 Analytics event spec, KPI dashboard spec, validation protocol. [P3]
- B14 PWA support matrix for iOS Safari, Android Chrome, in-app browsers. [P2]
- B1 Monetization decision memo (compare at least three options with numbers; no payment code). [P5]
- B15 Phased roadmap with hard gates. [all]

---

## 5. ARCHITECTURE
### 5.1 REPO (pnpm workspaces, TypeScript strict, ESLint, Prettier)
- `/apps/web`: React 18 + Vite PWA (`vite-plugin-pwa`) + Tailwind + Framer Motion + Zustand
- `/api`: Vercel serverless functions (TypeScript, `firebase-admin`, `zod`)
- `/packages/shared`: Pure logic and types used by web AND api: phase machine, xp, vote, spin, deck, validators, moderation filter
- `/firebase`: `firestore.rules`, `database.rules.json`, indexes, emulator config, TTL policy
- `/e2e`: Playwright multi-client tests, bot players, chaos suite
- `/content`: starter deck, Owl lines, tier rubric, calibration set
- `/docs`, `/ops`, `/.github`

### 5.2 DATA MODEL
- `rooms/{code}`: settings, hostUid, phase, round, turnVersion, schemaVersion, callLink, expiresAt (TTL). Members read; nobody writes.
- `rooms/{code}/players/{uid}`: name, avatar, seat, joinedAt, ready, banned, turnsTaken, sessionScore, streak. Members read; nobody writes.
- `rooms/{code}/turn/current`: performerUid, phase, deadlineAt, choice, kind, startedAt, stallVotes. Members read; nobody writes.
- `rooms/{code}/votes/{uid}`: verdict, turnVersion. A user may write only their own vote, only when phase is VOTE, uid is not the performer, and the version matches.
- `rooms/{code}/chits/{id}`: kind, tier, dareType, status. Never text, never author.
- `rooms/{code}/secret/{id}`: text, authorUid, verdict. NO client access.
- `rooms/{code}/private/{uid}`: the sealed prompt. Readable only by the current performer.
- `users/{uid}`: lifetimeXp, level, skins, optIns. Read own; writes via API.
- `prompts/{id}`: text, kind, tier, pack, source, ratingAgg, hash. Read; writes via API.
- `reports/{id}`: create only.
- RTDB `presence/{code}/{uid}`: online, away, lastSeen. Write own node only.

### 5.3 STATE MACHINE (every row: expectedPhase + expectedVersion guard)
- `LOBBY -> WRITING` (or `SPIN` in Quick Play): host presses Start with 3+ present players. No timeout.
- `WRITING -> SPIN`: all sealed or 120s. Missing chits auto-filled from the starter deck.
- `SPIN -> CHOOSE`: server picks the seat index on entry; 4.5s animation; any player may advance after the deadline.
- `CHOOSE -> PERFORM`: performer picks; 15s then auto-Truth.
- `PERFORM -> VOTE`: performer taps Done, or >50% of witnesses press Taking Too Long (flag `STALLED`). No cutoff.
- `PERFORM -> RESULT`: performer taps Skip (-30 session points).
- `VOTE -> RESULT`: all witness votes in or 20s; quorum and SPLIT rules from decision 7.
- `RESULT -> SPIN` or `SUMMARY`: 6s or tap; rounds left decides.
- `SUMMARY -> PODIUM -> LOBBY` (Rematch) or `CLOSED`. Room expires 4h after last activity.

### 5.4 API (every route: ID token + App Check + zod + rate limit + idempotency key)
- `POST /api/room/create | join | leave | kick | start | settings`
- `POST /api/chit/submit | swap`
- `POST /api/turn/advance | choose | perform/done | perform/skip | perform/stall`
- `POST /api/game/finish` (lifetime XP, levels, skin unlocks from verified turn records)
- `GET /api/prompts/community`, `POST /api/prompts/rate`, `POST /api/report`
- `POST /api/livekit/token` (Phase 4 only)
Put the shared logic in `/packages/shared` so the client previews exactly what the server decides.

### 5.5 JUDGE OWL PIPELINE
1. Deterministic filter: max 140 chars; English + Hinglish blocklists; phone/email/address patterns; alcohol/drug terms; minors; sexual content; violence; self-harm; naming real non-participants; unsafe-dare patterns (trespass, driving, fire, heights, ingestion, nudity, public harassment).
2. LLM classifier behind an adapter interface (default: Google AI Studio free tier; a mock for tests). The chit is passed as quoted DATA. Output must validate against a JSON schema `{verdict: FINE | TOO_MILD | NOPE, tier, dareType, reason}`. Cache by normalized-text hash.
3. Failure handling: timeout, rate limit or malformed output = chit stays pending, retry once, then ask the author to rewrite or take a starter prompt. NEVER auto-approve.
4. Owl explains verdicts in one friendly line. Players can flag a wrong tier.
5. A Remote Config kill switch disables the LLM stage (falls back to filter + starter deck).

---

## 6. UI/UX SPECIFICATION
Reference image: `/docs/design/reference.png` (10 screens). Two visual modes: LINEN (home, write chits, vote, result, podium) and LAMPLIT SCENES (lobby, spin, chosen, unseal: dark amber, cream text). Build both.

### 6.1 SCREENS FROM THE REFERENCE, WITH REQUIRED CHANGES
1. Home: owl, Create/Join, level chip. Change: wordmark reads "Vowlet" with the tagline; no bottom nav; gear for settings; level chip only when signed in (guests see "Sign in to keep progress").
2. Lobby: radial table, room code with copy, ready counter. Add: QR + share link, call-link field, settings summary, kick menu, Quick Play toggle (host), self-ready toggle, cap 8 seats.
3. Write Chits: Add dare-type selector (Instant/Social), Judge verdict states (FINE / TOO MILD / NOPE with an Owl line), 140-char counter, "skip writing" option. Replace the sample dare "propose to your crush" with a consent-safe example.
4. Bottle Spin: personalised text "The bottle has chosen {name}"; sound toggle; haptic on landing; no skip.
5. Chosen: performer only; 15s ring; others see "{name} is choosing...".
6. Unseal: performer sees the text; others see "{name} is unsealing a Dare..."; Done and Skip below; one Swap.
7. Vote: 20s (not 15); Approve/Reject with icon + label on both; show a vote COUNT only, never who voted how; performer sees a waiting state.
8. Result: PASSED seal plus NOT IT, SPLIT, SKIPPED, STALLED variants; show session-score delta; warm Owl line.
9. Podium: top three; add Rematch, Share Recap, Save Table; handle 3-player and 8-player layouts.

### 6.2 SCREENS THE REFERENCE DOES NOT SHOW (all must be built)
First-run consent; Create Table; Join Table (code, QR, link); Perform Truth (answer aloud or type); Perform Dare (elapsed stopwatch, Taking Too Long); Social share sheet; Summary/Loot (XP, level-up, skin unlock); Profile/Settings (name, sign-in, delete my data, sound, reduced motion); Report/Block sheet; Legal (Terms, Privacy, Safe Dares, all DRAFT); Reconnecting/offline banner; Room closed and error pages; In-app-browser help; Update-available toast; Table Mode display; loading and empty states.

### 6.3 DESIGN TOKENS
- Palette: Linen `#F6F1E9`, Cream `#FFFDF9`, Ink `#23201C`, Truth Teal `#2E5E6B`, Dare Terracotta `#C4552D`, Brass `#B8893B`, Sage `#5B8C5A`, Brick `#A33A2C`.
- Text-safe variants (use for TEXT only; QA must confirm 4.5:1 with a contrast checker): brass text `#8A6420`, sage text `#3F6B3E`, terracotta text `#A9441F`. Originals stay for fills, seals, borders.
- Lamplit scenes: dark scrim of at least 60% behind cream text.
- Fonts (self-hosted WOFF2, subsetted): Cormorant Garamond (display), Inter (UI), Kalam (handwritten chits; covers Devanagari for Hinglish).
- Shape: 18px radii, hairline ink borders, two-layer shadows. Wax seals, bottle and owl poses (idle, judging, approve, disapprove, roast) are SVG/CSS, not heavy rasters. Scene backgrounds are WebP of 150KB or less. Any raster art must be self-made or free-licensed.

### 6.4 LAYOUT, MOTION, ACCESSIBILITY
- Mobile-first 360-430px, safe-area insets, 44px minimum touch targets, NO horizontal overflow on any screen. Radial table supports 3-8 seats and is tested at 360px.
- Framer Motion, transform and opacity only. The bottle uses a cumulative angle (extra full turns, 4.5s ease-out) so it never reverses across 350 to 10 degrees. Reconnecting clients snap to the stored final angle. Each device rotates the table so its own seat is at the bottom; the shared value is a seat index, never degrees.
- `prefers-reduced-motion`: crossfade and instant bottle placement with a highlight.
- Every state (Approve, Reject, ready, away, error) uses icon + text + colour, never colour alone. Timers and verdicts are announced to screen readers. Sound is optional with a visible toggle.

---

## 7. THE TEAM
### OPERATING MODEL
- ORCH is the only agent that talks to the human. Others work from task cards and write handoff notes to files.
- Board: `/docs/orchestration/`. Contracts: `/docs/contracts/{api.md, schema.md, phases.md, events.md}`, versioned with semver. ADRs: `/docs/adr/`.
- Loop per phase: Plan -> Contract freeze -> Parallel build in lanes -> Integration -> Gate review -> Retrospective.
- Lanes (parallel after contract freeze): PRODUCT (PM, BIZ, GD, CW, LEG) | EXPERIENCE (UX, FE1, FE2, PERF) | PLATFORM (ARCH, BE, RT, AI) | ASSURANCE (SEC, QA, OPS).
- OWNERSHIP: an agent edits only its owned paths. Anything else is a change request to ORCH, who routes it to the owner. Contract changes need ARCH plus written acknowledgement from every consumer.
- MERGE ORDER: `packages/shared` -> `firebase` rules and `api` -> `apps/web` -> `e2e`. A merge needs green CI and the named reviewers.
- CONFLICT PRIORITY: Safety and Legal > Security > Correctness > UX > Speed > Polish.
- ANTI-DRIFT: re-read sections 3 and 4 at every phase start. No work outside the current phase backlog; good ideas go to `PARKING-LOT.md`.

### ROSTER (code: mission | owns | outputs | reviewed by)
- PM: backlog, stories, testable acceptance criteria, scope guard | `/docs/prd` | PRD, per-phase backlog | ORCH
- BIZ: metrics, validation, growth, monetization memo | `/docs/business` | analytics event spec, KPI spec, validation protocol, landing copy, creator kit, Phase 5 memo | PM
- GD: rules, balance, XP, fairness, Quick Play and Table Mode design | `/packages/shared/{xp,vote,spin,deck}`, `/docs/game` | rulebook, property tests spec | QA
- CW: starter deck, Owl voice, tier rubric, Safe Dares copy, all UI text (English + Hinglish, alcohol-free, consent-safe) | `/content` | 450+ prompts, 150 Owl lines, calibration-set seeds | LEG, AI
- UX: tokens, components, screen specs from the reference, a11y spec | `/docs/design`, `/apps/web/src/design` | token file, component library, specs for every screen in 6.1 and 6.2, motion spec | PERF
- ARCH: contracts, data model, ADRs, versioning | `/docs/contracts`, `/docs/adr` | api, schema, phases, events | SEC
- FE1: app shell, phase router, stores, auth, PWA/service worker, sync indicator, version-skew prompt, in-app-browser help | `/apps/web/src/{app,state,pwa,auth}` | shell | UX, QA
- FE2: all screens, bottle spin, table layout, animations, Table Mode | `/apps/web/src/{screens,game}` | screens 1-9 plus all of 6.2 | UX, PERF
- BE: every route in 5.4; transactional, idempotent, authenticated, rate-limited | `/api` | API | SEC, QA
- RT: deny-by-default rules and rules tests, presence, host election, TTL, indexes | `/firebase`, `/packages/shared/presence` | rules + tests | SEC, ARCH
- AI: Judge pipeline, filters, calibration harness, verdict cache, roast templates, ratings, PII scrub | `/api/judge`, `/packages/shared/moderation` | pipeline + eval harness | SEC, LEG
- SEC: threat model, review of every rules/API change, scripted abuse cases; blocks releases with open Critical/High | `/docs/security` | threat model, checklist | ORCH
- QA: all test layers, bots, chaos suite, device matrix, reproducible bug reports | `/e2e` | suites in section 9 | ORCH
- PERF: budgets, accessibility and performance audits, Lighthouse CI + axe | `/docs/quality` | audit reports | QA
- OPS: repo, CI/CD, environments, Remote Config flags, monitoring, quota tracking, kill switches | `/.github`, `/ops` | pipelines, staging, Sentry, alerts | SEC
- LEG: consent text, Terms, Privacy, Safe Dares, delete-my-data and report SOPs; drafts only, not legal advice | `/docs/legal`, `/apps/web/src/legal` | DRAFT policies | Human

---

## 8. PHASES AND GATES
- PHASE 0: FOUNDATIONS AND CONTRACTS
- PHASE 1: CORE IN-PERSON LOOP
- PHASE 2: ROBUSTNESS, TRUST AND SAFETY
- PHASE 3: RETENTION, GROWTH AND VALIDATION READINESS
- PHASE 4 (only after "GO PHASE 4"): LiveKit video, multi-turn dares
- PHASE 5: Launch hardening

---

## 9. QUALITY, SECURITY AND RELEASE GATES
- 9.1 TEST LAYERS: Unit + property (Vitest), Rules tests (Emulator), API tests, End-to-end (Playwright 4-6 contexts + bots, 20x), Judge eval harness (300+ labelled set), Device matrix.
- 9.2 CHAOS SCENARIOS: 14 scenarios, all must pass by end of Phase 2.
- 9.3 SECURITY CHECKLIST: ID token + App Check, zod, rate-limit, locked CORS, no secrets, deny-by-default rules, text-only rendering, reserved/impersonating names rejected.
- 9.4 PERFORMANCE AND ACCESSIBILITY BUDGETS: Initial JS <= 200KB gzipped, scene images <= 150KB WebP, mobile Lighthouse LCP <= 2.5s, CLS <= 0.1, a11y >= 95, 60fps bottle spin, axe zero critical, >= 44px touch targets, reduced-motion, 4.5:1 contrast.
- 9.5 FREE-TIER GUARDRAILS AND KILL SWITCHES: <= 300 Firestore writes per 10-turn 6-player game; quota alerts at 60% and 80%; Remote Config kill switches; Sentry privacy scrubber.
- 9.6 DEFINITION OF DONE: AC met + tested, reviewers approved, no Critical/High SEC or a11y regression, contracts/docs updated, analytics emitted, CI green.
