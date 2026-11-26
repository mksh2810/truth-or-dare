import { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import {
  BotanicalCorners,
  BottleSpinner,
  RadialTable,
  SyncIndicator,
  TimerRing,
  TornScrollBanner,
} from '../design';
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
      className="lamplit-backdrop relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col justify-between overflow-hidden px-4 py-4"
      style={{
        paddingTop: 'calc(var(--safe-top) + 12px)',
        paddingBottom: 'calc(var(--safe-bottom) + 20px)',
      }}
    >
      <BotanicalCorners surface="lamplit" />

      <header className="relative z-10 flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
          data-testid="spin-sound-toggle"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-[var(--color-cream)]"
        >
          {soundEnabled ? (
            <Volume2 className="h-5 w-5" aria-hidden="true" />
          ) : (
            <VolumeX className="h-5 w-5" aria-hidden="true" />
          )}
        </button>

        <div className="text-center">
          <h1 className="font-display text-2xl font-bold text-[var(--color-cream)]">
            The Bottle Spins...
          </h1>
          <p className="text-xs text-[var(--color-lamplit-muted)]">
            Let fate decide! • Round {room.round}/{room.totalRounds}
          </p>
        </div>

        <SyncIndicator state={syncState} surface="lamplit" />
      </header>

      <div className="relative z-10 my-auto flex flex-col items-center gap-5">
        <RadialTable
          players={players}
          presence={presence}
          myUid={auth?.uid ?? null}
          hostUid={room.hostUid}
          activePerformerUid={landed ? turn.performerUid : null}
          showSpinGlow
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

        <div aria-live="polite" className="w-full px-2">
          <TornScrollBanner tiltDeg={-1}>
            {landed && performer ? (
              <p className="font-display text-2xl font-bold italic text-[var(--color-ink)]">
                The bottle has chosen {performer.name}.
              </p>
            ) : (
              <p className="font-display text-xl font-semibold italic text-[var(--color-ink)]/80">
                Spinning the bottle…
              </p>
            )}
          </TornScrollBanner>
        </div>
      </div>

      {/* Compact TimerRing triggers advanceTurn when 4.5s deadline expires */}
      <div className="relative z-10 flex justify-center">
        <TimerRing
          deadlineAt={turn.deadlineAt}
          totalSec={5}
          clockOffsetMs={clockOffsetMs}
          surface="lamplit"
          size={44}
          onExpire={() => void advanceTurn()}
        />
      </div>
    </main>
  );
}
