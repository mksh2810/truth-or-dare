# Evening Table — Component Library Specification

**Product:** Vowlet  
**Design System:** Evening Table (`tokens.md`)  
**Scope:** Shared primitives and game components used across `apps/web/src/design`, `screens`, and `game`.

---

## 1. Global Rules for All Components

1. **Touch Targets:** Every interactive element (`button`, `a`, `input`, `switch`, `seat action`) has a minimum clickable area of `44px × 44px` (`min-h-[44px] min-w-[44px]`).
2. **Never Colour Alone:** Every status/verdict/action uses **icon + text label + colour** (`Approve` ✓, `Reject` ✕, `Ready` ✓, `Away` ☾, `Error` !, `PASSED`, `NOT IT`, `SPLIT`, `SKIPPED`, `STALLED`).
3. **Mode Awareness:** Components accept a `surface="linen" | "lamplit"` context or read from the active screen mode so borders, shadows, and text-safe colors adapt automatically.
4. **No Horizontal Overflow:** Tested down to `360px` viewport width. Long player names truncate with `text-overflow: ellipsis` and `max-w-full`.

---

## 2. Core Primitives

### 2.1 `VowletWordmark`
- **Visual:** Top-hatted owl SVG (`idle` pose) + `"Vowlet"` in `Cormorant Garamond` 700 + optional tagline `"A little truth, a little trouble"`.
- **Constraint:** Never displays `"Evening Table"` in user-facing copy.

### 2.2 `OwlMascot`
- **Poses (inline SVG):** `idle`, `judging`, `approve`, `disapprove`, `roast`.
- **Props:** `pose`, `line?: string`, `size?: "sm" | "md" | "lg"`.
- **Speech Bubble:** Cream card (`18px` radius, hairline ink border, `--shadow-card`) displaying curated or Judge Owl one-liner. `aria-live="polite"` when the Owl line updates (e.g., Judge verdict or Result roast).

### 2.3 `Button`
- **Variants:**
  - `primary-dare`: `--color-dare-terracotta` fill, `--color-cream` text.
  - `primary-truth`: `--color-truth-teal` fill, `--color-cream` text.
  - `secondary`: `--color-cream` fill, `--color-ink` text, `--border-ink-hairline`.
  - `ghost`: transparent fill, `--color-ink` (Linen) or `--color-cream` (Lamplit) text.
  - `danger`: `--color-brick` fill, `--color-cream` text.
- **Specs:** `min-h-[44px]`, `--radius-control` (`14px`), `disabled` state lowers opacity to `0.5` and sets `aria-disabled="true"`. Loading state shows inline spinner + text (no layout shift).

### 2.4 `SurfaceCard` & `BottomSheet`
- `SurfaceCard`: `18px` radius, `--border-ink-hairline` (Linen) or `--border-lamplit-hairline` (Lamplit), `--shadow-card`.
- `BottomSheet`: `18px` top corners, `--shadow-sheet`, safe-area bottom padding, focus-trapped (`role="dialog"`, `aria-modal="true"`), dismissible via close button (`44px` target) and `Escape`.

### 2.5 `WaxSeal`
- **Variants (SVG + Cormorant Garamond stamp):**
  - `PASSED` — Sage fill (`#5B8C5A`), check icon + `"PASSED"`
  - `NOT IT` — Brick fill (`#A33A2C`), cross icon + `"NOT IT"`
  - `SPLIT` — Brass fill (`#B8893B`), split/scale icon + `"SPLIT"`
  - `SKIPPED` — Brick/muted fill (`#A33A2C`), forward/skip icon + `"SKIPPED"`
  - `STALLED` — Brass fill (`#B8893B`), hourglass icon + `"STALLED"`
- **Accessibility:** `role="status"` with `aria-label` announcing the exact stamp name.

### 2.6 `TimerRing` & `ElapsedStopwatch`
- **Authority Rule (Section 3.3):** Never uses local `setInterval` counters as source of truth. Derives remaining/elapsed time on every render from `deadlineAt` (or `startedAt`) + `clockOffsetMs`.
- **`TimerRing`:** Circular SVG progress (`stroke-dashoffset` or transform) + `tabular-nums` seconds text. Screen reader announces at key thresholds (e.g., 10s, 5s, 0s) via `aria-live="polite"` without spamming every second.
- **`ElapsedStopwatch`:** Used in `Perform Dare` (no cutoff). Shows `MM:SS` in `tabular-nums` from `startedAt`.

### 2.7 `SyncIndicator`
- **Placement:** Top utility bar (non-intrusive pill).
- **States:**
  - `synced`: subtle green dot + `"Synced"` (or hidden when healthy after 2s)
  - `syncing`: spinner + `"Syncing…"`
  - `offline` / `reconnecting`: Brick/Brass banner (`ReconnectingBanner` in Section 4).

---

## 3. Game Components

### 3.1 `RadialTable` (3–8 Seats)
- **Layout:** Circular arrangement supporting `3` to `8` seats, tested at `360px` width.
- **Per-Device Rotation (D17):** Each client rotates the visual seat ring so the **local player's own seat is always at the bottom (6 o'clock)**. The server only ever stores and broadcasts `seatIndex` (`0..N-1`).
- **Seat Pod (`SeatNode`):**
  - Avatar + truncated name + Host crown (`--color-brass` icon + `"Host"` sr-only/badge) + Ready/Away/Offline badge (icon + text + colour).
  - Active performer highlight ring (`--color-brass` / `--color-dare-terracotta`).
  - Host-only tap on another player opens a `44px`-compliant action sheet (`Kick player` / `Report/Block`).

### 3.2 `BottleSpinner`
- **Asset:** Inline SVG bottle centered inside `RadialTable`.
- **Motion (D17):** Driven by cumulative angle (`targetAngle = currentAngle + extraFullTurns + deltaToSeat`). Never reverses across `350° -> 10°`. `4.5s` ease-out. Reconnecting clients snap immediately to final angle.
- **Reduced Motion:** Instant placement at target seat + highlight ring.

### 3.3 `ChitCard` & `ChitComposer`
- **Chit Display (`ChitCard`):** Cream paper card, `18px` radius, hairline ink border, `--shadow-card`, `Kalam` font (Latin + Devanagari). Top pill shows `TRUTH` (Truth Teal) or `DARE` (Dare Terracotta) + `Instant` / `Social` badge for Dares.
- **Chit Composer (`ChitComposer`):**
  - Kind toggle (`Truth` / `Dare`).
  - Dare-type selector (`Instant` / `Social`), visible when `Dare` is selected.
  - Textarea with live `0 / 140` character counter (`tabular-nums`).
  - Judge Owl verdict banner:
    - `FINE`: Sage icon + `#3F6B3E` text + Owl line.
    - `TOO_MILD`: Brass icon + `#8A6420` text + Owl line + rewrite prompt.
    - `NOPE`: Brick icon + `#A33A2C` text + Owl line + rewrite/starter-prompt fallback.
    - `PENDING / ERROR`: Fail-closed state asking author to retry or pick a starter prompt.

### 3.4 `VoteControls` & `VoteCountBar`
- **Buttons:** Two equal-width `44px+` buttons:
  - `Approve` (Check icon + `"Approve"` + Sage `#5B8C5A` fill / `#3F6B3E` text)
  - `Reject` (X icon + `"Reject"` + Brick `#A33A2C` fill)
- **Privacy Rule:** `VoteCountBar` displays **total votes cast vs. witnesses** (`"3 of 5 voted"`) ONLY. Never reveals who voted Approve or Reject.

---

## 4. System Banners, Toasts & Sheets

| Component | Trigger | Visual & Behavior |
| :--- | :--- | :--- |
| `ReconnectingBanner` | RTDB `presence` offline or network drop | Sticky top bar, Brass/Brick fill, icon + `"Reconnecting…"` / `"You're offline. Waiting to rejoin."` |
| `UpdateAvailableToast` | Service Worker `onNeedRefresh` (D16) | Bottom toast above safe area: `"New version ready"` + `Reload` (`44px`) + `Dismiss` (`44px`). |
| `InAppBrowserHelpSheet` | Detected WebView (Instagram, WhatsApp, Snapchat, etc.) | Modal/banner with `"Open in Safari / Chrome"` step-by-step instructions + `"Copy room link"` button. |
| `ReportBlockSheet` | Tap Report/Block on player or prompt | Select reason, optional note, `"Block player"` toggle, `"Submit Report"` (`POST /api/report`). |
