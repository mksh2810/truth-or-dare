import { useEffect, useMemo, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { SyncIndicator, TimerRing, playSpinLandingChime } from '../design';
import { toMillis } from '../design/TimerRing';
import { Bottle, Tabletop, TopBar } from '../design/VowletUiPrimitives';
import { useGameStore } from '../state/useGameStore';

export function BottleSpinScreen() {
  const room = useGameStore((s) => s.room)!;
  const turn = useGameStore((s) => s.turn)!;
  const players = useGameStore((s) => s.players);
  const presence = useGameStore((s) => s.presence);
  const auth = useGameStore((s) => s.auth);
  const syncState = useGameStore((s) => s.syncState);
  const clockOffsetMs = useGameStore((s) => s.clockOffsetMs);
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const setSoundEnabled = useGameStore((s) => s.setSoundEnabled);
  const reducedMotionOverride = useGameStore((s) => s.reducedMotionOverride);
  const advanceTurn = useGameStore((s) => s.advanceTurn);

  const [landed, setLanded] = useState(false);
  const landedTurnRef = useRef<number>(-1);

  const activePlayers = useMemo(
    () =>
      players
        .filter((p) => !p.banned && !p.spectator)
        .slice()
        .sort((a, b) => a.seat - b.seat),
    [players],
  );
  const mySeatIndex = Math.max(
    0,
    activePlayers.findIndex((p) => p.uid === auth?.uid),
  );
  const targetSeatIndex = Math.max(
    0,
    activePlayers.findIndex((p) => p.uid === turn.performerUid),
  );
  const performer = activePlayers[targetSeatIndex];

  const totalSeats = Math.max(1, activePlayers.length);
  const targetAngle = 180 + ((targetSeatIndex - mySeatIndex) / totalSeats) * 360;
  const normalizedTarget = ((targetAngle % 360) + 360) % 360;
  const cumulativeRotate = room.turnVersion * 360 * 6 + 360 * 6 + normalizedTarget;

  const deadlineMs = toMillis(turn.deadlineAt) ?? Date.now();
  const remainingMs = Math.max(0, deadlineMs - (Date.now() + clockOffsetMs));
  const durationSec = Math.min(4.5, Math.max(0.4, remainingMs / 1000));

  useEffect(() => {
    setLanded(false);
  }, [room.turnVersion]);

  const handleSpinComplete = () => {
    if (landedTurnRef.current === room.turnVersion) return;
    landedTurnRef.current = room.turnVersion;
    setLanded(true);
    playSpinLandingChime(soundEnabled);
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(40);
    }
  };

  return (
    <main className="vowlet-shell" data-testid="bottle-spin-screen">
      <div className="spin-screen dark-scene">
        <TopBar
          dark
          rightSlot={
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="icon-btn"
                aria-label={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
                data-testid="spin-sound-toggle"
                onClick={() => setSoundEnabled(!soundEnabled)}
              >
                {soundEnabled ? (
                  <Volume2 size={18} aria-hidden="true" />
                ) : (
                  <VolumeX size={18} aria-hidden="true" />
                )}
              </button>
              <SyncIndicator state={syncState} surface="lamplit" />
            </div>
          }
        />

        <h1>The Bottle Spins...</h1>
        <p className="dark-sub">
          Let fate decide! • Round {room.round}/{room.totalRounds}
        </p>

        <Tabletop
          players={players}
          presence={presence}
          myUid={auth?.uid ?? null}
          hostUid={room.hostUid}
          activePerformerUid={landed ? turn.performerUid : null}
          centerContent={
            <Bottle
              rotate={cumulativeRotate}
              reducedMotion={reducedMotionOverride}
              durationSec={durationSec}
              onSpinComplete={handleSpinComplete}
            />
          }
        />

        <div className="chosen-note" aria-live="polite">
          {landed && performer
            ? `The bottle has chosen ${performer.name}.`
            : 'The bottle is choosing...'}
        </div>

        <div className="flex justify-center pb-2">
          <TimerRing
            deadlineAt={turn.deadlineAt}
            totalSec={5}
            clockOffsetMs={clockOffsetMs}
            surface="lamplit"
            size={44}
            onExpire={() => void advanceTurn()}
          />
        </div>
      </div>
    </main>
  );
}
