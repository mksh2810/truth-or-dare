# ORCHESTRATION DECISIONS LOG

## DEC-001: Execution Mode (Capability Check)
- **Date**: 2026-11-26
- **Owner**: ORCH
- **Decision**: Parallel subagent lanes (`invoke_subagent`) + file-based handoffs.
- **Rationale**: The runtime supports `invoke_subagent` for concurrent execution across independent lanes (PRODUCT, EXPERIENCE, PLATFORM, ASSURANCE) as well as direct file editing and command execution by ORCH for integration and gate verification. Each subagent receives the Shared Preamble, its charter, and owned paths.

## DEC-002: Package Manager & Monorepo Setup
- **Date**: 2026-11-26
- **Owner**: ORCH / OPS
- **Decision**: Use `pnpm` via `corepack` (or local `npx pnpm` / global install if corepack is available) with `pnpm-workspace.yaml` covering `apps/*`, `packages/*`, `api`, `e2e`.
- **Rationale**: Matches Section 5.1 specification.

## DEC-003: Missing Reference Image Handling
- **Date**: 2026-11-26
- **Owner**: ORCH
- **Decision**: `/docs/design/reference.png` is not present in the empty repo. Recorded in `HUMAN-TODO.md`. UX proceeds from Section 6 specifications (tokens, layout, screen specs) until provided.

## DEC-004: Private Beta & Draft Legal Mode
- **Date**: 2026-11-26
- **Owner**: ORCH / LEG
- **Decision**: `PRIVATE_BETA=true` by default; `noindex` meta tag on web app and landing page; all legal/policy pages clearly labelled `DRAFT - NOT LEGALLY REVIEWED`.
- **Rationale**: Per Section 1 Current-State Adaptations.
