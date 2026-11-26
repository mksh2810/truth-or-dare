# ADR 002: Firebase Realtime Database (RTDB) for Presence Only

- **Status:** Accepted (Locked Decision #4, D4)
- **Date:** 2026-11-26

## Context
Cloud Firestore does not have native TCP-level `onDisconnect` hooks. Implementing presence via Firestore heartbeats burns read/write quota rapidly on the Spark free tier (20k writes/day) and reacts slowly to sudden mobile network drops.

## Decision
Use Firebase Realtime Database exclusively for ephemeral player presence at `presence/{code}/{uid}` (`online`, `away`, `lastSeen`), leveraging RTDB's native `onDisconnect()`.
- Clients write only their own node.
- `document.visibilitychange` sets `away: true` (not `online: false`), and share-sheet opens are exempt.
- A 25-second grace period applies before a disconnected player is treated as offline for spin weighting or host migration.

## Consequences
- **Positive:** Zero Firestore write quota consumed by presence heartbeats; instant disconnect detection via WebSocket `onDisconnect`.
- **Negative:** Requires running the RTDB emulator alongside Firestore in local development and maintaining `database.rules.json`.
