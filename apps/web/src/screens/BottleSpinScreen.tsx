import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';
import { SyncIndicator, TimerRing, playSpinLandingChime } from '../design';
import { toMillis } from '../design/TimerRing';
import {
  AmberBottleSvg,
  BotanicalLayer,
  PlayerSeatAvatar,
  TopBar,
  WoodenTableSvg,
} from '../design/VowletUiPrimitives';
import { useMediaCall } from '../media/useMediaCall';
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

  const voiceJoined = useMediaCall((s) => s.voiceJoined);
  const micMuted = useMediaCall((s) => s.micMuted);
  const localStream = useMediaCall((s) => s.localStream);
  const remoteStreams = useMediaCall((s) => s.remoteStreams);
  const remoteMediaState = useMediaCall((s) => s.remoteMediaState);

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
  // Local player sits at bottom (90deg in screen coords; bottle points up = 0deg, so 180deg = down)
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

  useEffect(() => {
    if (!reducedMotionOverride) return;
    const t = window.setTimeout(() => handleSpinComplete(), 120);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotionOverride, room.turnVersion]);

  return (
    <main className="vowlet-shell" data-testid="bottle-spin-screen">
      <div className="bg-wood-candle flex min-h-dvh flex-col pb-5">
        <BotanicalLayer darkMode />

        <TopBar
          dark
          rightSlot={
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="grid min-h-[44px] min-w-[44px] place-items-center rounded-full border-0 bg-transparent text-[#f8e8ce]"
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

        <div className="relative z-10 px-4 text-center">
          <h1 className="font-cormorant text-[31px] leading-tight font-bold text-[#faeed7]">
            The Bottle Spins...
          </h1>
          <p className="font-cormorant text-[17px] text-[#e5cfa9] italic">
            Let fate decide! • Round {room.round}/{room.totalRounds}
          </p>
        </div>

        {/* Wooden Table + Gold Ripples + Rotating Amber Bottle + Seated Players */}
        <div className="relative z-10 mx-auto my-auto flex h-[320px] w-full max-w-[340px] items-center justify-center">
          {/* Concentric Golden Ripples */}
          <div className="gold-ripple h-[220px] w-[220px]" aria-hidden="true" />
          <div
            className="gold-ripple h-[270px] w-[270px]"
            style={{ animationDelay: '0.8s' }}
            aria-hidden="true"
          />

          <WoodenTableSvg className="h-[234px] w-[234px] drop-shadow-[0_18px_28px_rgba(0,0,0,0.65)]" />

          {/* Rotating Bottle */}
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            initial={
              reducedMotionOverride
                ? { rotate: normalizedTarget }
                : { rotate: room.turnVersion * 360 * 6 }
            }
            animate={{ rotate: reducedMotionOverride ? normalizedTarget : cumulativeRotate }}
            transition={
              reducedMotionOverride
                ? { duration: 0.05 }
                : { duration: durationSec, ease: [0.12, 0.78, 0.18, 1] }
            }
            onAnimationComplete={handleSpinComplete}
          >
            <AmberBottleSvg className="h-[92px] w-[44px] drop-shadow-[0_6px_12px_rgba(0,0,0,0.65)]" />
          </motion.div>

          {/* Players around the table */}
          {activePlayers.map((player, index) => {
            const relIdx = (index - mySeatIndex + totalSeats) % totalSeats;
            const angleDeg = 90 + (relIdx / totalSeats) * 360;
            const angleRad = (angleDeg * Math.PI) / 180;
            const rx = 128;
            const ry = 124;
            const left = 50 + (Math.cos(angleRad) * rx * 100) / 340;
            const top = 50 + (Math.sin(angleRad) * ry * 100) / 320;
            const isOnline = presence[player.uid]?.online ?? true;
            const isChosen = landed && player.uid === turn.performerUid;
            const isMe = player.uid === auth?.uid;
            const seatStream = isMe ? localStream : (remoteStreams[player.uid] ?? null);
            const isVoiceActive = isMe
              ? voiceJoined && !micMuted
              : Boolean(remoteMediaState[player.uid]?.voice);

            return (
              <div
                key={player.uid}
                className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5"
                style={{ left: `${left}%`, top: `${top}%`, opacity: isOnline ? 1 : 0.45 }}
              >
                <PlayerSeatAvatar
                  name={player.name}
                  stream={seatStream}
                  muted
                  isVoiceActive={isVoiceActive}
                  size={44}
                  className={`transition-shadow ${
                    isChosen ? 'halo-chosen' : 'shadow-[0_4px_10px_rgba(0,0,0,0.6)]'
                  }`}
                />
                <span className="max-w-[78px] truncate rounded-full border border-[#d9b061]/35 bg-[#1b110a]/90 px-2 py-0.5 text-[11px] font-semibold text-[#faeed7]">
                  {player.name}
                </span>
              </div>
            );
          })}
        </div>

        {/* Torn Note Result */}
        <div className="relative z-10 mx-auto mb-3 px-5">
          <div className="torn-note px-6 py-3 text-center" aria-live="polite">
            <span className="font-cormorant text-[20px] font-semibold text-[#2b1d12] italic">
              {landed && performer
                ? `The bottle has chosen ${performer.name}.`
                : 'The bottle is choosing...'}
            </span>
          </div>
        </div>

        <div className="relative z-10 flex justify-center pb-1">
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
