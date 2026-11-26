# Vowlet Security Threat Model (STRIDE)

> **Status**: Phase 0 Baseline  
> **Owner**: SEC (`ASSURANCE` lane)  
> **Reviewed by**: ORCH, ARCH  
> **References**: [MASTER_PLAN.md](../MASTER_PLAN.md) (Sections 3, 4, 5, 9)

---

## 1. System Overview & Trust Boundaries

Vowlet is an in-person-first social party PWA (React 18 + Vite) backed by Vercel Serverless Functions (Arbiter API using `firebase-admin`), Firebase Auth, Firebase App Check, Cloud Firestore, and Firebase Realtime Database (presence only).

```text
[ Untrusted Client: /apps/web PWA ]
   |  (Firebase ID Token + App Check Token + HTTPS)
   v
[ Trust Boundary 1: Vercel Edge / Arbiter API (/api/*) ]
   |  (firebase-admin service account, zod validation, rate limits, transactions)
   +---> [ Cloud Firestore ] (rooms, players, turn, votes, chits, secret, private, users, prompts, reports)
   +---> [ Google AI Studio ] (Judge Owl LLM classifier — quoted DATA only)
   |
[ Trust Boundary 2: Direct Firebase Client SDK ]
   +---> [ Firestore ] (read-only on permitted docs; write ONLY on votes/{uid} & reports/{id})
   +---> [ RTDB ] (presence/{code}/{uid} — write own node only)
   |
[ Observability ]
   +---> [ Sentry ] (error & performance telemetry with PII scrubber)
```

### Key Assets to Protect
1. **Sealed Prompt Text** (`rooms/{code}/private/{uid}`): Must only be visible to the active performer after `CHOOSE`.
2. **Chit Author Identity** (`rooms/{code}/secret/{id}.authorUid`): Must never be exposed to any client.
3. **Game State & Progression Integrity** (`phase`, `turnVersion`, `deadlineAt`, `hostUid`, `sessionScore`, `lifetimeXp`).
4. **Player Privacy & Safety**: Display names, UIDs, potential PII in user-submitted chits, and telemetry data.
5. **Free-Tier Quotas**: Firestore writes ($\le 300$ per 10-turn 6-player game) and Google AI Studio LLM quota.

---

## 2. STRIDE Threat Analysis by Surface

| Surface | Threats (STRIDE) | Existing / Required Controls (MASTER_PLAN Refs) | Residual Risk & Notes |
| :--- | :--- | :--- | :--- |
| **1. Firestore & RTDB Rules** | **T**ampering, **I**nformation Disclosure, **E**levation of Privilege, **D**oS | - Deny-by-default baseline (`allow read, write: if false`).<br>- `rooms/{code}`, `players/{uid}`, `turn/current`, `chits/{id}`: members read, **nobody writes** from client (D1).<br>- `votes/{uid}`: write own `uid` only, only when `phase == 'VOTE'`, `uid != performerUid`, and `turnVersion` matches (Sec 5.2).<br>- `secret/{id}`: **NO client read or write** (D9).<br>- `private/{uid}`: readable only by `uid == performerUid` after `CHOOSE` (D8).<br>- `users/{uid}`: read own only; writes via API.<br>- `reports/{id}`: create only.<br>- RTDB `presence/{code}/{uid}`: write own node only; `onDisconnect` + 25s grace (D4). | Rules must be regression-tested in Firebase Emulator on every rules change (Sec 9.1). |
| **2. Arbiter API (`/api/*`)** | **S**poofing, **T**ampering, **R**epudiation, **D**oS | - Every route enforces: Firebase ID token + App Check + `zod` schema validation + per-UID rate limit + locked CORS + idempotency key (D12, Sec 5.4).<br>- Every state transition runs in a Firestore transaction verifying `expectedPhase` + `expectedVersion`; mismatch returns current state with no mutation (Sec 3.2, 5.3).<br>- Host actions (`settings`, `kick`, `start`) verify `hostUid == uid`; host migration picks earliest `joinedAt` among present players and demotes returning old host (Sec 3.5, D5).<br>- `lifetimeXp` computed server-side at game end (`/api/game/finish`) from verified turn records (D15). | Rate-limit state in serverless environments must use a shared store or consistent edge limiter so bursts cannot bypass per-instance memory. |
| **3. App Check** | **S**poofing, **D**oS | - Required on every `/api/*` route (D12) and Firebase client SDK access to block scripted bots and non-app clients.<br>- Paired with per-UID rate limits and ID token verification. | Web App Check (reCAPTCHA) can be bypassed by sophisticated headless browsers; treated as defense-in-depth, never sole auth. |
| **4. Room Code Enumeration** | **I**nformation Disclosure, **D**oS | - Room codes generated in a transaction using an unambiguous alphabet without `0/O/1/I/L` (D7).<br>- Firestore TTL on `expiresAt` (4h idle) shrinks active room surface (D7).<br>- Rate-limited code probing on `/api/room/join` (D7).<br>- Transactional join enforces max 8 players, UID ban list, and rejoin only with same UID (D6). | Short human-friendly codes have bounded entropy; strict rate limiting + 4h TTL + App Check are mandatory to prevent brute-force joins. |
| **5. Sealed Prompt Secrecy** | **I**nformation Disclosure | - `rooms/{code}/chits/{id}` stores only `kind, tier, dareType, status` — **never `text`**, **never `authorUid`** (Sec 5.2).<br>- Sealed prompt is written to `rooms/{code}/private/{uid}` and readable only by the current performer after `CHOOSE` (D8). | Once unsealed on the performer's screen, a player can read it aloud or screenshot it (mitigated by in-person social context and no-recording notice). |
| **6. Author Anonymity** | **I**nformation Disclosure | - `authorUid` is stored exclusively in `rooms/{code}/secret/{id}` with **NO client access** (D9, Sec 5.2).<br>- API responses for chits, turns, and results strip `authorUid`.<br>- Opt-in community deck (Phase 3) runs PII scrub and supports author delete without exposing `authorUid` to players (D28). | Small-group deduction (e.g., 3 players) is inherent to party games; technical leakage is prevented. |
| **7. Judge Prompt Injection** | **T**ampering, **E**levation of Privilege | - Chit text is passed to Google AI Studio LLM classifier strictly as **quoted DATA**, never interpolated into system prompts (Sec 5.5).<br>- LLM output must validate against strict JSON schema `{verdict: FINE \| TOO_MILD \| NOPE, tier, dareType, reason}` (Sec 5.5).<br>- **Fail-closed** (D11): timeout, rate limit, or malformed output keeps chit pending, retries once, then prompts author to rewrite or pick starter deck — **never auto-approves**. | Adversarial inputs may still trigger false negatives; mitigated by pre-LLM deterministic filter and calibration testing (D29). |
| **8. Hinglish Moderation Bypass** | **T**ampering (Safety Policy Bypass) | - Deterministic filter includes English + Hinglish blocklists, PII patterns, and unsafe-dare patterns (Sec 5.5).<br>- Normalized-text hashing prevents trivial whitespace/punctuation evasion (Sec 5.5).<br>- 300+ labelled calibration set specifically includes Hinglish and injection attempts (D29).<br>- Remote Config kill switch disables LLM stage and falls back to deterministic filter + starter deck (Sec 5.5). | Novel transliterations or coded slang may slip through; mitigated by in-game Skip, player tier-flagging, and Report/Block flows. |
| **9. XSS via Player Names / Chits** | **T**ampering, **S**poofing | - Text-only rendering in React (no `dangerouslySetInnerHTML`, no raw HTML injection) (Sec 9.3).<br>- Server-side `zod` validation on names: length/charset limits, per-room uniqueness, reserved words (`Host`, `Owl`, `Admin`, `Vowlet`), impersonation checks (D14).<br>- Chits capped at 140 chars and sanitized before storage (Sec 5.5).<br>- Content Security Policy (CSP) headers on `/apps/web`. | Ensure any share-card / SVG export (Phase 3) escapes or renders text via safe DOM/canvas APIs, not string-concatenated SVG. |
| **10. Privacy in Sentry** | **I**nformation Disclosure | - Sentry privacy scrubber strips PII (player names, UIDs, emails, IPs, auth/App Check tokens, chit text, `authorUid`) before transmission (Sec 9.5).<br>- `sendDefaultPii: false` enforced in client and API Sentry configs.<br>- Request bodies and `Authorization` headers excluded from breadcrumbs. | Verify scrubber with unit tests on synthetic error payloads containing PII before Phase 2 gate. |

---

## 3. Out-of-Scope / Future Phases
- **Phase 4 (LiveKit Video & Multi-Turn Dares)**: Deferred behind Remote Config flag (`GO PHASE 4`). Will require threat-modeling LiveKit token issuance (`D13`: membership + active-dare check, performer-only publish, 2-minute TTL) and same-room echo/recording notices (`D22`) prior to Phase 4 build.
- **Payments**: Explicitly out of scope (Section 3.15: free and ad-free; no payment code).
