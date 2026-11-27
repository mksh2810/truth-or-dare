import { Suspense, lazy, useEffect, useMemo, useRef } from 'react';
import { MotionConfig } from 'framer-motion';
import { Mic, MicOff, PhoneOff } from 'lucide-react';
import { subscribeAuth } from './auth/firebase';
import { SharedSvgDefs } from './design/VowletUiPrimitives';
import { useMediaCall } from './media/useMediaCall';
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
const TestingModeDock = lazy(() =>
  import('./dev/TestingModeDock').then((m) => ({ default: m.TestingModeDock })),
);

const showTestingDock =
  import.meta.env.DEV || import.meta.env.VITE_LOCAL_API === 'true';

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

function RemoteAudioTrack({ stream }: { stream: MediaStream }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (el.srcObject !== stream) {
      el.srcObject = stream;
    }
  }, [stream]);

  return <audio ref={audioRef} autoPlay playsInline className="hidden" />;
}

function RemoteAudioMixer({ myUid }: { myUid: string | null }) {
  const remoteStreams = useMediaCall((s) => s.remoteStreams);
  const entries = Object.entries(remoteStreams).filter(([uid]) => uid !== myUid);
  if (entries.length === 0) return null;
  return (
    <div aria-hidden="true" className="hidden">
      {entries.map(([uid, stream]) => (
        <RemoteAudioTrack key={uid} stream={stream} />
      ))}
    </div>
  );
}

export function App() {
  const setAuth = useGameStore((s) => s.setAuth);
  const auth = useGameStore((s) => s.auth);
  const consentAccepted = useGameStore((s) => s.consentAccepted);
  const route = useGameStore((s) => s.route);
  const setRoute = useGameStore((s) => s.setRoute);
  const room = useGameStore((s) => s.room);
  const players = useGameStore((s) => s.players);
  const turn = useGameStore((s) => s.turn);
  const tableDisplayActive = useGameStore((s) => s.tableDisplayActive);
  const passThePhone = useGameStore((s) => s.passThePhone);
  const podiumSubView = useGameStore((s) => s.podiumSubView);
  const toast = useGameStore((s) => s.toast);
  const reducedMotionOverride = useGameStore((s) => s.reducedMotionOverride);
  const isInApp = useMemo(() => detectInAppBrowser().isInApp, []);

  const voiceJoined = useMediaCall((s) => s.voiceJoined);
  const micMuted = useMediaCall((s) => s.micMuted);
  const toggleMic = useMediaCall((s) => s.toggleMic);
  const leaveVoice = useMediaCall((s) => s.leaveVoice);
  const syncRoomContext = useMediaCall((s) => s.syncRoomContext);

  useEffect(() => {
    const inActiveRoom = route === 'ROOM' && room && room.phase !== 'CLOSED';
    syncRoomContext({
      roomCode: inActiveRoom ? room.code : null,
      myUid: auth?.uid ?? null,
      peerUids: players.filter((p) => !p.banned).map((p) => p.uid),
      phase: inActiveRoom ? room.phase : null,
      turnKind: inActiveRoom ? (turn?.kind ?? null) : null,
    });
  }, [route, room, auth?.uid, players, turn?.kind, syncRoomContext]);

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
        {voiceJoined && route === 'ROOM' && room && room.phase !== 'CLOSED' && (
          <div
            data-testid="active-voice-call-pill"
            className="fixed top-2 right-2 z-40 flex items-center gap-1 rounded-full border border-[#d9b061]/70 bg-[#1b110a]/95 p-1 shadow-md backdrop-blur-sm"
          >
            <button
              type="button"
              onClick={() => toggleMic()}
              aria-label={micMuted ? 'Unmute microphone' : 'Mute microphone'}
              data-testid="voice-pill-mic-btn"
              className={`inline-flex min-h-[36px] items-center gap-1 rounded-full px-2.5 text-xs font-semibold ${
                micMuted
                  ? 'bg-[#5c2116] text-[#f9e5be]'
                  : 'bg-[#244429] text-[#f6f1e9]'
              }`}
            >
              {micMuted ? <MicOff size={13} aria-hidden="true" /> : <Mic size={13} aria-hidden="true" />}
              <span>{micMuted ? 'Muted' : 'Mic'}</span>
            </button>
            <button
              type="button"
              onClick={() => leaveVoice()}
              aria-label="Leave voice call"
              data-testid="voice-pill-leave-btn"
              className="grid min-h-[36px] min-w-[36px] place-items-center rounded-full bg-[#392719] text-[#f7e5c9]"
            >
              <PhoneOff size={13} aria-hidden="true" />
            </button>
          </div>
        )}
        <RemoteAudioMixer myUid={auth?.uid ?? null} />
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
        {showTestingDock && (
          <Suspense fallback={null}>
            <TestingModeDock />
          </Suspense>
        )}
      </div>
    </MotionConfig>
  );
}

export default App;
