import React from 'react';
import { Chit } from '../../components/Chit';
import { Stamp } from '../../components/Stamp';
import { Button } from '../../components/Button';

export interface ResultScreenProps {
  outcome?: 'pass' | 'fail' | 'skip';
  xpGained?: number;
  streak?: number;
  performerName?: string;
  chitText?: string;
  chitType?: 'truth' | 'dare';
  onNextSpin?: () => void;
  onShare?: () => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({
  outcome = 'pass',
  xpGained = 50,
  streak = 2,
  performerName = 'Felix',
  chitText = 'Do your best runway model walk across the room while giving a dramatic speech.',
  chitType = 'dare',
  onNextSpin,
  onShare,
}) => {
  const isPass = outcome === 'pass';
  const isSkip = outcome === 'skip';

  const stampType = isPass ? 'PASSED' : 'NOT IT';

  const captionText = isPass
    ? 'Passed. The table approves.'
    : isSkip
    ? 'Chickened out. No shame, no XP.'
    : 'Not it. Shake it off, next spin.';

  return (
    <div className="w-full flex-1 flex flex-col justify-between py-6 max-w-[390px] mx-auto text-center">
      <div>
        <span className="font-mono text-xs font-bold uppercase tracking-widest text-ink-muted">
          TURN VERDICT
        </span>
        <h1 className="font-display text-3xl font-black text-ink mt-1">
          {performerName}'s Result
        </h1>
      </div>

      {/* Center: Stamp with Generous Breathing Space */}
      <div className="flex-1 flex flex-col justify-center items-center space-y-6">
        {/* Giant Stamp */}
        <div className="scale-125 transform transition-transform animate-bounce-short">
          <Stamp type={stampType} size="lg" rotation={isPass ? -8 : 6} />
        </div>

        {/* Outcome Line */}
        <p className="font-handwriting text-2xl italic text-ink">
          "{captionText}"
        </p>

        {/* XP Highlight Award */}
        {isPass ? (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-highlighter border-2 border-ink shadow-hard-sm rounded-btn">
            <span className="font-mono text-sm font-black text-ink uppercase">
              +{xpGained} XP
            </span>
            {streak > 1 && (
              <span className="text-xs font-mono text-ink">
                (Streak bonus 🔥 x{streak})
              </span>
            )}
          </div>
        ) : (
          <div className="font-mono text-xs text-ink-muted uppercase">
            +{xpGained} XP earned
          </div>
        )}

        {/* Minimized Chit Summary */}
        <div className="w-full opacity-80 scale-95">
          <Chit
            id="result-chit"
            type={chitType}
            text={chitText}
          />
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="pt-4 space-y-3">
        <Button fullWidth onClick={onNextSpin}>
          Next Spin →
        </Button>

        {isPass && (
          <div>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: 'Truth or Dare Victory!',
                    text: `I just passed my dare on Chit Table! "${chitText}"`,
                    url: window.location.href,
                  }).catch(() => {});
                } else {
                  onShare?.();
                }
              }}
              className="font-mono text-xs font-bold text-ink underline underline-offset-4 hover:text-dare"
            >
              Share accomplishment ↗
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
