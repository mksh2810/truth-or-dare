# Vowlet — Product Requirements Document (PRD)

**Product Name:** Vowlet  
**Tagline:** *"A little truth, a little trouble"*  
**Design System:** Evening Table (`Linen` & `Lamplit` visual modes)  
**Mascot:** Vowlet (top-hatted owl)  
**Status:** Active — Phases 0–3 Scope (Private Beta)  
**Source of Truth:** `/docs/MASTER_PLAN.md` (Sections 2–6, 8–9)

---

## 1. Product Vision & Audience

Vowlet is a mobile-first Progressive Web App (PWA) multiplayer Truth-or-Dare party game designed **in-person first** for **18+ friends in the same room** (3–8 players), where each phone acts as a personal controller. Remote groups may paste an external call link (Google Meet, WhatsApp, Discord) into the lobby; native in-app LiveKit video is deferred to Phase 4 (`GO PHASE 4` gate).

### Core Principles
- **Free & Ad-Free:** Zero paid tiers, zero payment code, zero ads. Runs within free-tier quotas (Firebase Spark/Blaze free limits, Vercel Hobby non-commercial, Google AI Studio free tier).
- **Private Beta:** Ships behind `PRIVATE_BETA=true` (`noindex`, no public marketing, no app store listing) until legal review and human playtest gates pass.
- **Languages:** UI in English; prompts and Vowlet Owl lines in English and Hinglish (Roman-script Hindi). Moderation covers both.
- **Safety & Consent First:** 18+ self-declaration gate (never termed "verification"), alcohol-free and harm-free Safe Dares policy, no forced shaming, and non-punitive XP.

---

## 2. Core Game Loop

1. **First-Run Consent:** 18+ self-declaration, table rules, and notice that others can record video calls.
2. **Join / Create Table:** Host creates a room (or player joins via 3-tap code/QR/link); optional Google Sign-In or name-only guest.
3. **Lobby (3–8 Players):** Radial table view, ready toggles, host settings (Quick Play vs. Writing, length presets Short 5 / Standard 10 / Long 15 turns, timer presets, external call link).
4. **Chit Writing (Optional, 120s):** Players write custom Truths or Dares (Instant or Social/External) up to 140 chars; Judge Owl moderates. Missing chits auto-filled from curated starter deck. Skipped in Quick Play.
5. **Bottle Spin (4.5s):** Server selects target `seatIndex` (excluding offline/kicked, no repeat performer, favouring fewer turns). Clients animate cumulative bottle angle to their own rotated table view.
6. **Choose (15s):** Performer-only blind choice between Truth or Dare; timeout auto-selects Truth with a toast.
7. **Perform (No Cutoff):** Performer unseals the prompt privately; elapsed stopwatch runs from `startedAt`. Performer may tap **Done**, **Skip** (`-30` session points), or use **1 free Swap** per game. If >50% of witnesses press **Taking Too Long**, turn advances to Vote flagged `STALLED`.
8. **Vote (20s or all in):** Witnesses cast **Approve** or **Reject** (count-only UI, anonymous). Quorum = >50% of witnesses. Exact tie or no quorum = `SPLIT` (half XP, streak kept).
9. **Result Seal (6s or tap):** Stamp displayed (`PASSED`, `NOT IT`, `SPLIT`, `SKIPPED`, `STALLED`) with session-score delta and warm Owl line.
10. **Summary & Podium:** Top 3 podium (3–8 player layouts), Night Recap share card, one-tap Rematch, Save Table (signed-in users), and server-side lifetime XP/level/skin calculation.

---

## 3. Locked Architectural & Product Decisions (Summary)

| # | Decision | Requirement |
|---|---|---|
| 1 | In-Person First | LiveKit video is Phase 4 only, behind Remote Config flag, always off in in-person mode. |
| 2 | Server Arbiter | Vercel API routes (`firebase-admin`) execute all state transitions transactionally with `expectedPhase`, `expectedVersion`, and idempotency keys. Clients never write room/turn/player/chit docs. |
| 3 | Timers | Server writes `deadlineAt`. UI derives remaining time on every render with clock-offset estimate. Any present player may call `/api/turn/advance` after deadline. |
| 4 | Databases | Firestore (game state, prompts) + Realtime Database (presence only). No SQL/Postgres. |
| 5 | Host & Migration | Host controls lobby settings and kick only. Migration = earliest `joinedAt` among present players (version-checked); returning old host is demoted. |
| 6 | Vocabulary | Votes: `Approve` / `Reject`. Stamps: `PASSED` / `NOT IT` / `SPLIT` / `SKIPPED` / `STALLED`. Declining = `Skip`. Never use "Pass" for two meanings. |
| 7 | Voting | Cast votes only; quorum >50% witnesses; no quorum or tie = `SPLIT` (half XP, streak kept); no host tie-break; 20s window. |
| 8 | XP & Scoring | Session score (podium) != lifetime XP. Completion `+50` + streak bonus up to `+80`; `SPLIT` = half; `Skip` = `-30` session points. Lifetime XP monotonic server-side. 1 free swap/game. |
| 9 | Choose Phase | 15s; timeout = auto-Truth with toast. |
| 10 | Taking Too Long | >50% witnesses press -> Vote flagged `STALLED`. Perform has no cutoff; stopwatch from `startedAt`. |
| 11 | Spin Weighting | Server picks `seatIndex`: exclude offline/kicked, no repeat performer, favour fewer turns. |
| 12 | Dare Types | Author selects `Instant` or `Social/External`; Judge confirms/reclassifies. Multi-turn (N=1-3) is Phase 4. |
| 13 | Chit Writing | Optional; Quick Play skips and uses starter deck. 120s deadline; auto-fill missing. 3–8 players. |
| 14 | Age Gate | Single first-run screen: 18+ self-declaration, table rules, "others can record video calls". Never call it verification. |
| 15 | Monetization | Free and ad-free; analytics instrumented; no payment code. |

---

## 4. Visual & Experience Requirements

### 4.1 Modes & Screens
- **Linen Mode (`#F6F1E9`):** Home, Write Chits, Vote, Result, Podium.
- **Lamplit Scenes (dark amber + >=60% dark scrim behind cream text):** Lobby, Spin, Chosen, Unseal.
- **Reference Screens (1–9):** Home, Lobby, Write Chits, Bottle Spin, Chosen, Unseal, Vote, Result, Podium (with all Section 6.1 modifications applied).
- **Additional Required Screens (Section 6.2):** First-run consent, Create Table, Join Table (code/QR/link), Perform Truth, Perform Dare, Social share sheet, Summary/Loot, Profile/Settings (name, sign-in, delete my data, sound, reduced motion), Report/Block sheet, Legal pages (`DRAFT`), Reconnecting/offline banner, Room closed & error pages, In-app-browser help, Update-available toast, Table Mode display, loading & empty states.

### 4.2 Accessibility & Performance Budgets
- **Viewport:** Mobile-first 360–430px, safe-area insets, >=44px touch targets, zero horizontal overflow.
- **Motion:** Framer Motion (`transform` and `opacity` only), 60fps bottle spin, `prefers-reduced-motion` support (crossfade + instant placement).
- **Accessibility:** Lighthouse a11y >= 95, axe zero critical issues, >= 4.5:1 text contrast (using text-safe tokens `#8A6420`, `#3F6B3E`, `#A9441F`), icon + text + colour for all states, screen-reader announcements for timers/verdicts.
- **Performance:** Initial JS <= 200KB gzipped, scene images <= 150KB WebP, mobile Lighthouse LCP <= 2.5s, CLS <= 0.1.
- **Cost Guardrail:** <= 300 Firestore writes per 10-turn 6-player game.

---

## 5. Phased Release Plan & Gates

- **Phase 0 — Foundations & Contracts:** Repo, CI/CD, Firebase Emulator Suite, contracts (`/docs/contracts`), shared logic (`/packages/shared`), design tokens, legal drafts, observability/quota scaffolding.
- **Phase 1 — Core In-Person Loop:** Auth (anonymous + Google), first-run consent, room create/join/lobby, Quick Play + basic Writing (filter-only), Bottle Spin, Choose, Perform, Vote, Result, Podium, 150 starter prompts, bot-driven E2E loop.
- **Phase 2 — Robustness, Trust & Safety:** Full Judge Owl LLM pipeline + 300+ calibration set, deterministic host migration, schemaVersion/SW update prompt, full leaver/chaos handling (14 chaos scenarios), full legal/SOP flows, accessibility & performance budget enforcement.
- **Phase 3 — Retention, Growth & Validation Readiness:** Server-side lifetime XP/levels/skins, Night Recap share card, Rematch, Save Table, Community Deck (opt-in, PII scrub, 20+ ratings unlock, Wilson ranking), Table Mode & Pass-the-Phone, 450+ prompts & 150 Owl lines, Private Beta landing page & analytics/KPI specs.
- **Phase 4 (Gated on `GO PHASE 4`):** LiveKit video, multi-turn dares (N=1–3).
- **Phase 5 (Gated on Phase 4):** Launch hardening, Monetization decision memo (`B1`).
