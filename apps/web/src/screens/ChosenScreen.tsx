import { Sparkles, Flame } from 'lucide-react';
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
      className="lamplit-backdrop mx-auto flex min-h-dvh w-full max-w-[430px] flex-col justify-between px-4 py-4"
      style={{
        paddingTop: 'calc(var(--safe-top) + 12px)',
        paddingBottom: 'calc(var(--safe-bottom) + 24px)',
      }}
    >
      <header className="flex items-center justify-between">
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

      <section className="my-auto flex flex-col items-center gap-5">
        <OwlMascot pose="judging" size="md" surface="lamplit" />

        {isPerformer ? (
          <div className="w-full space-y-4 text-center">
            <h1 className="font-display text-3xl font-bold text-[var(--color-cream)]">
              Your turn! Choose wisely
            </h1>
            <p className="text-xs text-[var(--color-lamplit-muted)]">
              Auto-selects Truth if timer runs out.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                disabled={pendingAction}
                data-testid="choose-truth-btn"
                onClick={() => void choosePromptKind('TRUTH')}
                className="flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-[18px] p-4 text-[var(--color-cream)] transition-transform active:scale-95 disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--color-truth-teal)',
                  border: '1px solid rgba(255,253,249,0.28)',
                  boxShadow: 'var(--shadow-sheet)',
                }}
              >
                <Sparkles className="h-7 w-7" aria-hidden="true" />
                <span className="font-display text-2xl font-bold">Truth</span>
              </button>

              <button
                type="button"
                disabled={pendingAction}
                data-testid="choose-dare-btn"
                onClick={() => void choosePromptKind('DARE')}
                className="flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-[18px] p-4 text-[var(--color-cream)] transition-transform active:scale-95 disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--color-dare-terracotta)',
                  border: '1px solid rgba(255,253,249,0.28)',
                  boxShadow: 'var(--shadow-sheet)',
                }}
              >
                <Flame className="h-7 w-7" aria-hidden="true" />
                <span className="font-display text-2xl font-bold">Dare</span>
              </button>
            </div>
          </div>
        ) : (
          <SurfaceCard surface="lamplit" className="w-full text-center">
            <p className="font-display text-2xl font-bold" aria-live="polite">
              {performer?.name ?? 'Player'} is choosing…
            </p>
            <p className="mt-1 text-xs text-[var(--color-lamplit-muted)]">
              Truth or Dare? Stay tuned.
            </p>
          </SurfaceCard>
        )}
      </section>

      <div className="h-6" />
    </main>
  );
}
