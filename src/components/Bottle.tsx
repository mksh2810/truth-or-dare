import React from 'react';
import { motion } from 'framer-motion';

export interface BottleProps {
  skin?: 'green' | 'amber' | 'gold' | 'default';
  rotation?: number; // degrees
  spinning?: boolean;
  className?: string;
  onClick?: () => void;
}

export const Bottle: React.FC<BottleProps> = ({
  skin = 'green',
  rotation = 0,
  spinning = false,
  className = '',
  onClick,
}) => {
  // Bottle color schemes
  const colorMap = {
    default: { glass: '#2E7D32', highlight: '#81C784', cap: '#D4AF37', label: '#FFF8F5' },
    green: { glass: '#2F8F5B', highlight: '#6EE7B7', cap: '#D97706', label: '#FFF8F5' },
    amber: { glass: '#B45309', highlight: '#FBBF24', cap: '#78350F', label: '#FEF3C7' },
    gold: { glass: '#F59E0B', highlight: '#FDE68A', cap: '#B45309', label: '#FFFBEB' },
  }[skin];

  return (
    <div
      onClick={onClick}
      className={`relative inline-block cursor-pointer select-none ${className}`}
    >
      {/* Bottle itself spinning with smooth 3.5s ease-out + slight end wobble */}
      <motion.div
        animate={{ rotate: rotation }}
        transition={{
          duration: spinning ? 3.5 : 0.4,
          ease: [0.12, 0.82, 0.38, 1.05], // Strong ease-out with a subtle organic wobble at end
        }}
        style={{ originX: 0.5, originY: 0.5 }}
        className="relative origin-center drop-shadow-md flex items-center justify-center"
      >
        <svg
          width="60"
          height="140"
          viewBox="0 0 60 140"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Bottle Neck Cap */}
          <rect x="24" y="4" width="12" height="12" rx="2" fill={colorMap.cap} stroke="#1C1917" strokeWidth="2" />
          
          {/* Bottle Neck */}
          <rect x="25" y="16" width="10" height="26" fill={colorMap.glass} stroke="#1C1917" strokeWidth="2" />
          
          {/* Shoulder & Body */}
          <path
            d="M25 42 C16 48 10 58 10 70 L10 128 C10 133 14 136 20 136 L40 136 C46 136 50 133 50 128 L50 70 C50 58 44 48 35 42 Z"
            fill={colorMap.glass}
            stroke="#1C1917"
            strokeWidth="3"
          />

          {/* Glass reflection highlight */}
          <path
            d="M16 68 L16 126"
            stroke={colorMap.highlight}
            strokeWidth="3"
            strokeLinecap="round"
            strokeOpacity="0.7"
          />

          {/* Vintage Paper Label on the bottle */}
          <rect
            x="14"
            y="78"
            width="32"
            height="36"
            rx="2"
            fill={colorMap.label}
            stroke="#1C1917"
            strokeWidth="1.5"
          />
          <line x1="18" y1="88" x2="42" y2="88" stroke="#1C1917" strokeWidth="1.5" />
          <line x1="20" y1="94" x2="40" y2="94" stroke="#B91C14" strokeWidth="2" />
          <line x1="22" y1="100" x2="38" y2="100" stroke="#1C1917" strokeWidth="1" strokeDasharray="2 2" />
        </svg>

        {/* Speed lines when spinning (spinning together with bottle) */}
        {spinning && (
          <div className="absolute -inset-2 border-2 border-dashed border-ink/40 rounded-full pointer-events-none" />
        )}
      </motion.div>
    </div>
  );
};
