import React from 'react';

export type StickerAvatarState = 'idle' | 'ready' | 'active' | 'voted' | 'away';

export interface StickerOption {
  id: string;
  name: string;
  emoji: string;
  bgColor: string;
}

export const STICKER_LIST: StickerOption[] = [
  { id: 'owl', name: 'Grumpy Owl', emoji: '🦉', bgColor: '#FEF3C7' },
  { id: 'fox', name: 'Sly Fox', emoji: '🦊', bgColor: '#FFEDD5' },
  { id: 'cat', name: 'Chill Cat', emoji: '🐱', bgColor: '#FCE7F3' },
  { id: 'frog', name: 'Derp Frog', emoji: '🐸', bgColor: '#DCFCE7' },
  { id: 'bear', name: 'Grizzly', emoji: '🐻', bgColor: '#E0E7FF' },
  { id: 'monkey', name: 'Cheeky Ape', emoji: '🐵', bgColor: '#FEF08A' },
  { id: 'tiger', name: 'Wild Tiger', emoji: '🐯', bgColor: '#FED7AA' },
  { id: 'rabbit', name: 'Hoppy Bun', emoji: '🐰', bgColor: '#F3E8FF' },
  { id: 'panda', name: 'Lazy Panda', emoji: '🐼', bgColor: '#F1F5F9' },
  { id: 'lion', name: 'King Lion', emoji: '🦁', bgColor: '#FEF9C3' },
  { id: 'dog', name: 'Goofy Pup', emoji: '🐶', bgColor: '#E2E8F0' },
  { id: 'alien', name: 'Cosmic Bro', emoji: '👽', bgColor: '#CFFAFE' },
];

export interface StickerAvatarProps {
  avatarId?: string;
  state?: StickerAvatarState;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
  showLabel?: boolean;
}

export const StickerAvatar: React.FC<StickerAvatarProps> = ({
  avatarId = 'owl',
  state = 'idle',
  size = 'md',
  className = '',
  onClick,
  showLabel = false,
}) => {
  const sticker = STICKER_LIST.find((s) => s.id === avatarId) || STICKER_LIST[0];

  const sizeClasses = {
    sm: 'w-10 h-10 text-xl',
    md: 'w-14 h-14 text-2xl',
    lg: 'w-20 h-20 text-4xl',
    xl: 'w-28 h-28 text-6xl',
  }[size];

  // Active state: thick red scribble ring (performer)
  const activeRing =
    state === 'active'
      ? 'ring-4 ring-offset-2 ring-dare animate-pulse'
      : '';

  const opacityClass = state === 'away' ? 'opacity-40 grayscale' : 'opacity-100';

  return (
    <div className={`inline-flex flex-col items-center gap-1.5 ${className}`}>
      <div
        onClick={onClick}
        style={{ backgroundColor: sticker.bgColor }}
        className={`relative flex items-center justify-center rounded-[40%_60%_70%_30%/40%_50%_60%_55%] border-2 border-ink shadow-hard-sm cursor-pointer select-none transition-all ${sizeClasses} ${activeRing} ${opacityClass}`}
      >
        <span role="img" aria-label={sticker.name}>
          {sticker.emoji}
        </span>

        {/* Ready Badge: green tick */}
        {state === 'ready' && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-pass text-white text-[11px] font-bold rounded-full border-2 border-ink flex items-center justify-center shadow-sm">
            ✓
          </div>
        )}

        {/* Voted Badge */}
        {state === 'voted' && (
          <div className="absolute -top-1 -right-2 px-1 py-0.2 bg-truth text-white text-[9px] font-mono font-bold uppercase rounded border border-ink shadow-sm">
            Voted
          </div>
        )}
      </div>

      {showLabel && (
        <span className="font-mono text-xs text-ink truncate max-w-[80px]">
          {sticker.name}
        </span>
      )}
    </div>
  );
};
