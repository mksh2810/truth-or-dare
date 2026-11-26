import { motion } from 'framer-motion';
import { Check, FastForward, Hourglass, Scale, X } from 'lucide-react';
import type { ResultStamp } from '@vowlet/shared';

export interface WaxSealProps {
  stamp: ResultStamp;
  size?: 'md' | 'lg';
}

const SEAL_STYLE: Record<
  ResultStamp,
  { fill: string; ring: string; label: string; icon: JSX.Element }
> = {
  PASSED: {
    fill: 'var(--color-sage)',
    ring: '#3F6B3E',
    label: 'PASSED',
    icon: <Check className="h-6 w-6 text-[var(--color-cream)]" aria-hidden="true" />,
  },
  'NOT IT': {
    fill: 'var(--color-brick)',
    ring: '#7C291E',
    label: 'NOT IT',
    icon: <X className="h-6 w-6 text-[var(--color-cream)]" aria-hidden="true" />,
  },
  SPLIT: {
    fill: 'var(--color-brass)',
    ring: '#8A6420',
    label: 'SPLIT',
    icon: <Scale className="h-6 w-6 text-[var(--color-cream)]" aria-hidden="true" />,
  },
  SKIPPED: {
    fill: '#3F3A34',
    ring: '#23201C',
    label: 'SKIPPED',
    icon: <FastForward className="h-6 w-6 text-[var(--color-cream)]" aria-hidden="true" />,
  },
  STALLED: {
    fill: 'var(--color-dare-terracotta)',
    ring: '#8E3718',
    label: 'STALLED',
    icon: <Hourglass className="h-6 w-6 text-[var(--color-cream)]" aria-hidden="true" />,
  },
};

export function WaxSeal({ stamp, size = 'lg' }: WaxSealProps) {
  const cfg = SEAL_STYLE[stamp];
  const dim = size === 'lg' ? 128 : 92;

  return (
    <motion.div
      role="status"
      aria-label={`Result stamp: ${cfg.label}`}
      data-testid="wax-seal"
      initial={{ scale: 1.35, opacity: 0 }}
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
        style={{ filter: 'drop-shadow(0 4px 10px rgba(35, 32, 28, 0.24))' }}
      >
        {/* Scalloped wax outer edge */}
        <path
          d="M60 6 C68 6 73 11 81 10 C89 9 94 16 100 22 C106 28 112 34 111 42 C110 50 115 55 114 63 C113 71 107 76 106 84 C105 92 98 97 91 102 C84 107 78 113 70 112 C62 111 56 115 48 113 C40 111 35 105 27 103 C19 101 14 94 11 86 C8 78 4 72 6 64 C8 56 5 49 9 41 C13 33 15 26 22 20 C29 14 35 9 43 10 C51 11 52 6 60 6 Z"
          fill={cfg.fill}
          stroke="#23201C"
          strokeWidth="2"
        />
        <circle cx="60" cy="60" r="41" fill="none" stroke={cfg.ring} strokeWidth="2.5" strokeDasharray="4 3" />
        <circle cx="60" cy="60" r="36" fill="none" stroke="rgba(255,253,249,0.3)" strokeWidth="1.5" />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 text-[var(--color-cream)]">
        {cfg.icon}
        <span className="font-display text-sm font-bold tracking-wider uppercase">{cfg.label}</span>
      </div>
    </motion.div>
  );
}
