import { useCallback, useEffect, useRef, useState } from 'react';

export interface SwUpdateState {
  needRefresh: boolean;
  updateServiceWorker: () => Promise<void>;
  dismiss: () => void;
}

/**
 * VitePWA update prompt hook (D16) using standard Service Worker APIs.
 */
export function useSwUpdate(): SwUpdateState {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    let active = true;

    const attachRegistration = (reg: ServiceWorkerRegistration) => {
      if (reg.waiting && navigator.serviceWorker.controller) {
        waitingWorkerRef.current = reg.waiting;
        if (active) setNeedRefresh(true);
      }

      reg.addEventListener('updatefound', () => {
        const nextWorker = reg.installing;
        if (!nextWorker) return;
        nextWorker.addEventListener('statechange', () => {
          if (
            nextWorker.state === 'installed' &&
            navigator.serviceWorker.controller
          ) {
            waitingWorkerRef.current = nextWorker;
            if (active) setNeedRefresh(true);
          }
        });
      });
    };

    navigator.serviceWorker
      .getRegistration()
      .then((reg) => {
        if (reg) attachRegistration(reg);
      })
      .catch(() => {
        // Ignore SW errors in non-HTTPS / dev contexts
      });

    return () => {
      active = false;
    };
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
    setNeedRefresh(false);
  }, []);

  const updateServiceWorker = useCallback(async () => {
    const waiting = waitingWorkerRef.current;
    if (waiting) {
      waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    window.location.reload();
  }, []);

  return {
    needRefresh: needRefresh && !dismissed,
    updateServiceWorker,
    dismiss,
  };
}
