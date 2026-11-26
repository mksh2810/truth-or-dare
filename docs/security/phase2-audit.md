# Vowlet Phase 2 Security Audit Report

> **Auditor**: SEC (`ASSURANCE` lane)  
> **Scope**: Phase 1 & Phase 2 implementation review against [MASTER_PLAN.md](../MASTER_PLAN.md) (Sections 4, 8, 9.3, 9.5) and [threat-model.md](./threat-model.md)  
> **Gate Verdict**: **PASS — 0 Critical / 0 High open findings**

---

## 1. Executive Summary

A static and test-backed security review was conducted across Firebase security rules (`firebase/firestore.rules`, `firebase/database.rules.json`), Arbiter API middleware and routes (`api/_lib/middleware.ts`, `api/_lib/env.ts`, `api/_lib/store.ts`, `api/room/*`, `api/chit/*`, `api/turn/*`, `api/report.ts`, `api/user/delete.ts`), the Judge Owl moderation pipeline (`api/judge/pipeline.ts`, `api/judge/adapter.ts`), the Sentry privacy scrubber (`api/_lib/sentry.ts`), and the web client (`apps/web/`, `vercel.json`).

**Summary of Findings:**
- **Critical**: 0
- **High**: 0
- **Medium**: 2 (defense-in-depth hardening / known serverless rate-limit residual risk)
- **Low**: 3 (emulator rules test suite gap, CSP header pending, `.env.example` & Sentry SDK wiring pending)

---

## 2. Verification Matrix (Phase 1 & 2 Controls)

### 2.1 Firestore & RTDB Security Rules (`D1`, `D4`, `D8`, `D9`, Sec 9.3)
- **Deny-by-Default (`firebase/firestore.rules`)**:
  - Catch-all rule `match /{document=**} { allow read, write: if false; }` (lines 41–43).
  - Arbiter-managed collections (`rooms/{code}`, `players/{uid}`, `turn/current`, `chits/{id}`, `users/{uid}`, `prompts/{id}`) enforce `allow write: if false;`.
  - `verdictCache/{normalizedHash}` enforces `allow read, write: if false;`.
- **Zero Client Access to `secret/{id}` (`D9`)**:
  - `match /secret/{id} { allow read, write: if false; }` (lines 80–82). Verified `api/chit/submit.ts` writes `text` and `authorUid` only to `secret/{id}`, and `chits/{id}` stores only `kind`, `tier`, `dareType`, `status`, `judgeVerdict`, `owlReason`.
- **Performer-Only `private/{uid}` (`D8`)**:
  - `match /private/{uid}` (lines 85–91) allows `read` only when `isSignedIn() && request.auth.uid == uid && getTurn(code).data.performerUid == uid && getRoom(code).data.phase in ['PERFORM', 'VOTE', 'RESULT']`; `allow write: if false;`.
  - `GET /api/room/state` (`api/room/state.ts:51-56`) enforces the identical condition server-side.
- **Vote Integrity `votes/{uid}` (Sec 5.2)**:
  - `match /votes/{uid}` (lines 59–71) allows `create, update` only when:
    - `isRoomMember(code)` and `request.auth.uid == uid`
    - Not `banned` and not `spectator`
    - `getRoom(code).data.phase == 'VOTE'`
    - `getTurn(code).data.performerUid != uid` (non-performer)
    - `request.resource.data.turnVersion == getRoom(code).data.turnVersion`
    - `request.resource.data.verdict in ['APPROVE', 'REJECT']`
    - `request.resource.data.keys().hasOnly(['verdict', 'turnVersion', 'votedAt'])`
    - `allow delete: if false;`
- **Reports (`reports/{id}`)**:
  - `allow create: if isSignedIn() && request.resource.data.reporterUid == request.auth.uid; allow read, update, delete: if false;` (lines 104–108).
- **RTDB Presence (`firebase/database.rules.json`)**:
  - Root `.read: false`, `.write: false`.
  - `presence/$code/$uid`: `.write: "auth != null && auth.uid === $uid"`, `presence/$code`: `.read: "auth != null"`.

### 2.2 Arbiter API Middleware (`D7`, `D12`, `D14`, `D16`, Sec 3.2, 9.3)
Reviewed `api/_lib/middleware.ts`, `api/_lib/env.ts`, `api/_lib/store.ts`, and all route handlers in `api/`:
- **Route Coverage**: Every mutating route in `api/` uses `withArbiterAuth`; `api/room/state.ts` uses `withArbiterGet`. (`api/health.ts` is the sole unauthenticated `GET` health check.)
- **Firebase ID Token**: `authenticateRequest` (`middleware.ts:87-118`) requires `Authorization: Bearer <token>` and verifies via `firebase-admin` `getAuth().verifyIdToken(token)`.
- **Firebase App Check**: When `env.appCheckEnforce` is `true` (default in `NODE_ENV === 'production'` without emulator/local memory, or when `APP_CHECK_ENFORCE=true`), `authenticateRequest` requires `X-Firebase-AppCheck` and verifies via `getAppCheck().verifyToken(token)`.
- **Zod Validation**: `withArbiterAuth` parses JSON safely (`parseRawBody`), validates UUID `Idempotency-Key` (body or header), and validates payloads against each route's `zod` schema (`400 VALIDATION_ERROR` on failure).
- **Per-UID Rate Limiting**: Both `withArbiterAuth` and `withArbiterGet` invoke `store.checkRateLimit(uid, routeGroup, limit, windowMs)`, returning `429 RATE_LIMITED` with `Retry-After`. `api/room/join.ts` enforces a stricter limit (`10` req / `60s` per UID) against room-code enumeration.
- **Locked CORS**: `applyCors` (`middleware.ts:54-85`) sets `Vary: Origin` and rejects unknown `Origin` headers with `403 FORBIDDEN`. Production defaults to `https://vowlet.app`, `https://www.vowlet.app`, plus `ALLOWED_ORIGINS`.
- **Idempotency & Version Guards**: `withArbiterAuth` caches `2xx` responses keyed by `sha256(uid:route:key)` in `_idempotency`. State transitions run inside `store.runTransaction` with `expectedPhase` + `expectedVersion` checks (`409 VERSION_MISMATCH`).
- **Host Migration & Schema Guard**: `api/room/migrate.ts` enforces `expectedPhase`/`expectedVersion`, elects earliest `joinedAt` present player, and keeps returning old hosts demoted (`D5`). `api/room/join.ts` and `api/room/state.ts` reject outdated `schemaVersion` with `426 SCHEMA_MISMATCH` (`D16`).

### 2.3 Judge Owl Pipeline (`D11`, `D27`, `D29`, Sec 5.5)
Reviewed `api/judge/pipeline.ts` and `api/judge/adapter.ts`:
- **Prompt Injection Defense (Quoted DATA)**:
  - `GEMINI_SYSTEM_PROMPT` (`adapter.ts:181-189`) explicitly defines `<CHIT_DATA>` as JSON-quoted untrusted user DATA and instructs the model never to follow instructions inside `<CHIT_DATA>`.
  - `GeminiJudgeAdapter.classify` (`adapter.ts:218-246`) serializes `{ kind, requestedTier, requestedDareType, text }` with `JSON.stringify` inside `<CHIT_DATA>...</CHIT_DATA>`.
  - Pre-LLM `detectPromptInjection` (`adapter.ts:58-69`, `pipeline.ts:162`) blocks common override patterns and `<system>`/`<chit_data>`/`<instruction>` tags deterministically.
- **Strict Output Schema & Fail-Closed**:
  - `GeminiJudgeAdapter` uses a `2500ms` `AbortController` timeout and validates responses with `JudgeOutputSchema` (`verdict`, `tier`, `dareType`, `reason`).
  - `runJudgePipeline` retries once on `JudgeTimeoutError`, `JudgeRateLimitError`, or `JudgeMalformedError`, and otherwise returns `outcome: 'PENDING_RETRY'`, `verdict: null`, `status: 'PENDING'`, `fallbackAction: 'REWRITE_OR_STARTER'`, `stage: 'FAIL_CLOSED'` — **never auto-approving**.
- **Calibration & Tests**: `pnpm --filter @vowlet/api test` passed all 4 suites (22/22 tests), including the 320-item calibration eval (`NOPE` block rate `120/120` = `100.00%`, `FINE` false-block `1/150` = `0.67%`, `TOO_MILD` `49/50` = `98.00%`, timeout/malformed fail-closed, and curated/moderated roasts).

### 2.4 Sentry Privacy Scrubber (Sec 9.5)
Reviewed `api/_lib/sentry.ts`:
- `scrubSentryEvent` recursively scrubs `message`, `user`, `request`, `extra`, `contexts`, `tags`, `breadcrumbs`, and `exception.values[].value` without mutating input.
- `SENSITIVE_KEYS` strips chit/prompt text (`chitText`, `promptText`, `secretText`, `sealedPrompt`, `privatePrompt`, `text`), names (`playerName`, `displayName`, `name`, `username`), `email`, `authorUid`, `ip_address`, and auth/App Check/API tokens (`authorization`, `idToken`, `x-firebase-appcheck`, `x-test-uid`, `cookie`, `gemini_api_key`, etc.).
- Regexes scrub `Bearer <token>`, JWTs (`eyJ...`), email addresses, and `rooms/{code}/secret/...` paths (`[REDACTED_SECRET_PATH]`).
- Unit-tested in `api/__tests__/phase2.test.ts` (passing).

### 2.5 Secrets & Client XSS Hygiene (Sec 9.3)
- **Secret Scan**: `git grep` across tracked files for Google API keys (`AIza...`), PEM private keys, and service tokens returned **0 matches**. `.gitignore` excludes `.env`, `.env.local`, `.env.*.local`, `.vercel/`, `.firebase/`.
- **Text-Only Rendering**: `git grep` across `apps/`, `packages/`, and `api/` for `dangerouslySetInnerHTML` and `innerHTML` returned **0 matches**.
- **Security Headers**: `vercel.json` sets `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, and `X-Robots-Tag: noindex, nofollow`.

---

## 3. Open Findings & Recommendations (Non-Blocking for Phase 2)

| ID | Severity | Area | Finding | Recommendation / Target |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-F1** | **Medium** | `api/_lib/env.ts`, `api/_lib/middleware.ts` | `useMemoryStore` defaults to `true` when both `FIREBASE_SERVICE_ACCOUNT_JSON` and `FIRESTORE_EMULATOR_HOST` are unset, which enables `x-test-uid` header auth bypass if production env vars are misconfigured. | Gate `x-test-uid` strictly on `process.env.NODE_ENV !== 'production'` (and require explicit `VOWLET_LOCAL_MEMORY === '1'`). |
| **SEC-F2** | **Medium** | `api/_lib/store.ts` | `FirestoreArbiterStore.checkRateLimit` stores sliding-window timestamps in per-instance memory (`Map`), so bursts across warm Vercel instances can exceed the per-UID limit (known residual risk in `threat-model.md`). | Acceptable for Private Beta free tier; move rate-limit counters to a shared store if multi-instance abuse is observed. |
| **SEC-F3** | **Low** | `firebase/` | No automated `@firebase/rules-unit-testing` suite exists in `/firebase` yet; rules were verified via static review. | Add Emulator rules regression tests covering `secret/`, `private/`, `votes/`, and `reports/` before Phase 3/5. |
| **SEC-F4** | **Low** | `vercel.json` | `Content-Security-Policy` (CSP) header is not yet configured alongside the existing security headers. | Add a strict CSP header in `vercel.json` (allowing self-hosted fonts/assets + Firebase Auth/Firestore/RTDB/App Check origins). |
| **SEC-F5** | **Low** | Repo / Observability | `.env.example` is missing at repo root, and `@sentry/node` / `@sentry/react` SDK initialization (`sendDefaultPii: false`, `beforeSend: scrubSentryEvent`) is not yet wired to a DSN. | Add `.env.example` (with placeholder names only) and wire `scrubSentryEvent` into Sentry `beforeSend` when DSN is configured. |

---

## 4. Test Evidence Observed

- `pnpm --filter @vowlet/api test`: **4 test files passed, 22/22 tests passed** (`health.test.ts`, `judge/__tests__/eval.test.ts`, `__tests__/phase2.test.ts`, `__tests__/arbiter.test.ts`).
- `packages/shared` tests (via `pnpm test`): **8 test files passed, 49/49 tests passed**.
