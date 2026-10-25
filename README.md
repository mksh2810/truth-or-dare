# Truth or Dare (Chit Table)

Mobile-first multiplayer party game with handwritten paper-style chits, an AI Judge owl, top-down bottle spin, and light RPG progression.

---

## 🚀 Deploy to Vercel (Section 6.2)

Follow these exact steps to deploy to Vercel and test on your phone:

1. **Create a GitHub repo and push the project**:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/truth-or-dare.git
   git branch -M main
   git push -u origin main
   ```

2. **Import into Vercel**:
   - Go to [vercel.com](https://vercel.com) and click **Add New Project**.
   - Import your GitHub repository.
   - Framework preset: **Vite**.
   - Before hitting Deploy, expand **Environment Variables** and enter the variables listed below.

3. **Configure Firebase Authorized Domains**:
   - Open your [Firebase Console](https://console.firebase.google.com).
   - Go to **Authentication** → **Settings** → **Authorized domains**.
   - Add your production Vercel domain (e.g. `truth-or-dare-xxx.vercel.app`) and your preview domain pattern if testing previews.

4. **Open and Install on your phone**:
   - Open the Vercel HTTPS URL in **Chrome** (Android) or **Safari** (iOS). *Do not open within Instagram or WhatsApp browsers.*
   - Install the PWA:
     - **Android**: Tap the Chrome menu (⋮) → **Install app** / **Add to Home screen**.
     - **iOS**: Tap the Safari Share icon (□↑) → **Add to Home Screen**.

---

## 🔑 Environment Variables (Section 5.11)

Only variables starting with `VITE_` reach the browser bundle. Server secrets are configured in Vercel project settings only.

### Client-Side Variables (Public in Vercel & `.env.local`):
| Variable | Description |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain (e.g., `<project-id>.firebaseapp.com`) |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Project ID |
| `VITE_FIREBASE_APP_ID` | Firebase Web App ID |
| `VITE_FEATURE_REMOTE_LIVE` | Feature flag for LiveKit video daring (`true` / `false`, default `false`) |

### Server-Only Secrets (Vercel Serverless Functions Only):
| Secret Name | Where Set | Notes |
|---|---|---|
| `FIREBASE_SERVICE_ACCOUNT_B64` | Vercel Environment | Base64-encoded Firebase Admin service account JSON |
| `GEMINI_API_KEY` | Vercel Environment | Google AI Studio Gemini API Key |
| `LIVEKIT_URL` | Vercel Environment | LiveKit Cloud WebSocket URL |
| `LIVEKIT_API_KEY` | Vercel Environment | LiveKit API Key |
| `LIVEKIT_API_SECRET` | Vercel Environment | LiveKit API Secret |
| `ALLOWED_ORIGIN` | Vercel Environment | Optional CORS origin (e.g. `https://your-app.vercel.app`) |

---

## 🛠️ Local Development & Scripts

- `npm run dev`: Starts Vite local development server on `http://localhost:5173`.
- `npm run build`: Production bundle and PWA service worker build.
- `npm run typecheck`: Runs `tsc --noEmit`.
- `npm run lint`: Runs ESLint flat config.
- `npm test`: Runs Vitest test suite.
- `/dev/kit`: Interactive design token & component gallery.
- `/dev/screens`: Responsive preview of all 16 static screens (360px, 390px, 430px).
