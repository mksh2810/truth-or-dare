import { useEffect, useRef, useState } from 'react';
import { SyncIndicator } from '../design';
import { toMillis } from '../design/TimerRing';
import {
  BotanicalLayer,
  PlayerAvatarArtwork,
  TopBar,
  WaxSealArtwork,
} from '../design/VowletUiPrimitives';
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

  const [nowMs, setNowMs] = useState(() => Date.now());
  const expiredRef = useRef(false);

  useEffect(() => {
    expiredRef.current = false;
  }, [turn.deadlineAt]);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  const totalSec = room.settings.voteDeadlineSec || 20;
  const deadlineMs = toMillis(turn.deadlineAt) ?? nowMs;
  const remainingSec = Math.max(0, Math.ceil((deadlineMs - (nowMs + clockOffsetMs)) / 1000));
  const progress = Math.max(0, Math.min(1, remainingSec / totalSec));
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  useEffect(() => {
    if (remainingSec === 0 && !expiredRef.current) {
      expiredRef.current = true;
      void advanceTurn();
    }
  }, [remainingSec, advanceTurn]);

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
    <main className="vowlet-shell" data-testid="vote-screen">
      <div className="bg-parchment flex min-h-dvh flex-col items-center pb-6">
        <BotanicalLayer />

        <div className="w-full">
          <TopBar rightSlot={<SyncIndicator state={syncState} />} />
        </div>

        <div className="relative z-10 px-5 text-center">
          <h1 className="font-cormorant text-[33px] leading-tight font-bold text-[#2b1d12]">
            Time to Vote!
          </h1>
          <p className="font-cormorant mt-1 text-[17px] font-medium text-[#5e4430]">
            {isPerformer
              ? 'Hold tight — the table is casting their verdict.'
              : `Approve or Reject ${performer?.name ?? 'the performer'}.`}
          </p>
        </div>

        {/* SVG Circular Countdown Ring */}
        <div
          className="relative z-10 my-6 flex h-[156px] w-[156px] items-center justify-center"
          data-testid="timer-ring"
          role="timer"
          aria-label={`${remainingSec} seconds remaining`}
        >
          <svg viewBox="0 0 156 156" className="h-full w-full -rotate-90" aria-hidden="true">
            <circle
              cx="78"
              cy="78"
              r={radius}
              fill="#fff7e8"
              fillOpacity="0.65"
              stroke="#d9bfa0"
              strokeWidth="9"
            />
            <circle
              cx="78"
              cy="78"
              r={radius}
              fill="none"
              stroke="url(#timerRingGrad)"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{ transition: 'stroke-dashoffset 0.25s linear' }}
            />
          </svg>
          <span className="font-cormorant absolute text-[34px] font-bold text-[#2b1d12] tabular-nums">
            00:{String(remainingSec).padStart(2, '0')}
          </span>
        </div>

        {/* Two Tactile Wax Seal Vote Buttons */}
        <div className="relative z-10 w-full px-5">
          {isPerformer || me?.spectator ? (
            <div className="chit-card mx-auto mb-5 max-w-[320px] p-4 text-center">
              <p className="font-cormorant text-[20px] font-bold text-[#2b1d12]">
                Table is voting…
              </p>
              <small className="text-xs text-[#5e4430]">
                {isPerformer
                  ? 'Waiting for witnesses to seal the verdict.'
                  : 'Spectators observe while players vote.'}
              </small>
            </div>
          ) : (
            <div className="mb-5 flex items-center justify-center gap-8">
              <button
                type="button"
                className="wax-btn gap-1.5"
                data-testid="vote-approve-btn"
                aria-pressed={myVote?.verdict === 'APPROVE'}
                style={{
                  opacity: myVote && myVote.verdict !== 'APPROVE' ? 0.55 : 1,
                  transform: myVote?.verdict === 'APPROVE' ? 'scale(1.07)' : undefined,
                }}
                onClick={() => void castVote('APPROVE')}
              >
                <WaxSealArtwork color="green" icon="check" size={96} />
                <span className="font-cinzel text-sm font-bold tracking-wider text-[#2f522c]">
                  Approve
                </span>
              </button>

              <button
                type="button"
                className="wax-btn gap-1.5"
                data-testid="vote-reject-btn"
                aria-pressed={myVote?.verdict === 'REJECT'}
                style={{
                  opacity: myVote && myVote.verdict !== 'REJECT' ? 0.55 : 1,
                  transform: myVote?.verdict === 'REJECT' ? 'scale(1.07)' : undefined,
                }}
                onClick={() => void castVote('REJECT')}
              >
                <WaxSealArtwork color="red" icon="x" size={96} />
                <span className="font-cinzel text-sm font-bold tracking-wider text-[#8c2a1e]">
                  Reject
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Witness Avatars Row + Vote Count Pill */}
        <div className="relative z-10 mt-auto flex flex-col items-center gap-3 px-5">
          <div className="flex flex-wrap justify-center gap-2">
            {witnesses.map((w) => (
              <PlayerAvatarArtwork
                key={w.uid}
                name={w.name}
                size={34}
                className="rounded-full shadow-sm"
              />
            ))}
          </div>

          <div
            className="rounded-full border border-[#c59d6b] bg-[#fbf0dc] px-6 py-2 font-serif text-sm font-semibold text-[#2b1d12] shadow-sm"
            data-testid="vote-count-bar"
            aria-live="polite"
          >
            Votes: {currentVotes.length} / {witnesses.length}
          </div>
        </div>
      </div>
    </main>
  );
}
