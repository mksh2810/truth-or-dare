# DRAFT - NOT LEGALLY REVIEWED

> **NOTICE:** This document is a **DRAFT - NOT LEGALLY REVIEWED** placeholder prepared for Vowlet's Private Beta (`PRIVATE_BETA=true`). It does not constitute legal advice and must be reviewed by a qualified legal professional before public launch.

---

# Vowlet — Privacy Policy

**Last Updated:** Private Beta Draft  
**Product:** Vowlet

---

## 1. Data We Collect
Vowlet minimizes data collection and operates on free-tier infrastructure:
- **Authentication Data:**
  - *Guests:* An anonymous Firebase Auth UID and your chosen room display name.
  - *Google Sign-In (Optional):* Your Firebase UID, display name, and email/avatar provided by Google Auth.
- **Gameplay & Room Data:** Room code, settings, turn history, votes (anonymous counts), session scores, and custom chits. Custom chits' `authorUid` is stored in a restricted server-only collection (`secret/{id}`) and is never readable by other players.
- **Presence Data:** Online/away status and `lastSeen` timestamp in Firebase Realtime Database while you are in a room.
- **Profile & Progression Data (Signed-in Users):** Lifetime XP, level, unlocked bottle skins, streaks, and saved Table history (`users/{uid}`).
- **Safety & Diagnostics:** Abuse reports (`reports/{id}`), rate-limit counters, and privacy-scrubbed error logs (Sentry, with PII stripped) and aggregated analytics events.

## 2. How We Use Data
- To run real-time multiplayer turns, enforce server-side rules, and prevent abuse/cheating.
- To moderate custom chits via automated filters and the Judge Owl classifier (Google AI Studio free tier; chits are sent as quoted data without your name or email).
- To compute server-side lifetime XP and display Night Recaps.

## 3. Data Retention & Automatic Deletion
- **Rooms & Session Chits:** Rooms and all associated subcollections (`players`, `turn`, `votes`, `chits`, `secret`, `private`) have a Firestore TTL (`expiresAt`) set to **4 hours after last activity** and are automatically purged.
- **Presence:** Ephemeral RTDB presence nodes are cleared on disconnect/room expiry.
- **LLM Verdict Cache:** Normalized text hashes and verdicts may be cached without user identifiers to stay within free-tier quotas.

## 4. Video Calls & Third-Party Services
- If your room uses an external call link (Google Meet, WhatsApp, Discord), that service's own privacy policy applies.
- **Recording Notice:** Others can record video calls using external tools; Vowlet does not record your audio or video.
- **Infrastructure Providers:** Firebase (Google), Vercel (hosting/API), Google AI Studio (moderation), and Sentry (scrubbed error monitoring).

## 5. Your Rights & Controls (Delete My Data)
- You can delete your account and personal progression data at any time directly from **Profile / Settings -> Delete My Data** in the app (see [SOPs](./sop.md)).
- You may also delete any Community Deck prompt you authored.

## 6. Age Requirement
Vowlet is intended strictly for users **18+** (self-declared). We do not knowingly collect data from anyone under 18.
