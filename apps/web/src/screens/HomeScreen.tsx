import { useState } from 'react';
import { Award, LogIn, Plus, Settings, Users } from 'lucide-react';
import { Button, OwlMascot, VowletWordmark } from '../design';
import { signInWithGoogle } from '../auth/firebase';
import { useGameStore } from '../state/useGameStore';
import { ProfileSettingsSheet } from './ProfileSettingsSheet';

export function HomeScreen() {
  const auth = useGameStore((s) => s.auth);
  const setAuth = useGameStore((s) => s.setAuth);
  const level = useGameStore((s) => s.level);
  const setRoute = useGameStore((s) => s.setRoute);
  const showToast = useGameStore((s) => s.showToast);

  const [settingsOpen, setSettingsOpen] = useState(false);

  const isSignedIn = Boolean(auth && !auth.isAnonymous);

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
    <main
      data-testid="home-screen"
      className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col justify-between px-4 py-5"
      style={{
        paddingTop: 'calc(var(--safe-top) + 16px)',
        paddingBottom: 'calc(var(--safe-bottom) + 24px)',
      }}
    >
      {/* Top Utility Bar (No bottom nav) */}
      <header className="flex items-center justify-between gap-2">
        {isSignedIn ? (
          <span
            data-testid="level-chip"
            className="inline-flex min-h-[44px] items-center gap-1.5 px-3 py-1.5 text-xs font-bold"
            style={{
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'var(--color-cream)',
              color: 'var(--color-brass-text)',
              border: 'var(--border-ink-hairline)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <Award className="h-4 w-4" aria-hidden="true" />
            <span>Level {level}</span>
          </span>
        ) : (
          <button
            type="button"
            data-testid="guest-signin-btn"
            onClick={() => void handleSignIn()}
            className="inline-flex min-h-[44px] items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[var(--color-truth-teal)] underline"
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            <span>Sign in to keep progress</span>
          </button>
        )}

        <button
          type="button"
          aria-label="Settings"
          data-testid="settings-btn"
          onClick={() => setSettingsOpen(true)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/15 bg-[var(--color-cream)]"
          style={{ boxShadow: 'var(--shadow-card)' }}
        >
          <Settings className="h-5 w-5" aria-hidden="true" />
        </button>
      </header>

      {/* Centerpiece */}
      <section className="my-auto flex flex-col items-center gap-4 py-6 text-center">
        <OwlMascot pose="idle" size="lg" />
        <VowletWordmark />
      </section>

      {/* Primary CTAs */}
      <section className="flex flex-col gap-3">
        <Button
          variant="primary-dare"
          fullWidth
          data-testid="create-table-nav"
          onClick={() => setRoute('CREATE')}
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
          Create Table
        </Button>

        <Button
          variant="secondary"
          fullWidth
          data-testid="join-table-nav"
          onClick={() => setRoute('JOIN')}
        >
          <Users className="h-5 w-5" aria-hidden="true" />
          Join Table
        </Button>
      </section>

      <ProfileSettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </main>
  );
}
