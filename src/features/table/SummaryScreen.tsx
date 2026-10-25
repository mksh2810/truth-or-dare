import React from 'react';
import { StickerAvatar } from '../../components/StickerAvatar';
import { RankLabel } from '../../components/RankLabel';
import { Button } from '../../components/Button';
import { Bottle } from '../../components/Bottle';

export interface SummaryScreenProps {
  onPlayAgain?: () => void;
  onBackHome?: () => void;
  totalXpGained?: number;
  newLevel?: number;
  unlockedItem?: { name: string; type: string } | null;
}

export const SummaryScreen: React.FC<SummaryScreenProps> = ({
  onPlayAgain,
  onBackHome,
  totalXpGained = 180,
  newLevel = 7,
  unlockedItem = { name: 'Green Glass Bottle', type: 'Bottle Skin' },
}) => {
  return (
    <div className="w-full flex-1 flex flex-col justify-between py-6 max-w-[390px] mx-auto text-center">
      <div>
        <span className="font-mono text-xs font-bold uppercase tracking-widest text-ink-muted">
          GAME OVER
        </span>
        <h1 className="font-display text-4xl font-black text-ink mt-1">
          Final Podium
        </h1>
      </div>

      {/* Podium Display */}
      <div className="space-y-6">
        <div className="flex items-end justify-center gap-3 pt-6 pb-2">
          {/* 2nd Place */}
          <div className="flex flex-col items-center">
            <StickerAvatar avatarId="cat" size="md" />
            <span className="font-mono text-xs font-bold mt-1">Zoya</span>
            <div className="w-20 h-16 bg-chit-shade border-2 border-ink rounded-t-btn shadow-hard-sm flex items-center justify-center font-mono text-xl font-bold">
              2
            </div>
          </div>

          {/* 1st Place */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-2xl">
                👑
              </span>
              <StickerAvatar avatarId="fox" size="lg" />
            </div>
            <span className="font-mono text-xs font-bold mt-1">Felix</span>
            <div className="w-24 h-24 bg-highlighter border-2 border-ink rounded-t-btn shadow-hard flex items-center justify-center font-mono text-2xl font-black">
              1
            </div>
          </div>

          {/* 3rd Place */}
          <div className="flex flex-col items-center">
            <StickerAvatar avatarId="frog" size="md" />
            <span className="font-mono text-xs font-bold mt-1">Aman</span>
            <div className="w-20 h-12 bg-chit-shade border-2 border-ink rounded-t-btn shadow-hard-sm flex items-center justify-center font-mono text-xl font-bold">
              3
            </div>
          </div>
        </div>

        {/* Your stats summary line */}
        <div className="p-3 bg-chit border-2 border-ink shadow-hard-sm rounded-btn flex items-center justify-around">
          <div>
            <div className="text-[10px] font-mono uppercase text-ink-muted">XP Gained</div>
            <div className="font-mono text-base font-black text-dare">+{totalXpGained} XP</div>
          </div>
          <div className="w-[1px] h-8 bg-ink/20" />
          <div>
            <div className="text-[10px] font-mono uppercase text-ink-muted">Current Rank</div>
            <RankLabel level={newLevel} />
          </div>
        </div>

        {/* Reward / Unlock card */}
        {unlockedItem && (
          <div className="p-4 bg-white border-2 border-ink shadow-hard rounded-btn flex items-center gap-4 text-left">
            <div className="w-14 h-14 bg-amber-50 border-2 border-ink rounded-btn flex items-center justify-center">
              <Bottle skin="green" />
            </div>
            <div>
              <span className="px-2 py-0.5 bg-highlighter text-ink font-mono text-[10px] font-bold uppercase rounded">
                Unlocked Loot!
              </span>
              <h4 className="font-display text-lg font-bold text-ink mt-0.5">
                {unlockedItem.name}
              </h4>
              <p className="font-mono text-xs text-ink-muted">
                {unlockedItem.type} equippable in Loot shelf
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="pt-6 space-y-3">
        <Button fullWidth onClick={onPlayAgain}>
          Play Again
        </Button>
        <button
          onClick={onBackHome}
          className="font-mono text-xs font-bold text-ink underline underline-offset-4 hover:text-dare block mx-auto"
        >
          ← Back to Home
        </button>
      </div>
    </div>
  );
};
