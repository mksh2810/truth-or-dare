# Vowlet Analytics Event Specification (Zero-PII)

- **Version:** `1.0.0`
- **Checklist Ref:** `B13`
- **Source of Truth:** `/docs/contracts/events.md` (v1.0.0)
- **Provider:** Firebase Analytics (GA4), consent-gated (`preferences.analytics`)

---

## 1. Privacy & Zero-PII Rules

1. **Consent-Gated Emission:** Events are emitted **only** when the user has accepted the 18+ consent screen and has **not** opted out of analytics in Profile/Settings (`preferences.analytics !== false`).
2. **Zero PII Guarantee:** Payloads MUST NEVER contain:
   - Player display names, nicknames, or `hostName`
   - Raw `uid` (use Firebase Analytics anonymous app-instance ID or ephemeral `sessionId`)
   - Raw room codes (`code`) — omit or replace with an ephemeral per-game `sessionId`
   - Chit/prompt text, Owl free-text, or report descriptions
   - Email addresses, phone numbers, IP addresses, or call links (`callLink`)
3. **Strict Schema Enforcement:** Every event wrapper validates parameters against a strict allowlist before calling `logEvent()`. Unknown keys are stripped.

---

## 2. Canonical Event Catalog

> **Naming Alignment Note:** Product/backlog discussions may refer to `table_created` and `table_joined`; per `/docs/contracts/events.md` v1.0.0, the canonical wire event names are `room_created` and `room_joined`.

| Event Name | Trigger | Allowed Parameters | Types & Constraints |
| --- | --- | --- | --- |
| `age_gate_accepted` | User confirms 18+ consent screen | `{}` | No parameters |
| `room_created` | `POST /api/room/create` succeeds | `quickPlay`, `totalRounds`, `tableMode` | `boolean`, `5 \| 10 \| 15`, `boolean` |
| `room_joined` | `POST /api/room/join` succeeds | `method`, `spectator` | `'code' \| 'qr' \| 'link'`, `boolean` |
| `game_started` | Transition `LOBBY -> WRITING \| SPIN` | `playerCount`, `quickPlay`, `packCount` | `3..8`, `boolean`, `number >= 0` |
| `chit_submitted` | `POST /api/chit/submit` returns verdict | `kind`, `verdict`, `tier` | `'TRUTH' \| 'DARE'`, `'FINE' \| 'TOO_MILD' \| 'NOPE'`, `'MILD' \| 'SPICY' \| 'LEGEND'` |
| `turn_completed` | Transition `VOTE \| PERFORM -> RESULT` | `kind`, `resultStamp`, `durationSec`, `stalled` | `'TRUTH' \| 'DARE'`, `'PASSED' \| 'NOT_IT' \| 'SPLIT' \| 'SKIPPED' \| 'STALLED'`, `number >= 0`, `boolean` |
| `chit_swapped` | `POST /api/chit/swap` succeeds | `kind` | `'TRUTH' \| 'DARE'` |
| `game_finished` | Transition `SUMMARY -> PODIUM` | `playerCount`, `totalRounds`, `durationSec` | `3..8`, `5 \| 10 \| 15`, `number >= 0` |
| `rematch_started` | Transition `PODIUM -> LOBBY` | `playerCount` | `3..8` |
| `recap_shared` | User taps Share Recap on Podium | `method` | `'web_share' \| 'clipboard'` |
| `quota_kill_switch_hit` | Remote Config kill switch active | `switchName` | `string` (allowlisted flag key only) |
| `pwa_install_prompted` | Browser install prompt shown | `platform` | `'ios' \| 'android' \| 'desktop'` |

---

## 3. Additional Phase 3 Operational Dimensions (Optional, Zero-PII)

When instrumented in client analytics helpers, the following non-PII boolean/enum properties may be attached only if explicitly added to `/docs/contracts/events.md` in a minor version bump:
- `passThePhone: boolean` on `room_created` / `game_started` (if Pass-the-Phone mode is enabled)
- `linkToLobbySec: number` on `room_joined` (client-measured elapsed seconds from landing on `/join` to seated in `LOBBY`, clamped `0..600`)

---

## 4. Implementation & QA Verification

- **Opt-out behavior:** Toggling analytics OFF in Settings immediately stops all `logEvent()` calls in the active session and persists across reloads.
- **Automated E2E check:** `e2e/src/tests/phase3.spec.ts` asserts that emitted events match the canonical names above and contain zero PII strings (player names, room codes, prompt text).
- **Emulator / Local Dev:** When `VITE_LOCAL_API=true` or running on Firebase Emulator, events are buffered to `window.__VOWLET_ANALYTICS_EVENTS__` (or console debug) for deterministic Playwright inspection without sending network traffic to production GA4.
