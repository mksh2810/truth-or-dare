# Evening Table — Motion & Accessibility Specification

**Product:** Vowlet  
**Source of Truth:** `/docs/MASTER_PLAN.md` Sections 3.11, 4 (D17, D24), and 6.4

---

## 1. Motion Principles (Framer Motion)

1. **GPU-Composited Properties Only:** Every animation MUST animate **only `transform` (`x`, `y`, `scale`, `rotate`) and `opacity`**. Never animate `width`, `height`, `top`, `left`, `margin`, `padding`, or `box-shadow` directly (prevents layout thrash and keeps CLS `<= 0.1` and bottle spin at `60fps`).
2. **No Continuous Layout Shift:** Reserve space for banners, Owl speech bubbles, and vote counters before they appear.
3. **Wrap App in `<MotionConfig reducedMotion="user">`** (combined with the user's in-app Reduced Motion preference in Profile/Settings).

---

## 2. Bottle Spin & Per-Device Table Rotation (D17)

### 2.1 Shared Authority vs. Local Visuals
- **Server Authority:** The server picks and stores a **target `seatIndex` (`0 .. N-1`)** in `rooms/{code}/turn/current`. The server **never** stores or broadcasts degrees.
- **Per-Device Table Rotation:** Each client rotates the `RadialTable` ring so the **local player's own seat (`mySeatIndex`) is positioned at the bottom (`180°` / 6 o'clock)**.
  - Visual angle of any seat `i` on device `d`:
    ```ts
    const stepDeg = 360 / seatCount;
    const relativeIndex = (i - mySeatIndex + seatCount) % seatCount;
    // 0 -> bottom (180deg), advancing clockwise
    const seatVisualAngleDeg = (180 + relativeIndex * stepDeg) % 360;
    ```
  - For **Spectators** or **Table Mode**, `mySeatIndex` defaults to `0` (seat 0 at bottom).

### 2.2 Cumulative Bottle Angle (Never Reverses)
To prevent the bottle from spinning backwards across the `350° -> 10°` wrap-around boundary, clients maintain a monotonically increasing `cumulativeAngleDeg`:

```ts
const extraFullTurns = 5; // 5 * 360 = 1800deg (4–6 full turns)
const currentMod = ((prevAngle % 360) + 360) % 360;
const delta = ((targetSeatVisualAngleDeg - currentMod) + 360) % 360;
const nextAngle = prevAngle + extraFullTurns * 360 + delta;
```

- **Timing & Easing:** `duration: 4.5` seconds, custom cubic-bezier ease-out `[0.12, 0.88, 0.22, 1]` (fast initial flick, long suspenseful deceleration onto the target seat).
- **Landing Feedback:** When the `4.5s` transition completes (or deadline passes), trigger:
  - Target seat pulse (`scale: [1, 1.08, 1]`, `opacity` glow ring)
  - Optional `navigator.vibrate?.(35)` haptic pulse
  - Optional chime (only if Sound toggle is ON)
  - Screen reader announcement: `"The bottle has chosen {name}"`

### 2.3 Reconnect / Late-Join Snap Rule
If a client loads or reconnects during `SPIN` when `now >= deadlineAt` (or within the final `400ms` of the spin), **skip the `4.5s` animation** and **snap immediately** (`duration: 0`) to the final `targetSeatVisualAngleDeg` so the client is never out of sync with `CHOOSE`.

---

## 3. Screen & Component Transitions

| Element | Standard Motion (`transform` + `opacity`) | Reduced Motion Fallback |
| :--- | :--- | :--- |
| **Screen / Phase Switch** | Crossfade + subtle vertical settle (`y: 8 -> 0`, `opacity: 0 -> 1`, `220ms` ease-out) | Instant or `120ms` opacity crossfade only (`y: 0`) |
| **Bottle Spin** | `rotate: prevAngle -> nextAngle`, `4.5s` ease-out | **Instant placement** at `targetSeatVisualAngleDeg` + static highlight ring on chosen seat |
| **Chit Unseal** | Card flip/reveal via `scale: 0.94 -> 1` + `opacity: 0 -> 1` (`260ms`) | `120ms` opacity crossfade |
| **Wax Seal Stamp** | `scale: 1.35 -> 1`, `opacity: 0 -> 1` (`240ms` ease-out) | `120ms` opacity fade (`scale: 1`) |
| **Bottom Sheet** | Slide up (`y: "100%" -> 0`, `240ms` ease-out) | `120ms` opacity fade |
| **Skeleton Shimmer** | Subtle opacity pulse (`0.5 -> 0.85 -> 0.5`, `1.4s`) | Static solid placeholder (`opacity: 0.65`) |

---

## 4. Accessibility Rules (D24, Section 6.4)

1. **Touch Targets:** Minimum `44px × 44px` on all buttons, toggles, seat menus, close icons, and links.
2. **Multi-Signal Encoding (Never Colour Alone):**
   - `Approve`: Check icon + `"Approve"` text + Sage (`#5B8C5A` / `#3F6B3E`)
   - `Reject`: Cross icon + `"Reject"` text + Brick (`#A33A2C`)
   - `Ready`: Check badge + `"Ready"` text + Sage
   - `Away`: Moon/pause icon + `"Away"` text + Brass (`#8A6420`)
   - `Offline`: Cloud-off icon + `"Offline"` text + Brick
   - `Result Seals`: Distinct icon + uppercase stamp (`PASSED`, `NOT IT`, `SPLIT`, `SKIPPED`, `STALLED`) + colour
3. **Contrast >= 4.5:1:**
   - Use text-safe tokens (`#8A6420`, `#3F6B3E`, `#A9441F`) for text on Linen/Cream.
   - Use `>= 60%` dark scrim (`--scrim-lamplit`) behind all Cream text on Lamplit scenes.
4. **Screen Reader Announcements (`aria-live`):**
   - Phase changes (`polite`): e.g., `"Spinning the bottle"`, `"The bottle has chosen Maya"`, `"Voting started, 20 seconds"`.
   - Timers (`polite` at milestones only): announce at `10s`, `5s`, and `"Time's up"` — never every second.
   - Verdicts & Judge Owl (`assertive` for errors/blocks, `polite` for `FINE` / `PASSED` / `SPLIT` / `NOT IT` / `SKIPPED` / `STALLED`).
5. **Optional Sound:** Audio effects (spin tick, landing chime, seal stamp) are **off or muted-safe by default** and always controllable via a visible `44px` Sound toggle in the game header and Profile/Settings.
6. **Keyboard & Focus Management:** Modals/BottomSheets trap focus, return focus to the trigger on close, and use visible `2px solid #2E5E6B` focus rings (`:focus-visible`).
