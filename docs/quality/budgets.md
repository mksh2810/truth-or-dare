# Vowlet — Performance & Accessibility Budgets

**Owner:** PERF  
**Source of Truth:** `/docs/MASTER_PLAN.md` Sections 4 (D24, D25) and 9.4  
**Gate Enforcement:** Phase 2 and Phase 3 CI gates (blocking on regression).

---

## 1. Hard Numeric Budgets (Section 9.4)

| Metric | Budget (Hard Limit) | Measurement Tool | Notes |
| :--- | :--- | :--- | :--- |
| **Initial JS Bundle** | `<= 200 KB` gzipped | Vite build analyzer / `bundlesize` | Entry + vendor chunks loaded on initial route (`/`) |
| **Scene Background Images** | `<= 150 KB` per file (WebP) | Asset check script in CI | Lamplit scenes must be WebP; vector art (Owl, seals, bottle) must be SVG/CSS |
| **Mobile Lighthouse LCP** | `<= 2.5 s` (`2500 ms`) | Lighthouse CI (mobile preset) | Measured on `/` and `/room/:code` shell |
| **Cumulative Layout Shift (CLS)** | `<= 0.1` | Lighthouse CI | Reserve space for fonts (`font-display: swap` + metrics), banners, and cards |
| **Lighthouse Accessibility** | `>= 95` (`0.95`) | Lighthouse CI | Enforced on every PR |
| **Axe Accessibility Violations** | `0` critical (and `0` serious target) | `@axe-core/playwright` | Tested across all 9 reference screens + key 6.2 screens |
| **Bottle Spin Frame Rate** | `60 fps` | Motion spec + DevTools / Playwright trace | `transform` + `opacity` only; zero layout properties animated |
| **Touch Target Size** | `>= 44px × 44px` | Axe / Playwright geometry check | All buttons, toggles, seat menus, and links |
| **Color Contrast** | `>= 4.5:1` (normal text) | Contrast checker + Axe | Enforced via text-safe tokens (`#8A6420`, `#3F6B3E`, `#A9441F`) & `>= 60%` scrim |
| **Reduced Motion** | Full functional parity | Playwright `reducedMotion: 'reduce'` | Crossfade + instant bottle placement with highlight |

---

## 2. Bundle & Asset Hygiene Rules

1. **Code Splitting:**
   - Lazy-load non-initial routes (`Podium`, `Legal`, `TableMode`, `QRScanner`, `SocialShareSheet`) via `React.lazy`.
   - Keep `firebase/auth`, `firebase/firestore`, and `firebase/database` tree-shaken; never import `firebase-admin` in `apps/web`.
2. **Self-Hosted Fonts (WOFF2, Subsetted):**
   - `Cormorant Garamond` (600, 700, Latin subset)
   - `Inter` (400, 500, 600, 700, Latin subset)
   - `Kalam` (400, 700, Latin + Devanagari subset)
   - Preload primary display/UI WOFF2 files in `index.html`; never load Google Fonts CDN.
3. **Images:**
   - No PNG/JPEG scene backgrounds. Convert all scene backgrounds to WebP `<= 150 KB`.
   - Use inline SVG for `OwlMascot` (5 poses), `WaxSeal` (5 variants), and `BottleSpinner`.
