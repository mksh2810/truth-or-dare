# Vowlet — PWA & Browser Support Matrix (B14)

**Owner:** QA + PERF  
**Source of Truth:** `/docs/MASTER_PLAN.md` Sections 4 (B3, B14, D16) & 6.2  
**Status:** Phase 2 Baseline (Emulator / Local Dev Verified; Physical Device Matrix Pending Human Game Night)

---

## 1. Browser & WebView Support Matrix

| Platform / Browser | Install / Standalone (`display: standalone`) | Service Worker (`registerType: 'prompt'`) | Web Share / Clipboard | Camera QR Scan | Presence (`visibilitychange` & `onDisconnect`) | Fallback / Mitigation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Android Chrome (110+)** | Supported (`beforeinstallprompt` + Add to Home Screen) | Supported (Workbox `generateSW`, `UpdateAvailableToast` prompt) | Web Share API + `navigator.clipboard.writeText` | Supported (`getUserMedia` over HTTPS) | Supported (`visibilitychange` = `away`, 25s grace) | Full native experience |
| **iOS Safari (16.4+)** | Supported via Share -> Add to Home Screen (no `beforeinstallprompt`) | Supported (16.4+ standalone Web Push & SW update prompt) | Web Share API (`navigator.share`) + Clipboard | Supported over HTTPS | Supported; backgrounding suspends WS quickly -> 25s grace + `clockOffsetMs` timer recovery | `ReconnectingBanner` + server-authoritative `deadlineAt` snap on resume |
| **Desktop Chrome / Edge** | Supported | Supported | Clipboard fallback when `navigator.share` absent | Supported | Supported | Tested in CI via Playwright (`mobile-chromium-360` / `390`) |
| **Instagram In-App Browser (iOS/Android)** | Blocked / Unavailable | Restricted / ephemeral | Restricted (often fails or opens in-app sheet) | Blocked in many WebView builds | Frequent suspension | `detectInAppBrowser()` detects `/Instagram/i` and renders `InAppBrowserHelp` ("Open in Safari / Chrome" + copy link) |
| **WhatsApp In-App Browser (iOS/Android)** | Blocked / Unavailable | Restricted | Restricted | Restricted | Frequent suspension | `detectInAppBrowser()` detects `/WhatsApp/i` and renders `InAppBrowserHelp` ("Open in browser" + copy link) |
| **Facebook / Messenger / Snapchat / TikTok WebViews** | Blocked / Unavailable | Restricted | Restricted | Restricted | Frequent suspension | `detectInAppBrowser()` detects `FBAN|FBAV|FB_IAB|Messenger|Snapchat|BytedanceWebview|TikTok|\bwv\b` and prompts external browser |

---

## 2. PWA Manifest & Update Behavior

- **Manifest (`apps/web/vite.config.ts` via `vite-plugin-pwa`):**
  - `name`: `Vowlet`
  - `short_name`: `Vowlet`
  - `description`: `A little truth, a little trouble`
  - `display`: `standalone`
  - `theme_color` / `background_color`: `#F6F1E9` (Linen)
  - `start_url`: `/`
- **Service Worker Update Prompt (D16):**
  - Configured with `registerType: 'prompt'` so active games are never interrupted by a silent reload.
  - `UpdateAvailableToast` surfaces a non-blocking prompt when a new SW is waiting, and `schemaVersion` mismatch (`426 SCHEMA_MISMATCH`) blocks stale clients from joining newer rooms.

---

## 3. Known Platform Caveats & Verification Notes

1. **iOS Safari Backgrounding:** Switching apps or opening the iOS Share Sheet fires `visibilitychange` (`hidden`). Vowlet treats this as `away` rather than dropping the player (verified in `chaos.spec.ts` Chaos 2), and `BottleSpinner` + `TimerRing` snap/recompute from server `deadlineAt` + `clockOffsetMs` on resume.
2. **In-App Browsers (B3):** Instagram and WhatsApp WebViews strip PWA install and may block Web Share or `localStorage` persistence across sessions. `InAppBrowserHelp` provides a one-tap copy-URL + "Open in system browser" guide.
3. **Physical Device Sign-off:** Android Chrome and iOS Safari physical hardware checks are tracked in `HUMAN-TODO.md` for pre-Phase 4 playtesting.
