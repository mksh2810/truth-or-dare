import React from 'react';
import { getRankTitle } from '../data/ranks';

export interface RankLabelProps {
  level: number;
  className?: string;
  showLevelNumber?: boolean;
}

export const RankLabel: React.FC<RankLabelProps> = ({
  level,
  className = '',
  showLevelNumber = true,
}) => {
  const title = getRankTitle(level);

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      {showLevelNumber && (
        <span className="px-1.5 py-0.5 bg-ink text-white font-mono text-[10px] font-bold uppercase rounded">
          LV.{level}
        </span>
      )}
      <span className="font-mono text-xs font-bold uppercase text-ink tracking-wide">
        {title}
      </span>
    </div>
  );
};

export interface XpBarProps {
  currentXp: number;
  neededXp: number;
  className?: string;
}

export const XpBar: React.FC<XpBarProps> = ({
  currentXp,
  neededXp,
  className = '',
}) => {
  const percentage = Math.min(100, Math.max(0, (currentXp / Math.max(1, neededXp)) * 100));

  return (
    <div className={`w-full space-y-1 ${className}`}>
      <div className="flex justify-between items-center text-[11px] font-mono text-ink-muted">
        <span>XP</span>
        <span>
          {currentXp} / {neededXp} XP
        </span>
      </div>
      <div className="w-full h-3 bg-chit-shade border-2 border-ink rounded-full overflow-hidden relative shadow-[inset_1px_1px_0px_rgba(0,0,0,0.1)]">
        <div
          style={{ width: `${percentage}%` }}
          className="h-full bg-highlighter border-r-2 border-ink transition-all duration-300"
        />
      </div>
    </div>
  );
};
