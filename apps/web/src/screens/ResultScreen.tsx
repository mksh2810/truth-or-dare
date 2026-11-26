import { useEffect } from 'react';
import { ArrowRight, Flame, Trophy } from 'lucide-react';
import {
  BotanicalCorners,
  LaurelWreath,
  OwlMascot,
  SyncIndicator,
  TimerRing,
  WaxSeal,
  playStampSound,
} from '../design';
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
      className="linen-backdrop relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col justify-between overflow-hidden px-4 py-4"
      style={{
        paddingTop: 'calc(var(--safe-top) + 12px)',
        paddingBottom: 'calc(var(--safe-bottom) + 24px)',
      }}
    >
      <BotanicalCorners surface="linen" />

      <header className="relative z-10 flex items-center justify-between gap-2">
        <TimerRing
          deadlineAt={turn.deadlineAt}
          totalSec={6}
          clockOffsetMs={clockOffsetMs}
          size={48}
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
        className="relative z-10 my-auto flex flex-col items-center gap-4 text-center"
      >
        <LaurelWreath>
          <WaxSeal stamp={stamp} size="lg" />
        </LaurelWreath>

        <div className="space-y-1.5">
          <p className="text-sm font-semibold opacity-75">{performer?.name ?? 'Player'}</p>
          <p
            data-testid="result-score-delta"
            className="tabular-nums font-display text-4xl font-bold"
            style={{ color: deltaColor }}
          >
            {deltaLabel}
          </p>

          {(performer?.streak ?? 0) > 0 && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#8A6420]/30 bg-[var(--color-cream)] px-3.5 py-1 text-xs font-bold text-[var(--color-terracotta-text)] shadow-sm">
              <Flame className="h-3.5 w-3.5 text-[var(--color-dare-terracotta)]" aria-hidden="true" />
              <span>Streak +{performer?.streak}</span>
            </div>
          )}
        </div>

        {/* Vowlet Owl bottom-left + Cream Speech Bubble */}
        <div className="mt-2 flex w-full items-end gap-3 px-1 text-left">
          <OwlMascot pose={owlPose} size="md" className="shrink-0" />
          <div
            className="relative flex-1 rounded-[18px] border border-[#8A6420]/25 bg-[var(--color-cream)] px-4 py-3 text-sm font-medium text-[var(--color-ink)]"
            style={{ boxShadow: 'var(--shadow-card)' }}
          >
            <p className="font-display text-base font-semibold italic leading-snug">
              “{turn.owlLine || 'The Owl has recorded your fate.'}”
            </p>
          </div>
        </div>
      </section>

      <button
        type="button"
        data-testid="result-next-btn"
        onClick={() => void advanceTurn()}
        className="relative z-10 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[16px] px-5 py-3 text-base font-bold text-[var(--color-cream)] transition-transform active:scale-[0.98]"
        style={{
          background: 'linear-gradient(180deg, #336775 0%, #244C57 100%)',
          border: '1px solid rgba(35, 32, 28, 0.35)',
          boxShadow: '0 4px 14px rgba(35, 32, 28, 0.24)',
        }}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-[3px] rounded-[13px] border border-[#FFFDF9]/25"
        />
        {isFinalRound ? (
          <>
            <Trophy className="h-5 w-5" aria-hidden="true" />
            <span>View Summary &amp; Podium</span>
          </>
        ) : (
          <>
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
            <span>Next Turn</span>
          </>
        )}
      </button>
    </main>
  );
}
