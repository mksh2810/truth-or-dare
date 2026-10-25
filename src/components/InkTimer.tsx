import React from 'react';

export interface InkTimerProps {
  secondsLeft: number;
  totalSeconds: number;
  type?: 'truth' | 'dare' | 'neutral';
  className?: string;
  size?: number; // px diameter
}

export const InkTimer: React.FC<InkTimerProps> = ({
  secondsLeft,
  totalSeconds,
  type = 'truth',
  className = '',
  size = 72,
}) => {
  const isUrgent = secondsLeft <= 10;
  const strokeColor =
    type === 'dare' || isUrgent ? '#B91C14' : type === 'truth' ? '#2757D6' : '#1C1917';

  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(1, secondsLeft / Math.max(1, totalSeconds)));
  const strokeDashoffset = circumference - progress * circumference;

  const minutes = Math.floor(Math.max(0, secondsLeft) / 60);
  const seconds = Math.max(0, secondsLeft) % 60;
  const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div
      className={`relative inline-flex items-center justify-center ${
        isUrgent ? 'animate-pulse' : ''
      } ${className}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-300"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-mono text-sm font-black tracking-tight"
          style={{ color: strokeColor }}
        >
          {formattedTime}
        </span>
      </div>
    </div>
  );
};
