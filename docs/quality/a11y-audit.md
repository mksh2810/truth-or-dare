# Vowlet — Accessibility & Performance Audit (D24, D25)

**Owner:** QA + PERF  
**Source of Truth:** `/docs/MASTER_PLAN.md` Sections 4 (D24, D25), 6.3, 6.4, and 9.4  
**Budget Reference:** `/docs/quality/budgets.md`

---

## 1. Automated `@axe-core/playwright` Audit

- **Command:** `pnpm --filter @vowlet/e2e exec playwright test src/tests/a11y.spec.ts --project=mobile-chromium-360`
- **Viewport:** `360 × 800` (`mobile-chromium-360`)

| Screen | Default Motion (`critical` violations) | `prefers-reduced-motion: reduce` (`critical` violations) | Horizontal Overflow (`360px`) |
| :--- | :--- | :--- | :--- |
| **ConsentScreen** (`consent-screen`) | `0` | `0` | `false` (`scrollWidth <= clientWidth`) |
| **HomeScreen** (`home-screen`) | `0` | `0` | `false` (`scrollWidth <= clientWidth`) |
| **LobbyScreen** (`lobby-screen`) | `0` | `0` | `false` (`scrollWidth <= clientWidth`) |

---

## 2. Touch Targets, Reduced Motion & Contrast (Section 6.4 / 9.4)

| Requirement | Budget / Target | Verification |
| :--- | :--- | :--- |
| **Touch Target Size** | `>= 44px × 44px` | Verified in `a11y.spec.ts` via bounding box checks (`consent-accept` height `>= 44px`, `settings-btn` `>= 44×44px`, `ready-toggle-btn` height `>= 44px`; Consent legal links `min-h-[44px]`). |
| **Reduced Motion** | Crossfade + instant bottle placement with highlight | `App.tsx` wraps app in `<MotionConfig reducedMotion={reducedMotionOverride ? 'always' : 'user'}>`; `BottleSpinner.tsx` checks `useReducedMotion() || reducedMotionOverride` and snaps immediately (`spinDuration = 0`) with brass highlight ring. Verified under `reducedMotion: 'reduce'` in `a11y.spec.ts` and `chaos.spec.ts` (Chaos 6). |
| **Color Contrast** | `>= 4.5:1` (normal text) | Design tokens enforce text-safe variants (`--color-brass-text: #8A6420`, `--color-sage-text: #3F6B3E`, `--color-terracotta-text: #A9441F`) on Linen (`#F6F1E9`) / Cream (`#FFFDF9`), and `>= 60%` dark scrim behind cream text on Lamplit scenes. |
| **Screen Reader Announcements** | Timers & verdicts announced | `TimerRing.tsx` uses `aria-label` + live region announcements at 10s / 5s / 0s; `BottleSpinScreen.tsx` uses `aria-live="polite"`; `App.tsx` toasts use `role="status"` + `aria-live="polite"`. |

---

## 3. Initial JS Bundle Size (Section 9.4)

- **Build Command:** `pnpm --filter @vowlet/web build`
- **Measured Initial App Entry Chunk:** `dist/assets/index-n2tbBeUN.js` = `116.64 kB` raw / **`32.56 kB` gzipped** (`<= 200 kB` hard limit).
- **Code Splitting:** Non-initial screens (`CreateTableScreen`, `JoinTableScreen`, `LobbyScreen`, `WriteChitsScreen`, `BottleSpinScreen`, `ChosenScreen`, `PerformScreen`, `VoteScreen`, `ResultScreen`, `PodiumScreen`, `RoomClosedScreen`, `InAppBrowserHelp`, `LegalSheet`, `ProfileSettingsSheet`) are lazy-loaded via `React.lazy`, and vendor chunks (`vendor-react` `45.77 kB` gz, `vendor-motion` `36.81 kB` gz, `vendor-firebase` `149.72 kB` gz) are split via `manualChunks`.
