import React, { useState } from 'react';
import { Chit } from '../../components/Chit';
import { Stamp } from '../../components/Stamp';
import { Button } from '../../components/Button';
import { Sheet } from '../../components/Sheet';

export interface ResultScreenProps {
  outcome?: 'pass' | 'fail' | 'skip';
  xpGained?: number;
  streak?: number;
  performerName?: string;
  isPerformer?: boolean;
  chitText?: string;
  chitType?: 'truth' | 'dare';
  owlLine?: string;
  onNextSpin?: () => void;
  onShare?: () => void;
  onRateChit?: (rating: 'fire' | 'mid' | 'tooMuch') => void;
  onVoteOwlLine?: (vote: 'nailed' | 'meh') => void;
  onSubmitOwlTake?: (take: string) => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({
  outcome = 'pass',
  xpGained = 50,
  streak = 2,
  performerName = 'Felix',
  isPerformer = false,
  chitText = 'Do your best runway model walk across the room while giving a dramatic speech.',
  chitType = 'dare',
  owlLine = 'Fine. That is evil enough.',
  onNextSpin,
  onShare,
  onRateChit,
  onVoteOwlLine,
  onSubmitOwlTake,
}) => {
  const [selectedRating, setSelectedRating] = useState<'fire' | 'mid' | 'tooMuch' | null>(null);
  const [owlLineVote, setOwlLineVote] = useState<'nailed' | 'meh' | null>(null);
  const [isTakeSheetOpen, setIsTakeSheetOpen] = useState(false);
  const [owlTakeText, setOwlTakeText] = useState('');
  const [takeSubmitted, setTakeSubmitted] = useState(false);

  const isPass = outcome === 'pass';
  const isSkip = outcome === 'skip';

  const stampType = isPass ? 'PASSED' : 'NOT IT';

  const captionText = isPass
    ? 'Passed. The table approves.'
    : isSkip
    ? 'Chickened out. No shame, no XP.'
    : 'Not it. Shake it off, next spin.';

  const handleRate = (rating: 'fire' | 'mid' | 'tooMuch') => {
    setSelectedRating(rating);
    onRateChit?.(rating);
  };

  const handleOwlVote = (vote: 'nailed' | 'meh') => {
    setOwlLineVote(vote);
    onVoteOwlLine?.(vote);
  };

  const handleTakeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = owlTakeText.trim();
    if (clean.length > 0 && clean.length <= 80) {
      onSubmitOwlTake?.(clean);
      setTakeSubmitted(true);
      setTimeout(() => {
        setIsTakeSheetOpen(false);
      }, 1200);
    }
  };

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
      <div className="flex-1 flex flex-col justify-center items-center space-y-4 my-2">
        {/* Giant Stamp */}
        <div className="scale-110 transform transition-transform animate-bounce-short">
          <Stamp type={stampType} size="lg" rotation={isPass ? -8 : 6} />
        </div>

        {/* Outcome Line */}
        <p className="font-handwriting text-xl italic text-ink">
          "{captionText}"
        </p>

        {/* XP Highlight Award */}
        {isPass ? (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-highlighter border-2 border-ink shadow-hard-sm rounded-btn">
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
        <div className="w-full opacity-85 scale-95">
          <Chit
            id="result-chit"
            type={chitType}
            text={chitText}
          />
        </div>

        {/* 1-Tap Voter Chit Rating (LEARN-4) */}
        {!isPerformer && (
          <div className="w-full pt-1">
            <div className="text-[10px] font-mono uppercase text-ink-muted mb-1.5">
              Rate this chit (under 3s):
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleRate('fire')}
                className={`py-1.5 px-2 border-2 border-ink rounded-btn font-mono text-xs font-bold uppercase btn-press ${
                  selectedRating === 'fire'
                    ? 'bg-highlighter text-ink shadow-hard-pressed'
                    : 'bg-chit text-ink shadow-hard-sm'
                }`}
              >
                🔥 Fire
              </button>
              <button
                type="button"
                onClick={() => handleRate('mid')}
                className={`py-1.5 px-2 border-2 border-ink rounded-btn font-mono text-xs font-bold uppercase btn-press ${
                  selectedRating === 'mid'
                    ? 'bg-chit-shade text-ink shadow-hard-pressed'
                    : 'bg-chit text-ink shadow-hard-sm'
                }`}
              >
                😐 Mid
              </button>
              <button
                type="button"
                onClick={() => handleRate('tooMuch')}
                className={`py-1.5 px-2 border-2 border-ink rounded-btn font-mono text-xs font-bold uppercase btn-press ${
                  selectedRating === 'tooMuch'
                    ? 'bg-fail/20 text-fail shadow-hard-pressed'
                    : 'bg-chit text-ink shadow-hard-sm'
                }`}
              >
                💥 Too much
              </button>
            </div>
          </div>
        )}

        {/* Owl Line & Player Reaction (LEARN-8) */}
        {owlLine && !isPerformer && (
          <div className="w-full flex items-center justify-between p-2 bg-chit border border-ink/40 rounded text-left">
            <div className="font-handwriting text-sm italic text-ink truncate pr-2">
              🦉 "{owlLine}"
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button
                onClick={() => handleOwlVote('nailed')}
                className={`px-1.5 py-0.5 text-[9px] font-mono uppercase rounded border border-ink ${
                  owlLineVote === 'nailed' ? 'bg-pass text-white' : 'bg-chit-shade text-ink'
                }`}
              >
                Nailed it
              </button>
              <button
                onClick={() => handleOwlVote('meh')}
                className={`px-1.5 py-0.5 text-[9px] font-mono uppercase rounded border border-ink ${
                  owlLineVote === 'meh' ? 'bg-fail text-white' : 'bg-chit-shade text-ink'
                }`}
              >
                Meh
              </button>
            </div>
          </div>
        )}

        {/* Add an Owl take link (LEARN-6, LEARN-7) */}
        {!isPerformer && (
          <div>
            <button
              onClick={() => setIsTakeSheetOpen(true)}
              className="font-mono text-xs text-ink-muted underline hover:text-dare"
            >
              + Add an owl take
            </button>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="pt-2 space-y-2">
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

      {/* Owl Take Bottom Sheet (LEARN-7) */}
      <Sheet
        isOpen={isTakeSheetOpen}
        onClose={() => setIsTakeSheetOpen(false)}
        title="Add an Owl Roast"
      >
        <p className="font-sans text-xs text-ink-muted">
          Add a quick roast of this chit in the owl's voice (max 80 chars). Mock the chit, never the player.
        </p>

        {takeSubmitted ? (
          <div className="p-4 bg-pass/10 border-2 border-pass rounded-btn font-mono text-xs text-pass font-bold">
            Submitted for Judge moderation! ✓
          </div>
        ) : (
          <form onSubmit={handleTakeSubmit} className="space-y-3 pt-2">
            <input
              type="text"
              maxLength={80}
              value={owlTakeText}
              onChange={(e) => setOwlTakeText(e.target.value)}
              placeholder="e.g. Even my grandma would do that."
              className="w-full h-12 px-3 bg-chit border-2 border-ink rounded-btn font-handwriting text-lg italic text-ink focus:outline-none focus:ring-2 focus:ring-highlighter"
            />
            <div className="flex justify-between font-mono text-[11px] text-ink-muted">
              <span>Must pass safety prefilter</span>
              <span>{owlTakeText.length}/80</span>
            </div>
            <Button
              fullWidth
              size="md"
              type="submit"
              disabled={!owlTakeText.trim() || owlTakeText.length > 80}
            >
              Submit Roast
            </Button>
          </form>
        )}
      </Sheet>
    </div>
  );
};
