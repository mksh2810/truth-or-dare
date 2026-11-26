import { Check, Users, X } from 'lucide-react';
import {
  BotanicalCorners,
  SurfaceCard,
  SyncIndicator,
  TimerRing,
} from '../design';
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
      className="linen-backdrop relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col justify-between overflow-hidden px-4 py-4"
      style={{
        paddingTop: 'calc(var(--safe-top) + 12px)',
        paddingBottom: 'calc(var(--safe-bottom) + 24px)',
      }}
    >
      <BotanicalCorners surface="linen" />

      <header className="relative z-10 flex items-center justify-between gap-2">
        <span className="tabular-nums text-xs font-semibold uppercase opacity-75">
          Round {room.round} / {room.totalRounds}
        </span>
        <SyncIndicator state={syncState} />
      </header>

      <section className="relative z-10 my-auto flex flex-col items-center gap-5 text-center">
        <div>
          <h1 className="font-display text-3xl font-bold leading-tight">Time to Vote!</h1>
          <p className="mt-1 text-xs font-medium opacity-80">
            {isPerformer
              ? 'Hold tight — the table is casting their verdict.'
              : `Did ${performer?.name ?? 'the performer'} deliver? Approve or Reject.`}
          </p>
        </div>

        {/* Large Circular 20s Countdown Ring */}
        <div className="rounded-full bg-[var(--color-cream)]/70 p-2 shadow-sm">
          <TimerRing
            deadlineAt={turn.deadlineAt}
            totalSec={room.settings.voteDeadlineSec}
            clockOffsetMs={clockOffsetMs}
            size={112}
            onExpire={() => void advanceTurn()}
          />
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
          <div className="flex w-full items-center justify-center gap-6">
            {/* Tactile Sage Scalloped Wax Seal: Approve */}
            <button
              type="button"
              data-testid="vote-approve-btn"
              aria-pressed={myVote?.verdict === 'APPROVE'}
              onClick={() => void castVote('APPROVE')}
              className="relative flex h-[116px] w-[116px] flex-col items-center justify-center transition-transform active:scale-95"
              style={{
                opacity: myVote && myVote.verdict !== 'APPROVE' ? 0.55 : 1,
                transform: myVote?.verdict === 'APPROVE' ? 'scale(1.06)' : undefined,
              }}
            >
              <svg
                width="116"
                height="116"
                viewBox="0 0 120 120"
                fill="none"
                aria-hidden="true"
                className="absolute inset-0"
                style={{ filter: 'drop-shadow(0 6px 12px rgba(35, 32, 28, 0.28))' }}
              >
                <defs>
                  <radialGradient id="sageWaxGrad" cx="38%" cy="32%" r="68%">
                    <stop offset="0%" stopColor="#74A873" />
                    <stop offset="65%" stopColor="#5B8C5A" />
                    <stop offset="100%" stopColor="#385B37" />
                  </radialGradient>
                </defs>
                <path
                  d="M60 5 C67 5 72 10 79 9 C86 8 92 14 98 20 C104 26 111 32 110 40 C109 48 115 54 114 62 C113 70 107 76 106 84 C105 92 98 97 91 102 C84 107 78 114 70 113 C62 112 56 116 48 114 C40 112 35 106 27 104 C19 102 14 95 11 87 C8 79 4 72 6 64 C8 56 5 48 9 40 C13 32 15 25 22 19 C29 13 35 8 43 9 C51 10 53 5 60 5 Z"
                  fill="url(#sageWaxGrad)"
                  stroke={myVote?.verdict === 'APPROVE' ? '#23201C' : '#325231'}
                  strokeWidth={myVote?.verdict === 'APPROVE' ? '3' : '2'}
                />
                <circle cx="60" cy="60" r="41" fill="none" stroke="rgba(255,253,249,0.45)" strokeWidth="1.5" />
                <circle cx="60" cy="60" r="36" fill="none" stroke="#325231" strokeWidth="2" strokeDasharray="3 2.5" />
              </svg>
              <div className="relative z-10 flex flex-col items-center gap-0.5 text-[var(--color-cream)]">
                <Check className="h-8 w-8 stroke-[2.6]" aria-hidden="true" />
                <span className="font-display text-base font-bold tracking-wider uppercase">
                  Approve
                </span>
              </div>
            </button>

            {/* Tactile Brick Scalloped Wax Seal: Reject */}
            <button
              type="button"
              data-testid="vote-reject-btn"
              aria-pressed={myVote?.verdict === 'REJECT'}
              onClick={() => void castVote('REJECT')}
              className="relative flex h-[116px] w-[116px] flex-col items-center justify-center transition-transform active:scale-95"
              style={{
                opacity: myVote && myVote.verdict !== 'REJECT' ? 0.55 : 1,
                transform: myVote?.verdict === 'REJECT' ? 'scale(1.06)' : undefined,
              }}
            >
              <svg
                width="116"
                height="116"
                viewBox="0 0 120 120"
                fill="none"
                aria-hidden="true"
                className="absolute inset-0"
                style={{ filter: 'drop-shadow(0 6px 12px rgba(35, 32, 28, 0.28))' }}
              >
                <defs>
                  <radialGradient id="brickWaxGrad" cx="38%" cy="32%" r="68%">
                    <stop offset="0%" stopColor="#C74E3E" />
                    <stop offset="65%" stopColor="#A33A2C" />
                    <stop offset="100%" stopColor="#5E1D14" />
                  </radialGradient>
                </defs>
                <path
                  d="M60 5 C67 5 72 10 79 9 C86 8 92 14 98 20 C104 26 111 32 110 40 C109 48 115 54 114 62 C113 70 107 76 106 84 C105 92 98 97 91 102 C84 107 78 114 70 113 C62 112 56 116 48 114 C40 112 35 106 27 104 C19 102 14 95 11 87 C8 79 4 72 6 64 C8 56 5 48 9 40 C13 32 15 25 22 19 C29 13 35 8 43 9 C51 10 53 5 60 5 Z"
                  fill="url(#brickWaxGrad)"
                  stroke={myVote?.verdict === 'REJECT' ? '#23201C' : '#5E1D14'}
                  strokeWidth={myVote?.verdict === 'REJECT' ? '3' : '2'}
                />
                <circle cx="60" cy="60" r="41" fill="none" stroke="rgba(255,253,249,0.45)" strokeWidth="1.5" />
                <circle cx="60" cy="60" r="36" fill="none" stroke="#5E1D14" strokeWidth="2" strokeDasharray="3 2.5" />
              </svg>
              <div className="relative z-10 flex flex-col items-center gap-0.5 text-[var(--color-cream)]">
                <X className="h-8 w-8 stroke-[2.6]" aria-hidden="true" />
                <span className="font-display text-base font-bold tracking-wider uppercase">
                  Reject
                </span>
              </div>
            </button>
          </div>
        )}

        {/* Witness Avatars Row + Vote COUNT only */}
        <div className="flex flex-col items-center gap-2.5">
          <div className="flex items-center justify-center -space-x-1.5" aria-hidden="true">
            {witnesses.slice(0, 7).map((w) => (
              <span
                key={w.uid}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#8A6420]/40 bg-[var(--color-cream)] text-sm shadow-sm"
              >
                {w.avatar || '🦉'}
              </span>
            ))}
          </div>

          <div
            data-testid="vote-count-bar"
            aria-live="polite"
            className="tabular-nums inline-flex items-center gap-2 rounded-full border border-[#8A6420]/30 bg-[var(--color-cream)] px-5 py-1.5 text-sm font-semibold text-[var(--color-ink)]"
            style={{ boxShadow: 'var(--shadow-card)' }}
          >
            <Users className="h-4 w-4 text-[var(--color-truth-teal)]" aria-hidden="true" />
            <span>
              Votes: {currentVotes.length} / {witnesses.length}
            </span>
          </div>
        </div>
      </section>

      <div className="h-4" />
    </main>
  );
}
