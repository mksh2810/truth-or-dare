import React, { useState } from 'react';
import { Chit } from '../../components/Chit';
import { InkTimer } from '../../components/InkTimer';
import { Button } from '../../components/Button';

export interface PerformDareScreenProps {
  performerName?: string;
  isPerformer?: boolean;
  dareText?: string;
  isRemoteLive?: boolean;
  onDone?: () => void;
  onSkip?: () => void;
  onSwap?: () => void;
  onReport?: () => void;
  swapsLeft?: number;
}

export const PerformDareScreen: React.FC<PerformDareScreenProps> = ({
  performerName = 'Felix',
  isPerformer = true,
  dareText = 'Do your best runway model walk across the room while giving a dramatic speech.',
  isRemoteLive = false,
  onDone,
  onSkip,
  onSwap,
  onReport,
  swapsLeft = 1,
}) => {
  const [hasConsented, setHasConsented] = useState(!isRemoteLive);

  // Consent note for Remote Live
  if (isRemoteLive && !hasConsented) {
    return (
      <div className="w-full flex-1 flex flex-col justify-between py-6 max-w-[390px] mx-auto text-center">
        <div className="space-y-6 pt-6">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-dare">
            CAMERA CONSENT
          </span>
          <h1 className="font-display text-3xl font-black text-ink">
            Ready for Camera?
          </h1>

          <div className="p-6 bg-chit border-2 border-ink shadow-hard rounded-btn space-y-3">
            <p className="font-handwriting text-2xl italic text-ink">
              "Everyone here can see you for the next minute."
            </p>
            <p className="font-mono text-xs text-ink-muted">
              Live only. Nothing is recorded or stored.
            </p>
          </div>
        </div>

        <div className="pt-6 space-y-3">
          <Button fullWidth onClick={() => setHasConsented(true)}>
            Got It, Turn on Camera
          </Button>
          <button
            onClick={onSkip}
            className="font-mono text-xs text-ink-muted hover:text-ink underline block mx-auto"
          >
            Leave or Switch to In the Room
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex-1 flex flex-col justify-between py-4 max-w-[390px] mx-auto text-center">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-dare">
            DARE · {performerName}'s Turn
          </span>
          {isRemoteLive && (
            <span className="px-1.5 py-0.5 bg-dare text-white font-mono text-[9px] font-black uppercase rounded animate-pulse">
              LIVE
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {swapsLeft > 0 && isPerformer && (
            <button
              onClick={onSwap}
              className="font-mono text-[11px] font-bold text-ink-muted underline hover:text-ink"
            >
              Swap (1 left)
            </button>
          )}
          <button
            onClick={onReport}
            className="font-mono text-[11px] text-ink-muted hover:text-fail"
          >
            🚩 Report
          </button>
        </div>
      </div>

      {/* Main Dare Body */}
      <div className="flex-1 flex flex-col justify-center items-center space-y-6">
        {/* Remote Live Video Frame or Room Dare Chit */}
        {isRemoteLive ? (
          <div className="relative w-full aspect-video bg-neutral-900 border-4 border-ink rounded-btn shadow-hard overflow-hidden flex items-center justify-center">
            {/* Mock Camera feed preview */}
            <div className="text-white font-mono text-xs flex flex-col items-center gap-2">
              <span className="text-3xl">📹</span>
              <span>Live Video Stream Active</span>
            </div>

            {/* Chit taped on top of frame */}
            <div className="absolute top-2 left-2 right-2">
              <div className="bg-chit/95 border border-ink p-2 rounded shadow-sm">
                <p className="font-handwriting text-sm italic text-ink line-clamp-2">
                  "{dareText}"
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full">
            <Chit
              id="perform-dare-chit"
              type="dare"
              text={dareText}
              taped
            />
          </div>
        )}

        {/* Timer */}
        <InkTimer secondsLeft={54} totalSeconds={90} type="dare" size={80} />

        {!isPerformer && (
          <p className="font-handwriting text-lg italic text-ink-muted">
            Watch {performerName} execute the dare!
          </p>
        )}
      </div>

      {/* Performer Controls */}
      <div className="pt-4 space-y-2">
        {isPerformer ? (
          <>
            <Button fullWidth onClick={onDone}>
              Done! (Vote Time)
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
        ) : (
          <p className="font-mono text-xs text-ink-muted">
            Waiting for performer to complete...
          </p>
        )}
      </div>
    </div>
  );
};
