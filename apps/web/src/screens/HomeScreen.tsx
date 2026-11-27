import { Suspense, lazy, useState } from 'react';
import { Crown, Plus, Settings, Users } from 'lucide-react';
import { signInWithGoogle } from '../auth/firebase';
import {
  BotanicalLayer,
  OwlArtwork,
  PlayerAvatarArtwork,
  WaxSealArtwork,
} from '../design/VowletUiPrimitives';
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
  const playerName = auth?.displayName || displayName || 'Guest';

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
      <div className="bg-parchment flex min-h-dvh flex-col justify-between pb-5">
        <BotanicalLayer />

        {/* Top Bar: Settings Gear + Gold Crown */}
        <header className="relative z-10 flex items-center justify-between px-4 pt-2">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
            data-testid="settings-btn"
            className="grid min-h-[44px] min-w-[44px] place-items-center rounded-full border border-[#b88c58]/35 bg-[#fff8eb]/70 text-[#3c2718] shadow-sm"
          >
            <Settings size={19} aria-hidden="true" />
          </button>

          <span className="font-cinzel text-[11px] font-bold tracking-[0.28em] text-[#5e4430]">
            VOWLET
          </span>

          <div
            aria-hidden="true"
            className="grid min-h-[44px] min-w-[44px] place-items-center rounded-full border border-[#d9b061]/45 bg-[#fff8eb]/70 text-[#8a6420] shadow-sm"
          >
            <Crown size={19} />
          </div>
        </header>

        {/* Arched Owl Hero */}
        <section className="relative z-10 flex flex-col items-center px-6 pt-1 text-center">
          <div className="relative flex h-[210px] w-[210px] items-center justify-center rounded-t-full border border-[#c59855]/45 bg-gradient-to-b from-[#fff8ea]/90 via-[#f6e8cf]/65 to-transparent shadow-[inset_0_1px_12px_rgba(255,255,255,0.75)]">
            <div className="pointer-events-none absolute inset-2 rounded-t-full border border-[#d9b061]/30" />
            <OwlArtwork className="h-[195px] w-[195px] drop-shadow-[0_10px_14px_rgba(45,27,13,0.2)]" />
          </div>

          <h1 className="font-playfair mt-2 text-[38px] leading-none font-bold tracking-tight text-[#2b1d12] italic">
            Vowlet
          </h1>
          <div className="font-cinzel mt-1.5 text-[11px] font-bold tracking-[0.32em] text-[#6d4e31]">
            EVENING TABLE
          </div>
          <p className="font-cormorant mt-2 text-[20px] leading-snug font-semibold text-[#3c2818] italic">
            A little truth, a little trouble.
          </p>

          {/* Ornate Diamond Flourish */}
          <div className="my-2 flex w-44 items-center justify-center gap-2 text-[#9c7228]" aria-hidden="true">
            <span className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-[#b8893b]" />
            <span className="text-[11px]">✦ ◆ ✦</span>
            <span className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-[#b8893b]" />
          </div>
        </section>

        {/* Primary Action Stack */}
        <section className="relative z-10 mt-auto flex flex-col gap-3 px-6 pb-3">
          <button
            type="button"
            className="btn-teal w-full"
            data-testid="create-table-nav"
            onClick={() => {
              setPrefillPackId(null);
              setRoute('CREATE');
            }}
          >
            <Users size={18} aria-hidden="true" />
            <span>Create a Table</span>
          </button>

          <button
            type="button"
            className="btn-parchment w-full"
            data-testid="join-table-nav"
            onClick={() => setRoute('JOIN')}
          >
            <Plus size={18} aria-hidden="true" />
            <span>Join a Table</span>
          </button>
        </section>

        {/* Bottom Dark Wooden Profile Card */}
        <footer className="relative z-10 px-5">
          {isSignedIn ? (
            <div
              data-testid="level-chip"
              className="flex min-h-[64px] items-center gap-3 rounded-2xl border border-[#b8893b]/70 bg-gradient-to-r from-[#3a2314] via-[#4b2e1b] to-[#321e11] px-3.5 py-2.5 text-[#faeed7] shadow-[0_8px_18px_rgba(24,14,8,0.28)]"
            >
              <PlayerAvatarArtwork name={playerName} size={42} className="shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="font-cinzel text-sm font-bold tracking-wide text-[#f7dca4]">
                  Lv. {level}
                </div>
                <div className="truncate text-xs text-[#e8d4b7]">
                  {playerName} • {lifetimeXp.toLocaleString()} XP
                </div>
              </div>
              <WaxSealArtwork color="red" icon="emblem" size={44} className="shrink-0" />
            </div>
          ) : (
            <button
              type="button"
              data-testid="guest-signin-btn"
              onClick={() => void handleSignIn()}
              className="flex min-h-[64px] w-full items-center gap-3 rounded-2xl border border-[#b8893b]/70 bg-gradient-to-r from-[#3a2314] via-[#4b2e1b] to-[#321e11] px-3.5 py-2.5 text-left text-[#faeed7] shadow-[0_8px_18px_rgba(24,14,8,0.28)]"
            >
              <PlayerAvatarArtwork name={playerName} size={42} className="shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="font-cormorant text-[17px] leading-tight font-bold text-[#f9e5be]">
                  Sign in to keep progress
                </div>
                <div className="text-xs text-[#e2cba8]">Save XP, bottle skins &amp; tables</div>
              </div>
              <WaxSealArtwork color="red" icon="emblem" size={44} className="shrink-0" />
            </button>
          )}
        </footer>
      </div>

      {settingsOpen && (
        <Suspense fallback={null}>
          <ProfileSettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        </Suspense>
      )}
    </main>
  );
}
