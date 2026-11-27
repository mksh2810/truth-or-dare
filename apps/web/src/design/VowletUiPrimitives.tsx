import type { CSSProperties, ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Settings } from 'lucide-react';
import type { PlayerDoc, PresenceNode } from '@vowlet/shared';

const AVATAR_PALETTE = [
  '#b96b48',
  '#567b69',
  '#6b7591',
  '#a56d83',
  '#b18a43',
  '#4e7482',
  '#8c5a44',
  '#6b7d53',
];

export function getPlayerInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  return trimmed.charAt(0).toUpperCase();
}

export function getPlayerColor(index: number): string {
  return AVATAR_PALETTE[index % AVATAR_PALETTE.length] ?? '#a56c45';
}

export interface TopBarProps {
  dark?: boolean;
  back?: () => void;
  backLabel?: string;
  onSettings?: () => void;
  rightSlot?: ReactNode;
  title?: string;
}

export function TopBar({
  dark = false,
  back,
  backLabel = 'Back',
  onSettings,
  rightSlot,
  title = 'VOWLET',
}: TopBarProps) {
  return (
    <header className={`topbar ${dark ? 'on-dark' : ''}`}>
      {back ? (
        <button
          type="button"
          className="icon-btn"
          onClick={back}
          aria-label={backLabel}
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
      ) : (
        <span className="brand-dot" aria-hidden="true">
          v.
        </span>
      )}
      <span className="topbar-title">{title}</span>
      {rightSlot ?? (
        onSettings ? (
          <button
            type="button"
            className="icon-btn"
            onClick={onSettings}
            aria-label="Settings"
            data-testid="settings-btn"
          >
            <Settings size={19} aria-hidden="true" />
          </button>
        ) : (
          <span className="min-w-[44px]" aria-hidden="true" />
        )
      )}
    </header>
  );
}

export interface SealProps {
  children?: ReactNode;
  tone?: 'red' | 'green' | 'brass';
  className?: string;
}

export function Seal({ children = '✦', tone = 'red', className = '' }: SealProps) {
  return <span className={`seal seal-${tone} ${className}`}>{children}</span>;
}

export interface MainButtonProps {
  children: ReactNode;
  secondary?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  style?: CSSProperties;
  'data-testid'?: string;
  'aria-label'?: string;
}

export function MainButton({
  children,
  secondary = false,
  onClick,
  disabled = false,
  type = 'button',
  className = '',
  style,
  'data-testid': testId,
  'aria-label': ariaLabel,
}: MainButtonProps) {
  return (
    <button
      type={type}
      className={`main-btn ${secondary ? 'secondary' : ''} ${className}`}
      onClick={onClick}
      disabled={disabled}
      style={style}
      data-testid={testId}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}

export function OwlMark({ className = '' }: { className?: string }) {
  return (
    <div className={`owl-mark ${className}`} aria-label="VOWLET mascot">
      <div className="owl-ear left" />
      <div className="owl-ear right" />
      <div className="owl-face">
        <span className="eye" />
        <span className="eye" />
        <span className="beak" />
      </div>
      <div className="owl-body" />
    </div>
  );
}

export interface BottleProps {
  spinning?: boolean;
  rotate?: number;
  reducedMotion?: boolean;
  durationSec?: number;
  onSpinComplete?: () => void;
}

export function Bottle({
  spinning = false,
  rotate,
  reducedMotion = false,
  durationSec = 4.5,
  onSpinComplete,
}: BottleProps) {
  const osReducedMotion = useReducedMotion();
  const shouldReduce = reducedMotion || Boolean(osReducedMotion);

  if (typeof rotate === 'number') {
    return (
      <motion.div
        className="bottle-wrap"
        initial={false}
        animate={{ rotate }}
        transition={
          shouldReduce
            ? { duration: 0.01 }
            : { duration: durationSec, ease: [0.12, 0.72, 0.18, 1] }
        }
        onAnimationComplete={() => {
          onSpinComplete?.();
        }}
        style={{ transformOrigin: 'center center' }}
      >
        <div className="bottle-cap" />
        <div className="bottle-neck" />
        <div className="bottle-glass">
          <i />
        </div>
      </motion.div>
    );
  }

  return (
    <div className={`bottle-wrap ${spinning && !shouldReduce ? 'spinning' : ''}`}>
      <div className="bottle-cap" />
      <div className="bottle-neck" />
      <div className="bottle-glass">
        <i />
      </div>
    </div>
  );
}

export interface AvatarsProps {
  players?: Array<Pick<PlayerDoc, 'uid' | 'name' | 'avatar'>>;
  compact?: boolean;
}

export function Avatars({ players = [], compact = false }: AvatarsProps) {
  const list = players.slice(0, compact ? 7 : 5);
  return (
    <div className={`avatars ${compact ? 'compact' : ''}`}>
      {list.map((p, i) => (
        <div className="avatar-unit" key={p.uid}>
          <span
            className="avatar"
            style={{ background: getPlayerColor(i) }}
            title={p.name}
          >
            {getPlayerInitials(p.name)}
          </span>
          {!compact && <small>{p.name}</small>}
        </div>
      ))}
    </div>
  );
}

export interface TabletopProps {
  players?: PlayerDoc[];
  presence?: Record<string, PresenceNode>;
  myUid?: string | null;
  hostUid?: string | null;
  activePerformerUid?: string | null;
  spinning?: boolean;
  centerContent?: ReactNode;
  onSelectPlayer?: (player: PlayerDoc) => void;
}

export function Tabletop({
  players = [],
  presence = {},
  myUid = null,
  hostUid = null,
  activePerformerUid = null,
  spinning = false,
  centerContent,
  onSelectPlayer,
}: TabletopProps) {
  const seated = players
    .filter((p) => !p.banned && !p.spectator)
    .slice(0, 8)
    .sort((a, b) => a.seat - b.seat);

  const total = seated.length;
  const myIndex = Math.max(
    0,
    seated.findIndex((p) => p.uid === myUid),
  );

  return (
    <div className="table-scene">
      <div className="table-ring ring-one" />
      <div className="table-ring ring-two" />
      <div className="table-center">
        {centerContent ?? <Bottle spinning={spinning} />}
      </div>
      {seated.map((player, index) => {
        // Rotate table per-device so own seat is always at bottom (90deg)
        const angleRad = Math.PI / 2 + ((index - myIndex) / Math.max(1, total)) * Math.PI * 2;
        const leftPct = 50 + Math.cos(angleRad) * 41;
        const topPct = 50 + Math.sin(angleRad) * 41;
        const isOnline = presence[player.uid]?.online ?? true;
        const isPerformer = activePerformerUid === player.uid;
        const isHost = hostUid === player.uid;

        const seatStyle: CSSProperties = {
          left: `${leftPct.toFixed(2)}%`,
          top: `${topPct.toFixed(2)}%`,
          opacity: isOnline ? 1 : 0.45,
        };

        const avatarStyle: CSSProperties = {
          background: getPlayerColor(index),
          borderColor: isPerformer ? '#f4c97a' : player.ready ? '#8ea879' : '#d6ad69',
          boxShadow: isPerformer
            ? '0 0 0 3px rgba(244, 201, 122, 0.55), 0 4px 12px #130c08aa'
            : undefined,
        };

        const content = (
          <>
            <span className="avatar" style={avatarStyle}>
              {getPlayerInitials(player.name)}
            </span>
            <small>
              {player.name}
              {isHost ? ' ★' : ''}
            </small>
          </>
        );

        if (onSelectPlayer) {
          return (
            <button
              key={player.uid}
              type="button"
              className="seat"
              style={seatStyle}
              onClick={() => onSelectPlayer(player)}
              aria-label={`Player ${player.name}`}
            >
              {content}
            </button>
          );
        }

        return (
          <div key={player.uid} className="seat" style={seatStyle}>
            {content}
          </div>
        );
      })}
    </div>
  );
}

export interface PaperProps {
  title: ReactNode;
  children: ReactNode;
  tone?: 'truth' | 'dare';
  className?: string;
}

export function Paper({ title, children, tone = 'truth', className = '' }: PaperProps) {
  return (
    <div className={`paper prompt-paper ${tone} ${className}`}>
      <div className="paper-title">{title}</div>
      {children}
    </div>
  );
}
