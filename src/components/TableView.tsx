import React from 'react';
import { StickerAvatar, StickerAvatarState } from './StickerAvatar';
import { getSeededTilt } from '../lib/tilt';

export interface TablePlayer {
  uid: string;
  name: string;
  avatarId: string;
  state?: StickerAvatarState;
  isHost?: boolean;
}

export interface TableViewProps {
  players: TablePlayer[];
  maxPlayers?: number;
  performerUid?: string | null;
  centerElement?: React.ReactNode;
  className?: string;
  onSeatClick?: (player: TablePlayer) => void;
}

export const TableView: React.FC<TableViewProps> = ({
  players,
  maxPlayers = 6,
  performerUid,
  centerElement,
  className = '',
  onSeatClick,
}) => {
  const totalSlots = Math.max(players.length, Math.min(maxPlayers, 8));
  const center = 145;
  const radius = 102; // px from center to seat center

  return (
    <div className={`relative w-[290px] h-[290px] mx-auto select-none ${className}`}>
      {/* Wood-textured or circular felt party table surface */}
      <div className="absolute inset-3 rounded-full border-4 border-ink bg-[#F5EDE6] shadow-hard flex items-center justify-center">
        {/* Subtle table rim groove */}
        <div className="absolute inset-2 rounded-full border border-ink/20 pointer-events-none" />

        {/* Center content (e.g. spinning bottle, active chit, or text) */}
        <div className="relative z-10 flex items-center justify-center">
          {centerElement || (
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-ink/30 flex items-center justify-center font-mono text-[10px] text-ink-muted">
              TABLE
            </div>
          )}
        </div>
      </div>

      {/* Seats arranged circularly */}
      {Array.from({ length: totalSlots }).map((_, i) => {
        const player = players[i];
        // Calculate angle around circle
        const angle = (i / totalSlots) * 2 * Math.PI - Math.PI / 2;
        // Deterministic offset to look natural and slightly messy
        const offsetDist = getSeededTilt(`seat-${i}`, -4, 4);
        const effectiveRadius = radius + offsetDist;

        const x = center + effectiveRadius * Math.cos(angle);
        const y = center + effectiveRadius * Math.sin(angle);

        if (!player) {
          // Empty seat (dashed circle)
          return (
            <div
              key={`empty-${i}`}
              style={{ left: `${x}px`, top: `${y}px` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none"
            >
              <div className="w-12 h-12 rounded-full border-2 border-dashed border-ink/40 bg-paper/60 flex items-center justify-center text-ink-muted text-xs">
                +
              </div>
            </div>
          );
        }

        const isPerformer = performerUid === player.uid;
        const playerState: StickerAvatarState = isPerformer
          ? 'active'
          : player.state || 'idle';

        return (
          <div
            key={player.uid}
            onClick={() => onSeatClick?.(player)}
            style={{ left: `${x}px`, top: `${y}px` }}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer z-20 group"
          >
            <StickerAvatar
              avatarId={player.avatarId}
              state={playerState}
              size="sm"
            />
            <div className="mt-1 px-1.5 py-0.2 bg-paper border border-ink shadow-sm rounded text-[10px] font-mono font-bold text-ink truncate max-w-[68px] text-center">
              {player.name} {player.isHost ? '★' : ''}
            </div>
          </div>
        );
      })}
    </div>
  );
};
