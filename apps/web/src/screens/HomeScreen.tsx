import { Suspense, lazy, useState } from 'react';
import { ArrowRight, Award, Bookmark, LogIn, Plus, Settings, Users } from 'lucide-react';
import type { PackId } from '@vowlet/shared';
import { Button, OwlMascot, SurfaceCard, VowletWordmark } from '../design';
import { signInWithGoogle } from '../auth/firebase';
import { useGameStore } from '../state/useGameStore';

const ProfileSettingsSheet = lazy(() =>
  import('./ProfileSettingsSheet').then((m) => ({ default: m.ProfileSettingsSheet })),
);

const OCCASION_PACKS: Array<{ key: string; label: string; packId: PackId }> = [
  { key: 'friends', label: 'Friends', packId: 'friends' },
  { key: 'couples', label: 'Couples', packId: 'couples' },
  { key: 'office', label: 'Office', packId: 'office-safe' },
  { key: 'trip', label: 'Trip', packId: 'trip' },
  { key: 'hinglish', label: 'Hinglish', packId: 'hinglish-special' },
];

export function HomeScreen() {
  const auth = useGameStore((s) => s.auth);
  const setAuth = useGameStore((s) => s.setAuth);
  const level = useGameStore((s) => s.level);
  const savedTables = useGameStore((s) => s.savedTables);
  const setRoute = useGameStore((s) => s.setRoute);
  const setPrefillPackId = useGameStore((s) => s.setPrefillPackId);
  const showToast = useGameStore((s) => s.showToast);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [quickCode, setQuickCode] = useState('');

  const isSignedIn = Boolean(auth && !auth.isAnonymous);

  const handleQuickJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = quickCode.trim().toUpperCase();
    if (cleaned.length < 4) {
      showToast('Enter a 6-character table code.', 'error');
      return;
    }
    setRoute('JOIN', cleaned);
  };

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
      <section className="my-auto flex flex-col items-center gap-3 py-4 text-center">
        <OwlMascot pose="idle" size="lg" />
        <VowletWordmark />
        <p className="max-w-[300px] text-xs leading-relaxed opacity-80">
          In-person Truth or Dare for 3–8 friends. Pass the bottle, seal your chits, let the Owl judge.
        </p>

        {/* Occasion Pack Badges (B8) */}
        <div
          aria-label="Occasion packs"
          data-testid="occasion-pack-badges"
          className="flex flex-wrap justify-center gap-1.5 pt-1"
        >
          {OCCASION_PACKS.map((pack) => (
            <button
              key={pack.key}
              type="button"
              data-testid={`pack-badge-${pack.key}`}
              onClick={() => {
                setPrefillPackId(pack.packId);
                setRoute('CREATE');
              }}
              className="min-h-[36px] rounded-full border border-black/15 bg-[var(--color-cream)] px-3 py-1 text-xs font-semibold transition-colors hover:bg-[var(--color-ink)] hover:text-[var(--color-cream)]"
            >
              {pack.label}
            </button>
          ))}
        </div>
      </section>

      {/* Quick Join-by-Code + Primary CTAs */}
      <section className="flex flex-col gap-3">
        <form
          onSubmit={handleQuickJoin}
          data-testid="quick-join-form"
          className="flex items-center gap-2 rounded-[16px] border border-black/15 bg-[var(--color-cream)] p-1.5"
          style={{ boxShadow: 'var(--shadow-card)' }}
        >
          <input
            type="text"
            inputMode="text"
            maxLength={6}
            value={quickCode}
            onChange={(e) => setQuickCode(e.target.value.toUpperCase())}
            placeholder="TABLE CODE"
            aria-label="Quick join by 6-character table code"
            data-testid="quick-join-code-input"
            className="min-h-[44px] min-w-0 flex-1 rounded-[12px] bg-transparent px-3 text-sm font-bold tracking-[0.18em] uppercase placeholder:tracking-normal placeholder:font-normal"
          />
          <button
            type="submit"
            data-testid="quick-join-submit"
            className="inline-flex min-h-[44px] items-center gap-1 rounded-[12px] bg-[var(--color-truth-teal)] px-4 text-xs font-bold text-[var(--color-cream)]"
          >
            Join
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </form>

        <Button
          variant="primary-dare"
          fullWidth
          data-testid="create-table-nav"
          onClick={() => {
            setPrefillPackId(null);
            setRoute('CREATE');
          }}
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

        {isSignedIn && savedTables.length > 0 && (
          <SurfaceCard data-testid="home-saved-tables" className="mt-1 space-y-1.5">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider opacity-75">
              <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
              Saved Tables
            </p>
            {savedTables.slice(0, 3).map((entry) => (
              <div
                key={`${entry.code}-${entry.dateIso}`}
                className="flex items-center justify-between text-xs"
              >
                <span>
                  <strong>{entry.code}</strong> • {entry.winnerName}
                </span>
                <span className="tabular-nums font-bold text-[var(--color-brass-text)]">
                  {entry.myScore} pts
                </span>
              </div>
            ))}
          </SurfaceCard>
        )}
      </section>

      {settingsOpen && (
        <Suspense fallback={null}>
          <ProfileSettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        </Suspense>
      )}
    </main>
  );
}
