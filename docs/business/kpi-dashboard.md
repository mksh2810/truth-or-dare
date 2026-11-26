# Vowlet KPI Dashboard Specification

- **Version:** `1.0.0`
- **Checklist Ref:** `B13`, `MASTER_PLAN.md §8`
- **Data Sources:** Firebase Analytics (zero-PII events), Sentry (crash-free sessions), Firestore turn records (aggregated)

---

## 1. Core KPI Targets (Phase 3 -> Phase 4 Gate)

| KPI | Target | Measurement Formula | Data Source |
| --- | --- | --- | --- |
| **Link-to-Lobby Time** | `<= 45s` (median / p75) | Elapsed seconds from landing via invite link/QR/code to `room_joined` / Lobby seated | `room_joined` timing / validation log |
| **Game Completion Rate** | `>= 70%` | `count(game_finished) / count(game_started)` | Firebase Analytics |
| **Replay / Rematch Rate** | `>= 40%` | `count(rematch_started) / count(game_finished)` | Firebase Analytics |
| **14-Day Return Rate** | `>= 20%` | `% of cohort app_instance_ids active in Days 1–14 after first game` | Firebase Analytics Cohort |
| **Crash-Free Sessions** | `>= 99%` | `1 - (sessions_with_unhandled_error / total_sessions)` | Sentry |
| **Turns per Player Fairness** | `+/- 20%` of mean | `max(\|turns_i - mean_turns\|) / mean_turns <= 0.20` across completed games | Turn records / E2E + validation logs |

---

## 2. Stop-and-Fix Rule (Mandatory Quality Gate)

> **STOP-AND-FIX TRIGGER:**
> If **Game Completion Rate < 50%** OR **Replay / Rematch Rate < 25%** across any rolling window of **>= 5 real human game nights** (or >= 10 completed/abandoned games), **HALT all growth/Phase 4 work immediately**.

### Required Remediation Flow when Triggered
1. Inspect `turn_completed` drop-offs by `resultStamp` (`STALLED`, `SKIPPED`) and `durationSec` to identify where rooms stall or players abandon.
2. Review Sentry errors and validation session notes for UX friction (e.g., Lobby ready confusion, Chit writing timeout, Vote quorum deadlock).
3. Ship targeted fixes to staging and re-validate with at least 3 fresh human game nights before resuming Phase 4 readiness.

---

## 3. Secondary Health Metrics

| Metric | Healthy Range | Action if Out of Range |
| --- | --- | --- |
| `chit_submitted` `NOPE` rate | `< 15%` | Review Judge Owl false positives in `/content` calibration set |
| `turn_completed` `STALLED` rate | `< 10%` | Review Dare types and "Taking Too Long" threshold |
| `turn_completed` `SKIPPED` rate | `< 15%` | Rebalance Mild/Spicy/Legend prompt distribution |
| `recap_shared` rate | `>= 20%` of `game_finished` | Improve Night Recap card copy/CTA visibility on Podium |
| `quota_kill_switch_hit` | `0` | Check `/ops/quotas.md` and AI verdict cache hit rate |

---

## 4. Dashboard Layout (Firebase Console + Sentry)

1. **Funnel Card:** `age_gate_accepted` -> `room_created` / `room_joined` -> `game_started` -> `game_finished` -> `rematch_started` -> `recap_shared`.
2. **Fairness & Pacing Card:** `turn_completed` breakdown by `kind` (`TRUTH` vs `DARE`) and `resultStamp`, plus median `durationSec` per turn.
3. **Reliability Card:** Sentry 7-day crash-free rate (`>= 99%` threshold line) and `quota_kill_switch_hit` counter.
4. **Retention Card:** 14-day returning cohort curve (`>= 20%` target line).
