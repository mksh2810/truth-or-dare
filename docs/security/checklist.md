# Vowlet Security Sign-Off Checklist (Phases 0–3)

> **Owner**: SEC (`ASSURANCE` lane)  
> **Gate Policy**: Releases are blocked if any **Critical** or **High** security issue is open (Section 7, 9.6).  
> **References**: [MASTER_PLAN.md](../MASTER_PLAN.md) (Sections 3, 4, 5, 9.3, 9.5) and [threat-model.md](./threat-model.md).

---

## Phase 0: Foundations and Contracts
| ID | Control / Requirement | Owner | Verification Method | Status |
| :--- | :--- | :--- | :--- | :--- |
| SEC-0.1 | STRIDE Threat Model created and reviewed | SEC | Review `docs/security/threat-model.md` | [x] |
| SEC-0.2 | Data model & API contracts enforce Arbiter-only writes, `secret/` no-read, `private/` performer-only, `votes/` self-only | ARCH, SEC | Contract review (`docs/contracts/`) | [ ] |
| SEC-0.3 | No secrets, API keys, or service account JSONs committed to repo; `.gitignore` and `.env.example` configured | OPS, SEC | Repo scan / secret-scanning CI check | [ ] |
| SEC-0.4 | Sentry privacy scrubber specification defined (`sendDefaultPii: false`, PII field stripping) | OPS, SEC | Config & spec review | [ ] |

---

## Phase 1: Core In-Person Loop
| ID | Control / Requirement | Owner | Verification Method | Status |
| :--- | :--- | :--- | :--- | :--- |
| SEC-1.1 | **Firebase ID Token + App Check** enforced on every `/api/*` route (`D12`, Sec 9.3) | BE, SEC | API integration tests (missing/invalid token -> 401/403) | [ ] |
| SEC-1.2 | **`zod` schema validation** on all API request bodies and query params (`D12`, Sec 9.3) | BE | API tests with malformed/oversized payloads -> 400 | [ ] |
| SEC-1.3 | **Per-UID rate limiting** on all `/api/*` routes, including room code probing on `/api/room/join` (`D7`, `D12`, Sec 9.3) | BE, SEC | Scripted burst test -> 429 | [ ] |
| SEC-1.4 | **Locked CORS** policy allowing only known app origin(s) (`D12`, Sec 9.3) | BE, OPS | `curl` / API test with untrusted `Origin` | [ ] |
| SEC-1.5 | **Idempotency key + transactional `expectedPhase` / `expectedVersion`** on all state transitions (Sec 3.2, 5.3) | BE | Concurrent & replay API tests | [ ] |
| SEC-1.6 | **Deny-by-default Firestore & RTDB rules** (`D1`, Sec 9.3) | RT, SEC | Firebase Emulator rules suite | [ ] |
| SEC-1.7 | **Sealed prompt secrecy**: `rooms/{code}/private/{uid}` readable only by current performer after `CHOOSE` (`D8`) | RT, BE | Emulator rules test (non-performer / pre-CHOOSE read denied) | [ ] |
| SEC-1.8 | **Author anonymity**: `rooms/{code}/secret/{id}` has NO client read/write; `authorUid` never returned by API (`D9`) | RT, BE | Emulator rules test + API response inspection | [ ] |
| SEC-1.9 | **Chits API-only**: direct client writes to `chits/` denied; `/api/chit/submit` applies deterministic filter (`D10`) | RT, BE | Emulator rules test + API test | [ ] |
| SEC-1.10 | **Room code hygiene**: transactional generation without `0/O/1/I/L`, Firestore TTL 4h `expiresAt` (`D7`) | BE, RT | Unit + Emulator/API tests | [ ] |
| SEC-1.11 | **Player name sanitization**: unique per room, length/charset limits, reserved words (`Host`, `Owl`, `Admin`, `Vowlet`) & impersonation rejected (`D14`, Sec 9.3) | BE, FE1 | Unit + API tests | [ ] |
| SEC-1.12 | **Text-only rendering**: no `dangerouslySetInnerHTML`, no raw HTML in names/chits; CSP header configured (Sec 9.3) | FE1, FE2, SEC | Code grep + XSS payload E2E test | [ ] |

---

## Phase 2: Robustness, Trust and Safety
| ID | Control / Requirement | Owner | Verification Method | Status |
| :--- | :--- | :--- | :--- | :--- |
| SEC-2.1 | **Judge Owl LLM pipeline**: chit passed as quoted DATA, strict JSON schema output, **fail-closed** on timeout/malformed/rate-limit (`D11`, Sec 5.5) | AI, SEC | Judge eval harness + fault-injection tests | [ ] |
| SEC-2.2 | **Calibration & adversarial set**: 300+ labelled chits including prompt injection attempts and Hinglish bypasses (`D29`) | AI, CW, SEC | Eval harness pass threshold met | [ ] |
| SEC-2.3 | **Judge kill switch**: Remote Config flag disables LLM stage and falls back to deterministic filter + starter deck (Sec 5.5, 9.5) | AI, OPS | Flag toggle integration test | [ ] |
| SEC-2.4 | **Deterministic host election & demotion**: earliest `joinedAt` among present players; returning old host is demoted (`D5`, Sec 3.5) | BE, RT | API + chaos test | [ ] |
| SEC-2.5 | **`schemaVersion` guard**: join blocked on version mismatch (`D16`) | BE, FE1 | API + E2E test | [ ] |
| SEC-2.6 | **Sentry privacy scrubber** verified: zero PII (names, UIDs, chit text, tokens) in captured events (Sec 9.5) | OPS, SEC | Unit test with synthetic PII payload | [ ] |
| SEC-2.7 | **Scripted abuse cases** executed and passing (unauthorized kick/start, vote tampering, prompt leak, code brute-force) | SEC | Security test run against staging/emulator | [ ] |
| SEC-2.8 | **Phase 2 Gate Sign-Off**: Zero open Critical/High SEC findings | SEC | Gate review in `docs/orchestration/gates/` | [ ] |

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
