import { Suspense, lazy, useState } from 'react';
import { Plus, Users } from 'lucide-react';
import { signInWithGoogle } from '../auth/firebase';
import { MainButton, OwlMark, Seal, TopBar, getPlayerInitials } from '../design/VowletUiPrimitives';
import { useGameStore } from '../state/useGameStore';

const ProfileSettingsSheet = lazy(() =>
  import('./ProfileSettingsSheet').then((m) => ({ default: m.ProfileSettingsSheet })),
);

export function HomeScreen() {
  const auth = useGameStore((s) => s.auth);
  const setAuth = useGameStore((s) => s.setAuth);
  const level = useGameStore((s) => s.level);
  const lifetimeXp = useGameStore((s) => s.lifetimeXp);
  const displayName = useGameStore((s) => s.displayName);
  const setRoute = useGameStore((s) => s.setRoute);
  const setPrefillPackId = useGameStore((s) => s.setPrefillPackId);
  const showToast = useGameStore((s) => s.showToast);

  const [settingsOpen, setSettingsOpen] = useState(false);

  const isSignedIn = Boolean(auth && !auth.isAnonymous);
  const initial = getPlayerInitials(auth?.displayName || displayName || 'Y');

  const handleSignIn = async () => {
    try {
      const profile = await signInWithGoogle();
      setAuth(profile);
      showToast('Signed in! Progress saved.', 'success');
    } catch {
      showToast('Sign-in cancelled or unavailable.', 'error');
    }
  };

  return (
    <main className="vowlet-shell" data-testid="home-screen">
      <div className="home-screen parchment">
        <TopBar onSettings={() => setSettingsOpen(true)} />

        <div className="home-art">
          <div className="sun-disc" aria-hidden="true" />
          <OwlMark />
          <div className="sprig sprig-left" aria-hidden="true">
            ❧
          </div>
          <div className="sprig sprig-right" aria-hidden="true">
            ❧
          </div>
        </div>

        <h1 className="home-title">VOWLET</h1>
        <div className="home-kicker">— THE EVENING TABLE —</div>
        <p className="tagline">
          Spin into secrets.
          <br />
          Stay for the stories.
        </p>

        <div className="home-actions">
          <MainButton
            data-testid="create-table-nav"
            onClick={() => {
              setPrefillPackId(null);
              setRoute('CREATE');
            }}
          >
            <Users size={17} aria-hidden="true" /> Create a Table
          </MainButton>

          <MainButton
            secondary
            data-testid="join-table-nav"
            onClick={() => setRoute('JOIN')}
          >
            <Plus size={17} aria-hidden="true" /> Join a Table
          </MainButton>
        </div>

        {isSignedIn ? (
          <div className="profile-strip" data-testid="level-chip">
            <span className="mini-avatar" aria-hidden="true">
              {initial}
            </span>
            <span>
              <b>Level {level}</b>
              <small>{lifetimeXp.toLocaleString()} XP</small>
            </span>
            <Seal>✦</Seal>
          </div>
        ) : (
          <button
            type="button"
            className="profile-strip w-[calc(100%-36px)] text-left"
            data-testid="guest-signin-btn"
            onClick={() => void handleSignIn()}
          >
            <span className="mini-avatar" aria-hidden="true">
              {initial}
            </span>
            <span>
              <b>Sign in to keep progress</b>
              <small>Save XP, skins &amp; tables</small>
            </span>
            <Seal>✦</Seal>
          </button>
        )}
      </div>

      {settingsOpen && (
        <Suspense fallback={null}>
          <ProfileSettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        </Suspense>
      )}
    </main>
  );
}
