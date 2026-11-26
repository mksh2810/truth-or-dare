# VOWLET ORCHESTRATION STATUS

**Current Phase**: Phase 3 — Retention, Growth and Validation Readiness
**Previous Phase**: Phase 2 — **PASS** (`/docs/orchestration/gates/phase-2.md`)

## Phase 3 Task Cards

| ID | Title | Owner | Reviewers | Status | Outputs |
|---|---|---|---|---|---|
| P3-CW | Expand Starter Deck to 450+ Prompts (5 Packs) & 150+ Owl Lines | CW | LEG, AI | DOING | `/content/starter-deck.json`, `/content/owl-lines.json` |
| P3-BE-AI | Server-side Exponential XP/Levels/Skins (`B12`), Opt-In Community Deck (`D28`), Ratings with Wilson Lower-Bound & Near-Duplicate Hashing (`D19`, `B9`), `x-test-uid` prod guard | BE, AI | SEC, QA | DOING | `/api/prompts/{community,rate,delete}.ts`, `/api/game/finish.ts`, `/api/_lib/middleware.ts` |
| P3-FE | Summary/Loot Screen (XP, Level-Up, Skins), Table Mode & Pass-the-Phone (`B4`), Night Recap Share Card + Web Share (`B2`, `D23`), Rematch & Saved Tables, Landing Page (`noindex`, `B8`), Analytics Events (`B13`) | FE1, FE2, UX | PERF, BIZ | DOING | `/apps/web/src/screens/{SummaryLootScreen,TableModeScreen,LandingSection}.tsx`, `/apps/web/src/analytics/events.ts` |
| P3-BIZ-QA | Analytics Event Spec, KPI Dashboard Spec, Validation Protocol, 3-Question Survey, Creator Kit (`B8`, `B13`) + Phase 3 E2E Verification | BIZ, QA | PM, ORCH | DOING | `/docs/business/{analytics-spec,kpi-dashboard,validation-protocol,survey,creator-kit,landing-copy}.md`, `/e2e/src/tests/phase3.spec.ts` |
