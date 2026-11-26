import type { ReactNode } from 'react';
import { Check, Crown, Moon, WifiOff } from 'lucide-react';
import type { PlayerDoc, PresenceNode } from '@vowlet/shared';

export interface RadialTableProps {
  players: readonly PlayerDoc[];
  presence: Record<string, PresenceNode>;
  myUid: string | null;
  hostUid: string;
  activePerformerUid?: string | null;
  isHost?: boolean;
  showReadyBadge?: boolean;
  onSelectPlayer?: (player: PlayerDoc) => void;
  centerContent?: ReactNode;
}

export function RadialTable({
  players,
  presence,
  myUid,
  hostUid,
  activePerformerUid = null,
  isHost = false,
  showReadyBadge = false,
  onSelectPlayer,
  centerContent,
}: RadialTableProps) {
  const activePlayers = players
    .filter((p) => !p.banned && !p.spectator)
    .slice()
    .sort((a, b) => a.seat - b.seat)
    .slice(0, 8);

  const seatCount = Math.max(1, activePlayers.length);
  const myPlayer = activePlayers.find((p) => p.uid === myUid);
  const mySeatIndex = myPlayer ? activePlayers.indexOf(myPlayer) : 0;

  // Compact container sized for 360px phones with zero horizontal overflow
  const sizePx = 312;
  const center = sizePx / 2;
  const radius = 112;

  return (
    <div
      data-testid="radial-table"
      className="relative mx-auto flex items-center justify-center select-none"
      style={{ width: sizePx, height: sizePx, maxWidth: '100%' }}
    >
      {/* Table ring */}
      <div
        aria-hidden="true"
        className="absolute rounded-full"
        style={{
          width: radius * 2,
          height: radius * 2,
          border: '1.5px dashed rgba(255, 253, 249, 0.22)',
          background: 'radial-gradient(circle, rgba(184,137,59,0.12) 0%, rgba(26,20,16,0.35) 72%)',
        }}
      />

      {/* Center slot (e.g., BottleSpinner or empty state) */}
      <div className="relative z-10 flex items-center justify-center">{centerContent}</div>

      {/* Seats */}
      {activePlayers.map((player, idx) => {
        const relativeIdx = (idx - mySeatIndex + seatCount) % seatCount;
        // 0 -> bottom (180 deg / 6 o'clock), advancing clockwise
        const angleDeg = (180 + (relativeIdx * 360) / seatCount) % 360;
        const rad = ((angleDeg - 90) * Math.PI) / 180;
        const x = center + radius * Math.cos(rad);
        const y = center + radius * Math.sin(rad);

        const pNode = presence[player.uid];
        const isOnline = pNode ? pNode.online : true;
        const isAway = pNode ? pNode.away : false;
        const isSelf = player.uid === myUid;
        const isPlayerHost = player.uid === hostUid;
        const isPerformer = player.uid === activePerformerUid;
        const canTap = Boolean(onSelectPlayer && !isSelf && (isHost || true));

        let statusBadge: { label: string; color: string; icon: JSX.Element } | null = null;
        if (!isOnline) {
          statusBadge = {
            label: 'Offline',
            color: '#F2A094',
            icon: <WifiOff className="h-3 w-3" aria-hidden="true" />,
          };
        } else if (isAway) {
          statusBadge = {
            label: 'Away',
            color: '#F4C97A',
            icon: <Moon className="h-3 w-3" aria-hidden="true" />,
          };
        } else if (showReadyBadge && player.ready) {
          statusBadge = {
            label: 'Ready',
            color: '#A7D7A6',
            icon: <Check className="h-3 w-3" aria-hidden="true" />,
          };
        }

        return (
          <button
            key={player.uid}
            type="button"
            disabled={!canTap}
            onClick={() => canTap && onSelectPlayer?.(player)}
            data-testid={`seat-${player.seat}`}
            aria-label={`${player.name}${isPlayerHost ? ', Host' : ''}${isSelf ? ', You' : ''}${
              statusBadge ? `, ${statusBadge.label}` : ''
            }`}
            className="absolute z-20 flex min-h-[44px] min-w-[44px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-2xl px-1.5 py-1 transition-transform active:scale-95"
            style={{
              left: x,
              top: y,
              maxWidth: 84,
              backgroundColor: isPerformer
                ? 'rgba(196, 85, 45, 0.92)'
                : isSelf
                  ? 'rgba(46, 94, 107, 0.9)'
                  : 'rgba(26, 20, 16, 0.86)',
              border: isPerformer
                ? '2px solid #FFFDF9'
                : isSelf
                  ? '1.5px solid #B8893B'
                  : '1px solid rgba(255, 253, 249, 0.22)',
              boxShadow: 'var(--shadow-seal)',
            }}
          >
            <div className="flex items-center gap-1">
              <span className="text-sm leading-none" aria-hidden="true">
                {player.avatar || '🦉'}
              </span>
              {isPlayerHost && (
                <Crown
                  className="h-3.5 w-3.5 shrink-0"
                  style={{ color: 'var(--color-brass)' }}
                  aria-hidden="true"
                />
              )}
            </div>
            <span className="mt-0.5 max-w-[72px] truncate text-[11px] font-semibold text-[var(--color-cream)]">
              {player.name}
            </span>
            {statusBadge && (
              <span
                className="mt-0.5 inline-flex items-center gap-0.5 text-[10px] font-medium"
                style={{ color: statusBadge.color }}
              >
                {statusBadge.icon}
                <span>{statusBadge.label}</span>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
