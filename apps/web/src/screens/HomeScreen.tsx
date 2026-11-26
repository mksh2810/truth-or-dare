import { Suspense, lazy, useState } from 'react';
import {
  ArrowRight,
  Award,
  Bookmark,
  ChevronRight,
  Crown,
  LogIn,
  Settings,
  Users,
} from 'lucide-react';
import type { PackId } from '@vowlet/shared';
import {
  MistyTowerSilhouette,
  OwlMascot,
  SmallRedWaxSeal,
  SurfaceCard,
  VowletWordmark,
} from '../design';
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
  const [quickJoinOpen, setQuickJoinOpen] = useState(false);
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
      className="linen-backdrop relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col justify-between overflow-hidden px-5 py-4"
      style={{
        paddingTop: 'calc(var(--safe-top) + 14px)',
        paddingBottom: 'calc(var(--safe-bottom) + 18px)',
      }}
    >
      <MistyTowerSilhouette />

      {/* Top Utility Bar: Settings gear left, Crown right */}
      <header className="relative z-10 flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="Settings"
          data-testid="settings-btn"
          onClick={() => setSettingsOpen(true)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#8A6420]/25 bg-[var(--color-cream)] text-[var(--color-ink)]"
          style={{ boxShadow: 'var(--shadow-card)' }}
        >
          <Settings className="h-5 w-5" aria-hidden="true" />
        </button>

        <button
          type="button"
          aria-label="Quick Join & Occasion Packs"
          onClick={() => setQuickJoinOpen((v) => !v)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#8A6420]/30 bg-[var(--color-cream)] text-[var(--color-brass-text)]"
          style={{ boxShadow: 'var(--shadow-card)' }}
        >
          <Crown className="h-5 w-5" aria-hidden="true" />
        </button>
      </header>

      {/* Centerpiece: Owl on Book + Wordmark */}
      <section className="relative z-10 my-auto flex flex-col items-center gap-2 py-2 text-center">
        <OwlMascot pose="idle" size="xl" perchedOnBook />
        <VowletWordmark showEveningTable showTagline />
      </section>

      {/* Primary CTAs + Bottom Ornate Level Bar */}
      <section className="relative z-10 flex flex-col gap-3">
        {/* Truth Teal Create a Table button with inner hairline border */}
        <button
          type="button"
          data-testid="create-table-nav"
          onClick={() => {
            setPrefillPackId(null);
            setRoute('CREATE');
          }}
          className="relative flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-[16px] px-5 py-3 text-base font-semibold text-[var(--color-cream)] transition-transform active:scale-[0.98]"
          style={{
            background: 'linear-gradient(180deg, #336775 0%, #244C57 100%)',
            border: '1px solid rgba(35, 32, 28, 0.35)',
            boxShadow: '0 4px 14px rgba(35, 32, 28, 0.22)',
          }}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-[3px] rounded-[13px] border border-[#FFFDF9]/25"
          />
          <Users className="h-5 w-5" aria-hidden="true" />
          <span>Create a Table</span>
        </button>

        {/* Cream Join a Table button */}
        <button
          type="button"
          data-testid="join-table-nav"
          onClick={() => setRoute('JOIN')}
          className="relative flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-[16px] px-5 py-3 text-base font-semibold text-[var(--color-ink)] transition-transform active:scale-[0.98]"
          style={{
            background: 'linear-gradient(180deg, #FFFDF9 0%, #F2E7D3 100%)',
            border: '1px solid rgba(138, 100, 32, 0.32)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-[3px] rounded-[13px] border border-[#8A6420]/20"
          />
          <LogIn className="h-5 w-5" aria-hidden="true" />
          <span>Join a Table</span>
        </button>

        {/* Compact Quick-Join + Occasion Packs (expandable or directly accessible) */}
        {quickJoinOpen && (
          <div className="space-y-2.5 pt-1">
            <form
              onSubmit={handleQuickJoin}
              data-testid="quick-join-form"
              className="flex items-center gap-2 rounded-[14px] border border-[#8A6420]/25 bg-[var(--color-cream)] p-1.5"
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
                className="min-h-[44px] min-w-0 flex-1 rounded-[10px] bg-transparent px-3 text-sm font-bold tracking-[0.18em] uppercase placeholder:tracking-normal placeholder:font-normal"
              />
              <button
                type="submit"
                data-testid="quick-join-submit"
                className="inline-flex min-h-[44px] items-center gap-1 rounded-[10px] bg-[var(--color-truth-teal)] px-4 text-xs font-bold text-[var(--color-cream)]"
              >
                Join
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </form>

            <div
              aria-label="Occasion packs"
              data-testid="occasion-pack-badges"
              className="flex flex-wrap justify-center gap-1.5"
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
                  className="min-h-[36px] rounded-full border border-[#8A6420]/25 bg-[var(--color-cream)] px-3 py-1 text-xs font-semibold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-ink)] hover:text-[var(--color-cream)]"
                >
                  {pack.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Saved tables for signed-in users */}
        {isSignedIn && savedTables.length > 0 && (
          <SurfaceCard data-testid="home-saved-tables" className="space-y-1.5">
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

        {/* Bottom Ornate Bronze/Wood Level Bar with Red Wax Seal */}
        <div className="relative mt-1 flex items-center pr-3">
          {isSignedIn ? (
            <div
              data-testid="level-chip"
              className="flex min-h-[54px] w-full items-center justify-between rounded-[14px] px-4 py-2 pr-11 text-[var(--color-cream)]"
              style={{
                background: 'linear-gradient(135deg, #6E492D 0%, #412817 100%)',
                border: '1.5px solid #B8893B',
                boxShadow: '0 6px 18px rgba(35, 32, 28, 0.28)',
              }}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#F4C97A]/40 bg-[#2C1B0E] text-[#F4C97A]">
                  <Award className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="text-left">
                  <p className="font-display text-base font-bold leading-tight text-[#FFFDF9]">
                    Lv. {level}
                  </p>
                  <p className="text-[11px] text-[#F4C97A]">Evening Table Regular</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-[#F4C97A]" aria-hidden="true" />
            </div>
          ) : (
            <button
              type="button"
              data-testid="guest-signin-btn"
              onClick={() => void handleSignIn()}
              className="flex min-h-[54px] w-full items-center justify-between rounded-[14px] px-4 py-2 pr-11 text-left text-[var(--color-cream)] transition-transform active:scale-[0.99]"
              style={{
                background: 'linear-gradient(135deg, #6E492D 0%, #412817 100%)',
                border: '1.5px solid #B8893B',
                boxShadow: '0 6px 18px rgba(35, 32, 28, 0.28)',
              }}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#F4C97A]/40 bg-[#2C1B0E] text-[#F4C97A]">
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-display text-base font-bold leading-tight text-[#FFFDF9]">
                    Sign in to keep progress
                  </p>
                  <p className="text-[11px] text-[#F4C97A]">Save XP, skins &amp; tables</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-[#F4C97A]" aria-hidden="true" />
            </button>
          )}

          <SmallRedWaxSeal size={48} className="pointer-events-none absolute right-0" />
        </div>
      </section>

      {settingsOpen && (
        <Suspense fallback={null}>
          <ProfileSettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        </Suspense>
      )}
    </main>
  );
}
