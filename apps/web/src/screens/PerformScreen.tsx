import { useState } from 'react';
import { Check, FastForward, Hourglass, RefreshCw } from 'lucide-react';
import { ElapsedStopwatch, SyncIndicator } from '../design';
import { BotanicalLayer, TopBar, WaxSealArtwork } from '../design/VowletUiPrimitives';
import { useGameStore } from '../state/useGameStore';

export function PerformScreen() {
  const turn = useGameStore((s) => s.turn)!;
  const players = useGameStore((s) => s.players);
  const auth = useGameStore((s) => s.auth);
  const privatePrompt = useGameStore((s) => s.privatePrompt);
  const syncState = useGameStore((s) => s.syncState);
  const clockOffsetMs = useGameStore((s) => s.clockOffsetMs);
  const pendingAction = useGameStore((s) => s.pendingAction);
  const performDone = useGameStore((s) => s.performDone);
  const performSkip = useGameStore((s) => s.performSkip);
  const performSwap = useGameStore((s) => s.performSwap);
  const performStall = useGameStore((s) => s.performStall);

  const [unsealed, setUnsealed] = useState(true);
  const [answerText, setAnswerText] = useState('');

  const myUid = auth?.uid ?? '';
  const isPerformer = myUid === turn.performerUid;
  const performer = players.find((p) => p.uid === turn.performerUid);
  const me = players.find((p) => p.uid === myUid);
  const witnesses = players.filter(
    (p) => !p.banned && !p.spectator && p.uid !== turn.performerUid,
  );
  const hasPressedStall = turn.stallVotes.includes(myUid);
  const isDare = turn.kind === 'DARE';

  return (
    <main className="vowlet-shell" data-testid="perform-screen">
      <div className="bg-wood-candle flex min-h-dvh flex-col pb-5">
        <BotanicalLayer darkMode />

        {/* Overhead Spotlight */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-1/2 z-0 h-[340px] w-[360px] -translate-x-1/2"
          style={{
            background:
              'radial-gradient(ellipse at 50% 0%, rgba(245, 206, 132, 0.28) 0%, rgba(245, 206, 132, 0.06) 55%, transparent 80%)',
          }}
        />

        <TopBar
          dark
          rightSlot={
            <div className="flex items-center gap-2">
              <ElapsedStopwatch
                startedAt={turn.startedAt}
                clockOffsetMs={clockOffsetMs}
                surface="lamplit"
              />
              <SyncIndicator state={syncState} surface="lamplit" />
            </div>
          }
        />

        {isPerformer ? (
          <div className="relative z-10 flex flex-1 flex-col items-center px-5 pt-2">
            <h1 className="font-cormorant text-center text-[31px] leading-tight font-bold text-[#faeed7] italic">
              Unseal the Chit...
            </h1>

            {/* Kraft Sealed Envelope with animated flap & clickable WaxSeal */}
            <div
              className={`relative mt-5 mb-4 h-[132px] w-[224px] ${
                unsealed ? 'envelope-open' : ''
              }`}
              style={{ perspective: '700px' }}
            >
              {/* Envelope Body */}
              <div className="absolute inset-0 overflow-hidden rounded-xl border border-[#8e673b] bg-gradient-to-br from-[#d9b88c] via-[#c29967] to-[#9b7243] shadow-[0_14px_26px_rgba(0,0,0,0.6)]">
                <svg viewBox="0 0 224 132" className="h-full w-full" aria-hidden="true">
                  <path d="M0 0 L112 72 L224 0" fill="none" stroke="#855d32" strokeWidth="1.5" />
                  <path d="M0 132 L84 68 M224 132 L140 68" stroke="#855d32" strokeWidth="1.2" opacity="0.65" />
                </svg>
              </div>

              {/* Animated Envelope Flap */}
              <div className="envelope-flap pointer-events-none absolute top-0 right-0 left-0 h-[76px]">
                <svg viewBox="0 0 224 76" className="h-full w-full" aria-hidden="true">
                  <polygon
                    points="0,0 224,0 112,74"
                    fill="url(#envelopeFlapGrad)"
                    stroke="#7f572e"
                    strokeWidth="1.5"
                  />
                </svg>
              </div>

              {/* Clickable Wax Seal */}
              <button
                type="button"
                aria-label={unsealed ? 'Chit unsealed' : 'Break wax seal to reveal chit'}
                onClick={() => setUnsealed((prev) => !prev)}
                className={`wax-btn absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 ${
                  unsealed ? 'seal-cracking' : ''
                }`}
              >
                <WaxSealArtwork color={isDare ? 'red' : 'brass'} icon="emblem" size={56} />
              </button>
            </div>

            {/* Torn Note Prompt Card */}
            <div
              className="torn-note w-full -rotate-[0.8deg] px-5 py-5 text-center"
              data-testid="unsealed-chit-card"
            >
              <div className="font-cinzel text-[10px] font-bold tracking-[0.22em] text-[#75522f] uppercase">
                {turn.kind ?? 'TRUTH'} CHIT
                {isDare && turn.dareType ? ` • ${turn.dareType}` : ''}
              </div>
              <p className="font-script mt-2.5 text-[28px] leading-snug font-bold text-[#2b1d12]">
                {privatePrompt?.text ?? 'Unsealing your prompt…'}
              </p>
            </div>

            {/* Truth Answer Input (optional: answer aloud or type) */}
            {!isDare && (
              <div className="chit-card mt-3 w-full p-3.5 text-left">
                <label
                  htmlFor="truth-answer-input"
                  className="font-cinzel block text-[10px] font-bold tracking-[0.18em] text-[#75522f] uppercase"
                >
                  Your Truth Answer (or answer aloud)
                </label>
                <textarea
                  id="truth-answer-input"
                  data-testid="truth-answer-input"
                  rows={2}
                  maxLength={280}
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder="Type your answer here for the table to read…"
                  className="font-script mt-1 w-full resize-none bg-transparent text-[20px] leading-snug text-[#2b1d12] placeholder-[#8b6b4a]/70 outline-none"
                />
                <div className="text-right text-[11px] font-medium text-[#75522f] tabular-nums">
                  {answerText.length}/280
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-auto flex w-full flex-col gap-2.5 pt-4">
              <button
                type="button"
                className="btn-teal w-full"
                disabled={pendingAction}
                data-testid="perform-done-btn"
                onClick={() => void performDone(answerText.trim() || undefined)}
              >
                <Check size={18} aria-hidden="true" />
                <span>I&apos;ve completed it</span>
              </button>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={pendingAction || Boolean(me?.swapUsed)}
                  data-testid="perform-swap-btn"
                  onClick={() => void performSwap()}
                  className="btn-parchment w-full text-[14px]"
                >
                  <RefreshCw size={15} aria-hidden="true" />
                  <span>{me?.swapUsed ? 'Swap Used' : '1 Free Swap'}</span>
                </button>

                <button
                  type="button"
                  disabled={pendingAction}
                  data-testid="perform-skip-btn"
                  onClick={() => void performSkip()}
                  className="btn-parchment w-full text-[14px]"
                >
                  <FastForward size={15} aria-hidden="true" />
                  <span>Skip (-30)</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative z-10 flex flex-1 flex-col items-center px-5 pt-2">
            <h1
              aria-live="polite"
              className="font-cormorant text-center text-[30px] leading-tight font-bold text-[#faeed7] italic"
            >
              {performer?.name ?? 'Player'} is unsealing a{' '}
              {turn.kind === 'DARE' ? 'Dare' : 'Truth'}...
            </h1>

            <div className="relative mt-6 mb-5 h-[132px] w-[224px]" aria-hidden="true">
              <div className="absolute inset-0 overflow-hidden rounded-xl border border-[#8e673b] bg-gradient-to-br from-[#d9b88c] via-[#c29967] to-[#9b7243] shadow-[0_14px_26px_rgba(0,0,0,0.6)]">
                <svg viewBox="0 0 224 132" className="h-full w-full">
                  <polygon points="0,0 224,0 112,74" fill="url(#envelopeFlapGrad)" stroke="#7f572e" strokeWidth="1.5" />
                </svg>
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <WaxSealArtwork color="red" icon="emblem" size={56} />
              </div>
            </div>

            <div className="torn-note w-full -rotate-[0.6deg] px-5 py-5 text-center">
              <div className="font-cinzel text-[10px] font-bold tracking-[0.22em] text-[#75522f] uppercase">
                WITNESS VIEW
              </div>
              <p className="font-script mt-2 text-[26px] leading-snug font-bold text-[#2b1d12]">
                Watch closely — you&apos;ll vote once they finish.
              </p>
            </div>

            {!me?.spectator && (
              <div className="mt-auto w-full pt-4">
                <button
                  type="button"
                  className="btn-parchment w-full"
                  disabled={hasPressedStall || pendingAction}
                  data-testid="taking-too-long-btn"
                  onClick={() => void performStall()}
                >
                  <Hourglass size={16} aria-hidden="true" />
                  <span>
                    {hasPressedStall
                      ? `Stall Requested (${turn.stallVotes.length}/${witnesses.length})`
                      : `Taking Too Long (${turn.stallVotes.length}/${witnesses.length})`}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
