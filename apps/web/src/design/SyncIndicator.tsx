import { CheckCircle2, RefreshCw, WifiOff } from 'lucide-react';
import type { SurfaceMode } from './Button';

export type SyncState = 'synced' | 'syncing' | 'offline' | 'reconnecting';

export interface SyncIndicatorProps {
  state: SyncState;
  surface?: SurfaceMode;
}

export function SyncIndicator({ state, surface = 'linen' }: SyncIndicatorProps) {
  const isLamplit = surface === 'lamplit';

  const config: Record<
    SyncState,
    { label: string; color: string; bg: string; icon: JSX.Element }
  > = {
    synced: {
      label: 'Synced',
      color: isLamplit ? '#A7D7A6' : 'var(--color-sage-text)',
      bg: isLamplit ? 'rgba(91, 140, 90, 0.22)' : 'rgba(91, 140, 90, 0.12)',
      icon: <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />,
    },
    syncing: {
      label: 'Syncing…',
      color: isLamplit ? '#F4C97A' : 'var(--color-brass-text)',
      bg: isLamplit ? 'rgba(184, 137, 59, 0.24)' : 'rgba(184, 137, 59, 0.14)',
      icon: <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />,
    },
    reconnecting: {
      label: 'Reconnecting…',
      color: isLamplit ? '#F4C97A' : 'var(--color-brass-text)',
      bg: isLamplit ? 'rgba(184, 137, 59, 0.26)' : 'rgba(184, 137, 59, 0.16)',
      icon: <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />,
    },
    offline: {
      label: 'Offline',
      color: isLamplit ? '#F2A094' : 'var(--color-brick)',
      bg: isLamplit ? 'rgba(163, 58, 44, 0.3)' : 'rgba(163, 58, 44, 0.14)',
      icon: <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />,
    },
  };

  const current = config[state];

  return (
    <span
      role="status"
      aria-live="polite"
      data-testid="sync-indicator"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold"
      style={{
        borderRadius: 'var(--radius-pill)',
        color: current.color,
        backgroundColor: current.bg,
        border: isLamplit ? '1px solid rgba(255,253,249,0.14)' : 'var(--border-ink-hairline)',
      }}
    >
      {current.icon}
      <span>{current.label}</span>
    </span>
  );
}
