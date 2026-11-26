# Vowlet Security Sign-Off Checklist (Phases 0–3)

> **Owner**: SEC (`ASSURANCE` lane)  
> **Gate Policy**: Releases are blocked if any **Critical** or **High** security issue is open (Section 7, 9.6).  
> **References**: [MASTER_PLAN.md](../MASTER_PLAN.md) (Sections 3, 4, 5, 9.3, 9.5) and [threat-model.md](./threat-model.md).

---

## Phase 0: Foundations and Contracts
| ID | Control / Requirement | Owner | Verification Method | Status |
| :--- | :--- | :--- | :--- | :--- |
| SEC-0.1 | STRIDE Threat Model created and reviewed | SEC | Review `docs/security/threat-model.md` | [x] |
| SEC-0.2 | Data model & API contracts enforce Arbiter-only writes, `secret/` no-read, `private/` performer-only, `votes/` self-only | ARCH, SEC | Contract review (`docs/contracts/`) | [x] |
| SEC-0.3 | No secrets, API keys, or service account JSONs committed to repo; `.gitignore` and `.env.example` configured | OPS, SEC | Repo scan / secret-scanning CI check (no secrets in repo; `.env.example` tracked as SEC-F5) | [x] |
| SEC-0.4 | Sentry privacy scrubber specification defined (`sendDefaultPii: false`, PII field stripping) | OPS, SEC | Config & spec review (`api/_lib/sentry.ts`) | [x] |

---

## Phase 1: Core In-Person Loop
| ID | Control / Requirement | Owner | Verification Method | Status |
| :--- | :--- | :--- | :--- | :--- |
| SEC-1.1 | **Firebase ID Token + App Check** enforced on every `/api/*` route (`D12`, Sec 9.3) | BE, SEC | Middleware & route audit (`api/_lib/middleware.ts`; see SEC-F1 hardening note) | [x] |
| SEC-1.2 | **`zod` schema validation** on all API request bodies and query params (`D12`, Sec 9.3) | BE | Middleware & API tests (`api/_lib/middleware.ts`, `arbiter.test.ts`) | [x] |
| SEC-1.3 | **Per-UID rate limiting** on all `/api/*` routes, including room code probing on `/api/room/join` (`D7`, `D12`, Sec 9.3) | BE, SEC | Middleware & `room/join.ts` review (see SEC-F2 residual risk) | [x] |
| SEC-1.4 | **Locked CORS** policy allowing only known app origin(s) (`D12`, Sec 9.3) | BE, OPS | `applyCors` in `api/_lib/middleware.ts` + `api/_lib/env.ts` | [x] |
| SEC-1.5 | **Idempotency key + transactional `expectedPhase` / `expectedVersion`** on all state transitions (Sec 3.2, 5.3) | BE | Middleware + `arbiter.test.ts` + `phase2.test.ts` | [x] |
| SEC-1.6 | **Deny-by-default Firestore & RTDB rules** (`D1`, Sec 9.3) | RT, SEC | Static review of `firestore.rules` & `database.rules.json` (Emulator suite tracked as SEC-F3) | [x] |
| SEC-1.7 | **Sealed prompt secrecy**: `rooms/{code}/private/{uid}` readable only by current performer after `CHOOSE` (`D8`) | RT, BE | `firestore.rules` lines 85–91 + `api/room/state.ts` lines 51–56 | [x] |
| SEC-1.8 | **Author anonymity**: `rooms/{code}/secret/{id}` has NO client read/write; `authorUid` never returned by API (`D9`) | RT, BE | `firestore.rules` lines 80–82 + `git grep authorUid` inspection | [x] |
| SEC-1.9 | **Chits API-only**: direct client writes to `chits/` denied; `/api/chit/submit` applies deterministic filter (`D10`) | RT, BE | `firestore.rules` lines 74–77 + `api/chit/submit.ts` | [x] |
| SEC-1.10 | **Room code hygiene**: transactional generation without `0/O/1/I/L`, Firestore TTL 4h `expiresAt` (`D7`) | BE, RT | `packages/shared` + `api/room/create.ts` | [x] |
| SEC-1.11 | **Player name sanitization**: unique per room, length/charset limits, reserved words (`Host`, `Owl`, `Admin`, `Vowlet`) & impersonation rejected (`D14`, Sec 9.3) | BE, FE1 | `validators.test.ts` + `api/room/join.ts` | [x] |
| SEC-1.12 | **Text-only rendering**: no `dangerouslySetInnerHTML`, no raw HTML in names/chits; CSP header configured (Sec 9.3) | FE1, FE2, SEC | Zero `dangerouslySetInnerHTML`/`innerHTML` matches; `vercel.json` headers (CSP tracked as SEC-F4) | [x] |

---

## Phase 2: Robustness, Trust and Safety
| ID | Control / Requirement | Owner | Verification Method | Status |
| :--- | :--- | :--- | :--- | :--- |
| SEC-2.1 | **Judge Owl LLM pipeline**: chit passed as quoted DATA, strict JSON schema output, **fail-closed** on timeout/malformed/rate-limit (`D11`, Sec 5.5) | AI, SEC | `api/judge/adapter.ts` (`<CHIT_DATA>`) + `pipeline.ts` + `eval.test.ts` (6/6 passed) | [x] |
| SEC-2.2 | **Calibration & adversarial set**: 300+ labelled chits including prompt injection attempts and Hinglish bypasses (`D29`) | AI, CW, SEC | `eval.test.ts`: 320 chits (`NOPE` 100%, `FINE` false-block 0.67%, `TOO_MILD` 98%) | [x] |
| SEC-2.3 | **Judge kill switch**: Remote Config flag disables LLM stage and falls back to deterministic filter + starter deck (Sec 5.5, 9.5) | AI, OPS | `eval.test.ts` + `phase2.test.ts` (`getFeatureFlags`) | [x] |
| SEC-2.4 | **Deterministic host election & demotion**: earliest `joinedAt` among present players; returning old host is demoted (`D5`, Sec 3.5) | BE, RT | `api/room/migrate.ts` + `phase2.test.ts` | [x] |
| SEC-2.5 | **`schemaVersion` guard**: join blocked on version mismatch (`D16`) | BE, FE1 | `api/room/join.ts` + `api/room/state.ts` + `phase2.test.ts` (426 `SCHEMA_MISMATCH`) | [x] |
| SEC-2.6 | **Sentry privacy scrubber** verified: zero PII (names, UIDs, chit text, tokens) in captured events (Sec 9.5) | OPS, SEC | `api/_lib/sentry.ts` + `phase2.test.ts` (SDK wiring tracked as SEC-F5) | [x] |
| SEC-2.7 | **Scripted abuse cases** executed and passing (unauthorized kick/start, vote tampering, prompt leak, code brute-force) | SEC | `api/__tests__/arbiter.test.ts` & `phase2.test.ts` (all passing) | [x] |
| SEC-2.8 | **Phase 2 Gate Sign-Off**: Zero open Critical/High SEC findings | SEC | [phase2-audit.md](./phase2-audit.md) — 0 Critical / 0 High | [x] |

---

## Phase 3: Retention, Growth and Validation Readiness
| ID | Control / Requirement | Owner | Verification Method | Status |
| :--- | :--- | :--- | :--- | :--- |
| SEC-3.1 | **Server-side `lifetimeXp`**: computed exclusively in `/api/game/finish` from verified turn records (`D15`, Sec 3.8) | BE | API tamper test (client XP ignored) | [ ] |
| SEC-3.2 | **Community deck safety**: opt-in per chit, PII scrub applied, author delete works, `authorUid` never exposed (`D28`) | AI, BE | API + PII scrub test | [ ] |
| SEC-3.3 | **Rating integrity**: one rating per UID per prompt enforced server-side (`D19`) | BE | Duplicate rating API test | [ ] |
| SEC-3.4 | **Delete-my-data & Report/Block** flows functional end-to-end (`B10`, `reports/{id}` create-only) | BE, FE2, SEC | Emulator rules + E2E verification | [ ] |
| SEC-3.5 | **Beta indexing guard**: `noindex` enforced on landing/public pages while `PRIVATE_BETA` is active (`B8`) | FE1, OPS | HTML meta / HTTP header check | [ ] |
| SEC-3.6 | **Phase 3 Gate Sign-Off**: Zero open Critical/High SEC findings | SEC | Gate review in `docs/orchestration/gates/` | [ ] |
