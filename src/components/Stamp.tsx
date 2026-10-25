import React from 'react';

export type StampType = 'FINE' | 'NOPE' | 'TOO MILD' | 'NOT DOABLE' | 'PASSED' | 'NOT IT';

export interface StampProps {
  type: StampType;
  size?: 'sm' | 'md' | 'lg';
  rotation?: number; // degrees
  className?: string;
}

export const Stamp: React.FC<StampProps> = ({
  type,
  size = 'md',
  rotation = -6,
  className = '',
}) => {
  const isGreen = type === 'FINE' || type === 'PASSED';
  const isYellow = type === 'TOO MILD';
  const isRed = type === 'NOPE' || type === 'NOT DOABLE' || type === 'NOT IT';

  const colorClass = isGreen
    ? 'border-pass text-pass bg-pass/10'
    : isYellow
    ? 'border-[#D97706] text-[#B45309] bg-[#FDE68A]/30'
    : 'border-fail text-fail bg-fail/10';

  const sizeClass = {
    sm: 'px-2 py-0.5 text-xs tracking-wider border-2',
    md: 'px-3 py-1 text-sm tracking-widest border-2',
    lg: 'px-5 py-2 text-xl font-black tracking-widest border-4',
  }[size];

  return (
    <div
      style={{ transform: `rotate(${rotation}deg)` }}
      className={`inline-block font-mono font-black uppercase rounded-sm border-dashed select-none pointer-events-none drop-shadow-sm ${colorClass} ${sizeClass} ${className}`}
    >
      <div className="border border-current px-1.5 py-0.5 rounded-[2px]">
        {type}
      </div>
    </div>
  );
};
