import { Feather, Flame } from 'lucide-react';
import { SyncIndicator, TimerRing } from '../design';
import { OwlMark, TopBar } from '../design/VowletUiPrimitives';
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
    <main className="vowlet-shell" data-testid="chosen-screen">
      <div className="choose-screen dark-scene">
        <TopBar
          dark
          rightSlot={
            <div className="flex items-center gap-2">
              <TimerRing
                deadlineAt={turn.deadlineAt}
                totalSec={room.settings.chooseDeadlineSec}
                clockOffsetMs={clockOffsetMs}
                surface="lamplit"
                size={40}
                onExpire={() => void advanceTurn()}
              />
              <SyncIndicator state={syncState} surface="lamplit" />
            </div>
          }
        />

        {isPerformer ? (
          <>
            <div className="chosen-heading">
              <span aria-hidden="true">✦</span>
              <h1>You&apos;ve been chosen!</h1>
              <p className="dark-sub">Auto-selects Truth if timer runs out.</p>
            </div>

            <div className="choice-cards">
              <button
                type="button"
                className="choice-card truth-card"
                disabled={pendingAction}
                data-testid="choose-truth-btn"
                onClick={() => void choosePromptKind('TRUTH')}
              >
                <Feather size={35} aria-hidden="true" />
                <b>TRUTH</b>
                <small>Reveal what lies beneath.</small>
              </button>

              <button
                type="button"
                className="choice-card dare-card"
                disabled={pendingAction}
                data-testid="choose-dare-btn"
                onClick={() => void choosePromptKind('DARE')}
              >
                <Flame size={35} aria-hidden="true" />
                <b>DARE</b>
                <small>Make the evening memorable.</small>
              </button>
            </div>
          </>
        ) : (
          <div className="chosen-heading flex flex-col items-center gap-4 px-5" aria-live="polite">
            <OwlMark />
            <h1>{performer?.name ?? 'Player'} is choosing...</h1>
            <p className="dark-sub">Truth or Dare? Stay tuned.</p>
          </div>
        )}
      </div>
    </main>
  );
}
