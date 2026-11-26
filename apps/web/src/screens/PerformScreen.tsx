import { Check, FastForward, Hourglass, RefreshCw } from 'lucide-react';
import { Button, ElapsedStopwatch, OwlMascot, SurfaceCard, SyncIndicator } from '../design';
import { useGameStore } from '../state/useGameStore';

export function PerformScreen() {
  const room = useGameStore((s) => s.room)!;
  const turn = useGameStore((s) => s.turn)!;
  const players = useGameStore((s) => s.players);
  const auth = useGameStore((s) => s.auth);
  const privatePrompt = useGameStore((s) => s.privatePrompt);
  const syncState = useGameStore((s) => s.syncState);
  const clockOffsetMs = useGameStore((s) => s.clockOffsetMs);
  const pendingAction = useGameStore((s) => s.pendingAction);
  const performDone = useGameStore((s) => s.performDone);
  const performSkip = useGameStore((s) => s.performSkip);
  const performSwap = useGameStore((s) => s.performSwap);
  const performStall = useGameStore((s) => s.performStall);

  const myUid = auth?.uid ?? '';
  const isPerformer = myUid === turn.performerUid;
  const performer = players.find((p) => p.uid === turn.performerUid);
  const me = players.find((p) => p.uid === myUid);
  const witnesses = players.filter(
    (p) => !p.banned && !p.spectator && p.uid !== turn.performerUid,
  );
  const hasPressedStall = turn.stallVotes.includes(myUid);
  const isDare = turn.kind === 'DARE';

  return (
    <main
      data-testid="perform-screen"
      className="lamplit-backdrop mx-auto flex min-h-dvh w-full max-w-[430px] flex-col justify-between px-4 py-4"
      style={{
        paddingTop: 'calc(var(--safe-top) + 12px)',
        paddingBottom: 'calc(var(--safe-bottom) + 24px)',
      }}
    >
      <header className="flex items-center justify-between gap-2">
        <ElapsedStopwatch
          startedAt={turn.startedAt}
          clockOffsetMs={clockOffsetMs}
          surface="lamplit"
        />
        <span className="tabular-nums text-xs font-semibold text-[var(--color-lamplit-muted)] uppercase">
          Round {room.round} / {room.totalRounds}
        </span>
        <SyncIndicator state={syncState} surface="lamplit" />
      </header>

      {isPerformer ? (
        <section className="my-auto flex flex-col gap-4">
          <SurfaceCard
            surface="linen"
            data-testid="unsealed-chit-card"
            className="space-y-3 text-center"
          >
            <div className="flex items-center justify-center gap-2">
              <span
                className="rounded-full px-3 py-1 text-xs font-bold tracking-wider text-[var(--color-cream)] uppercase"
                style={{
                  backgroundColor: isDare ? 'var(--color-dare-terracotta)' : 'var(--color-truth-teal)',
                }}
              >
                {turn.kind ?? 'TRUTH'}
              </span>
              {isDare && turn.dareType && (
                <span className="rounded-full border border-black/15 bg-[var(--color-linen)] px-2.5 py-1 text-xs font-semibold">
                  {turn.dareType}
                </span>
              )}
            </div>

            <p className="font-chit py-4 text-[22px] leading-snug text-[var(--color-ink)]">
              {privatePrompt?.text ?? 'Unsealing your prompt…'}
            </p>

            <p className="text-xs opacity-75">
              {isDare
                ? 'Complete the dare in front of the table, then tap Done.'
                : 'Answer aloud to the table, then tap Done.'}
            </p>
          </SurfaceCard>

          <Button
            variant={isDare ? 'primary-dare' : 'primary-truth'}
            fullWidth
            disabled={pendingAction}
            data-testid="perform-done-btn"
            onClick={() => void performDone()}
          >
            <Check className="h-5 w-5" aria-hidden="true" />
            Done
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              surface="lamplit"
              disabled={pendingAction || Boolean(me?.swapUsed)}
              data-testid="perform-swap-btn"
              onClick={() => void performSwap()}
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              {me?.swapUsed ? 'Swap Used' : 'Free Swap'}
            </Button>

            <Button
              variant="danger"
              disabled={pendingAction}
              data-testid="perform-skip-btn"
              onClick={() => void performSkip()}
            >
              <FastForward className="h-4 w-4" aria-hidden="true" />
              Skip (-30)
            </Button>
          </div>
        </section>
      ) : (
        <section className="my-auto flex flex-col items-center gap-5 text-center">
          <OwlMascot pose="idle" size="md" surface="lamplit" />
          <SurfaceCard surface="lamplit" className="w-full space-y-2">
            <h1 className="font-display text-2xl font-bold" aria-live="polite">
              {performer?.name ?? 'Player'} is unsealing a{' '}
              {turn.kind === 'DARE' ? 'Dare' : 'Truth'}…
            </h1>
            <p className="text-xs text-[var(--color-lamplit-muted)]">
              Watch closely — you&apos;ll vote once they finish.
            </p>
          </SurfaceCard>

          {!me?.spectator && (
            <Button
              variant="secondary"
              surface="lamplit"
              fullWidth
              disabled={hasPressedStall || pendingAction}
              data-testid="taking-too-long-btn"
              onClick={() => void performStall()}
            >
              <Hourglass className="h-4 w-4" aria-hidden="true" />
              {hasPressedStall
                ? `Stall Requested (${turn.stallVotes.length}/${witnesses.length})`
                : `Taking Too Long (${turn.stallVotes.length}/${witnesses.length})`}
            </Button>
          )}
        </section>
      )}

      <div className="h-4" />
    </main>
  );
}
