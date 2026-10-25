import React, { useState } from 'react';
import { Chit } from '../../components/Chit';
import { InkTimer } from '../../components/InkTimer';
import { Button } from '../../components/Button';

export interface PerformTruthScreenProps {
  performerName?: string;
  isPerformer?: boolean;
  question?: string;
  onDone?: (typedAnswer?: string) => void;
  onSkip?: () => void;
  onSwap?: () => void;
  swapsLeft?: number;
}

export const PerformTruthScreen: React.FC<PerformTruthScreenProps> = ({
  performerName = 'Felix',
  isPerformer = true,
  question = 'What is the most embarrassing thing currently in your search history?',
  onDone,
  onSkip,
  onSwap,
  swapsLeft = 1,
}) => {
  const [mode, setMode] = useState<'speak' | 'type'>('speak');
  const [typedAnswer, setTypedAnswer] = useState('');

  return (
    <div className="w-full flex-1 flex flex-col justify-between py-4 max-w-[390px] mx-auto text-center">
      {/* Header */}
      <div className="flex justify-between items-center">
        <span className="font-mono text-xs font-bold uppercase tracking-widest text-truth">
          TRUTH · {performerName}'s Turn
        </span>
        {swapsLeft > 0 && isPerformer && (
          <button
            onClick={onSwap}
            className="font-mono text-[11px] font-bold text-ink-muted underline hover:text-ink"
          >
            Swap Chit (1 left)
          </button>
        )}
      </div>

      {/* Center Chit & Timer */}
      <div className="flex-1 flex flex-col justify-center items-center space-y-6">
        <div className="w-full">
          <Chit
            id="perform-truth-chit"
            type="truth"
            text={question}
            taped
          />
        </div>

        {/* Ink Timer */}
        <InkTimer secondsLeft={42} totalSeconds={60} type="truth" size={80} />

        {/* Performer Answer Mode Selector (Say aloud vs Type) */}
        {isPerformer ? (
          <div className="w-full space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode('speak')}
                className={`h-11 border-2 border-ink rounded-btn font-mono text-xs font-bold uppercase btn-press ${
                  mode === 'speak'
                    ? 'bg-truth text-white shadow-hard-sm'
                    : 'bg-chit text-ink'
                }`}
              >
                🎙️ Say It Aloud
              </button>
              <button
                type="button"
                onClick={() => setMode('type')}
                className={`h-11 border-2 border-ink rounded-btn font-mono text-xs font-bold uppercase btn-press ${
                  mode === 'type'
                    ? 'bg-truth text-white shadow-hard-sm'
                    : 'bg-chit text-ink'
                }`}
              >
                ⌨️ Type It
              </button>
            </div>

            {mode === 'type' && (
              <textarea
                value={typedAnswer}
                onChange={(e) => setTypedAnswer(e.target.value)}
                placeholder="Type your confession here..."
                rows={2}
                className="w-full p-3 bg-chit border-2 border-ink rounded-btn font-mono text-sm focus:outline-none focus:ring-2 focus:ring-highlighter shadow-hard-sm"
              />
            )}
          </div>
        ) : (
          <p className="font-handwriting text-lg italic text-ink-muted">
            Listen as {performerName} answers the truth...
          </p>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="pt-4 space-y-2">
        {isPerformer && (
          <>
            <Button
              fullWidth
              onClick={() => onDone?.(mode === 'type' ? typedAnswer : undefined)}
            >
              Done (Submit to Table)
            </Button>
            <div>
              <button
                onClick={onSkip}
                className="font-mono text-xs text-ink-muted hover:text-fail underline"
              >
                Skip (No shame, counts as fail)
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
