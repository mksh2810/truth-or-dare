# Vowlet Quality & Test Plan

> **Owner**: QA (`ASSURANCE` lane)  
> **Reviewers**: ORCH, PERF, SEC  
> **References**: [MASTER_PLAN.md](../MASTER_PLAN.md) (Sections 3, 4, 5, 6.4, 9)

---

## 1. Test Layers (Section 9.1)

All 6 layers are required for release readiness and integrated into CI/CD where applicable.

| # | Layer | Tooling & Location | Scope & Coverage | Gate |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **Unit & Property Tests** | Vitest (`/packages/shared`) | Pure logic: state machine transitions (`expectedPhase` + `expectedVersion`), XP & streak math (`+50` base, up to `+80` streak, `SPLIT` = half, `Skip` = `-30`), vote quorum (>50% witnesses, tie/no-quorum -> `SPLIT`), spin seat-index weighting (exclude offline/kicked, no repeat performer, favour fewer turns), deck refill, room code alphabet (no `0/O/1/I/L`), name/chit validators, deterministic moderation filter. | P1+ |
| 2 | **Rules Tests** | Firebase Emulator Suite (`/firebase`) | Deny-by-default Firestore & RTDB rules: `rooms`, `players`, `turn/current`, `chits` read-only for members; `votes/{uid}` write own only when `phase == 'VOTE'`, `uid != performerUid`, matching `turnVersion`; `secret/{id}` zero client access; `private/{uid}` performer-only after `CHOOSE`; `reports/{id}` create-only; RTDB `presence/{code}/{uid}` own-node write only. | P1+ |
| 3 | **API Tests** | Vitest + Supertest / HTTP against Emulator (`/api`) | Every route in Section 5.4: Firebase ID token, App Check, `zod` validation, per-UID rate limiting, locked CORS, idempotency key replay, `expectedPhase` + `expectedVersion` transaction guards, transactional join/kick/leave, server-side `lifetimeXp` (`/api/game/finish`). | P1+ |
| 4 | **End-to-End Tests** | Playwright (`/e2e`) | Multi-client browser contexts (4–6 contexts) + headless `BotPlayer` instances running 20x repeatability soak tests across `LOBBY -> WRITING -> SPIN -> CHOOSE -> PERFORM -> VOTE -> RESULT -> SUMMARY -> PODIUM`, plus Quick Play and Rematch. | P1 (smoke), P2 (20x) |
| 5 | **Judge Eval Harness** | Node/Vitest harness (`/api/judge`, `/content`) | 300+ labelled chits (`D29`) spanning Mild/Spicy/Legend, English + Hinglish, prompt injection attempts, PII, and unsafe dares. Verifies JSON schema validation, fail-closed behaviour, verdict caching, and kill-switch fallback. | P2+ |
| 6 | **Device Matrix** | Real devices + BrowserStack/emulators (`B14`) | iOS Safari, Android Chrome, and In-App Browsers (Instagram, WhatsApp, etc.). Verifies 360–430px layout, zero horizontal overflow, safe-area insets, >= 44px touch targets, 4.5:1 contrast, `prefers-reduced-motion`, 60fps bottle spin, and Lighthouse/axe budgets (Sec 9.4). | P2+ |

---

## 2. Chaos Scenarios (Section 9.2)

**Gate**: All 14 chaos scenarios must pass by the end of **Phase 2**.

| # | Scenario | Fault / Condition Injected | Expected System Behaviour |
| :--- | :--- | :--- | :--- |
| C1 | **Performer Disconnect Mid-CHOOSE** | Active performer drops connection during 15s `CHOOSE` window. | Any present player calls `/api/turn/advance` after `deadlineAt`; server auto-selects Truth with toast (`Sec 3.3, 3.9`). |
| C2 | **Performer Disconnect Mid-PERFORM** | Active performer disconnects (exceeds 25s RTDB `onDisconnect` grace) during `PERFORM`. | Turn resolves as `SKIPPED` with **no XP penalty** (`D20`), chits/state remain consistent, game advances to `RESULT`/`SPIN`. |
| C3 | **Host Leaves / Disconnects** | Host exits or exceeds 25s grace period. | Deterministic host migration elects earliest `joinedAt` among present players (`Sec 3.5, D5`). |
| C4 | **Returning Old Host Reconnects** | Former host reconnects after host migration occurred. | Returning old host is **demoted** to regular player; new host retains `hostUid` (`Sec 3.5, D5`). |
| C5 | **Player Count Drops Below 3** | Players leave/disconnect leaving `< 3` present players. | Game pauses for 60s; if `< 3` remain after 60s, room closes cleanly (`D20`). |
| C6 | **Concurrent `/turn/advance` Race** | 4+ clients simultaneously call `/api/turn/advance` right at `deadlineAt`. | Exactly one transaction succeeds and increments `turnVersion`; others receive current state with no mutation (`Sec 3.2, 3.3`). |
| C7 | **Duplicate Idempotency Key Replay** | Network retry sends identical request + idempotency key twice. | Server returns cached/current result without double-applying XP, state transition, or chit submission (`Sec 3.2, 5.4`). |
| C8 | **Stale `expectedVersion` Write** | Lagging client sends action with outdated `turnVersion` or `expectedPhase`. | Server rejects mutation, returns current state; client reconciles via visible sync indicator (`D3, Sec 3.2`). |
| C9 | **Vote Quorum Failure & Exact Tie** | Only <=50% of witnesses vote before 20s `deadlineAt`, OR Approve == Reject. | Turn resolves to `SPLIT` (half XP, streak kept); no host tie-break (`Sec 3.7`). |
| C10 | **Taking Too Long Stall** | >50% of witnesses press "Taking Too Long" during `PERFORM`. | Turn transitions `PERFORM -> VOTE` flagged `STALLED` (`Sec 3.10, 5.3`). |
| C11 | **Visibility Change vs Offline** | Player switches apps / opens share sheet (`visibilitychange`). | Marked `"away"` (not offline); share-sheet exempt; does not trigger 25s disconnect kick (`D4`). |
| C12 | **Bottle Reconnect Mid-Spin** | Client disconnects during 4.5s `SPIN` and reconnects after `SPIN -> CHOOSE`. | Client snaps immediately to stored final seat index / angle without re-playing full spin (`D17, Sec 6.4`). |
| C13 | **Judge LLM Timeout / Malformed JSON** | Google AI Studio times out, rate-limits (429), or returns invalid JSON. | **Fail-closed**: chit stays pending, retries once, then asks author to rewrite or take starter prompt; never auto-approves (`Sec 5.5, D11`). |
| C14 | **Schema Version Skew / SW Update** | Client running older `schemaVersion` attempts to join newer room or receives update. | Join blocked on `schemaVersion` mismatch with clear prompt; Service Worker update toast prompts reload (`D16`). |

---

## 3. Performance, Accessibility & Free-Tier Budgets (Sections 9.4, 9.5)

- **Initial JS**: $\le 200\text{ KB}$ gzipped
- **Scene Images**: $\le 150\text{ KB}$ WebP
- **Mobile Lighthouse**: LCP $\le 2.5\text{s}$, CLS $\le 0.1$, Accessibility $\ge 95$
- **Motion & Input**: 60fps bottle spin, `prefers-reduced-motion` crossfade + instant placement, $\ge 44\text{px}$ touch targets, zero horizontal overflow at `360px`
- **Axe**: 0 critical violations; 4.5:1 contrast on text-safe variants (`#8A6420`, `#3F6B3E`, `#A9441F`)
- **Free-Tier Guardrail**: $\le 300$ Firestore writes per 10-turn 6-player game

---

## 4. Device Matrix Template (B14)

Record test results for each release candidate at Phase 2+ gates.

| Platform | Browser / Context | OS / Version | Viewport | Mode (Browser / Standalone PWA) | Layout (360–430px, 0 overflow) | Touch & Safe Area | Audio / Haptics / Web Share | In-App Detector | Status | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **iOS** | Safari | iOS 16+ | 375x812 | Browser | [ ] | [ ] | [ ] | N/A | [ ] | |
| **iOS** | Safari | iOS 17+ | 390x844 | Standalone PWA | [ ] | [ ] | [ ] | N/A | [ ] | |
| **Android** | Chrome | Android 12+ | 360x800 | Browser | [ ] | [ ] | [ ] | N/A | [ ] | |
| **Android** | Chrome | Android 13+ | 412x915 | Standalone PWA | [ ] | [ ] | [ ] | N/A | [ ] | |
| **In-App (iOS)** | Instagram WebView | iOS 17+ | 390x844 | Embedded | [ ] | [ ] | [ ] | [ ] Shows "Open in browser" | [ ] | |
| **In-App (iOS)** | WhatsApp WebView | iOS 17+ | 390x844 | Embedded | [ ] | [ ] | [ ] | [ ] Shows "Open in browser" | [ ] | |
| **In-App (Android)** | Instagram WebView | Android 13+ | 360x800 | Embedded | [ ] | [ ] | [ ] | [ ] Shows "Open in browser" | [ ] | |
| **In-App (Android)** | WhatsApp WebView | Android 13+ | 360x800 | Embedded | [ ] | [ ] | [ ] | [ ] Shows "Open in browser" | [ ] | |
