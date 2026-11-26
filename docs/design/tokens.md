# Evening Table — Design Tokens

**Product:** Vowlet ("A little truth, a little trouble")  
**Design System:** Evening Table  
**Source of Truth:** `/docs/MASTER_PLAN.md` Section 6.3  
**Modes:** `LINEN` (light daylight/tabletop paper) and `LAMPLIT` (dark amber atmospheric scene)

---

## 1. Color Palette

### 1.1 Core Surface & Ink Tokens

| Token | Hex | RGB | Usage |
| :--- | :--- | :--- | :--- |
| `--color-linen` | `#F6F1E9` | `246, 241, 233` | Primary page background in `LINEN` mode |
| `--color-cream` | `#FFFDF9` | `255, 253, 249` | Card/sheet surface in `LINEN`; primary text in `LAMPLIT` |
| `--color-ink` | `#23201C` | `35, 32, 28` | Primary text, hairline borders, and deep shadow base |

### 1.2 Semantic & Accent Tokens (Fills, Seals, Borders, Icons)

> **Rule:** Use these original values for fills, wax seals, borders, badges, and large non-text graphics. Do **not** use Brass, Sage, or Dare Terracotta directly for small body text on Linen/Cream—use the text-safe variants in Section 1.3.

| Token | Hex | RGB | Semantic Role |
| :--- | :--- | :--- | :--- |
| `--color-truth-teal` | `#2E5E6B` | `46, 94, 107` | Truth choice, Truth chits, informational focus |
| `--color-dare-terracotta` | `#C4552D` | `196, 85, 45` | Dare choice, Dare chits, primary CTA fill |
| `--color-brass` | `#B8893B` | `184, 137, 59` | Host crown, podium/XP accents, `SPLIT` / `STALLED` wax seal fill |
| `--color-sage` | `#5B8C5A` | `91, 140, 90` | `PASSED` / `FINE` / `Approve` / Ready seal & icon fills |
| `--color-brick` | `#A33A2C` | `163, 58, 44` | `NOT IT` / `NOPE` / `Reject` / `SKIPPED` / Error fills |

### 1.3 Text-Safe Variants (WCAG AA >= 4.5:1)

> **Rule:** Use ONLY for text on `#F6F1E9` (Linen) or `#FFFDF9` (Cream) surfaces. QA must verify >= 4.5:1 contrast with an automated contrast checker.

| Token | Hex | Replaces (for text) | Usage |
| :--- | :--- | :--- | :--- |
| `--color-brass-text` | `#8A6420` | `#B8893B` | XP deltas, streak labels, `SPLIT` / `STALLED` / `TOO MILD` text |
| `--color-sage-text` | `#3F6B3E` | `#5B8C5A` | `PASSED`, `FINE`, Ready, Approve label text |
| `--color-terracotta-text` | `#A9441F` | `#C4552D` | Dare label text, secondary Dare links/badges |

*Note on Truth Teal (`#2E5E6B`) and Brick (`#A33A2C`):* Both already meet >= 4.5:1 contrast on `#F6F1E9` and `#FFFDF9` (and `#FFFDF9` on `#2E5E6B` / `#A33A2C` fills).

### 1.4 Lamplit Scene Tokens & Scrim

Used on **Lobby**, **Bottle Spin**, **Chosen**, and **Unseal** screens.

| Token | Value | Usage |
| :--- | :--- | :--- |
| `--color-lamplit-bg` | `#1A1410` | Base fallback behind WebP lamplit scene |
| `--color-lamplit-amber` | `#2A1D14` | Elevated dark amber surface |
| `--scrim-lamplit` | `linear-gradient(180deg, rgba(20, 15, 11, 0.65) 0%, rgba(20, 15, 11, 0.78) 100%)` | **Minimum 60% opacity** dark scrim behind all `--color-cream` text |
| `--color-lamplit-text` | `#FFFDF9` | Primary text on Lamplit scenes (always over scrim) |
| `--color-lamplit-muted` | `rgba(255, 253, 249, 0.78)` | Secondary/helper text on Lamplit scenes |
| `--border-lamplit-hairline` | `1px solid rgba(255, 253, 249, 0.18)` | Hairline borders on Lamplit cards |

---

## 2. Typography

All fonts are **self-hosted WOFF2**, subsetted for fast initial load (zero external Google Fonts network requests).

| Role | Token | Font Family | Weights | Character Coverage | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Display / Serif | `--font-display` | `Cormorant Garamond` | 600, 700 | Latin | Wordmark ("Vowlet"), screen titles, result stamps, podium headings |
| UI / Sans | `--font-ui` | `Inter` | 400, 500, 600, 700 | Latin | Buttons, timers, forms, settings, banners, legal copy, Owl UI lines |
| Handwritten | `--font-chit` | `Kalam` | 400, 700 | Latin + **Devanagari** | Player-written & starter chits (supports Hinglish / Devanagari) |

### Type Scale (Mobile-First 360px–430px)

| Token | Size / Line-Height | Tracking | Weight | Font |
| :--- | :--- | :--- | :--- | :--- |
| `--text-display-lg` | `2rem` (32px) / `1.15` | `-0.02em` | 700 | `--font-display` |
| `--text-display-md` | `1.5rem` (24px) / `1.2` | `-0.01em` | 600 | `--font-display` |
| `--text-chit` | `1.375rem` (22px) / `1.35` | `0` | 400 | `--font-chit` |
| `--text-body-lg` | `1.0625rem` (17px) / `1.45` | `0` | 500 | `--font-ui` |
| `--text-body` | `0.9375rem` (15px) / `1.5` | `0` | 400 | `--font-ui` |
| `--text-label` | `0.8125rem` (13px) / `1.3` | `0.02em` | 600 | `--font-ui` |
| `--text-caption` | `0.75rem` (12px) / `1.3` | `0.03em` | 500 | `--font-ui` |

> **Numeric Timers:** Always apply `font-variant-numeric: tabular-nums` on countdowns, stopwatches, room codes, XP counters, and vote counts to prevent layout jitter.

---

## 3. Shape, Borders, & Elevation

### 3.1 Radii

| Token | Value | Usage |
| :--- | :--- | :--- |
| `--radius-card` | `18px` | Primary cards, chit cards, modals, bottom sheets, table pods |
| `--radius-control` | `14px` | Primary/secondary buttons, text inputs, call-link field |
| `--radius-pill` | `9999px` | Chips, level badge, status pills, toggle tracks |

### 3.2 Hairline Ink Borders

| Token | Value | Usage |
| :--- | :--- | :--- |
| `--border-ink-hairline` | `1px solid rgba(35, 32, 28, 0.14)` | Default card/input border on Linen/Cream |
| `--border-ink-strong` | `1px solid rgba(35, 32, 28, 0.28)` | Active inputs, focus rings, elevated chits |
| `--border-focus` | `2px solid #2E5E6B` (with `2px` offset) | Keyboard/screen-reader focus indicator |

### 3.3 Two-Layer Shadows

Every elevated surface uses a two-layer shadow (tight contact shadow + soft ambient shadow) tinted with Ink (`#23201C`).

| Token | Value | Usage |
| :--- | :--- | :--- |
| `--shadow-card` | `0 1px 2px rgba(35, 32, 28, 0.08), 0 8px 24px rgba(35, 32, 28, 0.08)` | Standard Cream cards on Linen |
| `--shadow-sheet` | `0 2px 6px rgba(35, 32, 28, 0.12), 0 16px 40px rgba(35, 32, 28, 0.16)` | Bottom sheets, modals, unsealed chit |
| `--shadow-seal` | `0 1px 3px rgba(35, 32, 28, 0.18), 0 4px 12px rgba(35, 32, 28, 0.14)` | Wax seals, bottle, floating action buttons |

---

## 4. Layout & Safe-Area Tokens

| Token | Value | Rule |
| :--- | :--- | :--- |
| `--viewport-min` | `360px` | Zero horizontal overflow at 360px width |
| `--viewport-max-shell` | `430px` | Centered mobile column on desktop; Table Mode uses full viewport |
| `--space-page-x` | `16px` | Horizontal page gutter |
| `--space-section` | `20px` | Vertical rhythm between sections |
| `--touch-min` | `44px` | Minimum hit target width & height for all interactive controls |
| `--safe-top` | `env(safe-area-inset-top, 0px)` | Top notch / status bar clearance |
| `--safe-bottom` | `env(safe-area-inset-bottom, 0px)` | Home indicator clearance |

---

## 5. Media & Vector Asset Rules

1. **Vector-First Mascot & Seals:** Wax seals (`PASSED`, `NOT IT`, `SPLIT`, `SKIPPED`, `STALLED`), the bottle, and Vowlet the top-hatted owl poses (`idle`, `judging`, `approve`, `disapprove`, `roast`) MUST be **inline SVG / CSS**—never heavy PNGs.
2. **Scene Backgrounds:** Lamplit scene backgrounds must be **WebP <= 150KB** each, self-made or free-licensed, paired with `--scrim-lamplit` (60%+ dark scrim).
3. **No Heavy Rasters:** Icons use crisp 1.5px–2px stroke SVGs paired with text labels.
