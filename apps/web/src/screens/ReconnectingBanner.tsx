import { RefreshCw, WifiOff } from 'lucide-react';
import { useGameStore } from '../state/useGameStore';

export function ReconnectingBanner() {
  const isOnline = useGameStore((s) => s.isOnline);
  const syncState = useGameStore((s) => s.syncState);

  if (isOnline && syncState !== 'reconnecting' && syncState !== 'offline') {
    return null;
  }

  const isOffline = !isOnline || syncState === 'offline';

  return (
    <div
      role="alert"
      aria-live="assertive"
      data-testid="reconnecting-banner"
      className="sticky top-0 z-40 flex w-full items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-[var(--color-cream)]"
      style={{
        backgroundColor: isOffline ? 'var(--color-brick)' : 'var(--color-brass)',
      }}
    >
      {isOffline ? (
        <>
          <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Offline — changes paused until connection returns.</span>
        </>
      ) : (
        <>
          <RefreshCw className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
          <span>Reconnecting to table…</span>
        </>
      )}
    </div>
  );
}
