import { Suspense, lazy, useEffect, useMemo } from 'react';
import { MotionConfig } from 'framer-motion';
import { subscribeAuth } from './auth/firebase';
import { SharedSvgDefs } from './design/VowletUiPrimitives';
import { detectInAppBrowser } from './pwa/inAppBrowser';
import { useGameStore } from './state/useGameStore';
import { ConsentScreen } from './screens/ConsentScreen';
import { HomeScreen } from './screens/HomeScreen';
import { ReconnectingBanner } from './screens/ReconnectingBanner';
import { UpdateAvailableToast } from './screens/UpdateAvailableToast';

const CreateTableScreen = lazy(() =>
  import('./screens/CreateTableScreen').then((m) => ({ default: m.CreateTableScreen })),
);
const JoinTableScreen = lazy(() =>
  import('./screens/JoinTableScreen').then((m) => ({ default: m.JoinTableScreen })),
);
const LobbyScreen = lazy(() =>
  import('./screens/LobbyScreen').then((m) => ({ default: m.LobbyScreen })),
);
const WriteChitsScreen = lazy(() =>
  import('./screens/WriteChitsScreen').then((m) => ({ default: m.WriteChitsScreen })),
);
const BottleSpinScreen = lazy(() =>
  import('./screens/BottleSpinScreen').then((m) => ({ default: m.BottleSpinScreen })),
);
const ChosenScreen = lazy(() =>
  import('./screens/ChosenScreen').then((m) => ({ default: m.ChosenScreen })),
);
const PerformScreen = lazy(() =>
  import('./screens/PerformScreen').then((m) => ({ default: m.PerformScreen })),
);
const VoteScreen = lazy(() =>
  import('./screens/VoteScreen').then((m) => ({ default: m.VoteScreen })),
);
const ResultScreen = lazy(() =>
  import('./screens/ResultScreen').then((m) => ({ default: m.ResultScreen })),
);
const PodiumScreen = lazy(() =>
  import('./screens/PodiumScreen').then((m) => ({ default: m.PodiumScreen })),
);
const SummaryLootScreen = lazy(() =>
  import('./screens/SummaryLootScreen').then((m) => ({ default: m.SummaryLootScreen })),
);
const TableModeScreen = lazy(() =>
  import('./screens/TableModeScreen').then((m) => ({ default: m.TableModeScreen })),
);
const RoomClosedScreen = lazy(() =>
  import('./screens/RoomClosedScreen').then((m) => ({ default: m.RoomClosedScreen })),
);
const InAppBrowserHelp = lazy(() =>
  import('./screens/InAppBrowserHelp').then((m) => ({ default: m.InAppBrowserHelp })),
);

export const VOWLET_TAGLINE = 'A little truth, a little trouble';

function ScreenFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-dvh w-full items-center justify-center px-4 text-sm font-medium opacity-70"
    >
      Setting the table…
    </div>
  );
}

export function App() {
  const setAuth = useGameStore((s) => s.setAuth);
  const consentAccepted = useGameStore((s) => s.consentAccepted);
  const route = useGameStore((s) => s.route);
  const setRoute = useGameStore((s) => s.setRoute);
  const room = useGameStore((s) => s.room);
  const tableDisplayActive = useGameStore((s) => s.tableDisplayActive);
  const passThePhone = useGameStore((s) => s.passThePhone);
  const podiumSubView = useGameStore((s) => s.podiumSubView);
  const toast = useGameStore((s) => s.toast);
  const reducedMotionOverride = useGameStore((s) => s.reducedMotionOverride);
  const isInApp = useMemo(() => detectInAppBrowser().isInApp, []);

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
      if (tableDisplayActive && room.phase !== 'CLOSED') {
        return <TableModeScreen />;
      }
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
          return <SummaryLootScreen />;
        case 'PODIUM':
          return podiumSubView === 'SUMMARY' ? <SummaryLootScreen /> : <PodiumScreen />;
        case 'CLOSED':
          return <RoomClosedScreen />;
      }
    }

    return <HomeScreen />;
  };

  return (
    <MotionConfig reducedMotion={reducedMotionOverride ? 'always' : 'user'}>
      <SharedSvgDefs />
      <div className="min-h-dvh w-full overflow-x-hidden">
        <ReconnectingBanner />
        {isInApp && (
          <Suspense fallback={null}>
            <InAppBrowserHelp />
          </Suspense>
        )}
        {passThePhone && route === 'ROOM' && room && room.phase !== 'LOBBY' && room.phase !== 'CLOSED' && (
          <div
            role="status"
            data-testid="pass-the-phone-banner"
            className="bg-[var(--color-brass)] px-3 py-1.5 text-center text-xs font-bold text-[var(--color-cream)]"
          >
            Pass-the-Phone Mode active — hand device to the active player
          </div>
        )}
        <Suspense fallback={<ScreenFallback />}>{renderContent()}</Suspense>

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
