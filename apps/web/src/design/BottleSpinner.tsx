import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { computeTargetAngle, type Timestamp } from '@vowlet/shared';
import { toMillis } from './TimerRing';
import { playSpinLandingChime } from './sound';
import { getBottleSkin, type BottleSkinId } from './bottleSkins';

export interface BottleSpinnerProps {
  targetSeatIndex: number | null;
  mySeatIndex: number;
  totalSeats: number;
  deadlineAt: Timestamp | null | undefined;
  clockOffsetMs?: number;
  turnVersion: number;
  soundEnabled?: boolean;
  reducedMotionOverride?: boolean;
  skin?: BottleSkinId;
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
  skin = 'amber',
  onSpinComplete,
}: BottleSpinnerProps) {
  const skinMeta = getBottleSkin(skin);
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
        {/* Bottle pointing UP (0 deg = 12 o'clock, so 180 deg = 6 o'clock) */}
        <svg
          width="48"
          height="110"
          viewBox="0 0 48 110"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label={`Spinning ${skinMeta.name} bottle`}
          style={{ filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.65))' }}
        >
          <defs>
            <linearGradient id="bottleGlassGrad" x1="10" y1="36" x2="38" y2="104" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={skinMeta.highlightStroke} stopOpacity="0.85" />
              <stop offset="40%" stopColor={skinMeta.bodyFill} />
              <stop offset="100%" stopColor="#1E120A" />
            </linearGradient>
          </defs>
          {/* Cork & Lip */}
          <rect x="19" y="4" width="10" height="9" rx="2" fill={skinMeta.capFill} stroke="#23201C" strokeWidth="1.4" />
          <rect x="17" y="12" width="14" height="4" rx="1.5" fill={skinMeta.bodyFill} stroke="#FFFDF9" strokeOpacity="0.4" strokeWidth="1" />
          {/* Bottle Body */}
          <path
            d="M18.5 16 L29.5 16 L30.5 34 L38 46 L38 95 C38 100 34 104 29 104 L19 104 C14 104 10 100 10 95 L10 46 L17.5 34 Z"
            fill="url(#bottleGlassGrad)"
            stroke="#FFFDF9"
            strokeOpacity="0.45"
            strokeWidth="1.5"
          />
          {/* Left Glass Reflection */}
          <path
            d="M14.5 48 L14.5 93"
            stroke={skinMeta.highlightStroke}
            strokeOpacity="0.65"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <path
            d="M20 20 L20 33"
            stroke="#FFFDF9"
            strokeOpacity="0.45"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          {/* Cream Vowlet Label */}
          <rect x="13" y="55" width="22" height="28" rx="4" fill="#F6EBDC" stroke="#8A6420" strokeWidth="1.2" />
          <rect x="15" y="57" width="18" height="24" rx="2.5" fill="none" stroke="#8A6420" strokeOpacity="0.35" strokeWidth="0.8" />
          <circle cx="24" cy="69" r="5.5" fill={skinMeta.sealFill} />
          <circle cx="24" cy="69" r="3" fill="none" stroke="#F4C97A" strokeOpacity="0.6" strokeWidth="0.8" />
        </svg>
      </motion.div>
    </div>
  );
}
