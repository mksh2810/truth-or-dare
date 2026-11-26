import { useEffect } from 'react';
import { MotionConfig } from 'framer-motion';
import { subscribeAuth } from './auth/firebase';
import { useGameStore } from './state/useGameStore';
import { ConsentScreen } from './screens/ConsentScreen';
import { HomeScreen } from './screens/HomeScreen';
import { CreateTableScreen } from './screens/CreateTableScreen';
import { JoinTableScreen } from './screens/JoinTableScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { WriteChitsScreen } from './screens/WriteChitsScreen';
import { BottleSpinScreen } from './screens/BottleSpinScreen';
import { ChosenScreen } from './screens/ChosenScreen';
import { PerformScreen } from './screens/PerformScreen';
import { VoteScreen } from './screens/VoteScreen';
import { ResultScreen } from './screens/ResultScreen';
import { PodiumScreen } from './screens/PodiumScreen';
import { RoomClosedScreen } from './screens/RoomClosedScreen';
import { ReconnectingBanner } from './screens/ReconnectingBanner';
import { InAppBrowserHelp } from './screens/InAppBrowserHelp';
import { UpdateAvailableToast } from './screens/UpdateAvailableToast';

export const VOWLET_TAGLINE = 'A little truth, a little trouble';

export function App() {
  const setAuth = useGameStore((s) => s.setAuth);
  const consentAccepted = useGameStore((s) => s.consentAccepted);
  const route = useGameStore((s) => s.route);
  const setRoute = useGameStore((s) => s.setRoute);
  const room = useGameStore((s) => s.room);
  const toast = useGameStore((s) => s.toast);
  const reducedMotionOverride = useGameStore((s) => s.reducedMotionOverride);

  useEffect(() => {
    const unsub = subscribeAuth((profile) => {
      setAuth(profile);
    });
    return unsub;
  }, [setAuth]);

  // Support deep-link join (?join=ABCDEF)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join');
    if (joinCode && joinCode.length === 6) {
      setRoute('JOIN', joinCode.toUpperCase());
    }
  }, [setRoute]);

  const renderContent = () => {
    if (!consentAccepted) {
      return <ConsentScreen />;
    }

    if (route === 'CLOSED') {
      return <RoomClosedScreen />;
    }

    if (route === 'CREATE') {
      return <CreateTableScreen />;
    }

    if (route === 'JOIN') {
      return <JoinTableScreen />;
    }

    if (route === 'ROOM' && room) {
      switch (room.phase) {
        case 'LOBBY':
          return <LobbyScreen />;
        case 'WRITING':
          return <WriteChitsScreen />;
        case 'SPIN':
          return <BottleSpinScreen />;
        case 'CHOOSE':
          return <ChosenScreen />;
        case 'PERFORM':
          return <PerformScreen />;
        case 'VOTE':
          return <VoteScreen />;
        case 'RESULT':
          return <ResultScreen />;
        case 'SUMMARY':
        case 'PODIUM':
          return <PodiumScreen />;
        case 'CLOSED':
          return <RoomClosedScreen />;
      }
    }

    return <HomeScreen />;
  };

  return (
    <MotionConfig reducedMotion={reducedMotionOverride ? 'always' : 'user'}>
      <div className="min-h-dvh w-full overflow-x-hidden">
        <ReconnectingBanner />
        <InAppBrowserHelp />
        {renderContent()}

        {toast && (
          <div
            role="status"
            aria-live="polite"
            data-testid="app-toast"
            className="fixed top-4 left-1/2 z-50 w-[calc(100%-32px)] max-w-[398px] -translate-x-1/2 rounded-[14px] px-4 py-3 text-center text-sm font-semibold text-[var(--color-cream)]"
            style={{
              backgroundColor:
                toast.tone === 'error'
                  ? 'var(--color-brick)'
                  : toast.tone === 'success'
                    ? 'var(--color-sage)'
                    : 'var(--color-ink)',
              boxShadow: 'var(--shadow-sheet)',
            }}
          >
            {toast.text}
          </div>
        )}

        <UpdateAvailableToast />
      </div>
    </MotionConfig>
  );
}

export default App;
