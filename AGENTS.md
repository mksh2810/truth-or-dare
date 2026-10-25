# Truth or Dare (Chit Table): agent rules
Source of truth: /docs/PACK.md (requirements, design, architecture, TRD) and
/design (Stitch screenshots and exported HTML). Read both before changing
code. If they conflict, PACK.md wins, except visual details where /design
wins.

Stack: React 18, Vite, TypeScript, Tailwind, React Router, Zustand, Framer
Motion, Howler, Firebase (Auth, Firestore), Vercel Functions in /api, zod,
Vitest.

Rules:
1. Free tiers only. Do not add any paid service or a library that needs a
paid key.
2. No secrets in client code. Only VITE_ variables are public. Server keys
live in Vercel env and are read only in /api.
3. Game rules live in /src/game as pure functions with unit tests. UI never
contains rules.
4. Design tokens live in one place (tailwind config and
src/styles/tokens.css). No hard-coded colours, sizes or shadows in
components.
5. Follow the spacious rules in PACK.md section 3.2: one hero, one primary
action, no overlapping chits, nothing covering text.
6. Mobile first, 360-430 px portrait. Safe-area insets. Inputs at least 16
px.
7. Every animation respects Reduce Motion. Every haptic has a visual twin.
Every stamp shows words.
8. No alcohol or drinking content anywhere.
9. Small components, files named by feature, no dead code.
10. After each task: run typecheck, lint and tests, then list what you
changed and what I must do by hand.
11. Refer to requirement IDs from PACK.md (for example CHIT-4). Never invent
IDs.
12. Ask before deleting files or changing the data model.
