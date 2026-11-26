import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { computeTargetAngle, type Timestamp } from '@vowlet/shared';
import { toMillis } from './TimerRing';
import { playSpinLandingChime } from './sound';

export interface BottleSpinnerProps {
  targetSeatIndex: number | null;
  mySeatIndex: number;
  totalSeats: number;
  deadlineAt: Timestamp | null | undefined;
  clockOffsetMs?: number;
  turnVersion: number;
  soundEnabled?: boolean;
  reducedMotionOverride?: boolean;
  onSpinComplete?: () => void;
}

export function BottleSpinner({
  targetSeatIndex,
  mySeatIndex,
  totalSeats,
  deadlineAt,
  clockOffsetMs = 0,
  turnVersion,
  soundEnabled = false,
  reducedMotionOverride = false,
  onSpinComplete,
}: BottleSpinnerProps) {
  const osReducedMotion = useReducedMotion();
  const reducedMotion = Boolean(osReducedMotion || reducedMotionOverride);

  const angleRef = useRef<number>(180);
  const [displayAngle, setDisplayAngle] = useState<number>(180);
  const [spinDuration, setSpinDuration] = useState<number>(0);
  const [landed, setLanded] = useState<boolean>(false);
  const lastTurnRef = useRef<number>(-1);

  useEffect(() => {
    if (targetSeatIndex == null || totalSeats <= 0) return;
    if (lastTurnRef.current === turnVersion) return;
    lastTurnRef.current = turnVersion;

    const deadlineMs = toMillis(deadlineAt);
    const serverNow = Date.now() + clockOffsetMs;
    const remainingMs = deadlineMs != null ? deadlineMs - serverNow : 4500;
    const shouldSnap = reducedMotion || remainingMs <= 400;

    const nextAngle = computeTargetAngle(
      angleRef.current,
      targetSeatIndex,
      mySeatIndex,
      totalSeats,
      shouldSnap ? 1 : 5,
    );

    angleRef.current = nextAngle;
    setSpinDuration(shouldSnap ? 0 : 4.5);
    setLanded(shouldSnap);
    setDisplayAngle(nextAngle);

    if (shouldSnap) {
      onSpinComplete?.();
      return;
    }

    const timer = window.setTimeout(() => {
      setLanded(true);
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(35);
      }
      playSpinLandingChime(soundEnabled);
      onSpinComplete?.();
    }, 4500);

    return () => window.clearTimeout(timer);
  }, [
    targetSeatIndex,
    mySeatIndex,
    totalSeats,
    deadlineAt,
    clockOffsetMs,
    turnVersion,
    reducedMotion,
    soundEnabled,
    onSpinComplete,
  ]);

  return (
    <div
      data-testid="bottle-spinner"
      className="relative flex h-28 w-28 items-center justify-center"
    >
      {landed && (
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full border-2 border-[var(--color-brass)] opacity-75"
        />
      )}
      <motion.div
        animate={{ rotate: displayAngle }}
        transition={{
          duration: spinDuration,
          ease: [0.12, 0.88, 0.22, 1],
        }}
        style={{ originX: '50%', originY: '50%' }}
        className="flex items-center justify-center"
      >
        {/* Amber glass bottle pointing UP (0 deg = 12 o'clock, so 180 deg = 6 o'clock) */}
        <svg
          width="44"
          height="104"
          viewBox="0 0 44 104"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="Spinning bottle"
          style={{ filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.45))' }}
        >
          {/* Cork / Cap */}
          <rect x="17" y="4" width="10" height="8" rx="2" fill="#B8893B" stroke="#23201C" strokeWidth="1.5" />
          {/* Neck */}
          <path
            d="M17 12 L27 12 L28 32 L35 44 L35 92 C35 96.5 31.5 100 27 100 L17 100 C12.5 100 9 96.5 9 92 L9 44 L16 32 Z"
            fill="#8A4A1C"
            stroke="#FFFDF9"
            strokeOpacity="0.45"
            strokeWidth="1.5"
          />
          {/* Amber highlight */}
          <path
            d="M15 46 L15 90"
            stroke="#F4C97A"
            strokeOpacity="0.45"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Cream Vowlet label */}
          <rect x="12" y="54" width="20" height="26" rx="4" fill="#F6F1E9" stroke="#23201C" strokeWidth="1.2" />
          <circle cx="22" cy="67" r="5" fill="#C4552D" />
        </svg>
      </motion.div>
    </div>
  );
}
