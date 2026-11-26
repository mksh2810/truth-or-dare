# VOWLET ORCHESTRATION STATUS

**Current Phase**: Phase 1 — Core In-Person Loop
**Previous Phase**: Phase 0 — **PASS** (`/docs/orchestration/gates/phase-0.md`)

## Phase 1 Task Cards

| ID | Title | Owner | Reviewers | Status | Outputs |
|---|---|---|---|---|---|
| P1-CW | 150+ Curated Prompts (Mild/Spicy/Legend) + 75+ Owl Lines + Safe UI Copy | CW | LEG, AI | DOING | `/content/starter-deck.json`, `/content/owl-lines.json` |
| P1-RT | Deny-by-Default Firestore & RTDB Rules + Rules Unit Tests + Presence/Host Helpers | RT | SEC, ARCH | DOING | `/firebase/firestore.rules`, `/firebase/database.rules.json`, `/packages/shared/src/presence.ts` |
| P1-BE | Arbiter API Routes (room/*, chit/*, turn/*, game/finish) + Auth/AppCheck/RateLimit/Idempotency | BE | SEC, QA | DOING | `/api/room/*.ts`, `/api/chit/*.ts`, `/api/turn/*.ts`, `/api/game/finish.ts`, `/api/_lib/*.ts` |
| P1-UXFE | Design System Components + App Shell + Auth/Sync + All P1 Screens (1-9 + Create/Join/Perform/Consent) | UX, FE1, FE2 | PERF, QA | DOING | `/apps/web/src/{design,app,state,auth,pwa,screens,game}/*` |
| P1-QA | Bot-Driven 4-Player Full Game E2E (20x) + API/Rules Tests | QA | ORCH | TODO | `/e2e/src/tests/phase1-game.spec.ts` |
