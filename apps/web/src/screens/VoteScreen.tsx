import { Check, Users, X } from 'lucide-react';
import { OwlMascot, SurfaceCard, SyncIndicator, TimerRing } from '../design';
import { useGameStore } from '../state/useGameStore';

export function VoteScreen() {
  const room = useGameStore((s) => s.room)!;
  const turn = useGameStore((s) => s.turn)!;
  const players = useGameStore((s) => s.players);
  const votes = useGameStore((s) => s.votes);
  const auth = useGameStore((s) => s.auth);
  const syncState = useGameStore((s) => s.syncState);
  const clockOffsetMs = useGameStore((s) => s.clockOffsetMs);
  const castVote = useGameStore((s) => s.castVote);
  const advanceTurn = useGameStore((s) => s.advanceTurn);

  const myUid = auth?.uid ?? '';
  const isPerformer = myUid === turn.performerUid;
  const me = players.find((p) => p.uid === myUid);
  const performer = players.find((p) => p.uid === turn.performerUid);
  const witnesses = players.filter(
    (p) => !p.banned && !p.spectator && p.uid !== turn.performerUid,
  );

  // Only count votes for current turnVersion (never reveal who voted how)
  const currentVotes = votes.filter((v) => v.turnVersion === room.turnVersion);
  const myVote = currentVotes.find((v) => v.uid === myUid);

  return (
    <main
      data-testid="vote-screen"
      className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col justify-between px-4 py-4"
      style={{
        paddingTop: 'calc(var(--safe-top) + 12px)',
        paddingBottom: 'calc(var(--safe-bottom) + 24px)',
      }}
    >
      <header className="flex items-center justify-between gap-2">
        <TimerRing
          deadlineAt={turn.deadlineAt}
          totalSec={room.settings.voteDeadlineSec}
          clockOffsetMs={clockOffsetMs}
          onExpire={() => void advanceTurn()}
        />
        <span className="tabular-nums text-xs font-semibold uppercase opacity-75">
          Round {room.round} / {room.totalRounds}
        </span>
        <SyncIndicator state={syncState} />
      </header>

      <section className="my-auto flex flex-col items-center gap-5">
        <OwlMascot
          pose="judging"
          size="md"
          line={
            isPerformer
              ? 'Hold tight — the table is casting their verdict.'
              : `Did ${performer?.name ?? 'the performer'} deliver?`
          }
        />

        {/* Vote COUNT only (privacy rule: never reveal who voted how) */}
        <div
          data-testid="vote-count-bar"
          aria-live="polite"
          className="tabular-nums inline-flex items-center gap-2 rounded-full border border-black/15 bg-[var(--color-cream)] px-4 py-1.5 text-sm font-semibold"
          style={{ boxShadow: 'var(--shadow-card)' }}
        >
          <Users className="h-4 w-4 text-[var(--color-truth-teal)]" aria-hidden="true" />
          <span>
            {currentVotes.length} of {witnesses.length} voted
          </span>
        </div>

        {isPerformer || me?.spectator ? (
          <SurfaceCard className="w-full text-center">
            <p className="font-display text-2xl font-bold">Table is voting…</p>
            <p className="mt-1 text-xs opacity-75">
              {isPerformer
                ? 'Waiting for witnesses to seal the verdict.'
                : 'Spectators observe while players vote.'}
            </p>
          </SurfaceCard>
        ) : (
          <div className="grid w-full grid-cols-2 gap-3">
            <button
              type="button"
              data-testid="vote-approve-btn"
              aria-pressed={myVote?.verdict === 'APPROVE'}
              onClick={() => void castVote('APPROVE')}
              className="flex min-h-[88px] flex-col items-center justify-center gap-1.5 rounded-[18px] p-4 text-[var(--color-cream)] transition-transform active:scale-95"
              style={{
                backgroundColor: 'var(--color-sage)',
                border:
                  myVote?.verdict === 'APPROVE'
                    ? '3px solid var(--color-ink)'
                    : '1px solid rgba(35,32,28,0.18)',
                boxShadow: 'var(--shadow-card)',
                opacity: myVote && myVote.verdict !== 'APPROVE' ? 0.65 : 1,
              }}
            >
              <Check className="h-7 w-7" aria-hidden="true" />
              <span className="text-base font-bold">Approve</span>
            </button>

            <button
              type="button"
              data-testid="vote-reject-btn"
              aria-pressed={myVote?.verdict === 'REJECT'}
              onClick={() => void castVote('REJECT')}
              className="flex min-h-[88px] flex-col items-center justify-center gap-1.5 rounded-[18px] p-4 text-[var(--color-cream)] transition-transform active:scale-95"
              style={{
                backgroundColor: 'var(--color-brick)',
                border:
                  myVote?.verdict === 'REJECT'
                    ? '3px solid var(--color-ink)'
                    : '1px solid rgba(35,32,28,0.18)',
                boxShadow: 'var(--shadow-card)',
                opacity: myVote && myVote.verdict !== 'REJECT' ? 0.65 : 1,
              }}
            >
              <X className="h-7 w-7" aria-hidden="true" />
              <span className="text-base font-bold">Reject</span>
            </button>
          </div>
        )}
      </section>

      <div className="h-6" />
    </main>
  );
}
