# DRAFT - NOT LEGALLY REVIEWED

> **NOTICE:** This document is a **DRAFT - NOT LEGALLY REVIEWED** placeholder prepared for Vowlet's Private Beta (`PRIVATE_BETA=true`). It does not constitute legal advice and must be reviewed by a qualified legal professional before public launch.

---

# Vowlet — Standard Operating Procedures (Delete My Data & Report/Block)

**Last Updated:** Private Beta Draft  
**Fix Checklist:** `B10`

---

## 1. Delete My Data SOP

### 1.1 User-Initiated In-App Deletion
1. User navigates to **Profile / Settings -> Delete My Data**.
2. UI displays a clear confirmation modal explaining what will be permanently deleted:
   - `users/{uid}` profile document (lifetime XP, level, skins, streaks, saved Table history).
   - Authorship links on any opted-in Community Deck prompts (anonymized or deleted per user choice).
   - Firebase Auth account (anonymous or Google-linked).
3. User confirms deletion.
4. Client calls authenticated deletion endpoint (`POST /api/user/delete` or equivalent account deletion handler) with fresh ID token + App Check.
5. **Server Actions:**
   - Remove `users/{uid}`.
   - If user is currently in an active room, execute `leave` logic (remove from `players/{uid}`, return unplayed chits to pool, handle host migration if needed).
   - Delete or scrub `authorUid` on user's Community Deck prompts.
   - Delete Firebase Auth user record via `firebase-admin`.
6. Client clears local storage / IndexedDB caches, signs out, and returns to the first-run consent screen.

### 1.2 Automatic Room Expiry (No Action Needed)
- Active room documents (`rooms/{code}`) and all subcollections (`players`, `turn`, `votes`, `chits`, `secret`, `private`) carry `expiresAt` = **4 hours after last activity** and are automatically purged by Firestore TTL.

---

## 2. Report & Block SOP

### 2.1 In-App Report Flow
1. User opens **Report / Block** sheet from a player's menu, a prompt card, or Settings.
2. User selects:
   - **Target:** Player (`targetUid`) and/or Prompt (`promptId` / `chitId`).
   - **Reason:** Unsafe Dare, Harassment/Abuse, Alcohol/Drugs, PII/Doxxing, Wrong Tier, Other.
   - **Optional Note:** Free-text details (max 280 chars, sanitized).
3. Client submits to `POST /api/report` (or create-only `reports/{id}` rule).
4. Server writes `reports/{id}` with `reporterUid`, `roomCode`, `targetType`, `reason`, `createdAt`, and `status: "OPEN"`.

### 2.2 Immediate Local Block & Room Protection
- **Block Player:** Blocking a player immediately hides their custom display name/avatar cues where applicable on the blocker's client and prevents future room joins together where enforceable.
- **Host Kick:** If the reporter is the room Host, they may immediately **Kick** the offending player (`POST /api/room/kick`), adding their `uid` to the room's `banned` list so they cannot rejoin.
- **Prompt Removal:** Flagged Community Deck prompts exceeding the abuse threshold are automatically hidden pending review.

### 2.3 Operator Review (Private Beta)
- During Private Beta, the project owner (Mohit) reviews `reports` with `status == "OPEN"` in the Firebase Console, removes violating Community Deck prompts, and updates `status` to `RESOLVED` or `DISMISSED`.
