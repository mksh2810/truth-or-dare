import { useEffect, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import { SyncIndicator } from '../design';
import { toMillis } from '../design/TimerRing';
import { Avatars, TopBar } from '../design/VowletUiPrimitives';
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

  const deadlineMs = toMillis(turn.deadlineAt) ?? nowMs;
  const remainingSec = Math.max(0, Math.ceil((deadlineMs - (nowMs + clockOffsetMs)) / 1000));

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
      <div className="vote-screen parchment">
        <TopBar rightSlot={<SyncIndicator state={syncState} />} />

        <h1>Time to Vote!</h1>
        <p className="intro">
          {isPerformer
            ? 'Hold tight — the table is casting their verdict.'
            : `Approve or Reject ${performer?.name ?? 'the performer'}.`}
        </p>

        <div
          className="timer"
          data-testid="timer-ring"
          role="timer"
          aria-label={`${remainingSec} seconds remaining`}
        >
          00:{String(remainingSec).padStart(2, '0')}
        </div>

        {isPerformer || me?.spectator ? (
          <div className="paper mx-5 mb-4 p-4 text-center">
            <p className="font-semibold">Table is voting…</p>
            <small className="opacity-75">
              {isPerformer
                ? 'Waiting for witnesses to seal the verdict.'
                : 'Spectators observe while players vote.'}
            </small>
          </div>
        ) : (
          <div className="vote-actions">
            <button
              type="button"
              className="vote-seal pass"
              data-testid="vote-approve-btn"
              aria-pressed={myVote?.verdict === 'APPROVE'}
              style={{
                opacity: myVote && myVote.verdict !== 'APPROVE' ? 0.55 : 1,
                transform: myVote?.verdict === 'APPROVE' ? 'scale(1.06)' : undefined,
              }}
              onClick={() => void castVote('APPROVE')}
            >
              <Check size={31} aria-hidden="true" />
              <b>Approve</b>
            </button>

            <button
              type="button"
              className="vote-seal fail"
              data-testid="vote-reject-btn"
              aria-pressed={myVote?.verdict === 'REJECT'}
              style={{
                opacity: myVote && myVote.verdict !== 'REJECT' ? 0.55 : 1,
                transform: myVote?.verdict === 'REJECT' ? 'scale(1.06)' : undefined,
              }}
              onClick={() => void castVote('REJECT')}
            >
              <X size={31} aria-hidden="true" />
              <b>Reject</b>
            </button>
          </div>
        )}

        <Avatars players={witnesses} compact />
        <div className="vote-count" data-testid="vote-count-bar" aria-live="polite">
          Votes: {currentVotes.length} / {witnesses.length}
        </div>
      </div>
    </main>
  );
}
