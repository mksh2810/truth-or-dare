import { useEffect } from 'react';
import { SyncIndicator, TimerRing, playStampSound } from '../design';
import { MainButton, OwlMark, Seal, TopBar } from '../design/VowletUiPrimitives';
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

  const sealTone = stamp === 'PASSED' ? 'green' : stamp === 'SPLIT' ? 'brass' : 'red';
  const deltaLabel = delta > 0 ? `+${delta} XP` : `${delta} XP`;

  return (
    <main className="vowlet-shell" data-testid="result-screen">
      <div className="result-screen parchment">
        <TopBar
          rightSlot={
            <div className="flex items-center gap-2">
              <TimerRing
                deadlineAt={turn.deadlineAt}
                totalSec={6}
                clockOffsetMs={clockOffsetMs}
                size={38}
                onExpire={() => void advanceTurn()}
              />
              <SyncIndicator state={syncState} />
            </div>
          }
        />

        <div className="verdict-seal" aria-live="polite">
          <Seal tone={sealTone}>{stamp}</Seal>
        </div>

        <div className="xp" data-testid="result-score-delta">
          {deltaLabel}
        </div>

        {(performer?.streak ?? 0) > 0 && (
          <div className="streak">🔥 Streak +{performer?.streak}</div>
        )}

        <div className="owl-reaction">
          <OwlMark />
          <div className="speech">
            {turn.owlLine || 'Bold choice! The table has spoken.'}
          </div>
        </div>

        <MainButton
          data-testid="result-next-btn"
          onClick={() => void advanceTurn()}
        >
          {isFinalRound ? 'View Summary' : 'Next Turn'}
        </MainButton>
      </div>
    </main>
  );
}
