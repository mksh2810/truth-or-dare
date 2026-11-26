import { useEffect } from 'react';
import { ArrowRight, Trophy } from 'lucide-react';
import { Button, OwlMascot, SurfaceCard, SyncIndicator, TimerRing, WaxSeal, playStampSound } from '../design';
import { useGameStore } from '../state/useGameStore';

export function ResultScreen() {
  const room = useGameStore((s) => s.room)!;
  const turn = useGameStore((s) => s.turn)!;
  const players = useGameStore((s) => s.players);
  const syncState = useGameStore((s) => s.syncState);
  const clockOffsetMs = useGameStore((s) => s.clockOffsetMs);
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const advanceTurn = useGameStore((s) => s.advanceTurn);

  const stamp = turn.resultStamp ?? 'PASSED';
  const delta = turn.sessionScoreDelta ?? 0;
  const performer = players.find((p) => p.uid === turn.performerUid);
  const isFinalRound = room.round >= room.totalRounds;

  useEffect(() => {
    playStampSound(soundEnabled, stamp === 'PASSED' || stamp === 'SPLIT');
  }, [soundEnabled, stamp, room.turnVersion]);

  const owlPose =
    stamp === 'PASSED' ? 'approve' : stamp === 'SPLIT' ? 'roast' : 'disapprove';

  const deltaLabel = delta > 0 ? `+${delta} pts` : `${delta} pts`;
  const deltaColor =
    delta > 0
      ? 'var(--color-sage-text)'
      : delta < 0
        ? 'var(--color-brick)'
        : 'var(--color-brass-text)';

  return (
    <main
      data-testid="result-screen"
      className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col justify-between px-4 py-4"
      style={{
        paddingTop: 'calc(var(--safe-top) + 12px)',
        paddingBottom: 'calc(var(--safe-bottom) + 24px)',
      }}
    >
      <header className="flex items-center justify-between gap-2">
        <TimerRing
          deadlineAt={turn.deadlineAt}
          totalSec={6}
          clockOffsetMs={clockOffsetMs}
          onExpire={() => void advanceTurn()}
        />
        <span className="tabular-nums text-xs font-semibold uppercase opacity-75">
          Round {room.round} / {room.totalRounds}
        </span>
        <SyncIndicator state={syncState} />
      </header>

      <section
        aria-live="polite"
        aria-label={`Result: ${stamp}, ${deltaLabel}`}
        className="my-auto flex flex-col items-center gap-5 text-center"
      >
        <WaxSeal stamp={stamp} size="lg" />

        <SurfaceCard className="w-full space-y-2">
          <p className="text-sm font-semibold opacity-75">{performer?.name ?? 'Player'}</p>
          <p
            data-testid="result-score-delta"
            className="tabular-nums font-display text-3xl font-bold"
            style={{ color: deltaColor }}
          >
            {deltaLabel}
          </p>
        </SurfaceCard>

        <OwlMascot
          pose={owlPose}
          size="md"
          line={turn.owlLine || 'The Owl has recorded your fate.'}
        />
      </section>

      <Button
        variant="primary-dare"
        fullWidth
        data-testid="result-next-btn"
        onClick={() => void advanceTurn()}
      >
        {isFinalRound ? (
          <>
            <Trophy className="h-5 w-5" aria-hidden="true" />
            View Summary &amp; Podium
          </>
        ) : (
          <>
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
            Next Turn
          </>
        )}
      </Button>
    </main>
  );
}
