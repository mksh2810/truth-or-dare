import React from 'react';
import { getSeededTilt } from '../lib/tilt';
import { Stamp, StampType } from './Stamp';

export interface ChitProps {
  id?: string;
  type: 'truth' | 'dare';
  text?: string;
  folded?: boolean;
  stamp?: StampType;
  taped?: boolean;
  tilted?: boolean;
  className?: string;
  onClick?: () => void;
  children?: React.ReactNode;
}

export const Chit: React.FC<ChitProps> = ({
  id = 'chit-default',
  type,
  text,
  folded = false,
  stamp,
  taped = false,
  tilted = false,
  className = '',
  onClick,
  children,
}) => {
  // Respect rule 4: if stamp is present, do not allow both tape and tilt
  const hasStamp = !!stamp;
  const showTape = taped && !hasStamp;
  const rotation = tilted && !showTape ? getSeededTilt(id) : 0;

  const isTruth = type === 'truth';
  const badgeColor = isTruth ? 'bg-truth text-white' : 'bg-dare text-white';
  const accentBorder = isTruth ? 'border-truth' : 'border-dare';

  if (folded) {
    return (
      <div
        onClick={onClick}
        style={{ transform: `rotate(${rotation}deg)` }}
        className={`relative w-48 h-32 bg-chit border-2 border-ink shadow-hard rounded-chit p-4 flex flex-col justify-between cursor-pointer btn-press ${className}`}
      >
        {showTape && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-6 bg-highlighter/80 border border-ink/40 shadow-sm rotate-1" />
        )}
        <div className="flex justify-between items-center">
          <span className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded ${badgeColor}`}>
            {type}
          </span>
          <span className="font-mono text-xs text-ink-muted">FOLDED</span>
        </div>
        <div className="text-center font-display text-lg font-bold text-ink">
          Tap to reveal
        </div>
        <div className="w-full border-b border-dashed border-ink/30" />
      </div>
    );
  }

  return (
    <div
      style={{ transform: rotation ? `rotate(${rotation}deg)` : undefined }}
      className={`relative w-full bg-chit border-2 border-ink shadow-hard rounded-chit chit-clipped p-6 transition-transform ${className}`}
    >
      {/* Tape strip */}
      {showTape && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-24 h-7 bg-highlighter/85 border border-ink/40 shadow-sm -rotate-1 pointer-events-none z-10" />
      )}

      {/* Header bar: Type Badge + Stamp (sitting safely in the top corner without covering text) */}
      <div className="flex justify-between items-start mb-4">
        <span className={`px-2.5 py-1 text-xs font-mono font-bold uppercase rounded ${badgeColor}`}>
          {type}
        </span>
        {stamp && (
          <div className="ml-auto">
            <Stamp type={stamp} size="sm" rotation={getSeededTilt(id + '-stamp', -8, 8)} />
          </div>
        )}
      </div>

      {/* Chit Body: Lined paper effect with handwriting font */}
      <div className="min-h-[110px] lined-paper rounded px-3 py-1 flex items-center">
        {text ? (
          <p className="font-handwriting text-xl md:text-2xl italic text-ink leading-relaxed">
            {text}
          </p>
        ) : (
          children
        )}
      </div>
    </div>
  );
};
