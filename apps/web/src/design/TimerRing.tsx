import { useEffect, useRef, useState } from 'react';
import type { Timestamp } from '@vowlet/shared';
import type { SurfaceMode } from './Button';

export function toMillis(ts: Timestamp | null | undefined): number | null {
  if (ts == null) return null;
  if (typeof ts === 'number') return ts;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (typeof ts.seconds === 'number') return ts.seconds * 1000;
  return null;
}

export interface TimerRingProps {
  deadlineAt: Timestamp | null | undefined;
  totalSec: number;
  clockOffsetMs?: number;
  surface?: SurfaceMode;
  size?: number;
  label?: string;
  onExpire?: () => void;
}

export function TimerRing({
  deadlineAt,
  totalSec,
  clockOffsetMs = 0,
  surface = 'linen',
  size = 64,
  label = 'Time remaining',
  onExpire,
}: TimerRingProps) {
  const [, setTick] = useState(0);
  const expiredFiredRef = useRef<number | null>(null);
  const lastAnnouncedRef = useRef<number | null>(null);
  const [announcement, setAnnouncement] = useState<string>('');

  const deadlineMs = toMillis(deadlineAt);

  useEffect(() => {
    if (deadlineMs == null) return;
    const id = window.setInterval(() => {
      setTick((t) => t + 1);
    }, 100);
    return () => window.clearInterval(id);
  }, [deadlineMs]);

  // Derived from server deadlineAt + clockOffsetMs on every render (D2)
  const serverNow = Date.now() + clockOffsetMs;
  const remainingMs = deadlineMs != null ? Math.max(0, deadlineMs - serverNow) : 0;
  const remainingSec = Math.ceil(remainingMs / 1000);
  const progress =
    deadlineMs != null && totalSec > 0
      ? Math.max(0, Math.min(1, remainingMs / (totalSec * 1000)))
      : 0;

  useEffect(() => {
    if (deadlineMs == null) return;
    if (remainingMs <= 0 && expiredFiredRef.current !== deadlineMs) {
      expiredFiredRef.current = deadlineMs;
      onExpire?.();
    }
  }, [deadlineMs, remainingMs, onExpire]);

  useEffect(() => {
    if (deadlineMs == null) return;
    if (
      (remainingSec === 10 || remainingSec === 5 || remainingSec === 0) &&
      lastAnnouncedRef.current !== remainingSec
    ) {
      lastAnnouncedRef.current = remainingSec;
      setAnnouncement(remainingSec === 0 ? "Time's up" : `${remainingSec} seconds remaining`);
    }
  }, [deadlineMs, remainingSec]);

  const strokeWidth = 4;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const isUrgent = remainingSec <= 5 && deadlineMs != null;
  const isLamplit = surface === 'lamplit';
  const strokeColor = isUrgent
    ? 'var(--color-brick)'
    : isLamplit
      ? 'var(--color-brass)'
      : 'var(--color-truth-teal)';

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      aria-label={`${label}: ${remainingSec} seconds`}
      data-testid="timer-ring"
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isLamplit ? 'rgba(255,253,249,0.18)' : 'rgba(35,32,28,0.12)'}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </svg>
      <span
        className="tabular-nums absolute text-sm font-bold"
        style={{
          color: isUrgent
            ? isLamplit
              ? '#F2A094'
              : 'var(--color-brick)'
            : isLamplit
              ? 'var(--color-lamplit-text)'
              : 'var(--color-ink)',
        }}
      >
        {remainingSec}s
      </span>
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </div>
  );
}
