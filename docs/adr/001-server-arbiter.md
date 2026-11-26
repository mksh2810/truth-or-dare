# ADR 001: Server Arbiter for All Game State Transitions

- **Status:** Accepted (Locked Decision #2)
- **Date:** 2026-11-26

## Context
In a multiplayer party game where each player's phone is a controller, trusting clients (or even a designated host client) to mutate Firestore game state directly introduces race conditions, stale overwrites, host-disconnect deadlocks, vote tampering, and secret-chit leakage.

## Decision
All mutations to `rooms`, `players`, `turn/current`, `chits`, `secret`, `private`, and `users` are performed exclusively by Vercel serverless API routes (`/api/*`) using `firebase-admin`.
- Every transition runs inside a Firestore transaction guarded by `expectedPhase` and `expectedVersion`.
- Every mutating request carries a client-generated `idempotencyKey`.
- Any present player can call `/api/turn/advance` once `now >= deadlineAt`, eliminating host dependence.
- Firestore security rules deny all client writes to game documents (except own `votes/{uid}` during `VOTE`).

## Consequences
- **Positive:** Eliminates split-brain state, prevents cheating/spoofing, guarantees secret chits never leak to non-performers, and enables deterministic host migration.
- **Negative:** Slightly higher latency on transitions (HTTP round-trip to Vercel + Firestore transaction) and requires careful adherence to the `<= 300 writes per 10-turn game` budget.
