import type { SurfaceMode } from './Button';

export type OwlPose = 'idle' | 'judging' | 'approve' | 'disapprove' | 'roast';
export type OwlSize = 'sm' | 'md' | 'lg';

export interface OwlMascotProps {
  pose?: OwlPose;
  line?: string | null;
  size?: OwlSize;
  surface?: SurfaceMode;
  className?: string;
}

const SIZE_PX: Record<OwlSize, number> = {
  sm: 56,
  md: 88,
  lg: 116,
};

export function OwlMascot({
  pose = 'idle',
  line,
  size = 'md',
  surface = 'linen',
  className = '',
}: OwlMascotProps) {
  const px = SIZE_PX[size];
  const isLamplit = surface === 'lamplit';

  // Eye expressions by pose
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

  return (
    <div className={`flex flex-col items-center gap-2.5 ${className}`}>
      <svg
        width={px}
        height={px}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={`Vowlet the owl (${pose})`}
      >
        {/* Top Hat */}
        <rect x="38" y="8" width="44" height="22" rx="4" fill="#23201C" />
        <rect x="38" y="24" width="44" height="5" fill="#B8893B" />
        <rect x="28" y="28" width="64" height="6" rx="3" fill="#23201C" />

        {/* Owl Body */}
        <ellipse cx="60" cy="72" rx="34" ry="38" fill="#5C4433" stroke="#23201C" strokeWidth="2.5" />
        {/* Belly */}
        <ellipse cx="60" cy="82" rx="22" ry="24" fill="#F6F1E9" />
        {/* Belly feather arcs */}
        <path
          d="M49 75 Q54 79 59 75 M61 75 Q66 79 71 75 M53 85 Q60 90 67 85"
          stroke="#B8893B"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Wings */}
        <path
          d={
            pose === 'approve'
              ? 'M26 66 C14 54 16 78 28 84 Z'
              : 'M26 62 C18 70 20 88 30 90 Z'
          }
          fill="#473325"
          stroke="#23201C"
          strokeWidth="2"
        />
        <path
          d={
            pose === 'roast'
              ? 'M94 66 C106 54 104 78 92 84 Z'
              : 'M94 62 C102 70 100 88 90 90 Z'
          }
          fill="#473325"
          stroke="#23201C"
          strokeWidth="2"
        />

        {/* Facial Disc */}
        <circle cx="47" cy="54" r="14" fill="#FFFDF9" stroke="#23201C" strokeWidth="2" />
        <circle cx="73" cy="54" r="14" fill="#FFFDF9" stroke="#23201C" strokeWidth="2" />

        {/* Monocle for judging/roast */}
        {(pose === 'judging' || pose === 'roast') && (
          <circle cx="73" cy="54" r="16" stroke="#B8893B" strokeWidth="2.5" />
        )}

        {/* Pupils */}
        <circle cx={pose === 'judging' ? 49 : 47} cy="54" r="5.5" fill="#23201C" />
        <circle cx={pose === 'judging' ? 75 : 73} cy="54" r="5.5" fill="#23201C" />
        <circle cx="45.5" cy="52" r="2" fill="#FFFDF9" />
        <circle cx="71.5" cy="52" r="2" fill="#FFFDF9" />

        {/* Eyebrows */}
        {browRotate !== 0 && (
          <>
            <line
              x1="36"
              y1="40"
              x2="56"
              y2={40 + browRotate * 0.25}
              stroke="#23201C"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <line
              x1="84"
              y1="40"
              x2="64"
              y2={40 + browRotate * 0.25}
              stroke="#23201C"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </>
        )}

        {/* Beak */}
        <polygon points="55,58 65,58 60,67" fill="#C4552D" stroke="#23201C" strokeWidth="1.5" />

        {/* Pose Accent Dot */}
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
  surface?: SurfaceMode;
}

export function VowletWordmark({ showTagline = true, surface = 'linen' }: VowletWordmarkProps) {
  const isLamplit = surface === 'lamplit';
  return (
    <div className="flex flex-col items-center text-center">
      <h1
        className="font-display text-4xl font-bold tracking-tight"
        style={{ color: isLamplit ? 'var(--color-lamplit-text)' : 'var(--color-ink)' }}
      >
        Vowlet
      </h1>
      {showTagline && (
        <p
          className="mt-1 text-sm font-medium"
          style={{ color: isLamplit ? 'var(--color-lamplit-muted)' : 'var(--color-truth-teal)' }}
        >
          A little truth, a little trouble
        </p>
      )}
    </div>
  );
}
