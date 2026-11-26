import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import type { Timestamp } from '@vowlet/shared';
import { toMillis } from './TimerRing';
import type { SurfaceMode } from './Button';

export interface ElapsedStopwatchProps {
  startedAt: Timestamp | null | undefined;
  clockOffsetMs?: number;
  surface?: SurfaceMode;
}

export function ElapsedStopwatch({
  startedAt,
  clockOffsetMs = 0,
  surface = 'linen',
}: ElapsedStopwatchProps) {
  const [, setTick] = useState(0);
  const startedMs = toMillis(startedAt);

  useEffect(() => {
    if (startedMs == null) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 500);
    return () => window.clearInterval(id);
  }, [startedMs]);

  const serverNow = Date.now() + clockOffsetMs;
  const elapsedSec = startedMs != null ? Math.max(0, Math.floor((serverNow - startedMs) / 1000)) : 0;
  const mins = Math.floor(elapsedSec / 60);
  const secs = elapsedSec % 60;
  const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const isLamplit = surface === 'lamplit';

  return (
    <div
      data-testid="elapsed-stopwatch"
      aria-label={`Elapsed time ${mins} minutes ${secs} seconds`}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold tabular-nums"
      style={{
        borderRadius: 'var(--radius-pill)',
        backgroundColor: isLamplit ? 'rgba(255,253,249,0.12)' : 'var(--color-cream)',
        color: isLamplit ? 'var(--color-lamplit-text)' : 'var(--color-ink)',
        border: isLamplit ? 'var(--border-lamplit-hairline)' : 'var(--border-ink-hairline)',
      }}
    >
      <Clock className="h-4 w-4" aria-hidden="true" />
      <span>{formatted}</span>
    </div>
  );
}
