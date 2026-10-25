# Truth or Dare (Chit Table): Prototype Pack

Requirements, design, architecture, technical spec and build prompts for a prototype you can test on your own phone. Version 0.1 · 25 Oct 2026 · Owner: Mohit

## 0. How to use this pack

- Sections 1-2 (PRD, SRS) say what to build. Sections 3-5 (design, architecture, TRD) say how. Sections 6-9 cover phone testing, the build plan, the Antigravity prompts and the Stitch prompts.
- Export this doc as Markdown and save it in your repo as `/docs/PACK.md` so the Antigravity agent can read it.
- Anything marked VERIFY is a free-tier limit or product detail that changes often. Check it before you depend on it.

### Decisions locked for the prototype

| Topic | Decision | Why |
|---|---|---|
| Platform | Mobile-first installable web app (PWA) | Opens from a link on any phone, no APK or store, instant updates. A Flutter or native port can come later. |
| Players | 2-8 per table, 18+ self-confirmation | Keeps risk low and matches the content. |
| Modes | Friends Table only. Stranger Roulette is a Coming Soon stub | Random strangers on live video is the biggest abuse risk. |
| Dare delivery | Two modes: In the Room (default, no video) and Remote Live (video, built last, feature-flagged) | Most friend groups play in one room. Video is the riskiest build item, so the game must work without it. |
| Login | Google plus Guest (name only). Phone number deferred | SMS login needs billing and is not needed to test. |
| AI Judge | Gemini API free tier behind a serverless endpoint, plus a keyword prefilter | Keeps the key off the phone and cuts cost. |
| Backend | Firebase (Auth, Firestore) on the free plan, plus Vercel free serverless functions for anything that holds a secret | Firebase Cloud Functions need a billing plan (VERIFY). Vercel does not. |
| Game authority | The host's phone runs the game logic, with host migration | Fastest to build. Weaker anti-cheat, fine for friends. |
| Rewards | Cosmetic only (bottle skins, stamp packs, rank titles) | Free to give, no fraud. |
| UI | Chit Table look from Stitch, with the spacious revision in section 3 | Your chosen direction. |

---

## 1. Product Requirements Document (PRD)

### 1.1 Summary
Truth or Dare (working title, brand Chit Table) is a mobile-first multiplayer party game. Everyone writes one truth and one dare on paper-style chits. An AI Judge checks each chit for safety, spice and doability. A bottle spin picks a player and a random chit from the pool, the player performs it, and the table votes Pass or Fail. Passing earns XP, ranks and cosmetic rewards.

### 1.2 Problem
Truth or dare nights die from three things: stale questions, one loud person writing every dare, and no stakes or progress. Existing apps are either static question decks or random video chat with strangers. This product keeps content player-written, filters it before play, and adds light progression.

### 1.3 Target users
- **Host (Riya, 20)**: Organises hostel and house nights. Needs a game that runs itself and keeps everyone engaged.
- **Joiner (Aman, 19)**: Shy, joins from a link. Needs no install, no account, a clear rule set.
- **Remote friend (Zoya, 21)**: Friends live in other cities. Needs to play together over video without a complicated setup.

### 1.4 Goals and success metrics (prototype)
- Full game (4 players, 8 turns) finished with no crash or restart: 8 of 10 test games.
- AI Judge verdict time: Under 4 s for 90% of checks.
- Link to lobby for a new guest: Under 60 s.
- Testers who say they would play again: 7 of 10.
- Red-team list of 50 bad chits: 0 sexual, violent or self-harm chits approved, at most 3 borderline.
- Running cost: Rs 0.

### 1.5 Non-goals (prototype)
Stranger matchmaking, sponsor or cash rewards, recording or replaying video, native apps, phone-number login, verifying social posts, an admin dashboard, languages beyond English and Hinglish text.

### 1.6 Core loop
1. Sign in (Google or Guest) and confirm 18+.
2. Host creates a table and shares the code, link or QR.
3. Everyone joins the lobby.
4. Each player writes one truth and one dare. The Judge stamps each FINE or NOPE (or TOO MILD, NOT DOABLE).
5. When everyone is stamped, the host starts the game.
6. The bottle spins and lands on a player. A random truth or dare chit from someone else is drawn.
7. The player performs it (answers a truth, or does the dare in the room or on live video).
8. Everyone else votes Pass or Fail.
9. A stamp lands, XP is awarded, the next spin starts. After the last turn there is a summary with ranks and unlocks.

### 1.7 Features and priority
- F1: Guest and Google sign-in (P0, Phase 2)
- F2: Profile: name, sticker avatar, rank (P0, Phase 2)
- F3: Create and join table by code or link (QR is P1) (P0, Phase 3)
- F4: Lobby with presence and ready state (P0, Phase 3)
- F5: Write chits with AI Judge (P0, Phase 4)
- F6: Bottle spin and chit assignment (P0, Phase 5)
- F7: Truth answer (type, or say it aloud) (P0, Phase 5)
- F8: Dare in the Room mode (P0, Phase 5)
- F9: Voting and result stamps (P0, Phase 6)
- F10: XP, levels, ranks, game summary (P0, Phase 6)
- F11: Report, leave, consent screens (P0, Phase 5-7)
- F12: Reconnect and host migration (P0, Phase 5)
- F13: Dare Remote Live (video) (P1, Phase 7)
- F14: Daily Spin (solo truth of the day) (P1, Phase 8)
- F15: Cosmetic unlocks: bottle skins, stamp packs (P1, Phase 8)
- F16: Share to Instagram or X through the share sheet (P1, Phase 8)
- F17: Sound, haptics, reduce motion (P1, Phase 8)
- F18: Stranger Roulette stub (Coming Soon) (P2, Phase 2)
- F19: Friends leaderboard (P2, later)

### 1.8 Game rules
#### Timers (host can pick Short, Normal or Long)
| Step | Short | Normal | Long |
|---|---|---|---|
| Truth answer | 30 s | 60 s | 90 s |
| Dare | 60 s | 90 s | 150 s |
| Vote | 15 s | 20 s | 30 s |
| Writing phase | 3 min cap for all, host can force start | | |

#### Spin and draw
- Each round, every connected player gets exactly one turn in random order (shuffled bag). The host picks 1 to 3 rounds (default 1).
- Each turn is randomly a truth or a dare. The chit comes from another player's approved entries, never the performer's own, and is never reused. If the pool for that type runs out, use the other type, then the built-in Judge's Deck.
- A performer may Skip at any time. Skip counts as a Fail with no extra penalty and no shaming copy.
- Each player has 1 Swap per game: draw a different chit of the same type before starting.

#### Voting
- Voters are all connected players except the performer. Majority of cast votes wins.
- A tie, or zero votes, is decided by the host. If the host is the performer, the player who joined next decides.
- Votes are hidden in the UI until the timer ends or everyone has voted, then revealed together.

#### XP
| Event | XP |
|---|---|
| Pass | +50 |
| Fail | +10 |
| Skip | 0 |
| Pass streak bonus | +10 per consecutive pass, max +30 |
| Voting on a turn | +5 (max +40 per game) |
| Finishing a game | +20 |
| Daily Spin | +25 |

#### Levels and ranks
- XP needed to go from level L to L+1 is calculated exponentially: `xpForNext(L) = round to nearest 5 of BASE * GROWTH^(L-1)` where `BASE = 100` and `GROWTH = 1.25` (**XP-4**).
- Total cumulative XP (`totalXp`) is stored on `users/{uid}` and player documents. Level is never stored as the source of truth; it is derived via `levelFromTotal(totalXp)` and `progress(totalXp)`.
- Ranks: Lv 1-2 Fresh Chit, 3-4 Table Warmer, 5-7 Mild Troublemaker, 8-10 Certified Menace, 11-14 Spice Merchant, 15-19 Dare Devil, 20+ Legend of the Table.
- Unlocks: Lv 2 Green Glass bottle, Lv 4 Amber bottle, Lv 6 Chit colour pack, Lv 8 Extra stamp pack, Lv 10 Golden bottle.

#### Tiers (host setting)
Mild, Spicy or Legend. The tier tells the Judge how bold a chit must be. A chit that is too tame for the tier gets TOO MILD (the 'your granny would do this' line), and a chit that is unsafe gets NOPE.

### 1.9 Safety and trust
- 18+ is a self-confirmation at sign-in. It is not verified in the prototype.
- The Judge blocks: physical danger, illegal acts, sexual or explicit content, harassment, hate, self-harm, humiliating people who are not at the table, contacting real third parties who have not agreed, requests for personal data, anything involving minors, alcohol or drugs.
- Remove drinking mechanics from the Stitch copy (the 'drink stamps' line on Friends Table and 'Rule #2: drink on refusal' in the footer). They conflict with the alcohol block above and with store policies.
- Camera is used only in Remote Live, with a consent screen each session, no recording, and a Report button on every live screen. Anyone can leave at any time.
- Reports are saved to a reports collection that you review manually in the prototype.

---

## 2. Software Requirements Specification (SRS)

### 2.2 Definitions
- **Table**: A game room of 2-8 players
- **Chit**: A truth or dare entry written by a player
- **Judge**: The AI reviewer (owl character)
- **Pool**: All approved, unused chits in a table
- **Turn**: One spin, one performer, one chit, one vote
- **Round**: Every connected player has had one turn
- **Host**: Player who created the table and runs the game
- **Performer**: Player whose turn it is
- **Voter**: Any connected player who is not the performer

### 2.5 Functional requirements
- **AUTH-1**: Sign in with Google or continue as a Guest with a display name (P0)
- **AUTH-2**: Require 18+ and camera-visibility checkbox before first table is created or joined (P0)
- **AUTH-3**: Joiner with party code continue as Guest without registration (P0)
- **PROF-1**: Choose display name (2-16 chars) and one of at least 12 sticker avatars (P0)
- **PROF-2**: Show level, rank title, XP bar and games played on profile (P0)
- **PROF-3**: Delete data and sign out (P1)
- **ROOM-1**: Create table with max players (2-8), tier, timer length, rounds and dare mode (P0)
- **ROOM-2**: Generate unique 6-character code (no 0, O, 1, I) (P0)
- **ROOM-3**: Join by typing code or opening /join/CODE (P0)
- **ROOM-4**: Reject joins to full, started or ended table with clear message (P0)
- **ROOM-5**: Lobby shows every player with name, sticker, ready state and connection state (P0)
- **ROOM-6**: Host kicks player, copies or shares code and link (P0)
- **ROOM-7**: QR code for join link (P1)
- **ROOM-8**: Host disconnect >20 s => earliest-joined connected player becomes host (P0)
- **ROOM-9**: Reconnect within 60 s restores same seat and state (P0)
- **CHIT-1**: Each player submits exactly 1 truth (<=120 chars) and 1 dare (<=140 chars) (P0)
- **CHIT-2**: AI Judge verdict: FINE, NOPE, TOO MILD, or NOT DOABLE (P0)
- **CHIT-3**: Reason in Judge's voice + 4 suggestion chits for non-FINE verdicts (P0)
- **CHIT-4**: Use suggestion, edit, or write new chit -> re-judged (P0)
- **CHIT-5**: Enter pool only after FINE (P0)
- **CHIT-6**: Block phone number, email, link, address before calling AI (P0)
- **CHIT-7**: If AI service down/over quota: show 4 built-in chits so player can continue without auto-approving (P0)
- **CHIT-8**: Host starts when all connected FINE, or force start after writing cap (P0)
- **GAME-1**: Pick next performer by shuffled-bag rule (P0)
- **GAME-2**: Bottle animation ends pointing at performer on every phone at same time (P0)
- **GAME-3**: Random truth or dare, draw unused chit per pool rules (P0)
- **GAME-4**: Chit revealed with flip and handwriting text (P0)
- **GAME-5**: Truth answered by typing or saying aloud with timer (P0)
- **GAME-6**: Dare in In the Room mode shows timer + Done button (P0)
- **GAME-7**: Dare in Remote Live publishes camera & mic (P1)
- **GAME-8**: Skip (Fail) and 1 Swap per game (P0)
- **GAME-9**: Host can end game early (P0)
- **VOTE-1**: Pass or Fail vote, changable until timer ends (P0)
- **VOTE-2**: Show who voted but not what until reveal (P0)
- **VOTE-3**: Result follows voting rules, host tie-break (P0)
- **VOTE-4**: Rubber-stamp animation (PASSED or NOT IT) (P0)
- **XP-1**: Award XP and update level & rank (P0)
- **XP-2**: Summary shows XP earned, passes, fails, best streak, unlock (P0)
- **XP-3**: Equip unlocked cosmetics from Loot (P1)
- **XP-4**: Exponential XP with BASE=100, GROWTH=1.25. Derive level from totalXp (P0)
- **NAV-1**: Fixed 4-column bottom nav with no horizontal overflow at 360, 390, 430px (P0)
- **LEARN-1**: User consent for anonymous learning with opt-out toggle (P0)
- **LEARN-2**: Candidate storage in learning/chits on FINE stamps with counters (P0)
- **LEARN-3**: Gemini embeddings with trigram fallback and cosine duplicate merge (P0)
- **LEARN-4**: One-tap voter chit rating (Fire, Mid, Too Much) after turn (P0)
- **LEARN-5**: Promotion to Community Deck on Wilson score and Judge pass (P0)
- **LEARN-6**: Swap suggestions & fallback draw from Community Deck with logistic ranker (P1)
- **LEARN-7**: Player Owl takes (roast under 80 chars) on revealed chits (P1)
- **LEARN-8**: Moderation and voting (Nailed it / Meh) on Judge lines (P1)
- **LEARN-9**: Promoted lines used as style examples and 20% verbatim reuse (P1)
- **SAFE-1**: Reachable Report action on every in-game screen (P0)
- **SAFE-2**: Consent screen before camera turned on in Remote Live (P0)
- **SAFE-3**: Never record or store audio or video (P0)
- **SAFE-4**: Leave table without penalty (P0)
- **SAFE-5**: Player reported by 2+ players flagged to host (P1)
- **DAILY-1**: Daily Spin: 1 truth of the day, once/day, +25 XP (P1)
- **SHARE-1**: Share caption after Pass via device share sheet (P1)
- **SET-1**: Toggle sound, haptics, reduce motion (P1)

---

## 3. Design Document & Tokens

### 3.2 Spacious Revision Rules
1. One hero and one primary action per screen. At most 3 content blocks above the fold.
2. Spacing scale: 4, 8, 12, 16, 24, 32, 40, 56. Screen padding 24. Gap between sections 40. Card padding 24. Gap between items inside a card 16.
3. Cut metadata micro-labels. Keep at most one small mono label per card.
4. One decoration per card: tape, or a stamp, or a tilt. Never all three. At most 2 tilted elements per screen.
5. Nothing covers text. A stamp may sit on a chit's edge or empty corner, never over the written line.
6. Type: body 17-18 px, titles 28 px, display 40 px, mono labels 12 px caps with wide tracking. Nothing smaller than 12 px.
7. Never stack or overlap chits. Show one chit at a time.
8. Secondary content moves into a bottom sheet (suggestions, rules, settings), not inline.
9. Delete filler: footers, edition lines, copyright, rule banners, HOT/FREE/NEW tags.
10. Unavailable features are one quiet line, not a large card.

### 3.3 Design Tokens
- `paper`: `#FFF8F5` (Page background)
- `chit`: `#FFFFFF` (Chit and card surface)
- `chit-shade`: `#F3ECE8` (Inputs, quiet panels)
- `ink`: `#1C1917` (Text and borders)
- `ink-muted`: `#6B5B53` (Secondary text)
- `dare`: `#B91C14` (Dare colour, primary button)
- `truth`: `#2757D6` (Truth colour)
- `highlighter`: `#F6C244` (Tape, XP bar, accents)
- `peach`: `#FFDDB0` (Secondary button fill)
- `pass`: `#2F8F5B` (PASSED stamp)
- `fail`: `#B91C14` (NOT IT stamp)

Fonts:
- Display: Fraunces
- Handwriting: Newsreader italic
- Mono / UI: DM Mono

Borders & Shadows:
- Border: `2px solid #1C1917`
- Hard Shadow: `4px 4px 0px 0px #1C1917`
- Pressed state: `translate(3px, 3px)` and shadow `1px 1px 0px 0px #1C1917`
- Radius: Buttons 8px, chits 4px with clipped corner, avatars irregular blobs

---

## 4. Architecture and TRD Details

### 4.4 Repo Structure
```
truth-or-dare/
AGENTS.md
docs/PACK.md
design/ (Stitch screenshots, exported html, tokens)
api/ (Vercel functions: judge.ts, livekit-token.ts)
src/
  app/ (routes, providers)
  components/ (design system)
  features/ (auth, home, table, write, play, vote, loot, me, daily)
  game/ (pure rules: bag.ts, draw.ts, vote.ts, xp.ts, phases.ts)
  lib/ (firebase.ts, time.ts, presence.ts, sound.ts, haptics.ts)
  data/ (judgesDeck.ts, dailyDeck.ts, ranks.ts)
firestore.rules
vite.config.ts
```

### 5.5 Firestore Data Model
- `users/{uid}`: displayName, avatarId, isGuest, totalXp (source of truth for XP & level), gamesPlayed, passes, fails, bestStreak, unlocked[], equipped{bottle, stamp}, dailyLast (YYYY-MM-DD), shareChitsForLearning (boolean, default true), createdAt
- `rooms/{code}`: hostUid, status, settings{maxPlayers, tier, timer, rounds, dareMode}, round, bag[], currentTurnId, writingDeadline, createdAt
- `rooms/{code}/players/{uid}`: name, avatarId, ready, joinedAt, lastSeen, totalXp, swapsLeft, streak, xpGame, passes, fails, votesCast, chitsOk{truth, dare}, kicked
- `rooms/{code}/entries/{id}`: authorUid, type, text, tier, used, createdAt. (Written only by server /api/judge)
- `rooms/{code}/turns/{turnId}`: index, performerUid, type, entryId, entryText, phase, phaseStartedAt, phaseDeadline, targetAngle, answerText, done, tieBreakBy, result, xpAwarded
- `rooms/{code}/turns/{turnId}/votes/{uid}`: value ('pass' | 'fail'), at
- `rooms/{code}/turns/{turnId}/ratings/{uid}`: value ('fire' | 'mid' | 'tooMuch'), at
- `rooms/{code}/turns/{turnId}/takes/{takeId}`: authorUid, text, up, down, at
- `learning/chits/{chitId}`: text, normalisedText, type, tier, authorUid, embedding: number[], plays, passes, fails, fire, mid, tooMuch, distinctRaters, raterUids[], reports, status ('candidate' | 'promoted' | 'rejected'), createdAt
- `learning/judgeLines/{lineId}`: text, language ('en' | 'hi'), verdictContext, tier, embedding: number[], up, down, distinctRaters, voterUids[], uses, lastUsedAt, status ('candidate' | 'promoted' | 'retired' | 'rejected'), createdAt
- `community/deck/{id}`: type, text, tier, fireScore, plays, promotedAt
- `reports/{id}`: roomCode, reporterUid, targetUid, reason, note, turnId, createdAt

---

## 8. Antigravity Prompts Summary
- Prompt 0: Project setup (Scaffold Vite + React + TS + Tailwind + PWA + Vitest)
- Prompt 1: Design kit and static screens (/dev/kit, /dev/screens, design system)
- Prompt 2: Auth, profile, Home, first deploy (Firebase Auth, Guest, user doc)
- Prompt 3: Tables and lobby (Rooms, Players, presence, host migration)
- Prompt 4: Chits and the Judge (Vercel api/judge, blocklist, Gemini, Judge's Deck)
- Prompt 5: Spin, reveal, truth, dare in the room (Game state machine, spin animation, in-room dare)
- Prompt 6: Voting, XP, summary (Voting logic, tie break, XP calculations, game summary)
- Prompt 7: Remote Live video (LiveKit integration behind flag)
- Prompt 8: Polish (Reports, Daily Spin, Loot, sound, haptics, a11y)
- Prompt 9: QA and release (Checks, tests, audit, release checklist)
