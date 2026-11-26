import type { ReactNode } from 'react';

export interface BotanicalCornersProps {
  surface?: 'linen' | 'lamplit';
}

export function BotanicalCorners({ surface = 'linen' }: BotanicalCornersProps) {
  const leafColor = surface === 'lamplit' ? '#6D8C54' : '#6A8352';
  const stemColor = surface === 'lamplit' ? '#4F663C' : '#4E633B';
  const opacity = surface === 'lamplit' ? 0.55 : 0.72;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
      style={{ opacity }}
    >
      {/* Top-Left Olive Sprig */}
      <svg
        width="92"
        height="92"
        viewBox="0 0 92 92"
        fill="none"
        className="absolute -top-2 -left-2"
      >
        <path d="M6 76 C18 46 36 24 72 8" stroke={stemColor} strokeWidth="2" strokeLinecap="round" />
        <ellipse cx="22" cy="52" rx="10" ry="4.5" transform="rotate(-38 22 52)" fill={leafColor} />
        <ellipse cx="36" cy="40" rx="10" ry="4.5" transform="rotate(-24 36 40)" fill={leafColor} />
        <ellipse cx="14" cy="36" rx="9" ry="4" transform="rotate(24 14 36)" fill={leafColor} />
        <ellipse cx="48" cy="24" rx="10" ry="4.5" transform="rotate(-18 48 24)" fill={leafColor} />
        <ellipse cx="30" cy="20" rx="8.5" ry="4" transform="rotate(20 30 20)" fill={leafColor} />
        <ellipse cx="64" cy="12" rx="8" ry="3.5" transform="rotate(-12 64 12)" fill={leafColor} />
      </svg>

      {/* Top-Right Olive Sprig */}
      <svg
        width="84"
        height="84"
        viewBox="0 0 84 84"
        fill="none"
        className="absolute -top-2 -right-2 scale-x-[-1]"
      >
        <path d="M8 70 C20 42 36 22 68 8" stroke={stemColor} strokeWidth="2" strokeLinecap="round" />
        <ellipse cx="22" cy="48" rx="9" ry="4" transform="rotate(-36 22 48)" fill={leafColor} />
        <ellipse cx="38" cy="34" rx="9.5" ry="4.2" transform="rotate(-22 38 34)" fill={leafColor} />
        <ellipse cx="18" cy="30" rx="8" ry="3.8" transform="rotate(22 18 30)" fill={leafColor} />
        <ellipse cx="54" cy="18" rx="8.5" ry="3.8" transform="rotate(-16 54 18)" fill={leafColor} />
      </svg>

      {/* Bottom-Left Olive Sprig */}
      <svg
        width="88"
        height="88"
        viewBox="0 0 88 88"
        fill="none"
        className="absolute -bottom-2 -left-2 scale-y-[-1]"
      >
        <path d="M8 72 C22 44 40 22 70 10" stroke={stemColor} strokeWidth="2" strokeLinecap="round" />
        <ellipse cx="22" cy="50" rx="9.5" ry="4.2" transform="rotate(-35 22 50)" fill={leafColor} />
        <ellipse cx="38" cy="36" rx="9.5" ry="4.2" transform="rotate(-22 38 36)" fill={leafColor} />
        <ellipse cx="16" cy="32" rx="8" ry="3.8" transform="rotate(24 16 32)" fill={leafColor} />
        <ellipse cx="54" cy="20" rx="8.5" ry="3.8" transform="rotate(-14 54 20)" fill={leafColor} />
      </svg>

      {/* Bottom-Right Olive Sprig */}
      <svg
        width="88"
        height="88"
        viewBox="0 0 88 88"
        fill="none"
        className="absolute -right-2 -bottom-2 scale-[-1]"
      >
        <path d="M8 72 C22 44 40 22 70 10" stroke={stemColor} strokeWidth="2" strokeLinecap="round" />
        <ellipse cx="22" cy="50" rx="9.5" ry="4.2" transform="rotate(-35 22 50)" fill={leafColor} />
        <ellipse cx="38" cy="36" rx="9.5" ry="4.2" transform="rotate(-22 38 36)" fill={leafColor} />
        <ellipse cx="16" cy="32" rx="8" ry="3.8" transform="rotate(24 16 32)" fill={leafColor} />
        <ellipse cx="54" cy="20" rx="8.5" ry="3.8" transform="rotate(-14 54 20)" fill={leafColor} />
      </svg>
    </div>
  );
}

export interface ParchmentCardProps {
  tiltDeg?: number;
  className?: string;
  children: ReactNode;
  'data-testid'?: string;
}

export function ParchmentCard({
  tiltDeg = 0,
  className = '',
  children,
  'data-testid': testId,
}: ParchmentCardProps) {
  return (
    <div
      data-testid={testId}
      className={`parchment-card relative rounded-[14px] p-4 text-[var(--color-ink)] ${className}`}
      style={{
        transform: tiltDeg !== 0 ? `rotate(${tiltDeg}deg)` : undefined,
      }}
    >
      {/* Subtle inner parchment hairline */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-1.5 rounded-[10px] border border-[#8A6420]/20"
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function WaxSealedEnvelope({ className = '' }: { className?: string }) {
  return (
    <svg
      width="220"
      height="118"
      viewBox="0 0 220 118"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={`mx-auto drop-shadow-[0_10px_22px_rgba(0,0,0,0.55)] ${className}`}
    >
      <defs>
        <linearGradient id="envBody" x1="0" y1="0" x2="220" y2="118" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#D4B892" />
          <stop offset="100%" stopColor="#B89368" />
        </linearGradient>
        <linearGradient id="envFlap" x1="110" y1="6" x2="110" y2="74" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#DFC7A4" />
          <stop offset="100%" stopColor="#C19E73" />
        </linearGradient>
      </defs>
      {/* Envelope Base */}
      <rect x="6" y="10" width="208" height="102" rx="8" fill="url(#envBody)" stroke="#5E4328" strokeWidth="1.5" />
      {/* Side Fold Lines */}
      <path d="M8 108 L82 58 M212 108 L138 58" stroke="#7A5A39" strokeWidth="1.2" strokeOpacity="0.6" />
      {/* Top Flap */}
      <path
        d="M8 12 L110 74 L212 12 Z"
        fill="url(#envFlap)"
        stroke="#6E4E2E"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Red Owl Wax Seal */}
      <path
        d="M110 42 C115 42 118 45 123 45 C128 45 130 49 133 53 C136 57 137 61 135 66 C133 71 130 74 126 77 C122 80 117 82 112 81 C107 80 102 82 97 79 C92 76 89 72 87 67 C85 62 86 57 89 53 C92 49 95 45 100 45 C105 45 105 42 110 42 Z"
        fill="#A33A2C"
        stroke="#4A1710"
        strokeWidth="1.5"
      />
      <circle cx="110" cy="62" r="14" fill="none" stroke="#F4C97A" strokeOpacity="0.55" strokeWidth="1.2" />
      {/* Tiny embossed owl */}
      <circle cx="106" cy="59" r="3" fill="#F6F1E9" fillOpacity="0.85" />
      <circle cx="114" cy="59" r="3" fill="#F6F1E9" fillOpacity="0.85" />
      <circle cx="106" cy="59" r="1.2" fill="#4A1710" />
      <circle cx="114" cy="59" r="1.2" fill="#4A1710" />
      <polygon points="108,62 112,62 110,66" fill="#F4C97A" />
    </svg>
  );
}

export function LaurelWreath({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width="216"
        height="156"
        viewBox="0 0 216 156"
        fill="none"
        aria-hidden="true"
        className="pointer-events-none absolute"
      >
        {/* Left laurel branch */}
        <path d="M58 130 C30 110 22 72 44 36" stroke="#4D633A" strokeWidth="2.5" strokeLinecap="round" />
        {[
          { cx: 40, cy: 112, r: -35 },
          { cx: 30, cy: 94, r: -18 },
          { cx: 26, cy: 74, r: 2 },
          { cx: 30, cy: 54, r: 22 },
          { cx: 42, cy: 38, r: 42 },
          { cx: 52, cy: 102, r: 15 },
          { cx: 44, cy: 82, r: 28 },
          { cx: 44, cy: 62, r: 42 },
        ].map((l, i) => (
          <ellipse
            key={`l-${i}`}
            cx={l.cx}
            cy={l.cy}
            rx="10"
            ry="4.5"
            transform={`rotate(${l.r} ${l.cx} ${l.cy})`}
            fill="#607B49"
          />
        ))}
        {/* Right laurel branch */}
        <path d="M158 130 C186 110 194 72 172 36" stroke="#4D633A" strokeWidth="2.5" strokeLinecap="round" />
        {[
          { cx: 176, cy: 112, r: 35 },
          { cx: 186, cy: 94, r: 18 },
          { cx: 190, cy: 74, r: -2 },
          { cx: 186, cy: 54, r: -22 },
          { cx: 174, cy: 38, r: -42 },
          { cx: 164, cy: 102, r: -15 },
          { cx: 172, cy: 82, r: -28 },
          { cx: 172, cy: 62, r: -42 },
        ].map((l, i) => (
          <ellipse
            key={`r-${i}`}
            cx={l.cx}
            cy={l.cy}
            rx="10"
            ry="4.5"
            transform={`rotate(${l.r} ${l.cx} ${l.cy})`}
            fill="#607B49"
          />
        ))}
      </svg>
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function MistyTowerSilhouette() {
  return (
    <svg
      viewBox="0 0 430 140"
      fill="none"
      aria-hidden="true"
      className="pointer-events-none absolute top-14 left-0 w-full opacity-20 select-none"
    >
      <path
        d="M0 135 L35 135 L35 98 L52 80 L69 98 L69 135 L105 135 L105 112 L135 112 L135 135 L295 135 L295 104 L318 104 L318 68 L334 40 L350 68 L350 104 L375 104 L375 135 L430 135 L430 140 L0 140 Z"
        fill="#8A7660"
      />
    </svg>
  );
}

export function TornScrollBanner({
  children,
  tiltDeg = 0,
  className = '',
}: {
  children: ReactNode;
  tiltDeg?: number;
  className?: string;
}) {
  return (
    <div
      className={`parchment-card relative mx-auto max-w-[340px] px-6 py-3.5 text-center text-[var(--color-ink)] ${className}`}
      style={{
        borderRadius: '12px',
        transform: tiltDeg !== 0 ? `rotate(${tiltDeg}deg)` : undefined,
        boxShadow: '0 6px 20px rgba(0, 0, 0, 0.25), inset 0 0 14px rgba(184, 137, 59, 0.14)',
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-1.5 rounded-[8px] border border-[#8A6420]/25"
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
