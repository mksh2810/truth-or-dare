# VOWLET ORCHESTRATION STATUS

**Current Phase**: Phase 2 — Robustness, Trust and Safety
**Previous Phase**: Phase 1 — **PASS** (`/docs/orchestration/gates/phase-1.md`)

## Phase 2 Task Cards

| ID | Title | Owner | Reviewers | Status | Outputs |
|---|---|---|---|---|---|
| P2-AI | Judge Owl LLM Pipeline, Adapter, Verdict Cache, Roast Templates & 300+ Calibration Set + Eval Harness | AI, CW | SEC, LEG | DOING | `/content/tier-rubric.md`, `/content/calibration-set.json`, `/api/judge/*`, `/packages/shared/src/moderation.ts` |
| P2-BERE | Host Migration (D5), Reconnect & Leaver Rules (D20), Version Skew (D16), Report/Block, Delete-My-Data, Remote Config Flags | BE, RT | SEC, ARCH | DOING | `/api/room/migrate.ts`, `/api/report.ts`, `/api/user/delete.ts`, `/api/_lib/flags.ts` |
| P2-FE | Code-Splitting (<=200KB gzip), Legal Pages (DRAFT), Consent/Report/Delete-Data/Profile UI, Version-Skew Toast, A11y & Motion Polish | FE1, FE2, UX | PERF | DOING | `/apps/web/src/legal/*`, `/apps/web/src/screens/*`, `/apps/web/vite.config.ts` |
| P2-QA-SEC-PERF | 14 Chaos Scenarios (Section 9.2), Rules Emulator Tests, Security Audit, Axe A11y & PWA Support Matrix (B14), Sentry Privacy Scrubber | QA, SEC, PERF, OPS | ORCH | TODO | `/e2e/src/tests/chaos.spec.ts`, `/docs/quality/{a11y-audit.md,pwa-matrix.md}`, `/docs/security/phase2-audit.md` |
