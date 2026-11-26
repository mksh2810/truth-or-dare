import { Feather, Flame, Sparkles } from 'lucide-react';
import { OwlMascot, SurfaceCard, SyncIndicator, TimerRing } from '../design';
import { useGameStore } from '../state/useGameStore';

export function ChosenScreen() {
  const room = useGameStore((s) => s.room)!;
  const turn = useGameStore((s) => s.turn)!;
  const players = useGameStore((s) => s.players);
  const auth = useGameStore((s) => s.auth);
  const syncState = useGameStore((s) => s.syncState);
  const clockOffsetMs = useGameStore((s) => s.clockOffsetMs);
  const choosePromptKind = useGameStore((s) => s.choosePromptKind);
  const advanceTurn = useGameStore((s) => s.advanceTurn);
  const pendingAction = useGameStore((s) => s.pendingAction);

  const isPerformer = auth?.uid === turn.performerUid;
  const performer = players.find((p) => p.uid === turn.performerUid);

  return (
    <main
      data-testid="chosen-screen"
      className="lamplit-backdrop relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col justify-between overflow-hidden px-4 py-4"
      style={{
        paddingTop: 'calc(var(--safe-top) + 12px)',
        paddingBottom: 'calc(var(--safe-bottom) + 24px)',
      }}
    >
      {/* Subtle Golden Sparkles */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden opacity-45">
        <Sparkles className="absolute top-24 left-8 h-4 w-4 text-[#F4C97A]" />
        <Sparkles className="absolute top-32 right-10 h-5 w-5 text-[#F4C97A]" />
        <Sparkles className="absolute bottom-28 left-12 h-3.5 w-3.5 text-[#F4C97A]" />
      </div>

      <header className="relative z-10 flex items-center justify-between">
        <TimerRing
          deadlineAt={turn.deadlineAt}
          totalSec={room.settings.chooseDeadlineSec}
          clockOffsetMs={clockOffsetMs}
          surface="lamplit"
          onExpire={() => void advanceTurn()}
        />
        <span className="tabular-nums text-xs font-semibold text-[var(--color-lamplit-muted)] uppercase">
          Round {room.round} / {room.totalRounds}
        </span>
        <SyncIndicator state={syncState} surface="lamplit" />
      </header>

      <section className="relative z-10 my-auto flex flex-col items-center gap-5">
        {isPerformer ? (
          <div className="w-full space-y-5 text-center">
            <div>
              <h1 className="font-display text-3xl font-bold text-[var(--color-cream)]">
                You&apos;ve been chosen!
              </h1>
              <p className="mt-1 text-xs text-[var(--color-lamplit-muted)]">
                Auto-selects Truth if timer runs out.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3.5 pt-1">
              {/* Ornate Double-Gold-Bordered TRUTH Card */}
              <button
                type="button"
                disabled={pendingAction}
                data-testid="choose-truth-btn"
                onClick={() => void choosePromptKind('TRUTH')}
                className="relative flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-[18px] p-4 text-[var(--color-cream)] transition-transform active:scale-95 disabled:opacity-50"
                style={{
                  background: 'linear-gradient(165deg, #2E5E6B 0%, #193A44 100%)',
                  border: '2px solid #C99B48',
                  boxShadow: '0 12px 28px rgba(0, 0, 0, 0.55), inset 0 0 20px rgba(244, 201, 122, 0.12)',
                }}
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-2 rounded-[12px] border border-[#F4C97A]/45"
                />
                <Feather className="h-10 w-10 text-[#F4C97A]" aria-hidden="true" />
                <span className="font-display text-2xl font-bold tracking-wider uppercase">
                  TRUTH
                </span>
                <span className="max-w-[120px] text-xs leading-snug text-[#FFFDF9]/85">
                  Reveal what lies beneath.
                </span>
              </button>

              {/* Ornate Double-Gold-Bordered DARE Card */}
              <button
                type="button"
                disabled={pendingAction}
                data-testid="choose-dare-btn"
                onClick={() => void choosePromptKind('DARE')}
                className="relative flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-[18px] p-4 text-[var(--color-cream)] transition-transform active:scale-95 disabled:opacity-50"
                style={{
                  background: 'linear-gradient(165deg, #C4552D 0%, #8C3315 100%)',
                  border: '2px solid #C99B48',
                  boxShadow: '0 12px 28px rgba(0, 0, 0, 0.55), inset 0 0 20px rgba(244, 201, 122, 0.12)',
                }}
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-2 rounded-[12px] border border-[#F4C97A]/45"
                />
                <Flame className="h-10 w-10 text-[#F4C97A]" aria-hidden="true" />
                <span className="font-display text-2xl font-bold tracking-wider uppercase">
                  DARE
                </span>
                <span className="max-w-[120px] text-xs leading-snug text-[#FFFDF9]/85">
                  Make the evening memorable.
                </span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex w-full flex-col items-center gap-5">
            <OwlMascot pose="judging" size="md" surface="lamplit" />
            <SurfaceCard surface="lamplit" className="w-full text-center">
              <p className="font-display text-2xl font-bold" aria-live="polite">
                {performer?.name ?? 'Player'} is choosing…
              </p>
              <p className="mt-1 text-xs text-[var(--color-lamplit-muted)]">
                Truth or Dare? Stay tuned.
              </p>
            </SurfaceCard>
          </div>
        )}
      </section>

      <div className="h-6" />
    </main>
  );
}
