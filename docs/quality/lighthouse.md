# Vowlet — Lighthouse CI & Axe Audit Protocol

**Owner:** PERF  
**Config:** `/.lighthouserc.json`  
**Budgets:** `/docs/quality/budgets.md`

---

## 1. Purpose

Enforce Section 9.4 performance and accessibility budgets automatically on every PR and before every Phase Gate:
- Mobile preset (`360px`–`412px` emulated Moto G Power / throttled 4G)
- `LCP <= 2500ms`
- `CLS <= 0.1`
- `Accessibility >= 0.95` (95/100)
- `Initial JS <= 200KB` gzipped (verified by build budget check + Lighthouse resource summary)
- `axe-core` zero critical violations across all game screens in Playwright

---

## 2. Running Locally

Once `apps/web` is built:

```bash
# 1. Build the production PWA
pnpm --filter @vowlet/web build

# 2. Run Lighthouse CI against the built static preview
npx @lhci/cli@0.14.x autorun --config=.lighthouserc.json
```

### Axe-Core Accessibility Sweep (Playwright)

QA's Playwright suite imports `@axe-core/playwright` and asserts `criticalViolations.length === 0` on:
1. First-Run Consent
2. Home
3. Create / Join Table
4. Lobby (Lamplit mode)
5. Write Chits (Linen mode)
6. Bottle Spin & Chosen (Lamplit mode)
7. Unseal / Perform Truth / Perform Dare
8. Vote & Result
9. Podium & Legal

---

## 3. CI Integration

1. Runs in `.github/workflows/ci.yml` after `apps/web` build succeeds.
2. Uses `temporary-public-storage` (free, zero external paid accounts) or local artifact upload for HTML reports.
3. Any `error`-level assertion in `.lighthouserc.json` fails the CI check and blocks merge.

---

## 4. Triage & Exemption Policy

- **No silent threshold relaxation.** Only ORCH + PERF + QA may adjust non-locked thresholds; Section 9.4 hard budgets (`LCP <= 2.5s`, `CLS <= 0.1`, `a11y >= 95`, `JS <= 200KB`, `WebP <= 150KB`, `axe = 0 critical`) are locked and cannot be relaxed.
- If a third-party PWA/Firebase chunk pushes initial JS near `200KB`, split it into an async route chunk or lazy-load after first paint.
