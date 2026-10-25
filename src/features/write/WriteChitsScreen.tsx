import React, { useState } from 'react';
import { Chit } from '../../components/Chit';
import { JudgeBubble, JudgeExpression } from '../../components/JudgeBubble';
import { Button } from '../../components/Button';
import { Sheet } from '../../components/Sheet';
import { StampType } from '../../components/Stamp';
import { MOCK_SUGGESTIONS } from '../../data/mock';

export type WriteChitState = 'idle' | 'judging' | 'FINE' | 'NOPE' | 'TOO MILD' | 'offline';

export interface WriteChitsScreenProps {
  step?: 1 | 2; // 1 = Truth, 2 = Dare
  state?: WriteChitState;
  initialText?: string;
  onSubmitForReview?: (text: string) => void;
  onNext?: () => void;
  onBack?: () => void;
}

export const WriteChitsScreen: React.FC<WriteChitsScreenProps> = ({
  step = 1,
  state: externalState = 'idle',
  initialText = '',
  onSubmitForReview,
  onNext,
  onBack,
}) => {
  const isTruth = step === 1;
  const maxChars = isTruth ? 120 : 140;
  const chitType = isTruth ? 'truth' : 'dare';

  const [text, setText] = useState(initialText || (isTruth ? 'What is the most embarrassing thing in your search history?' : ''));
  const [internalState, setInternalState] = useState<WriteChitState>(externalState);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const state = externalState !== 'idle' ? externalState : internalState;

  // Owl commentary mapping based on state
  const getOwlFeedback = (): { text: string; expression: JudgeExpression; stamp?: StampType } => {
    switch (state) {
      case 'judging':
        return { text: 'Hmm, let me read this.', expression: 'reading' };
      case 'FINE':
        return { text: 'Fine. That is evil enough.', expression: 'approve', stamp: 'FINE' };
      case 'TOO MILD':
        return {
          text: 'Too mild. Your granny would do this on a Sunday. Spike it up.',
          expression: 'bored',
          stamp: 'TOO MILD',
        };
      case 'NOPE':
        return {
          text: 'Nope. Someone ends up in the ER with this one.',
          expression: 'nope',
          stamp: 'NOPE',
        };
      case 'offline':
        return {
          text: 'AI quota resting. Pick one of the classic backup chits below.',
          expression: 'snoring',
        };
      case 'idle':
      default:
        return {
          text: isTruth
            ? 'Write a truth that makes palms sweat. 18+ only.'
            : 'Write a dare doable in a living room in under 2 minutes.',
          expression: 'reading',
        };
    }
  };

  const owl = getOwlFeedback();

  const handleAction = () => {
    if (state === 'FINE') {
      onNext?.();
    } else {
      if (onSubmitForReview) {
        onSubmitForReview(text);
      } else {
        // Toggle simulation for static review
        setInternalState('judging');
        setTimeout(() => setInternalState('FINE'), 1000);
      }
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col justify-between py-4 max-w-[390px] mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2">
        <button
          onClick={onBack}
          className="font-mono text-xs font-bold text-ink hover:text-dare"
        >
          ← Back
        </button>
        <span className="font-mono text-xs font-bold uppercase tracking-widest text-ink-muted">
          Chit {step} of 2 ({isTruth ? 'Truth' : 'Dare'})
        </span>
      </div>

      {/* Center Chit & Judge Area */}
      <div className="flex-1 flex flex-col justify-center space-y-4">
        {/* The One Centered Chit */}
        <div className="relative">
          <Chit
            id={`write-${chitType}`}
            type={chitType}
            taped
            stamp={owl.stamp}
          >
            <div className="w-full">
              <textarea
                value={text}
                maxLength={maxChars}
                onChange={(e) => {
                  setText(e.target.value);
                  if (state !== 'idle') setInternalState('idle');
                }}
                placeholder={isTruth ? 'Write a spicy truth question...' : 'Write an entertaining dare...'}
                rows={3}
                className="w-full bg-transparent resize-none font-handwriting text-xl md:text-2xl italic text-ink focus:outline-none placeholder:text-ink-muted/50"
              />
              {/* Mono char counter - only shown near limit */}
              <div className="text-right font-mono text-[11px] text-ink-muted">
                {text.length}/{maxChars}
              </div>
            </div>
          </Chit>
        </div>

        {/* Judge Bubble */}
        <JudgeBubble expression={owl.expression} text={owl.text} />

        {/* Quiet Link to Suggestions Bottom Sheet */}
        <div className="text-center pt-1">
          <button
            onClick={() => setIsSheetOpen(true)}
            className="font-mono text-xs font-bold text-ink underline underline-offset-4 hover:text-dare"
          >
            Need inspiration? See 4 swaps →
          </button>
        </div>
      </div>

      {/* Bottom Primary Button */}
      <div className="pt-4">
        <Button
          fullWidth
          disabled={!text.trim() || state === 'judging'}
          onClick={handleAction}
        >
          {state === 'FINE' ? (step === 1 ? 'Next: Write Dare' : 'Done') : 'Show the Judge'}
        </Button>
      </div>

      {/* Suggestions Bottom Sheet */}
      <Sheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        title="Judge's Suggestions"
      >
        <p className="font-sans text-xs text-ink-muted mb-2">
          Tap any pre-approved prompt to replace your chit:
        </p>
        <div className="space-y-3">
          {MOCK_SUGGESTIONS.map((suggestion, idx) => (
            <div
              key={idx}
              className="p-3 bg-chit border-2 border-ink rounded-btn shadow-hard-sm space-y-2"
            >
              <p className="font-handwriting text-lg italic text-ink">
                "{suggestion}"
              </p>
              <button
                onClick={() => {
                  setText(suggestion);
                  setInternalState('FINE');
                  setIsSheetOpen(false);
                }}
                className="px-3 py-1 bg-highlighter text-ink font-mono text-xs font-bold uppercase rounded border border-ink btn-press"
              >
                Use this
              </button>
            </div>
          ))}
        </div>
      </Sheet>
    </div>
  );
};
