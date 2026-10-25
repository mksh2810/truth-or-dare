import React from 'react';

export type JudgeExpression = 'reading' | 'approve' | 'nope' | 'bored' | 'snoring';

export interface JudgeBubbleProps {
  expression?: JudgeExpression;
  text: string;
  className?: string;
}

const OWL_EMOJIS: Record<JudgeExpression, { emoji: string; title: string }> = {
  reading: { emoji: '🧐', title: 'Judging...' },
  approve: { emoji: '🦉', title: 'Approved' },
  nope: { emoji: '🤨', title: 'Rejected' },
  bored: { emoji: '🥱', title: 'Too Mild' },
  snoring: { emoji: '😴', title: 'Boring' },
};

export const JudgeBubble: React.FC<JudgeBubbleProps> = ({
  expression = 'reading',
  text,
  className = '',
}) => {
  const currentOwl = OWL_EMOJIS[expression];

  return (
    <div className={`flex items-start gap-3 w-full ${className}`}>
      {/* Owl character icon */}
      <div className="flex-shrink-0 w-12 h-12 bg-amber-100 border-2 border-ink shadow-hard-sm rounded-full flex flex-col items-center justify-center text-2xl select-none">
        <span>{currentOwl.emoji}</span>
      </div>

      {/* Speech bubble */}
      <div className="relative flex-1 bg-chit border-2 border-ink shadow-hard-sm rounded-btn p-3.5">
        {/* Little bubble triangle arrow pointing left */}
        <div className="absolute top-3.5 -left-2 w-3 h-3 bg-chit border-l-2 border-b-2 border-ink rotate-45" />

        <div className="text-[10px] font-mono uppercase tracking-wider text-ink-muted mb-0.5">
          The Judge · {currentOwl.title}
        </div>
        <p className="font-handwriting text-base md:text-lg italic text-ink leading-snug">
          "{text}"
        </p>
      </div>
    </div>
  );
};
