# Evening Table — Screen Specifications (6.1 & 6.2)

**Product:** Vowlet ("A little truth, a little trouble")  
**Design System:** Evening Table (`tokens.md`, `components.md`)  
**Viewport:** Mobile-first `360px–430px` (except Table Mode, which scales to shared TV/laptop screens). Zero horizontal overflow.

---

## Part A: Core Reference Screens (MASTER_PLAN Section 6.1)

| # | Screen | Visual Mode | Key Elements & Required Changes |
| :--- | :--- | :--- | :--- |
| 1 | **Home** | `LINEN` | • Top utility bar: Settings gear icon (`44px`, `aria-label="Settings"`), **no bottom nav**.<br>• Centerpiece: `OwlMascot` (`idle`), wordmark **"Vowlet"** + tagline **"A little truth, a little trouble"**.<br>• Auth status: **Level chip shown ONLY when signed in**; guests see a `"Sign in to keep progress"` button.<br>• Primary CTAs: `Create Table` (primary) and `Join Table` (secondary). |
| 2 | **Lobby** | `LAMPLIT` (60%+ scrim) | • Header: Room code (`ABCDEF`, no `0/O/1/I/L`) with 1-tap `Copy` + `QR & Share Link` sheet trigger + `SyncIndicator`.<br>• Center: `RadialTable` supporting **3–8 seats** (hard cap 8), local seat rotated to bottom.<br>• Controls: **Call-link field** (paste Meet/WhatsApp/Discord link; openable), **Settings summary** (rounds, timer preset, pack), **Self-ready toggle** (all players), **Quick Play toggle** (host only), **Start Game** (host only, enabled at 3+ present players).<br>• Host moderation: Tap any non-host seat opens **Kick menu** (`44px` target).<br>• Ready counter: `"X of Y ready"` (icon + text). |
| 3 | **Write Chits** | `LINEN` | • Header: `120s` countdown `TimerRing` (derived from `deadlineAt`) + `"Skip writing"` button (fills missing chits from starter deck).<br>• `ChitComposer`: Truth / Dare toggle; **Dare-type selector (`Instant` / `Social`)** when Dare is active; **`0/140` character counter**; consent-safe placeholder/example (never "propose to your crush").<br>• **Judge Owl Verdict States:** `FINE` (Sage), `TOO_MILD` (Brass), `NOPE` (Brick) — each with Owl pose + 1-line explanation. Fail-closed on error/timeout (retry or pick starter prompt). |
| 4 | **Bottle Spin** | `LAMPLIT` (60%+ scrim) | • `RadialTable` + `BottleSpinner` animating to server-chosen `seatIndex` over `4.5s` ease-out.<br>• Top bar: **Sound toggle** (visible, `44px`) + `SyncIndicator`.<br>• Landing state: **Haptic pulse** (`navigator.vibrate` if supported) + personalised text **"The bottle has chosen {name}"**.<br>• **No Skip button** during spin. |
| 5 | **Chosen** | `LAMPLIT` (60%+ scrim) | • **Performer view:** `TimerRing` (**15s**), two large `44px+` cards: **Truth** (`#2E5E6B`) and **Dare** (`#C4552D`). Timeout auto-selects Truth with a toast (`"Time's up — Truth chosen!"`).<br>• **Witness view:** Waiting card showing `OwlMascot` + **"{name} is choosing..."** + 15s `TimerRing`. |
| 6 | **Unseal** | `LAMPLIT` (60%+ scrim) | • **Performer view:** Unsealed `ChitCard` (`Kalam` font) with `TRUTH` or `DARE` (`Instant`/`Social`) badge. Actions below: **Done** (or transitions to Perform), **Skip** (`-30` session points, never called "Pass"), and **Swap** (1 free chit swap per game, disabled once used).<br>• **Witness view:** Waiting card showing **"{name} is unsealing a Dare..."** (or Truth). |
| 7 | **Vote** | `LINEN` | • Header: **20s** `TimerRing` (not 15s).<br>• **Witness view:** `Approve` (check icon + `"Approve"` + Sage) and `Reject` (X icon + `"Reject"` + Brick).<br>• **Privacy:** `VoteCountBar` shows **vote COUNT only** (`"3 of 5 voted"`), **never** who voted how.<br>• **Performer view:** Waiting state (`"Table is voting…"` + live vote count). |
| 8 | **Result** | `LINEN` | • Large `WaxSeal` stamp: **`PASSED`**, **`NOT IT`**, **`SPLIT`**, **`SKIPPED`**, or **`STALLED`**.<br>• **Session-score delta** badge (`+50`, `+25`, `-30`, `0`, `tabular-nums`, text-safe colors).<br>• **Warm Owl line** (`OwlMascot` + speech bubble, teasing-never-shaming).<br>• Auto-advances in `6s` (or tap `Next` for host/players after deadline). |
| 9 | **Podium** | `LINEN` | • **Top Three** podium cards (`1st`, `2nd`, `3rd`) with session score + streak highlights.<br>• **Responsive 3–8 player layout:** Ranks 4–8 render in a clean scrollable Cream list below the podium (no horizontal overflow at `360px`).<br>• **Actions:** `Rematch` (1-tap back to Lobby), `Share Recap` (opens Social Share Sheet), `Save Table` (for signed-in users; prompts optional sign-in for guests). |

---

## Part B: Additional Required Screens & States (MASTER_PLAN Section 6.2)

### 10. First-Run Consent (`LINEN`)
- **Purpose:** Required once before creating or joining a table (Decision 14).
- **Content:**
  - `VowletWordmark` + `OwlMascot` (`idle`).
  - **18+ Self-Declaration** checkbox (`44px` hit area) — never called "age verification".
  - **Table Rules** summary (respect boundaries, consent-safe dares, alcohol/drug-free prompts).
  - **Recording Notice:** Clear statement that *"others in the room or on a video call can record"* + link to `Legal` (`DRAFT - NOT LEGALLY REVIEWED`).
  - Primary CTA: `I'm 18+ & Agree` (disabled until checked).

### 11. Create Table (`LINEN`)
- **Fields:**
  - Display Name (validated: unique per room, length/charset limits, no reserved words `Host`, `Owl`, `Admin`, `Vowlet`).
  - Length Preset: `Short (5)` / `Standard (10)` / `Long (15)` turns.
  - Timer Preset & Starter Pack selector (`Friends`, `Couples`, `Office-safe`, `Trip`, `Hinglish Special`).
  - `Quick Play` toggle (skips Write Chits phase).
  - Optional `Table Mode` toggle (shared display).
- **Action:** `Create Table` -> `POST /api/room/create`.

### 12. Join Table (`LINEN`)
- **3-Tap-or-Fewer Flow:**
  - Tab/Option 1: Enter 6-char Room Code (auto-uppercased, rejects `0/O/1/I/L` visually with helper hint).
  - Tab/Option 2: `Scan QR` (camera permission prompt with fallback to manual code).
  - Deep-link entry: Pre-fills room code from URL; user only enters Display Name and taps `Join`.
  - Optional `Join as Spectator` toggle if room is in progress or full.

### 13. Perform Truth (`LINEN`)
- **Performer View:** Displays the unsealed Truth `ChitCard`, instructions (`"Answer aloud to the table, or type a quick note"`), optional short text field, `Done` CTA (`-> VOTE`), and `Skip` (`-30` session points).
- **Witness View:** Shows performer name, `"Answering Truth…"`, and `Taking Too Long` button (>50% witnesses pressing it moves turn to `VOTE` flagged `STALLED`).

### 14. Perform Dare (`LINEN`)
- **Performer View:** Displays the unsealed Dare `ChitCard` (`Instant` or `Social`), **`ElapsedStopwatch`** (`MM:SS` from `startedAt`, **no cutoff**), `Done` CTA (`-> VOTE`), and `Skip` (`-30` session points).
- **Witness View:** Shows performer name, `ElapsedStopwatch`, and **`Taking Too Long`** button with live count (`"2 of 4 pressed"`).

### 15. Social Share Sheet (`BottomSheet`)
- **Triggers:** Lobby (`Share Table`), Podium (`Share Recap`).
- **Actions:**
  - `Copy Invite Link` / `Copy Recap Text` (Clipboard API with visual `"Copied!"` confirmation).
  - `Share…` (Web Share API `navigator.share` when supported).
  - Recap card preview (top 3, best Owl line, `#Vowlet #TruthOrDare` — no promises about platform tags).
  - QR code display in Lobby share sheet.

### 16. Summary / Loot (`LINEN`)
- **Placement:** Shown between `Result` (final round) and `Podium` (or integrated into post-game flow).
- **Content:** Server-computed **Lifetime XP** progress bar (never decreases), **Level-Up** celebration (when triggered), and **Bottle Skin Unlocks** (SVG preview). Guests see `"Sign in with Google to save XP & skins"`.

### 17. Profile / Settings (`LINEN`)
- **Access:** Gear icon on Home or Lobby.
- **Controls:**
  - Display Name edit (default for new rooms).
  - Account: Guest status + `Sign in with Google` OR signed-in email/avatar + `Sign out`.
  - Preferences: **Sound Effects** toggle, **Reduced Motion** override toggle (respects OS `prefers-reduced-motion` by default).
  - Data & Safety: **`Delete My Data`** button (with confirmation dialog), links to `Legal` (`Terms`, `Privacy`, `Safe Dares`, `Content Policy`).

### 18. Report / Block (`BottomSheet`)
- **Access:** From seat menu in Lobby/Game or prompt footer.
- **Fields:** Reason radio list (Harassment, Unsafe Dare, Explicit/Minor, PII, Other), optional details, `Block this player` switch, `Submit` (`POST /api/report`).

### 19. Legal (`LINEN`)
- **Banner:** Prominent top notice: **`DRAFT - NOT LEGALLY REVIEWED`** (required by Section 1 & B10).
- **Tabs/Sections:** `Terms of Service`, `Privacy Policy`, `Content Policy`, `Safe Dares Policy`, and `No-Recording & Call Notice`.

### 20. Reconnecting / Offline Banner
- Sticky top banner across all game screens when RTDB presence drops or `navigator.onLine === false`. Shows icon + `"Reconnecting…"` (Brass) or `"Offline — changes paused"` (Brick).

### 21. Room Closed & Error Pages (`LINEN`)
- **Room Closed:** `OwlMascot` (`idle` or `roast`), clear reason (`"Table closed (4h idle)"`, `"Fewer than 3 players remained"`, `"You were removed by the host"`, or `"Version mismatch — please reload"`), and `Back to Home` CTA.
- **Error Pages (404 / 500 / Rate-Limited):** Friendly Owl copy, retry button, and `Back to Home`.

### 22. In-App-Browser Help (`InAppBrowserHelpSheet`)
- **Trigger:** Detected Instagram, WhatsApp, Snapchat, TikTok, or Facebook WebView where PWA/camera/Web Share may fail.
- **Content:** Illustrated 2-step guide (`Tap ••• or Share icon -> "Open in Safari / Chrome"`) + `Copy Table Link` button (`44px`).

### 23. Update-Available Toast (`UpdateAvailableToast`)
- **Trigger:** Service Worker detects new build or `schemaVersion` mismatch (D16).
- **Content:** `"A new version of Vowlet is ready."` + `Update Now` (`44px` reload trigger) + `Later` (`44px`).

### 24. Table Mode Display (Shared Screen)
- **Layout:** Full-viewport `LAMPLIT` view designed for a TV, tablet, or laptop on the table.
- **Content:** Large `RadialTable` (3–8 seats), central `BottleSpinner`, live `TimerRing` / `ElapsedStopwatch`, current phase banner, and `WaxSeal` result overlays. **No secret prompt text** is ever shown on Table Mode unless the room is in Pass-the-Phone fallback.

### 25. Loading & Empty States
- **Loading:** Cream skeleton cards with subtle pulse (disabled under `prefers-reduced-motion`) + `"Setting the table…"` Owl caption.
- **Empty States:**
  - Lobby (1–2 players): `"Need at least 3 players to spin the bottle"` + `Share Invite` CTA.
  - Saved Tables / History (0 games): `"No tables yet — host your first night!"` + `Create Table` CTA.
