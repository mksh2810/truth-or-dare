# Vowlet Human Validation Protocol (Pre-Phase 4)

- **Version:** `1.0.0`
- **Checklist Ref:** `B13`, `MASTER_PLAN.md §1 & §8`
- **Owner:** Mohit (Facilitator) + BIZ/PM (Analysis)
- **Requirement:** Complete **10–20 real human game nights** before typing `GO PHASE 4`.

---

## 1. Pre-Flight Checklist (Before Each Game Night)

1. **Environment:** Confirm staging URL is live with `PRIVATE_BETA=true`, Firebase Emulators are **not** used, and Firebase Analytics + Sentry are active.
2. **Participants:** 3–8 friends, all **18+**, in the same room (for in-person sessions) or on an external call link (Google Meet / WhatsApp / Discord) for remote validation.
3. **Mix Target across 10–20 Nights:**
   - At least **4 sessions** with 3–4 players and **4 sessions** with 5–8 players.
   - Mix of **Quick Play** (starter deck) and **Custom Chits** (Judge Owl active).
   - At least **3 sessions** using **Table Mode** (shared TV/laptop) and **2 sessions** using **Pass-the-Phone** or mixed devices (iOS Safari + Android Chrome).
4. **Tools Ready:** Stopwatch (to time Link-to-Lobby), `survey.md` link or printed/quick-note form, and Session Log table below.

---

## 2. Step-by-Step Session Protocol

### Step 1: Invite & Link-to-Lobby Timing (Target: <= 45s)
1. Host creates a table and shares the invite link, QR code, or 6-character room code.
2. Start a silent timer when the first guest opens the link/scans QR.
3. **Do not coach players** through the 18+ consent screen or join flow unless they hit a hard blocker.
4. Stop timer when all guests are seated in the Lobby. Record `linkToLobbySec`.

### Step 2: Play 1 Full Game (5, 10, or 15 Rounds)
1. Observe silently. Note any hesitation on:
   - Ready toggle / Host Start button
   - Bottle Spin orientation (per-device seat at bottom)
   - Blind Truth/Dare choice (15s timer)
   - Perform + Taking Too Long / Skip / Swap
   - Witness Vote (20s, Approve/Reject) & Result seal (`PASSED`, `NOT IT`, `SPLIT`, `SKIPPED`, `STALLED`)
2. If a bug or crash occurs, note the exact screen, device OS/browser, and room phase.

### Step 3: Podium & Rematch Observation
1. On Podium, observe whether players naturally notice **Share Recap** and **Rematch**.
2. Record whether the group plays a **Rematch** (`rematch_started`).

### Step 4: Post-Game 3-Question Survey (< 2 minutes)
1. Within 5 minutes of finishing, share the 3-question survey (`/docs/business/survey.md`).
2. Collect anonymous responses (no names or emails).

---

## 3. Session Log Template

| Session # | Date | Players (3–8) | Mode (In-Person / Call / Table / Pass-Phone) | Quick Play? | Link-to-Lobby (s) | Completed? (Y/N) | Rematch? (Y/N) | Crashes / Friction Notes | Avg Survey Q1 (1–5) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 01 | | | | | | | | | |
| 02 | | | | | | | | | |
| ... | | | | | | | | | |
| 20 | | | | | | | | | |

---

## 4. Go / No-Go Evaluation Before `GO PHASE 4`

After 10–20 sessions:
1. **Check Stop-and-Fix Rule:** Is Completion `>= 50%` and Replay `>= 25%`? If not, **STOP** and fix core friction first.
2. **Check Phase 3 KPI Targets (`/docs/business/kpi-dashboard.md`):**
   - Link-to-Lobby `<= 45s`
   - Completion `>= 70%`
   - Replay `>= 40%`
   - Crash-free `>= 99%`
   - Turns per player within `+/- 20%` of mean
3. Record the final summary in `/docs/orchestration/gates/phase-3.md` and resolve `HUMAN-TODO.md` items before issuing `GO PHASE 4`.
