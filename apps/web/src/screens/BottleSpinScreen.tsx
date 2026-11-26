import { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { BottleSpinner, RadialTable, SyncIndicator, TimerRing } from '../design';
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
  const selectedSkin = useGameStore((s) => s.selectedSkin);
  const advanceTurn = useGameStore((s) => s.advanceTurn);

  const [landed, setLanded] = useState(false);

  const activePlayers = players
    .filter((p) => !p.banned && !p.spectator)
    .slice()
    .sort((a, b) => a.seat - b.seat);
  const mySeatIndex = Math.max(
    0,
    activePlayers.findIndex((p) => p.uid === auth?.uid),
  );
  const targetSeatIndex = Math.max(
    0,
    activePlayers.findIndex((p) => p.uid === turn.performerUid),
  );
  const performer = activePlayers[targetSeatIndex];

  return (
    <main
      data-testid="bottle-spin-screen"
      className="lamplit-backdrop mx-auto flex min-h-dvh w-full max-w-[430px] flex-col justify-between px-4 py-4"
      style={{
        paddingTop: 'calc(var(--safe-top) + 12px)',
        paddingBottom: 'calc(var(--safe-bottom) + 24px)',
      }}
    >
      <header className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
          data-testid="spin-sound-toggle"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-[var(--color-cream)]"
        >
          {soundEnabled ? <Volume2 className="h-5 w-5" aria-hidden="true" /> : <VolumeX className="h-5 w-5" aria-hidden="true" />}
        </button>

        <span className="tabular-nums text-xs font-semibold tracking-wide text-[var(--color-lamplit-muted)] uppercase">
          Round {room.round} of {room.totalRounds}
        </span>

        <SyncIndicator state={syncState} surface="lamplit" />
      </header>

      <div className="my-auto flex flex-col items-center gap-6">
        <RadialTable
          players={players}
          presence={presence}
          myUid={auth?.uid ?? null}
          hostUid={room.hostUid}
          activePerformerUid={landed ? turn.performerUid : null}
          centerContent={
            <BottleSpinner
              targetSeatIndex={targetSeatIndex}
              mySeatIndex={mySeatIndex}
              totalSeats={activePlayers.length}
              deadlineAt={turn.deadlineAt}
              clockOffsetMs={clockOffsetMs}
              turnVersion={room.turnVersion}
              soundEnabled={soundEnabled}
              reducedMotionOverride={reducedMotionOverride}
              skin={selectedSkin}
              onSpinComplete={() => setLanded(true)}
            />
          }
        />

        <div aria-live="polite" className="min-h-[56px] text-center">
          {landed && performer ? (
            <p className="font-display text-2xl font-bold text-[var(--color-cream)]">
              The bottle has chosen {performer.name}
            </p>
          ) : (
            <p className="text-sm font-medium text-[var(--color-lamplit-muted)]">
              Spinning the bottle…
            </p>
          )}
        </div>
      </div>

      {/* Hidden/compact TimerRing triggers advanceTurn when 4.5s deadline expires */}
      <div className="flex justify-center">
        <TimerRing
          deadlineAt={turn.deadlineAt}
          totalSec={5}
          clockOffsetMs={clockOffsetMs}
          surface="lamplit"
          size={48}
          onExpire={() => void advanceTurn()}
        />
      </div>
    </main>
  );
}
