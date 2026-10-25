import React from 'react';
import { useNavigate } from 'react-router-dom';
import { StickerAvatar } from '../../components/StickerAvatar';
import { RankLabel, XpBar } from '../../components/RankLabel';
import { Chit } from '../../components/Chit';
import { Button } from '../../components/Button';
import { BottomNav } from '../../components/BottomNav';
import { useAuthStore } from '../auth/authStore';
import { progress, legacyToTotalXp } from '../../game/xp';

export const HomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuthStore();

  const totalXp = profile?.totalXp ?? (profile ? legacyToTotalXp(profile.level || 1, profile.xp || 0) : 0);
  const xpInfo = progress(totalXp);
  const userLevel = xpInfo.level;
  const currentXp = xpInfo.xpInLevel;
  const neededXp = xpInfo.neededForNext;
  const displayName = profile?.displayName || 'Player';
  const avatarId = profile?.avatarId || 'fox';

  return (
    <div className="w-full flex-1 flex flex-col justify-between pb-24 max-w-[390px] mx-auto">
      {/* Top Row: User status WITHOUT a card box (Section 3.2 Spacious rule) */}
      <div className="pt-2 pb-4 space-y-3">
        <div className="flex items-center gap-3">
          <StickerAvatar
            avatarId={avatarId}
            size="md"
            onClick={() => navigate('/setup')}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-black text-ink truncate">
                {displayName}
              </h2>
              <RankLabel level={userLevel} />
            </div>
            <div className="mt-1">
              <XpBar currentXp={currentXp} neededXp={neededXp} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area (max 3 content blocks above the fold) */}
      <div className="space-y-6">
        {/* Block 1: Hero Taped Chit */}
        <div className="relative">
          <Chit
            id="home-hero-chit"
            type="truth"
            taped
            stamp="FINE"
            text="Two fresh chits are waiting for your crew tonight."
          />
          <div className="mt-3">
            <Button
              variant="primary"
              size="md"
              fullWidth
              onClick={() => navigate('/create')}
            >
              Start Table Pass
            </Button>
          </div>
        </div>

        {/* Block 2: Friends Table Card */}
        <div className="p-5 bg-chit border-2 border-ink shadow-hard rounded-btn space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-dare">
                MULTIPLAYER TABLE
              </span>
              <h3 className="font-display text-2xl font-bold text-ink">
                Friends Table
              </h3>
            </div>
            <span className="text-2xl">🎲</span>
          </div>

          <p className="font-sans text-sm text-ink-muted">
            Write chits, spin, get judged by the owl.
          </p>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => navigate('/create')}
            >
              Create
            </Button>
            <Button
              variant="quiet"
              size="md"
              className="border-2 border-ink bg-chit-shade"
              fullWidth
              onClick={() => navigate('/join')}
            >
              Join
            </Button>
          </div>
        </div>

        {/* Block 3: Row of Two Small Square Tiles (Icon and Title only) */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/table/local/write')}
            className="p-4 bg-chit border-2 border-ink shadow-hard-sm rounded-btn flex flex-col items-center justify-center gap-1.5 btn-press"
          >
            <span className="text-2xl">🎯</span>
            <span className="font-mono text-xs font-bold uppercase text-ink">
              Daily Spin
            </span>
          </button>

          <button
            onClick={() => navigate('/loot')}
            className="p-4 bg-chit border-2 border-ink shadow-hard-sm rounded-btn flex flex-col items-center justify-center gap-1.5 btn-press"
          >
            <span className="text-2xl">🍾</span>
            <span className="font-mono text-xs font-bold uppercase text-ink">
              Loot Shelf
            </span>
          </button>
        </div>
      </div>

      {/* Global Bottom Navigation */}
      <BottomNav currentTab="table" />
    </div>
  );
};
