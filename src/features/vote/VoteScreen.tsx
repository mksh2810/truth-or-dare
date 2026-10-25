import React, { useState } from 'react';
import { Chit } from '../../components/Chit';
import { StickerAvatar } from '../../components/StickerAvatar';
import { InkTimer } from '../../components/InkTimer';
import { Button } from '../../components/Button';
import { MOCK_PLAYERS } from '../../data/mock';

export type VoteScreenState = 'waiting' | 'voted' | 'reveal' | 'tie';

export interface VoteScreenProps {
  state?: VoteScreenState;
  isPerformer?: boolean;
  isHost?: boolean;
  chitText?: string;
  chitType?: 'truth' | 'dare';
  onVote?: (vote: 'pass' | 'fail') => void;
  onTieBreak?: (vote: 'pass' | 'fail') => void;
  onProceedToResult?: () => void;
}

export const VoteScreen: React.FC<VoteScreenProps> = ({
  state = 'waiting',
  isPerformer = false,
  isHost = true,
  chitText = 'Do your best runway model walk across the room while giving a dramatic speech.',
  chitType = 'dare',
  onVote,
  onTieBreak,
  onProceedToResult,
}) => {
  const [selectedVote, setSelectedVote] = useState<'pass' | 'fail' | null>(null);

  const handleCastVote = (val: 'pass' | 'fail') => {
    setSelectedVote(val);
    onVote?.(val);
  };

  return (
    <div className="w-full flex-1 flex flex-col justify-between py-4 max-w-[390px] mx-auto text-center">
      {/* Top: Small performer chit */}
      <div className="space-y-2">
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-muted">
          VOTING ON {chitType.toUpperCase()}
        </span>
        <div className="p-3 bg-chit border-2 border-ink shadow-hard-sm rounded-btn">
          <p className="font-handwriting text-base italic text-ink line-clamp-2">
            "{chitText}"
          </p>
        </div>
      </div>

      {/* Middle: Timer & Voter Avatars */}
      <div className="flex-1 flex flex-col justify-center items-center space-y-5">
        <InkTimer secondsLeft={15} totalSeconds={20} type="neutral" size={68} />

        {/* Voter Row (shows who voted but NOT what until reveal) */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-mono uppercase text-ink-muted">
            {state === 'reveal' ? 'Final Votes Revealed' : 'Votes Cast'}
          </div>
          <div className="flex items-center justify-center gap-2">
            {MOCK_PLAYERS.slice(0, 4).map((p, idx) => (
              <div key={p.uid} className="flex flex-col items-center">
                <StickerAvatar
                  avatarId={p.avatarId}
                  state={idx < 3 ? 'voted' : 'idle'}
                  size="sm"
                />
                <span className="font-mono text-[10px] text-ink truncate max-w-[50px]">
                  {p.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Frame 2: Reveal State (Two Paper Jars with Counts) */}
        {state === 'reveal' && (
          <div className="grid grid-cols-2 gap-4 w-full animate-fade-in">
            <div className="p-4 bg-pass/10 border-2 border-pass shadow-hard-sm rounded-btn">
              <span className="text-2xl">👍</span>
              <div className="font-mono text-2xl font-black text-pass">3</div>
              <div className="font-mono text-xs uppercase font-bold text-pass">
                PASS
              </div>
            </div>
            <div className="p-4 bg-fail/10 border-2 border-fail shadow-hard-sm rounded-btn">
              <span className="text-2xl">👎</span>
              <div className="font-mono text-2xl font-black text-fail">1</div>
              <div className="font-mono text-xs uppercase font-bold text-fail">
                FAIL
              </div>
            </div>
          </div>
        )}

        {/* Tie State: Host Tie Break Prompt */}
        {state === 'tie' && (
          <div className="p-4 bg-amber-50 border-2 border-ink shadow-hard rounded-btn space-y-2">
            <span className="font-mono text-xs font-bold uppercase text-dare">
              Tie Vote (2 vs 2)!
            </span>
            <p className="font-sans text-xs text-ink">
              {isHost
                ? 'As table host, you cast the deciding stamp:'
                : 'Waiting for host to break the tie...'}
            </p>
            {isHost && (
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={() => onTieBreak?.('pass')}
                  className="h-10 bg-pass text-white font-mono text-xs font-bold rounded border border-ink btn-press"
                >
                  Pass
                </button>
                <button
                  onClick={() => onTieBreak?.('fail')}
                  className="h-10 bg-fail text-white font-mono text-xs font-bold rounded border border-ink btn-press"
                >
                  Fail
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Buttons: Two Big Rubber Stamps for Voters */}
      <div className="pt-4">
        {state === 'reveal' ? (
          <Button fullWidth onClick={onProceedToResult}>
            See Result Stamp →
          </Button>
        ) : isPerformer ? (
          <div className="p-4 bg-chit border-2 border-ink shadow-hard-sm rounded-btn font-mono text-xs text-ink">
            You are the performer! The table is voting on your deed.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleCastVote('pass')}
              className={`h-16 border-2 border-ink rounded-btn font-mono text-base font-black uppercase flex items-center justify-center gap-2 btn-press ${
                selectedVote === 'pass'
                  ? 'bg-pass text-white shadow-hard-pressed translate-x-[3px] translate-y-[3px]'
                  : 'bg-pass/15 text-pass hover:bg-pass/25 shadow-hard'
              }`}
            >
              <span>👍</span>
              <span>PASS</span>
            </button>

            <button
              onClick={() => handleCastVote('fail')}
              className={`h-16 border-2 border-ink rounded-btn font-mono text-base font-black uppercase flex items-center justify-center gap-2 btn-press ${
                selectedVote === 'fail'
                  ? 'bg-fail text-white shadow-hard-pressed translate-x-[3px] translate-y-[3px]'
                  : 'bg-fail/15 text-fail hover:bg-fail/25 shadow-hard'
              }`}
            >
              <span>👎</span>
              <span>FAIL</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
