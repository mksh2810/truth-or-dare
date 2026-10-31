import React, { useState } from 'react';
import { SplashScreen } from '../features/auth/SplashScreen';
import { OnboardingScreen } from '../features/auth/OnboardingScreen';
import { ProfileSetupScreen } from '../features/auth/ProfileSetupScreen';
import { HomeScreen } from '../features/home/HomeScreen';
import { CreateTableScreen } from '../features/table/CreateTableScreen';
import { JoinTableScreen } from '../features/table/JoinTableScreen';
import { LobbyScreen } from '../features/table/LobbyScreen';
import { WriteChitsScreen, WriteChitState } from '../features/write/WriteChitsScreen';
import { SpinScreen } from '../features/play/SpinScreen';
import { PerformTruthScreen } from '../features/play/PerformTruthScreen';
import { PerformDareScreen } from '../features/play/PerformDareScreen';
import { VoteScreen, VoteScreenState } from '../features/vote/VoteScreen';
import { ResultScreen } from '../features/vote/ResultScreen';
import { SummaryScreen } from '../features/table/SummaryScreen';
import { LootScreen } from '../features/loot/LootScreen';
import { MeScreen } from '../features/me/MeScreen';

const SCREENS = [
  { id: 'splash', label: '1. Splash & Sign-in' },
  { id: 'onboarding', label: '2. Onboarding (3 steps)' },
  { id: 'setup', label: '3. Profile Setup' },
  { id: 'home', label: '4. Home' },
  { id: 'create', label: '5. Create Table' },
  { id: 'join', label: '6. Join Table' },
  { id: 'lobby', label: '7. Lobby (Round Table)' },
  { id: 'write_idle', label: '8a. Write Chits (Idle)' },
  { id: 'write_judging', label: '8b. Write Chits (Judging)' },
  { id: 'write_fine', label: '8c. Write Chits (FINE)' },
  { id: 'write_nope', label: '8d. Write Chits (NOPE)' },
  { id: 'write_mild', label: '8e. Write Chits (TOO MILD)' },
  { id: 'write_offline', label: '8f. Write Chits (Offline)' },
  { id: 'spin', label: '9. Spin Screen' },
  { id: 'perform_truth', label: '10. Perform Truth' },
  { id: 'perform_dare_room', label: '11a. Perform Dare (In Room)' },
  { id: 'perform_dare_live', label: '11b. Perform Dare (Remote Live)' },
  { id: 'vote_waiting', label: '12a. Vote (Waiting)' },
  { id: 'vote_reveal', label: '12b. Vote (Reveal)' },
  { id: 'vote_tie', label: '12c. Vote (Tie Break)' },
  { id: 'result_pass', label: '13a. Result (PASSED)' },
  { id: 'result_fail', label: '13b. Result (NOT IT)' },
  { id: 'result_skip', label: '13c. Result (Skipped)' },
  { id: 'summary', label: '14. Summary & Podium' },
  { id: 'loot', label: '15. Loot (Bottle Shelf)' },
  { id: 'me', label: '16. Me (Profile & Stats)' },
] as const;

export default function DevScreens() {
  const [selectedScreen, setSelectedScreen] = useState<string>('home');
  const [viewportWidth, setViewportWidth] = useState<'360px' | '390px' | '430px'>('390px');

  const renderScreen = () => {
    switch (selectedScreen) {
      case 'splash':
        return <SplashScreen />;
      case 'onboarding':
        return <OnboardingScreen />;
      case 'setup':
        return <ProfileSetupScreen />;
      case 'home':
        return <HomeScreen />;
      case 'create':
        return <CreateTableScreen />;
      case 'join':
        return <JoinTableScreen isGuest />;
      case 'lobby':
        return <LobbyScreen isHost />;
      case 'write_idle':
        return <WriteChitsScreen step={1} state="idle" />;
      case 'write_judging':
        return <WriteChitsScreen step={1} state="judging" />;
      case 'write_fine':
        return <WriteChitsScreen step={1} state="FINE" />;
      case 'write_nope':
        return <WriteChitsScreen step={2} state="NOPE" />;
      case 'write_mild':
        return <WriteChitsScreen step={2} state="TOO MILD" />;
      case 'write_offline':
        return <WriteChitsScreen step={1} state="offline" />;
      case 'spin':
        return <SpinScreen />;
      case 'perform_truth':
        return <PerformTruthScreen />;
      case 'perform_dare_room':
        return <PerformDareScreen isRemoteLive={false} />;
      case 'perform_dare_live':
        return <PerformDareScreen isRemoteLive={true} />;
      case 'vote_waiting':
        return <VoteScreen state="waiting" />;
      case 'vote_reveal':
        return <VoteScreen state="reveal" />;
      case 'vote_tie':
        return <VoteScreen state="tie" />;
      case 'result_pass':
        return <ResultScreen outcome="pass" xpGained={50} streak={3} />;
      case 'result_fail':
        return <ResultScreen outcome="fail" xpGained={10} streak={0} />;
      case 'result_skip':
        return <ResultScreen outcome="skip" xpGained={0} streak={0} />;
      case 'summary':
        return <SummaryScreen />;
      case 'loot':
        return <LootScreen />;
      case 'me':
        return <MeScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <div className="w-full min-h-screen py-4 flex flex-col items-center">
      {/* Top Floating Control Bar */}
      <div className="w-full max-w-[430px] mb-4 p-3 bg-chit border-2 border-ink shadow-hard rounded-btn space-y-2 sticky top-2 z-50">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs font-bold uppercase text-ink">
            Static Screens Catalog
          </span>
          <div className="flex items-center gap-1">
            {(['360px', '390px', '430px'] as const).map((w) => (
              <button
                key={w}
                onClick={() => setViewportWidth(w)}
                className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded border ${
                  viewportWidth === w ? 'bg-ink text-white' : 'bg-chit-shade text-ink'
                }`}
              >
                {w}
              </button>
            ))}
          </div>
        </div>

        <select
          value={selectedScreen}
          onChange={(e) => setSelectedScreen(e.target.value)}
          className="w-full h-10 px-2 bg-chit-shade border-2 border-ink rounded font-mono text-xs font-bold uppercase text-ink focus:outline-none"
        >
          {SCREENS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Viewport Frame */}
      <div
        style={{ width: `min(100%, ${viewportWidth})` }}
        className="min-h-[780px] max-w-full bg-paper border-2 border-ink/40 shadow-hard-lg rounded-2xl p-4 flex flex-col justify-between transition-all duration-200"
      >
        {renderScreen()}
      </div>
    </div>
  );
}
