# Vowlet Events & Realtime Subscriptions Contract

- **Version:** `1.0.0`
- **Scope:** Realtime Firestore/RTDB listener topology and privacy-safe analytics event schema.

---

## 1. Realtime Listener Topology (Narrow Listeners per D18)

Clients MUST NOT subscribe to whole-room trees. Each connected client maintains only these narrow listeners:

| Listener | Path | Trigger / Purpose |
| --- | --- | --- |
| Room Header | `rooms/{code}` | `phase`, `round`, `turnVersion`, `hostUid`, `settings`, `schemaVersion` |
| Player Roster | `rooms/{code}/players` | Seat assignments, `ready`, `sessionScore`, `streak`, `turnsTaken` |
| Active Turn | `rooms/{code}/turn/current` | `performerSeat`, `performerUid`, `deadlineAt`, `startedAt`, `resultStamp`, `owlLine` |
| Vote Counter | `rooms/{code}/votes` (where `turnVersion == current`) | Aggregate vote count only (UI never displays voter identities) |
| Chit Pool Status | `rooms/{code}/chits` | Count of sealed chits during `WRITING`; never contains text |
| Performer Secret | `rooms/{code}/private/{myUid}` | Subscribed **only** when `myUid == turn.performerUid && phase in ['PERFORM', 'VOTE', 'RESULT']` |
| Presence (RTDB) | `presence/{code}` | `online`, `away`, `lastSeen` for all seats; own node writes via `onDisconnect` |

---

## 2. Analytics Events (Firebase Analytics, Consent-Gated)

Analytics events are emitted only if the user has not opted out and contain **zero PII** (no names, no prompt text, no IP, no raw emails). Room codes are hashed or omitted in favor of ephemeral `sessionId`.

| Event Name | Trigger | Parameters |
| --- | --- | --- |
| `age_gate_accepted` | User confirms 18+ consent screen | `{}` |
| `room_created` | `/api/room/create` succeeds | `{ quickPlay: boolean, totalRounds: number, tableMode: boolean }` |
| `room_joined` | `/api/room/join` succeeds | `{ method: 'code' \| 'qr' \| 'link', spectator: boolean }` |
| `game_started` | Transition `LOBBY -> WRITING \| SPIN` | `{ playerCount: number, quickPlay: boolean, packCount: number }` |
| `chit_submitted` | `/api/chit/submit` returns verdict | `{ kind: 'TRUTH' \| 'DARE', verdict: 'FINE' \| 'TOO_MILD' \| 'NOPE', tier: string }` |
| `turn_completed` | Transition `VOTE \| PERFORM -> RESULT` | `{ kind: 'TRUTH' \| 'DARE', resultStamp: string, durationSec: number, stalled: boolean }` |
| `chit_swapped` | `/api/chit/swap` succeeds | `{ kind: 'TRUTH' \| 'DARE' }` |
| `game_finished` | Transition `SUMMARY -> PODIUM` | `{ playerCount: number, totalRounds: number, durationSec: number }` |
| `rematch_started` | `PODIUM -> LOBBY` | `{ playerCount: number }` |
| `recap_shared` | User taps Share Recap | `{ method: 'web_share' \| 'clipboard' }` |
| `quota_kill_switch_hit` | Remote Config kill switch active | `{ switchName: string }` |
| `pwa_install_prompted` | Browser install prompt shown | `{ platform: 'ios' \| 'android' \| 'desktop' }` |
