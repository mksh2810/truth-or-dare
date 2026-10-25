import React, { useState } from 'react';
import { StickerAvatar } from '../../components/StickerAvatar';
import { RankLabel, XpBar } from '../../components/RankLabel';
import { BottomNav } from '../../components/BottomNav';
import { Sheet } from '../../components/Sheet';
import { MOCK_USER } from '../../data/mock';

export interface MeScreenProps {
  user?: typeof MOCK_USER;
  onEditProfile?: () => void;
  onSignOut?: () => void;
  onDeleteData?: () => void;
}

export const MeScreen: React.FC<MeScreenProps> = ({
  user = MOCK_USER,
  onEditProfile,
  onSignOut,
  onDeleteData,
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const passRate = user.gamesPlayed > 0
    ? Math.round((user.passes / (user.passes + user.fails)) * 100)
    : 0;

  return (
    <div className="w-full flex-1 flex flex-col justify-between pb-24 max-w-[390px] mx-auto">
      <div className="space-y-6 pt-2">
        {/* User Card */}
        <div className="p-5 bg-chit border-2 border-ink shadow-hard rounded-btn space-y-4">
          <div className="flex items-center gap-4">
            <StickerAvatar avatarId={user.avatarId} size="lg" />
            <div className="flex-1 min-w-0">
              <h2 className="font-display text-2xl font-black text-ink truncate">
                {user.displayName}
              </h2>
              <div className="mt-1">
                <RankLabel level={user.level} />
              </div>
            </div>
          </div>

          <XpBar currentXp={user.xp} neededXp={user.neededXp} />

          <button
            onClick={onEditProfile}
            className="w-full py-2 bg-chit-shade text-ink border border-ink rounded font-mono text-xs font-bold uppercase btn-press"
          >
            Edit Persona
          </button>
        </div>

        {/* 3 Stats in Mono (Games, Pass Rate, Best Streak) */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 bg-chit border-2 border-ink shadow-hard-sm rounded-btn text-center">
            <div className="font-mono text-2xl font-black text-ink">{user.gamesPlayed}</div>
            <div className="font-mono text-[10px] uppercase text-ink-muted">Games</div>
          </div>
          <div className="p-3 bg-chit border-2 border-ink shadow-hard-sm rounded-btn text-center">
            <div className="font-mono text-2xl font-black text-pass">{passRate}%</div>
            <div className="font-mono text-[10px] uppercase text-ink-muted">Pass Rate</div>
          </div>
          <div className="p-3 bg-chit border-2 border-ink shadow-hard-sm rounded-btn text-center">
            <div className="font-mono text-2xl font-black text-dare">{user.bestStreak}</div>
            <div className="font-mono text-[10px] uppercase text-ink-muted">Streak</div>
          </div>
        </div>

        {/* Settings & Danger Zone */}
        <div className="p-4 bg-chit border-2 border-ink shadow-hard-sm rounded-btn space-y-3">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="w-full flex items-center justify-between text-left font-mono text-xs font-bold text-ink hover:text-dare"
          >
            <span>⚙️ Game & Accessibility Settings</span>
            <span>→</span>
          </button>
        </div>
      </div>

      {/* Settings Bottom Sheet */}
      <Sheet
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="Settings"
      >
        <div className="space-y-4">
          {/* Sound toggle */}
          <label className="flex items-center justify-between p-3 bg-chit border-2 border-ink rounded-btn">
            <span className="font-mono text-xs font-bold">Sound Effects</span>
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(e) => setSoundEnabled(e.target.checked)}
              className="w-5 h-5 rounded border-2 border-ink text-dare"
            />
          </label>

          {/* Reduce Motion */}
          <label className="flex items-center justify-between p-3 bg-chit border-2 border-ink rounded-btn">
            <div>
              <span className="font-mono text-xs font-bold block">Reduce Motion</span>
              <span className="text-[10px] text-ink-muted">Swaps spins and shakes for fades</span>
            </div>
            <input
              type="checkbox"
              checked={reduceMotion}
              onChange={(e) => setReduceMotion(e.target.checked)}
              className="w-5 h-5 rounded border-2 border-ink text-dare"
            />
          </label>

          <div className="pt-4 border-t-2 border-ink space-y-2">
            <button
              onClick={onSignOut}
              className="w-full h-11 bg-chit-shade text-ink border-2 border-ink rounded-btn font-mono text-xs font-bold uppercase btn-press"
            >
              Sign Out
            </button>
            <button
              onClick={onDeleteData}
              className="w-full h-11 bg-fail text-white border-2 border-ink rounded-btn font-mono text-xs font-bold uppercase btn-press"
            >
              Delete My Data
            </button>
          </div>
        </div>
      </Sheet>

      <BottomNav currentTab="me" />
    </div>
  );
};
