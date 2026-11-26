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
  showSpinGlow?: boolean;
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
  showSpinGlow = false,
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
  const sizePx = 316;
  const center = sizePx / 2;
  const radius = 110;
  const tableDiameter = 278;

  return (
    <div
      data-testid="radial-table"
      className="relative mx-auto flex items-center justify-center select-none"
      style={{ width: sizePx, height: sizePx, maxWidth: '100%' }}
    >
      {/* Rich Walnut/Oak Wooden Table */}
      <div
        aria-hidden="true"
        className="absolute rounded-full"
        style={{
          width: tableDiameter,
          height: tableDiameter,
          background:
            'radial-gradient(circle at 46% 36%, #8C5C36 0%, #633D20 48%, #3F2411 82%, #2B170A 100%)',
          border: '3px solid #9A7130',
          boxShadow:
            '0 14px 34px rgba(0, 0, 0, 0.68), inset 0 2px 12px rgba(244, 201, 122, 0.25), inset 0 -10px 22px rgba(0, 0, 0, 0.55)',
        }}
      />

      {/* Inner Carved Wood Ring */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute rounded-full"
        style={{
          width: tableDiameter - 22,
          height: tableDiameter - 22,
          border: '1px solid rgba(244, 201, 122, 0.25)',
        }}
      />

      {/* Concentric Golden Spin Glow Rings */}
      {showSpinGlow && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <span
            className="absolute rounded-full"
            style={{
              width: 196,
              height: 196,
              border: '1.5px solid rgba(244, 201, 122, 0.32)',
              boxShadow: '0 0 24px rgba(244, 201, 122, 0.16)',
            }}
          />
          <span
            className="absolute rounded-full"
            style={{
              width: 152,
              height: 152,
              border: '1.5px solid rgba(244, 201, 122, 0.45)',
              boxShadow: '0 0 20px rgba(244, 201, 122, 0.22)',
            }}
          />
          <span
            className="absolute rounded-full"
            style={{
              width: 112,
              height: 112,
              border: '1px solid rgba(255, 240, 200, 0.55)',
              background: 'radial-gradient(circle, rgba(244,201,122,0.22) 0%, transparent 72%)',
            }}
          />
        </div>
      )}

      {/* Center slot (BottleSpinner or Table Ready) */}
      <div className="relative z-10 flex items-center justify-center">{centerContent}</div>

      {/* Seats */}
      {activePlayers.map((player, idx) => {
        const relativeIdx = (idx - mySeatIndex + seatCount) % seatCount;
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
            icon: <WifiOff className="h-2.5 w-2.5" aria-hidden="true" />,
          };
        } else if (isAway) {
          statusBadge = {
            label: 'Away',
            color: '#F4C97A',
            icon: <Moon className="h-2.5 w-2.5" aria-hidden="true" />,
          };
        } else if (showReadyBadge && player.ready) {
          statusBadge = {
            label: 'Ready',
            color: '#A7D7A6',
            icon: <Check className="h-2.5 w-2.5" aria-hidden="true" />,
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
            className="absolute z-20 flex min-h-[44px] min-w-[44px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center transition-transform active:scale-95"
            style={{
              left: x,
              top: y,
              maxWidth: 82,
            }}
          >
            {/* Circular Avatar Medallion */}
            <div
              className="relative flex h-11 w-11 items-center justify-center rounded-full"
              style={{
                background: isPerformer
                  ? 'linear-gradient(145deg, #F4C97A 0%, #C4552D 100%)'
                  : isSelf
                    ? 'linear-gradient(145deg, #3C7685 0%, #234954 100%)'
                    : 'linear-gradient(145deg, #4E3726 0%, #24170E 100%)',
                border: isPerformer
                  ? '2.5px solid #FFF7DF'
                  : isSelf
                    ? '2px solid #D9A952'
                    : '1.5px solid rgba(244, 201, 122, 0.45)',
                boxShadow: isPerformer
                  ? '0 0 18px 4px rgba(244, 201, 122, 0.78)'
                  : '0 4px 10px rgba(0, 0, 0, 0.5)',
              }}
            >
              {isPlayerHost && (
                <Crown
                  className="absolute -top-3 h-4 w-4 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                  style={{ color: '#F4C97A' }}
                  aria-hidden="true"
                />
              )}
              <span className="text-lg leading-none" aria-hidden="true">
                {player.avatar || '🦉'}
              </span>
              {showReadyBadge && player.ready && isOnline && !isAway && (
                <span
                  aria-hidden="true"
                  className="absolute -right-0.5 -bottom-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-[#1A1410] bg-[#5B8C5A]"
                >
                  <Check className="h-2.5 w-2.5 text-white" />
                </span>
              )}
            </div>

            {/* Name Pill */}
            <span
              className="mt-0.5 max-w-[78px] truncate rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-cream)]"
              style={{
                backgroundColor: isPerformer ? 'rgba(196, 85, 45, 0.92)' : 'rgba(20, 14, 10, 0.84)',
                border: '1px solid rgba(255, 253, 249, 0.14)',
              }}
            >
              {player.name}
            </span>

            {statusBadge && (
              <span
                className="mt-0.5 inline-flex items-center gap-0.5 rounded-full bg-black/70 px-1.5 text-[9px] font-medium"
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
