# Vowlet Free-Tier Quotas, Alerts & Kill Switches

> **Policy:** Vowlet runs exclusively on free-tier infrastructure (Section 1.5, Section 9.5). Paid hosting and payment code are out of scope.

---

## 1. Vendor Free-Tier Limits

### 1.1 Firebase Spark Plan (No-Cost Tier)
| Service | Free-Tier Limit | Notes / Guardrails |
| --- | --- | --- |
| **Cloud Firestore Writes** | **20,000 / day** | Budget: `<= 300` writes per 10-turn, 6-player game (~66 full games/day max) |
| **Cloud Firestore Reads** | **50,000 / day** | Narrow listeners (`rooms`, `turn/current`, `players`, `votes`) + in-memory doc cache |
| **Cloud Firestore Deletes** | **20,000 / day** | Room cleanup via Firestore TTL on `expiresAt` (4h idle) |
| **Cloud Firestore Storage** | **1 GiB** | Ephemeral rooms expire after 4h |
| **Realtime Database (RTDB)** | **100 concurrent connections**, **1 GB storage**, **10 GB/month download** | Used for `presence/{code}/{uid}` only |
| **Firebase Auth / Remote Config / Analytics / App Check** | Free within Spark limits | Anonymous + optional Google sign-in |

### 1.2 Vercel Hobby Plan
- **Terms:** **Non-commercial use only** (portfolio / private beta).
- **Bandwidth:** **100 GB / month** (enforced via `<= 200KB` gzipped initial JS, `<= 150KB` WebP scene assets).
- **Serverless Execution:** Hobby tier function execution duration & invocation limits (keep `/api/*` handlers fast, single Firestore transaction per call, no long-polling).

### 1.3 Google AI Studio (Free Tier)
- **Usage:** Judge Owl LLM classifier (`/api/chit/submit`) behind adapter interface.
- **Limits:** Subject to free-tier RPM / RPD / TPM caps (varies by Gemini Flash model).
- **Mitigation:** Deterministic filter runs first; LLM verdicts are cached by normalized text hash in `verdictCache/{normalizedHash}`. Fail-closed on 429/timeout.

### 1.4 Sentry (Developer Free Tier)
- **Limits:** **5,000 error events / month**, **10,000 performance transactions / month**, 1 user seat.
- **Privacy Scrubber:** Before-send hook strips `Authorization` headers, Firebase tokens, player names, room codes, and chit text.

---

## 2. Alert Thresholds (60% & 80%)

| Threshold | Action |
| --- | --- |
| **60% of daily/monthly quota** | Warning alert logged in ops monitoring; review traffic and cache hit rates. |
| **80% of daily/monthly quota** | Critical alert; enable appropriate Remote Config kill switch(es) to shed non-essential load. |

---

## 3. Remote Config Kill Switches

All flags default to safe values and can be toggled in Firebase Remote Config without a redeploy:

| Flag | Default (Phases 0–3) | Effect When Disabled / Toggled |
| --- | --- | --- |
| `enableLlmJudge` | `true` (mock in local) | When `false`: disables Google AI Studio calls; Judge falls back to deterministic filter + curated starter deck. |
| `enableCommunityDeck` | `false` (until P3) | When `false`: hides community prompts and disables `/api/prompts/community` & `/api/prompts/rate`. |
| `enableNewRoomCreation` | `true` | When `false`: `/api/room/create` returns `503` maintenance message while letting active rooms finish. |
| `enableLiveKit` | `false` | Phase 4 only. Must remain `false` in Phases 0–3 and in all in-person rooms. |
| `privateBeta` | `true` | Keeps `noindex` posture and private beta notice active until legal review & launch. |
