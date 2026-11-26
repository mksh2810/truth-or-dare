import type { SurfaceMode } from './Button';

export type OwlPose = 'idle' | 'judging' | 'approve' | 'disapprove' | 'roast';
export type OwlSize = 'sm' | 'md' | 'lg' | 'xl';

export interface OwlMascotProps {
  pose?: OwlPose;
  line?: string | null;
  size?: OwlSize;
  surface?: SurfaceMode;
  perchedOnBook?: boolean;
  className?: string;
}

const SIZE_PX: Record<OwlSize, number> = {
  sm: 56,
  md: 88,
  lg: 118,
  xl: 148,
};

export function OwlMascot({
  pose = 'idle',
  line,
  size = 'md',
  surface = 'linen',
  perchedOnBook = false,
  className = '',
}: OwlMascotProps) {
  const px = SIZE_PX[size];
  const isLamplit = surface === 'lamplit';

  const browRotate =
    pose === 'judging'
      ? 10
      : pose === 'disapprove'
        ? 16
        : pose === 'roast'
          ? -8
          : 0;

  const badgeColor =
    pose === 'approve'
      ? '#5B8C5A'
      : pose === 'disapprove'
        ? '#A33A2C'
        : pose === 'judging' || pose === 'roast'
          ? '#B8893B'
          : '#2E5E6B';

  const viewBoxHeight = perchedOnBook ? 142 : 120;
  const svgHeight = perchedOnBook ? Math.round(px * (142 / 120)) : px;

  return (
    <div className={`flex flex-col items-center gap-2.5 ${className}`}>
      <svg
        width={px}
        height={svgHeight}
        viewBox={`0 0 120 ${viewBoxHeight}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={`Vowlet the owl (${pose})`}
      >
        <defs>
          <linearGradient id="owlBodyGrad" x1="60" y1="34" x2="60" y2="110" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#7A583E" />
            <stop offset="100%" stopColor="#4A3322" />
          </linearGradient>
          <linearGradient id="owlHatGrad" x1="38" y1="6" x2="82" y2="30" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#3B332D" />
            <stop offset="100%" stopColor="#1D1814" />
          </linearGradient>
        </defs>

        {/* Leather-bound Book (HomeScreen) */}
        {perchedOnBook && (
          <g>
            {/* Book Shadow */}
            <ellipse cx="60" cy="134" rx="46" ry="5" fill="rgba(35,32,28,0.22)" />
            {/* Book Cover */}
            <path d="M18 112 L94 106 L108 118 L32 126 Z" fill="#8C4A27" stroke="#23201C" strokeWidth="1.8" strokeLinejoin="round" />
            {/* Book Pages */}
            <path d="M18 112 L32 126 L32 134 L18 120 Z" fill="#EFE4D0" stroke="#23201C" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M32 126 L108 118 L108 126 L32 134 Z" fill="#DFD0B6" stroke="#23201C" strokeWidth="1.5" strokeLinejoin="round" />
            {/* Gold Spine Band */}
            <path d="M46 124 L56 123 L56 131 L46 132 Z" fill="#B8893B" />
          </g>
        )}

        {/* Top Hat */}
        <path d="M40 8 L80 8 L78 29 L42 29 Z" fill="url(#owlHatGrad)" stroke="#140E0A" strokeWidth="1.8" />
        <rect x="41" y="23" width="38" height="4.5" fill="#B8893B" />
        <ellipse cx="60" cy="29.5" rx="31" ry="4.5" fill="#23201C" stroke="#140E0A" strokeWidth="1.4" />

        {/* Ear Tufts */}
        <path d="M33 39 L44 46 L36 52 Z" fill="#5C402C" stroke="#23201C" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M87 39 L76 46 L84 52 Z" fill="#5C402C" stroke="#23201C" strokeWidth="1.5" strokeLinejoin="round" />

        {/* Owl Body */}
        <ellipse cx="60" cy="74" rx="34" ry="37" fill="url(#owlBodyGrad)" stroke="#23201C" strokeWidth="2.2" />

        {/* Belly */}
        <ellipse cx="60" cy="83" rx="22" ry="24" fill="#F6EBDC" />
        {/* Belly feather arcs */}
        <path
          d="M47 74 Q53 79 59 74 M61 74 Q67 79 73 74 M49 84 Q55 89 61 84 M59 84 Q65 89 71 84 M53 94 Q60 99 67 94"
          stroke="#9E7342"
          strokeWidth="1.8"
          strokeLinecap="round"
        />

        {/* Wings */}
        <path
          d={
            pose === 'approve'
              ? 'M26 67 C13 54 16 80 28 86 Z'
              : 'M26 62 C17 72 19 92 31 94 Z'
          }
          fill="#4A3322"
          stroke="#23201C"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d={
            pose === 'roast'
              ? 'M94 67 C107 54 104 80 92 86 Z'
              : 'M94 62 C103 72 101 92 89 94 Z'
          }
          fill="#4A3322"
          stroke="#23201C"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Facial Disc */}
        <circle cx="46" cy="54" r="14.5" fill="#FBF5EA" stroke="#23201C" strokeWidth="2" />
        <circle cx="74" cy="54" r="14.5" fill="#FBF5EA" stroke="#23201C" strokeWidth="2" />

        {/* Golden Iris */}
        <circle cx="46" cy="54" r="10" fill="#D49B42" fillOpacity="0.35" />
        <circle cx="74" cy="54" r="10" fill="#D49B42" fillOpacity="0.35" />

        {/* Monocle for judging/roast */}
        {(pose === 'judging' || pose === 'roast') && (
          <circle cx="74" cy="54" r="16.5" stroke="#B8893B" strokeWidth="2.4" />
        )}

        {/* Pupils */}
        <circle cx={pose === 'judging' ? 48 : 46} cy="54" r="5.5" fill="#1D1814" />
        <circle cx={pose === 'judging' ? 76 : 74} cy="54" r="5.5" fill="#1D1814" />
        <circle cx="44" cy="51.5" r="2.1" fill="#FFFDF9" />
        <circle cx="72" cy="51.5" r="2.1" fill="#FFFDF9" />

        {/* Eyebrows */}
        {browRotate !== 0 && (
          <>
            <line
              x1="35"
              y1="40"
              x2="56"
              y2={40 + browRotate * 0.25}
              stroke="#23201C"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
            <line
              x1="85"
              y1="40"
              x2="64"
              y2={40 + browRotate * 0.25}
              stroke="#23201C"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
          </>
        )}

        {/* Beak */}
        <polygon points="55,58 65,58 60,67" fill="#C4552D" stroke="#23201C" strokeWidth="1.5" strokeLinejoin="round" />

        {/* Talons */}
        {perchedOnBook && (
          <g stroke="#B8893B" strokeWidth="2.4" strokeLinecap="round">
            <path d="M47 109 L44 115 M50 109 L50 116 M53 109 L56 115" />
            <path d="M67 109 L64 115 M70 109 L70 116 M73 109 L76 115" />
          </g>
        )}

        {/* Pose Accent Dot (only when non-idle) */}
        {pose !== 'idle' && (
          <g>
            <circle cx="96" cy="96" r="10" fill={badgeColor} stroke="#FFFDF9" strokeWidth="2" />
            {pose === 'approve' && (
              <path d="M91.5 96 L94.8 99.3 L100.5 93" stroke="#FFFDF9" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            )}
            {pose === 'disapprove' && (
              <path d="M92.5 92.5 L99.5 99.5 M99.5 92.5 L92.5 99.5" stroke="#FFFDF9" strokeWidth="2.2" strokeLinecap="round" />
            )}
            {(pose === 'judging' || pose === 'roast') && (
              <circle cx="96" cy="96" r="2.5" fill="#FFFDF9" />
            )}
          </g>
        )}
      </svg>

      {line && (
        <div
          aria-live="polite"
          className="max-w-full px-4 py-2.5 text-center text-sm font-medium"
          style={{
            backgroundColor: isLamplit ? 'rgba(42, 29, 20, 0.92)' : 'var(--color-cream)',
            color: isLamplit ? 'var(--color-lamplit-text)' : 'var(--color-ink)',
            borderRadius: 'var(--radius-card)',
            border: isLamplit ? 'var(--border-lamplit-hairline)' : 'var(--border-ink-hairline)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          “{line}”
        </div>
      )}
    </div>
  );
}

export interface VowletWordmarkProps {
  showTagline?: boolean;
  showEveningTable?: boolean;
  surface?: SurfaceMode;
}

export function VowletWordmark({
  showTagline = true,
  showEveningTable = false,
  surface = 'linen',
}: VowletWordmarkProps) {
  const isLamplit = surface === 'lamplit';
  return (
    <div className="flex flex-col items-center text-center">
      <h1
        className="font-display text-5xl font-bold italic tracking-tight"
        style={{ color: isLamplit ? 'var(--color-lamplit-text)' : 'var(--color-ink)' }}
      >
        Vowlet
      </h1>
      {showEveningTable && (
        <div className="mt-1 flex items-center gap-2 text-[11px] font-semibold tracking-[0.22em] text-[var(--color-brass-text)] uppercase">
          <span className="h-[1px] w-6 bg-[#8A6420]/45" aria-hidden="true" />
          <span>EVENING TABLE</span>
          <span className="h-[1px] w-6 bg-[#8A6420]/45" aria-hidden="true" />
        </div>
      )}
      {showTagline && (
        <p
          className="font-display mt-2 text-lg font-medium italic"
          style={{ color: isLamplit ? 'var(--color-lamplit-muted)' : 'var(--color-ink)' }}
        >
          “A little truth, a little trouble.”
        </p>
      )}
    </div>
  );
}
