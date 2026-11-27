import { Check, FastForward, Hourglass, LockKeyhole, RefreshCw } from 'lucide-react';
import { ElapsedStopwatch, SyncIndicator } from '../design';
import { MainButton, Seal, TopBar } from '../design/VowletUiPrimitives';
import { useGameStore } from '../state/useGameStore';

export function PerformScreen() {
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
    <main className="vowlet-shell" data-testid="perform-screen">
      <div className="reveal-screen dark-scene">
        <TopBar
          dark
          rightSlot={
            <div className="flex items-center gap-2">
              <ElapsedStopwatch
                startedAt={turn.startedAt}
                clockOffsetMs={clockOffsetMs}
                surface="lamplit"
              />
              <SyncIndicator state={syncState} surface="lamplit" />
            </div>
          }
        />

        {isPerformer ? (
          <>
            <h1>Unseal the Chit...</h1>

            <div className="envelope" aria-hidden="true">
              <Seal>✧</Seal>
              <LockKeyhole size={30} />
            </div>

            <div className="revealed-paper" data-testid="unsealed-chit-card">
              <small>
                {turn.kind ?? 'TRUTH'} CHIT{isDare && turn.dareType ? ` • ${turn.dareType}` : ''}
              </small>
              <p>{privatePrompt?.text ?? 'Unsealing your prompt…'}</p>
            </div>

            <MainButton
              disabled={pendingAction}
              data-testid="perform-done-btn"
              onClick={() => void performDone()}
            >
              <Check size={17} aria-hidden="true" />
              I&apos;ve completed it
            </MainButton>

            <div className="flex w-[calc(100%-44px)] gap-2 pb-2">
              <button
                type="button"
                disabled={pendingAction || Boolean(me?.swapUsed)}
                data-testid="perform-swap-btn"
                onClick={() => void performSwap()}
                className="main-btn secondary !m-0 !w-1/2"
              >
                <RefreshCw size={15} aria-hidden="true" />
                {me?.swapUsed ? 'Swap Used' : '1 Free Swap'}
              </button>

              <button
                type="button"
                disabled={pendingAction}
                data-testid="perform-skip-btn"
                onClick={() => void performSkip()}
                className="main-btn secondary !m-0 !w-1/2"
              >
                <FastForward size={15} aria-hidden="true" />
                Skip (-30)
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 aria-live="polite">
              {performer?.name ?? 'Player'} is unsealing a{' '}
              {turn.kind === 'DARE' ? 'Dare' : 'Truth'}...
            </h1>

            <div className="envelope" aria-hidden="true">
              <Seal>✧</Seal>
              <LockKeyhole size={30} />
            </div>

            <div className="revealed-paper">
              <small>WITNESS VIEW</small>
              <p>Watch closely — you&apos;ll vote once they finish.</p>
            </div>

            {!me?.spectator && (
              <MainButton
                secondary
                disabled={hasPressedStall || pendingAction}
                data-testid="taking-too-long-btn"
                onClick={() => void performStall()}
              >
                <Hourglass size={16} aria-hidden="true" />
                {hasPressedStall
                  ? `Stall Requested (${turn.stallVotes.length}/${witnesses.length})`
                  : `Taking Too Long (${turn.stallVotes.length}/${witnesses.length})`}
              </MainButton>
            )}
          </>
        )}
      </div>
    </main>
  );
}
