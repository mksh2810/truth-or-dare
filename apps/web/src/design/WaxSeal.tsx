import { motion } from 'framer-motion';
import { Check, FastForward, Hourglass, Scale, X } from 'lucide-react';
import type { ResultStamp } from '@vowlet/shared';

export interface WaxSealProps {
  stamp: ResultStamp;
  size?: 'md' | 'lg';
}

const SEAL_STYLE: Record<
  ResultStamp,
  { fill: string; highlight: string; ring: string; label: string; icon: JSX.Element }
> = {
  PASSED: {
    fill: '#9C3325',
    highlight: '#C94B38',
    ring: '#5A1B12',
    label: 'PASSED',
    icon: <Check className="h-5 w-5 text-[#F9E7C2]" aria-hidden="true" />,
  },
  'NOT IT': {
    fill: '#8C2A1E',
    highlight: '#B43E30',
    ring: '#4D140D',
    label: 'NOT IT',
    icon: <X className="h-5 w-5 text-[#F9E7C2]" aria-hidden="true" />,
  },
  SPLIT: {
    fill: '#9E732B',
    highlight: '#C99B48',
    ring: '#5C4012',
    label: 'SPLIT',
    icon: <Scale className="h-5 w-5 text-[#F9E7C2]" aria-hidden="true" />,
  },
  SKIPPED: {
    fill: '#47413B',
    highlight: '#686058',
    ring: '#23201C',
    label: 'SKIPPED',
    icon: <FastForward className="h-5 w-5 text-[#F9E7C2]" aria-hidden="true" />,
  },
  STALLED: {
    fill: '#B34822',
    highlight: '#D6643A',
    ring: '#69250E',
    label: 'STALLED',
    icon: <Hourglass className="h-5 w-5 text-[#F9E7C2]" aria-hidden="true" />,
  },
};

export function WaxSeal({ stamp, size = 'lg' }: WaxSealProps) {
  const cfg = SEAL_STYLE[stamp];
  const dim = size === 'lg' ? 136 : 96;
  const gradId = `waxGrad-${stamp.replace(/\s+/g, '')}`;

  return (
    <motion.div
      role="status"
      aria-label={`Result stamp: ${cfg.label}`}
      data-testid="wax-seal"
      initial={{ scale: 1.32, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
      className="relative inline-flex items-center justify-center select-none"
      style={{ width: dim, height: dim }}
    >
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: 'drop-shadow(0 6px 14px rgba(35, 32, 28, 0.34))' }}
      >
        <defs>
          <radialGradient id={gradId} cx="38%" cy="32%" r="68%">
            <stop offset="0%" stopColor={cfg.highlight} />
            <stop offset="65%" stopColor={cfg.fill} />
            <stop offset="100%" stopColor={cfg.ring} />
          </radialGradient>
        </defs>
        {/* Scalloped ornate wax outer edge */}
        <path
          d="M60 5 C67 5 72 10 79 9 C86 8 92 14 98 20 C104 26 111 32 110 40 C109 48 115 54 114 62 C113 70 107 76 106 84 C105 92 98 97 91 102 C84 107 78 114 70 113 C62 112 56 116 48 114 C40 112 35 106 27 104 C19 102 14 95 11 87 C8 79 4 72 6 64 C8 56 5 48 9 40 C13 32 15 25 22 19 C29 13 35 8 43 9 C51 10 53 5 60 5 Z"
          fill={`url(#${gradId})`}
          stroke={cfg.ring}
          strokeWidth="2"
        />
        {/* Outer & inner embossed rings */}
        <circle cx="60" cy="60" r="43" fill="none" stroke="#F6E2B8" strokeOpacity="0.45" strokeWidth="1.5" />
        <circle cx="60" cy="60" r="38" fill="none" stroke={cfg.ring} strokeWidth="2.5" strokeDasharray="3 2.5" />
        <circle cx="60" cy="60" r="34" fill="none" stroke="rgba(255,253,249,0.28)" strokeWidth="1.2" />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 text-[#F9E7C2]">
        {cfg.icon}
        <span className="font-display text-base font-bold tracking-wider uppercase drop-shadow-[0_1px_1px_rgba(0,0,0,0.45)]">
          {cfg.label}
        </span>
      </div>
    </motion.div>
  );
}

export function SmallRedWaxSeal({ size = 44, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={`shrink-0 drop-shadow-[0_3px_6px_rgba(35,32,28,0.45)] ${className}`}
    >
      <defs>
        <radialGradient id="smallRedWax" cx="35%" cy="32%" r="70%">
          <stop offset="0%" stopColor="#CC4E3B" />
          <stop offset="65%" stopColor="#9C3325" />
          <stop offset="100%" stopColor="#5C1B12" />
        </radialGradient>
      </defs>
      <path
        d="M32 4 C36 4 39 7 43 6 C47 5 51 9 54 13 C57 17 60 21 59 26 C58 31 61 34 59 39 C57 44 54 47 51 51 C48 55 43 58 38 57 C33 56 29 59 24 57 C19 55 16 52 12 49 C8 46 6 41 7 36 C8 31 4 27 6 22 C8 17 11 13 15 10 C19 7 23 5 27 6 C30 7 30 4 32 4 Z"
        fill="url(#smallRedWax)"
        stroke="#4A1710"
        strokeWidth="1.5"
      />
      <circle cx="32" cy="32" r="19" fill="none" stroke="#F6E2B8" strokeOpacity="0.45" strokeWidth="1.2" />
      <circle cx="28" cy="29" r="3.2" fill="#F9E7C2" fillOpacity="0.85" />
      <circle cx="36" cy="29" r="3.2" fill="#F9E7C2" fillOpacity="0.85" />
      <circle cx="28" cy="29" r="1.3" fill="#4A1710" />
      <circle cx="36" cy="29" r="1.3" fill="#4A1710" />
      <polygon points="30,33 34,33 32,37" fill="#F4C97A" />
    </svg>
  );
}
