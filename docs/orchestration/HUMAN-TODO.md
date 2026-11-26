# HUMAN-TODO (Action Items for Mohit)

These items cannot be completed autonomously by the agent team and must be completed before typing `GO PHASE 4`.

## 1. Design Reference (Completed)
- [x] Added the 10-screen UI reference image to `/docs/design/reference.png`.

## 2. Firebase Projects & Services (Staging & Production)
- [ ] Create two Firebase projects at https://console.firebase.google.com/: `vowlet-staging` and `vowlet-prod` (Spark / Free tier).
- [ ] In both projects, enable:
  - **Authentication**: Anonymous + Google Sign-In providers.
  - **Cloud Firestore**: Create database in production mode; configure TTL policy on `rooms/{code}` field `expiresAt`.
  - **Realtime Database**: Create database in default region.
  - **Remote Config**: Add flags (`llm_judge_enabled`, `video_enabled`, `community_deck_enabled`, `pause_room_creation`, `min_schema_version`).
  - **Analytics**: Enable Google Analytics.
  - **App Check**: Register web app with reCAPTCHA v3 (free tier) and enforce on Firestore, RTDB, and custom backend.

## 3. Google AI Studio API Key (Free Tier)
- [ ] Get a free Gemini API key from https://aistudio.google.com/apikey for the Judge Owl LLM classifier.
- [ ] Note: Until added to staging/prod env vars, `llm_judge_enabled` defaults to `false` and the deterministic filter + starter deck handles moderation safely.

## 4. Vercel Hosting & Environment Variables (Hobby / Non-Commercial Free Tier)
- [ ] Connect this GitHub repository to Vercel (Hobby plan — non-commercial portfolio use only).
- [ ] Set environment variables in Vercel (Preview/Staging and Production):
  - `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_DATABASE_URL`, `VITE_FIREBASE_APP_ID`, `VITE_RECAPTCHA_SITE_KEY`
  - `FIREBASE_SERVICE_ACCOUNT_JSON` (server-side only, never `VITE_` prefixed)
  - `GEMINI_API_KEY` (server-side only)
  - `PRIVATE_BETA=true`
  - `ALLOWED_ORIGINS=https://your-vowlet-domain.vercel.app`
  - `SENTRY_DSN` (optional, free tier)

## 5. Legal & Brand Checks
- [ ] Check the name "Vowlet" for trademark/domain conflicts.
- [ ] Have a qualified legal professional review the `DRAFT - NOT LEGALLY REVIEWED` policies in `/docs/legal/` (Terms, Privacy, Content Policy, Safe Dares Policy) before removing `PRIVATE_BETA=true` or marketing publicly.

## 6. Real Playtests (Required before GO PHASE 4)
- [ ] Recruit 3–8 friends for 10–20 real game nights using the validation protocol in `/docs/business/validation-protocol.md` and collect the 3-question survey.
- [ ] Review KPIs (completion rate >= 70%, replay >= 40%) and complete the go/fix/stop memo before typing `GO PHASE 4`.
