import type { ReactNode } from 'react';
import { ArrowLeft, Settings } from 'lucide-react';

export function getPlayerInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  return trimmed.charAt(0).toUpperCase();
}

/**
 * Shared SVG linearGradient definitions — rendered once in App.tsx.
 * IDs: goldGrad, tealQuillGrad, goldQuillGrad, flameGrad, goldFlameGrad, envelopeFlapGrad, timerRingGrad
 */
export function SharedSvgDefs() {
  return (
    <svg
      width="0"
      height="0"
      aria-hidden="true"
      focusable="false"
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden', pointerEvents: 'none' }}
    >
      <defs>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F8E2A6" />
          <stop offset="45%" stopColor="#D7A74E" />
          <stop offset="100%" stopColor="#8B611E" />
        </linearGradient>

        <linearGradient id="tealQuillGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#46838E" />
          <stop offset="55%" stopColor="#265159" />
          <stop offset="100%" stopColor="#153238" />
        </linearGradient>

        <linearGradient id="goldQuillGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FCE9B3" />
          <stop offset="55%" stopColor="#DFB25A" />
          <stop offset="100%" stopColor="#9A6D22" />
        </linearGradient>

        <linearGradient id="flameGrad" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#F5A456" />
          <stop offset="50%" stopColor="#C95529" />
          <stop offset="100%" stopColor="#7C2610" />
        </linearGradient>

        <linearGradient id="goldFlameGrad" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#FFF0B8" />
          <stop offset="50%" stopColor="#E6B254" />
          <stop offset="100%" stopColor="#9E651B" />
        </linearGradient>

        <linearGradient id="envelopeFlapGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#D9B88C" />
          <stop offset="65%" stopColor="#BE9664" />
          <stop offset="100%" stopColor="#9A7243" />
        </linearGradient>

        <linearGradient id="timerRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E6BE6C" />
          <stop offset="50%" stopColor="#B88636" />
          <stop offset="100%" stopColor="#7F5418" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/**
 * Victorian Owl in a Top Hat perched on stacked antique books.
 */
export function OwlArtwork({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 220 230"
      className={className}
      aria-hidden="true"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="owlGlow" cx="50%" cy="46%" r="50%">
          <stop offset="0%" stopColor="#FFF6DF" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#EED7B2" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="owlPlumage" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#B88754" />
          <stop offset="55%" stopColor="#855833" />
          <stop offset="100%" stopColor="#56351D" />
        </linearGradient>
        <linearGradient id="owlBelly" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F5E5C8" />
          <stop offset="100%" stopColor="#D4B487" />
        </linearGradient>
        <linearGradient id="topHatGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3B312B" />
          <stop offset="100%" stopColor="#1B1512" />
        </linearGradient>
      </defs>

      {/* Soft halo */}
      <circle cx="110" cy="112" r="92" fill="url(#owlGlow)" />

      {/* Stacked Antique Books */}
      <g>
        {/* Bottom book */}
        <rect x="44" y="186" width="132" height="22" rx="4" fill="#5A2B20" stroke="#2D150E" strokeWidth="2" />
        <rect x="52" y="191" width="114" height="12" rx="2" fill="#F2E2C4" />
        <line x1="60" y1="197" x2="156" y2="197" stroke="#C4A47C" strokeWidth="1.2" />
        <rect x="44" y="186" width="14" height="22" rx="3" fill="#3F1C14" />
        <line x1="48" y1="192" x2="54" y2="192" stroke="#D9B061" strokeWidth="1.5" />
        <line x1="48" y1="202" x2="54" y2="202" stroke="#D9B061" strokeWidth="1.5" />

        {/* Top book */}
        <rect x="56" y="165" width="108" height="21" rx="4" fill="#23484E" stroke="#13292D" strokeWidth="2" />
        <rect x="64" y="170" width="90" height="11" rx="2" fill="#F7EBD2" />
        <rect x="56" y="165" width="13" height="21" rx="3" fill="#163035" />
        <line x1="59" y1="171" x2="65" y2="171" stroke="#D9B061" strokeWidth="1.5" />
        <line x1="59" y1="180" x2="65" y2="180" stroke="#D9B061" strokeWidth="1.5" />
      </g>

      {/* Tail & Wings */}
      <path d="M84 150 L74 166 L94 162 Z" fill="#4D2F1A" stroke="#2C1A0D" strokeWidth="1.5" />
      <path d="M136 150 L146 166 L126 162 Z" fill="#4D2F1A" stroke="#2C1A0D" strokeWidth="1.5" />

      {/* Owl Body */}
      <ellipse cx="110" cy="118" rx="44" ry="48" fill="url(#owlPlumage)" stroke="#3D2412" strokeWidth="2.4" />
      {/* Left & Right Folded Wings */}
      <path
        d="M68 98 C56 116 60 144 79 156 C82 140 82 115 78 96 Z"
        fill="#694225"
        stroke="#3D2412"
        strokeWidth="2"
      />
      <path
        d="M152 98 C164 116 160 144 141 156 C138 140 138 115 142 96 Z"
        fill="#694225"
        stroke="#3D2412"
        strokeWidth="2"
      />

      {/* Belly */}
      <ellipse cx="110" cy="128" rx="27" ry="33" fill="url(#owlBelly)" stroke="#A07A4D" strokeWidth="1.4" />
      {/* Feather scallops */}
      <path
        d="M95 117 Q102 123 110 117 Q118 123 125 117 M92 129 Q101 135 110 129 Q119 135 128 129 M96 141 Q103 147 110 141 Q117 147 124 141"
        stroke="#9A7244"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Talons gripping book */}
      <path d="M94 163 L90 169 M97 163 L97 170 M100 163 L103 169" stroke="#C88A38" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M120 163 L117 169 M123 163 L123 170 M126 163 L130 169" stroke="#C88A38" strokeWidth="2.6" strokeLinecap="round" />

      {/* Owl Head & Facial Disc */}
      <circle cx="110" cy="80" r="36" fill="url(#owlPlumage)" stroke="#3D2412" strokeWidth="2.4" />
      {/* Ear tufts */}
      <path d="M78 60 L69 44 L88 53 Z" fill="#694225" stroke="#3D2412" strokeWidth="1.8" />
      <path d="M142 60 L151 44 L132 53 Z" fill="#694225" stroke="#3D2412" strokeWidth="1.8" />

      {/* Facial Discs */}
      <circle cx="94" cy="80" r="17" fill="#F2E1C2" stroke="#855833" strokeWidth="1.8" />
      <circle cx="126" cy="80" r="17" fill="#F2E1C2" stroke="#855833" strokeWidth="1.8" />

      {/* Expressive Eyes */}
      <circle cx="94" cy="80" r="11" fill="#F6C868" stroke="#3D2412" strokeWidth="2" />
      <circle cx="126" cy="80" r="11" fill="#F6C868" stroke="#3D2412" strokeWidth="2" />
      <circle cx="95" cy="80" r="6.2" fill="#1C140E" />
      <circle cx="125" cy="80" r="6.2" fill="#1C140E" />
      <circle cx="92.5" cy="77.5" r="2.2" fill="#FFFDF9" />
      <circle cx="122.5" cy="77.5" r="2.2" fill="#FFFDF9" />

      {/* Brass Monocle on right eye */}
      <circle cx="126" cy="80" r="14.5" stroke="#D9B061" strokeWidth="2" fill="none" />
      <path d="M140 83 Q145 102 138 118" stroke="#D9B061" strokeWidth="1.3" strokeDasharray="2 2" fill="none" />

      {/* Beak */}
      <path d="M104 86 L116 86 L110 98 Z" fill="#D48832" stroke="#5A320C" strokeWidth="1.6" strokeLinejoin="round" />

      {/* Victorian Top Hat */}
      <g transform="rotate(-6 110 48)">
        <ellipse cx="110" cy="52" rx="37" ry="7.5" fill="url(#topHatGrad)" stroke="#120E0B" strokeWidth="1.8" />
        <path d="M84 50 L88 18 C88 14 132 14 132 18 L136 50 Z" fill="url(#topHatGrad)" stroke="#120E0B" strokeWidth="1.8" />
        {/* Hat Ribbon */}
        <path d="M85 43 Q110 47 135 43 L136 50 Q110 54 84 50 Z" fill="#8C2E21" />
        <rect x="105" y="43" width="10" height="7" rx="1.5" fill="#D9B061" stroke="#6E4D16" strokeWidth="1" />
      </g>
    </svg>
  );
}

const SKIN_TONES = ['#F3CFB6', '#E5B897', '#CE9872', '#A8714D', '#7D4E32'];
const HAIR_COLORS = ['#2A1D16', '#4A2F1D', '#8C522B', '#C98E48', '#1A181A', '#6D2D24'];
const SHIRT_COLORS = ['#2B5860', '#9F4529', '#547350', '#6E5078', '#8B6830', '#3F4B66'];

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * Deterministic illustrated portrait SVG generator from player name.
 */
export function PlayerAvatarArtwork({
  name,
  size = 44,
  className = '',
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const hash = hashString(name.trim().toLowerCase() || 'guest');
  const skin = SKIN_TONES[hash % SKIN_TONES.length] ?? '#E5B897';
  const hair = HAIR_COLORS[(hash >> 3) % HAIR_COLORS.length] ?? '#2A1D16';
  const shirt = SHIRT_COLORS[(hash >> 6) % SHIRT_COLORS.length] ?? '#2B5860';
  const hasGlasses = (hash >> 9) % 3 === 0;
  const hasBeard = (hash >> 11) % 4 === 0;
  const longHair = (hash >> 13) % 2 === 0;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Warm medallion backdrop */}
      <circle cx="32" cy="32" r="31" fill="#F2DEC0" stroke="#C59855" strokeWidth="2" />

      {/* Back hair if long */}
      {longHair && (
        <path d="M16 32 C16 14 48 14 48 32 L50 50 L14 50 Z" fill={hair} />
      )}

      {/* Shoulders / Coat */}
      <path
        d="M11 61 C12 45 21 41 32 41 C43 41 52 45 53 61 Z"
        fill={shirt}
        stroke="#2B1D12"
        strokeWidth="1.6"
      />
      {/* Collar */}
      <path d="M25 42 L32 50 L39 42" fill="#FFF4DE" stroke="#2B1D12" strokeWidth="1.2" />

      {/* Neck & Head */}
      <rect x="27" y="34" width="10" height="10" rx="4" fill={skin} />
      <ellipse cx="32" cy="28" rx="13" ry="14.5" fill={skin} stroke="#3D281A" strokeWidth="1.5" />

      {/* Hair cap */}
      <path
        d="M19 26 C19 13 45 13 45 26 C41 20 35 19 31 21 C26 19 22 21 19 26 Z"
        fill={hair}
      />

      {/* Eyes & Brows */}
      <circle cx="27" cy="27" r="1.7" fill="#231811" />
      <circle cx="37" cy="27" r="1.7" fill="#231811" />
      <path d="M24 23.5 Q27 22 30 23.5" stroke="#2D1D14" strokeWidth="1.3" strokeLinecap="round" fill="none" />
      <path d="M34 23.5 Q37 22 40 23.5" stroke="#2D1D14" strokeWidth="1.3" strokeLinecap="round" fill="none" />

      {/* Glasses */}
      {hasGlasses && (
        <g stroke="#2C221A" strokeWidth="1.3" fill="none">
          <circle cx="27" cy="27" r="4.2" />
          <circle cx="37" cy="27" r="4.2" />
          <line x1="31.2" y1="27" x2="32.8" y2="27" />
        </g>
      )}

      {/* Beard or Smile */}
      {hasBeard ? (
        <path
          d="M21 31 C22 40 27 43 32 43 C37 43 42 40 43 31 C39 34 35 35 32 35 C29 35 25 34 21 31 Z"
          fill={hair}
          opacity="0.92"
        />
      ) : null}
      <path d="M28.5 34.5 Q32 37.5 35.5 34.5" stroke="#5E3522" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/**
 * Organic scalloped wax blob seal SVG.
 */
export function WaxSealArtwork({
  color = 'red',
  label = '',
  icon = '',
  size = 56,
  className = '',
}: {
  color?: 'red' | 'green' | 'brass';
  label?: string;
  icon?: 'check' | 'x' | 'emblem' | '';
  size?: number;
  className?: string;
}) {
  const palette =
    color === 'green'
      ? { hi: '#7B9B65', mid: '#486A42', lo: '#273E24', rim: '#C8D8B2', text: '#FFF8E8' }
      : color === 'brass'
        ? { hi: '#E6BF6F', mid: '#B38231', lo: '#744F14', rim: '#F8E3AC', text: '#FFF8E8' }
        : { hi: '#D46249', mid: '#9A2E20', lo: '#5B1810', rim: '#E99F84', text: '#FFF4DE' };

  const gradId = `waxGrad-${color}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id={gradId} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor={palette.hi} />
          <stop offset="58%" stopColor={palette.mid} />
          <stop offset="100%" stopColor={palette.lo} />
        </radialGradient>
      </defs>

      {/* Organic scalloped wax blob */}
      <path
        d="M50 6 C57 5 63 10 70 10 C77 10 83 16 86 22 C90 29 94 36 93 44 C92 51 95 58 91 65 C87 72 86 80 79 85 C72 90 64 93 56 92 C49 91 42 95 35 92 C27 89 19 87 15 80 C11 73 7 65 8 57 C9 49 5 42 9 34 C13 27 14 19 21 15 C28 11 35 7 42 8 C45 8 47 6 50 6 Z"
        fill={`url(#${gradId})`}
        stroke={palette.lo}
        strokeWidth="2.5"
      />
      {/* Embossed inner ring */}
      <circle cx="50" cy="50" r="31" fill="none" stroke={palette.rim} strokeWidth="2.2" opacity="0.72" />
      <circle cx="50" cy="50" r="27" fill="none" stroke={palette.lo} strokeWidth="1.4" opacity="0.55" />

      {/* Center icon or label */}
      {icon === 'check' && (
        <path
          d="M34 51 L45 62 L67 39"
          stroke={palette.text}
          strokeWidth="6.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      )}
      {icon === 'x' && (
        <g stroke={palette.text} strokeWidth="6.5" strokeLinecap="round">
          <line x1="36" y1="36" x2="64" y2="64" />
          <line x1="64" y1="36" x2="36" y2="64" />
        </g>
      )}
      {icon === 'emblem' && (
        <path
          d="M50 30 L55 43 L68 45 L58 54 L61 67 L50 60 L39 67 L42 54 L32 45 L45 43 Z"
          fill={palette.text}
          opacity="0.92"
        />
      )}
      {label && !icon && (
        <text
          x="50"
          y="55"
          textAnchor="middle"
          fill={palette.text}
          fontFamily="Cinzel, Georgia, serif"
          fontWeight="800"
          fontSize={label.length > 6 ? '13' : '16'}
          letterSpacing="0.8"
        >
          {label}
        </text>
      )}
    </svg>
  );
}

/**
 * Top-down circular wooden table SVG.
 */
export function WoodenTableSvg({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 260 260"
      className={className}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="tableWood" cx="44%" cy="38%" r="60%">
          <stop offset="0%" stopColor="#9C6B3F" />
          <stop offset="55%" stopColor="#664023" />
          <stop offset="100%" stopColor="#382112" />
        </radialGradient>
      </defs>
      {/* Outer Rim Shadow */}
      <circle cx="130" cy="130" r="122" fill="#130B06" opacity="0.65" />
      {/* Carved Wooden Rim */}
      <circle cx="130" cy="130" r="118" fill="#5A361D" stroke="#A67441" strokeWidth="4" />
      {/* Table Top */}
      <circle cx="130" cy="130" r="108" fill="url(#tableWood)" stroke="#301B0E" strokeWidth="2" />
      {/* Wood Grain Arcs */}
      <path d="M50 86 Q130 70 210 86" stroke="#2D190C" strokeWidth="1.2" opacity="0.35" fill="none" />
      <path d="M35 128 Q130 112 225 128" stroke="#2D190C" strokeWidth="1.3" opacity="0.3" fill="none" />
      <path d="M46 172 Q130 156 214 172" stroke="#2D190C" strokeWidth="1.2" opacity="0.35" fill="none" />
      {/* Gold Inlay Rings */}
      <circle cx="130" cy="130" r="95" fill="none" stroke="#D9B061" strokeWidth="1.2" opacity="0.45" />
      <circle cx="130" cy="130" r="56" fill="none" stroke="#D9B061" strokeWidth="1" strokeDasharray="4 4" opacity="0.38" />
    </svg>
  );
}

/**
 * Amber glass bottle SVG for the center of the table.
 */
export function AmberBottleSvg({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 132"
      className={className}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="amberBody" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#4A2107" />
          <stop offset="28%" stopColor="#CA7215" />
          <stop offset="52%" stopColor="#F2AB38" />
          <stop offset="78%" stopColor="#9B490A" />
          <stop offset="100%" stopColor="#3B1904" />
        </linearGradient>
      </defs>
      {/* Cork & Cap */}
      <rect x="24" y="4" width="16" height="12" rx="3" fill="#B5804A" stroke="#5A3718" strokeWidth="1.4" />
      {/* Neck */}
      <path d="M25 16 L39 16 L41 44 L23 44 Z" fill="url(#amberBody)" stroke="#612B09" strokeWidth="1.5" />
      <rect x="22" y="15" width="20" height="5" rx="2" fill="#D48B36" stroke="#612B09" strokeWidth="1.2" />
      {/* Shoulders & Body */}
      <path
        d="M23 44 C15 48 11 56 11 67 L11 116 C11 123 17 127 32 127 C47 127 53 123 53 116 L53 67 C53 56 49 48 41 44 Z"
        fill="url(#amberBody)"
        stroke="#4B1F06"
        strokeWidth="2"
      />
      {/* Glass Highlight */}
      <rect x="17" y="62" width="5" height="48" rx="2.5" fill="#FFE7B4" opacity="0.52" />
      {/* Vintage Label */}
      <rect x="17" y="72" width="30" height="26" rx="3" fill="#F4E3C3" stroke="#9B723A" strokeWidth="1.2" />
      <text
        x="32"
        y="89"
        textAnchor="middle"
        fill="#4A2B13"
        fontFamily="Cinzel, Georgia, serif"
        fontWeight="800"
        fontSize="11"
      >
        V.
      </text>
    </svg>
  );
}

/**
 * Olive / gold corner botanical foliage overlay.
 */
export function BotanicalLayer({ darkMode = false }: { darkMode?: boolean }) {
  const strokeColor = darkMode ? '#C9A258' : '#6F7D5B';
  const fillColor = darkMode ? '#B48D44' : '#7D8D67';
  const opacity = darkMode ? 0.28 : 0.42;

  return (
    <svg
      viewBox="0 0 430 820"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ zIndex: 0, opacity }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Top-left sprig */}
      <g stroke={strokeColor} strokeWidth="1.5" fill={fillColor} fillOpacity="0.45">
        <path d="M0 78 Q34 52 74 14" fill="none" />
        <ellipse cx="24" cy="48" rx="11" ry="4.5" transform="rotate(-35 24 48)" />
        <ellipse cx="44" cy="36" rx="10" ry="4" transform="rotate(-15 44 36)" />
        <ellipse cx="32" cy="64" rx="10" ry="4" transform="rotate(15 32 64)" />
      </g>

      {/* Top-right sprig */}
      <g stroke={strokeColor} strokeWidth="1.5" fill={fillColor} fillOpacity="0.45">
        <path d="M430 78 Q396 52 356 14" fill="none" />
        <ellipse cx="406" cy="48" rx="11" ry="4.5" transform="rotate(35 406 48)" />
        <ellipse cx="386" cy="36" rx="10" ry="4" transform="rotate(15 386 36)" />
        <ellipse cx="398" cy="64" rx="10" ry="4" transform="rotate(-15 398 64)" />
      </g>

      {/* Bottom-left sprig */}
      <g stroke={strokeColor} strokeWidth="1.5" fill={fillColor} fillOpacity="0.4">
        <path d="M0 742 Q32 768 68 806" fill="none" />
        <ellipse cx="22" cy="772" rx="11" ry="4.5" transform="rotate(30 22 772)" />
        <ellipse cx="42" cy="788" rx="10" ry="4" transform="rotate(15 42 788)" />
      </g>

      {/* Bottom-right sprig */}
      <g stroke={strokeColor} strokeWidth="1.5" fill={fillColor} fillOpacity="0.4">
        <path d="M430 742 Q398 768 362 806" fill="none" />
        <ellipse cx="408" cy="772" rx="11" ry="4.5" transform="rotate(-30 408 772)" />
        <ellipse cx="388" cy="788" rx="10" ry="4" transform="rotate(-15 388 788)" />
      </g>
    </svg>
  );
}

export interface TopBarProps {
  dark?: boolean;
  back?: () => void;
  backLabel?: string;
  onSettings?: () => void;
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
  title?: string;
}

export function TopBar({
  dark = false,
  back,
  backLabel = 'Back',
  onSettings,
  leftSlot,
  rightSlot,
  title = 'VOWLET',
}: TopBarProps) {
  return (
    <header
      className={`relative z-10 flex h-12 items-center justify-between px-4 pt-1 ${
        dark ? 'text-[#F8E8CE]' : 'text-[#2B1D12]'
      }`}
    >
      {leftSlot ? (
        leftSlot
      ) : back ? (
        <button
          type="button"
          onClick={back}
          aria-label={backLabel}
          className="grid min-h-[44px] min-w-[44px] place-items-center rounded-full border-0 bg-transparent p-1.5 text-inherit"
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
      ) : (
        <span className="min-w-[44px]" aria-hidden="true" />
      )}

      <span className="font-cinzel text-[11px] font-bold tracking-[0.26em] opacity-80">
        {title}
      </span>

      {rightSlot ?? (
        onSettings ? (
          <button
            type="button"
            onClick={onSettings}
            aria-label="Settings"
            data-testid="settings-btn"
            className="grid min-h-[44px] min-w-[44px] place-items-center rounded-full border-0 bg-transparent p-1.5 text-inherit"
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
