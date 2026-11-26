import { RefreshCw } from 'lucide-react';
import { Button } from '../design';
import { useSwUpdate } from '../pwa/swUpdate';

export function UpdateAvailableToast() {
  const { needRefresh, updateServiceWorker, dismiss } = useSwUpdate();

  if (!needRefresh) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="update-available-toast"
      className="fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-32px)] max-w-[398px] -translate-x-1/2 items-center justify-between gap-3 p-3.5"
      style={{
        backgroundColor: 'var(--color-ink)',
        color: 'var(--color-cream)',
        borderRadius: 'var(--radius-card)',
        boxShadow: 'var(--shadow-sheet)',
        marginBottom: 'var(--safe-bottom)',
      }}
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <RefreshCw className="h-4 w-4 shrink-0 text-[var(--color-brass)]" aria-hidden="true" />
        <span>A new version of Vowlet is ready.</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Button
          variant="primary-dare"
          onClick={() => void updateServiceWorker()}
          className="px-3 py-1.5 text-xs"
        >
          Update
        </Button>
        <Button
          variant="ghost"
          surface="lamplit"
          onClick={dismiss}
          className="px-2 py-1.5 text-xs"
        >
          Later
        </Button>
      </div>
    </div>
  );
}
