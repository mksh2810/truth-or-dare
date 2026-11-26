# ADR 003: Firestore + RTDB Only (No Postgres / Neon)

- **Status:** Accepted (Locked Decision #4)
- **Date:** 2026-11-26

## Context
Adding an external SQL database (e.g. Neon/Postgres) alongside Firebase introduces extra connection pooling complexity in serverless functions, a second auth/security boundary, additional free-tier quota management, and local Docker dependencies for development.

## Decision
Use Cloud Firestore for all persistent/session data (rooms, turns, chits, users, prompts, reports) and Firebase RTDB for presence. Do not provision or use Postgres/Neon.
- Local development and CI run 100% on the Firebase Emulator Suite (`auth`, `firestore`, `database`) with zero external database dependencies.

## Consequences
- **Positive:** Single vendor (Firebase Spark free tier), native real-time client listeners without custom WebSockets, zero connection-pool cold-start issues in Vercel serverless functions, and fast local/CI emulator setup.
- **Negative:** Complex relational queries (e.g., community prompt ranking) must use precomputed aggregates (`ratingAgg.wilsonScore`) and Firestore composite indexes.
