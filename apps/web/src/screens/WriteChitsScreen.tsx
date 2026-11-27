import { useState } from 'react';
import { AlertCircle, CheckCircle2, Sparkles, XCircle } from 'lucide-react';
import {
  MAX_CHIT_LENGTH,
  checkDeterministicModeration,
  type DareType,
  type JudgeVerdict,
  type PromptKind,
} from '@vowlet/shared';
import { SyncIndicator, TimerRing } from '../design';
import { BotanicalLayer, TopBar, WaxSealArtwork } from '../design/VowletUiPrimitives';
import { useGameStore } from '../state/useGameStore';

export function WriteChitsScreen() {
  const room = useGameStore((s) => s.room)!;
  const chits = useGameStore((s) => s.chits);
  const clockOffsetMs = useGameStore((s) => s.clockOffsetMs);
  const syncState = useGameStore((s) => s.syncState);
  const submitChit = useGameStore((s) => s.submitChit);
  const advanceTurn = useGameStore((s) => s.advanceTurn);
  const showToast = useGameStore((s) => s.showToast);

  const [kind, setKind] = useState<PromptKind>('TRUTH');
  const [dareType, setDareType] = useState<DareType>('INSTANT');
  const [truthText, setTruthText] = useState('');
  const [dareText, setDareText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [judgeState, setJudgeState] = useState<{
    verdict: JudgeVerdict;
    reason: string;
  } | null>(null);

  const text = kind === 'TRUTH' ? truthText : dareText;
  const setText = (val: string) => {
    if (kind === 'TRUTH') setTruthText(val);
    else setDareText(val);
    if (judgeState) setJudgeState(null);
  };

  const localCheck = text.trim() ? checkDeterministicModeration(text) : null;
  const remainingChars = MAX_CHIT_LENGTH - text.length;
  const writingDeadlineMs =
    typeof room.updatedAt === 'number'
      ? room.updatedAt + room.settings.writingDeadlineSec * 1000
      : Date.now() + 120000;

  const handleSeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    if (localCheck && !localCheck.allowed) {
      setJudgeState({
        verdict: 'NOPE',
        reason: localCheck.reason || 'That breaks table rules.',
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitChit({
        kind,
        dareType: kind === 'DARE' ? dareType : undefined,
        text: text.trim(),
      });
      setJudgeState({ verdict: res.verdict, reason: res.owlReason });
      if (res.verdict === 'FINE') {
        setText('');
        showToast('Chit sealed into the bowl!', 'success');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not submit chit', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="vowlet-shell" data-testid="write-chits-screen">
      <form
        className="bg-parchment flex min-h-dvh flex-col pb-5"
        onSubmit={(e) => void handleSeal(e)}
      >
        <BotanicalLayer />

        <TopBar
          rightSlot={
            <div className="flex items-center gap-2">
              <TimerRing
                deadlineAt={writingDeadlineMs}
                totalSec={room.settings.writingDeadlineSec}
                clockOffsetMs={clockOffsetMs}
                size={38}
                onExpire={() => void advanceTurn()}
              />
              <SyncIndicator state={syncState} />
            </div>
          }
        />

        <div className="relative z-10 px-5 text-center">
          <h1 className="font-cormorant text-[31px] leading-tight font-bold text-[#2b1d12]">
            Write Your Chits
          </h1>
          <p className="font-cormorant mt-0.5 text-[16px] font-medium text-[#5e4430]">
            Create one Truth and one Dare, or pick starter prompts. ({chits.length} sealed)
          </p>
        </div>

        {/* Truth Chit Card (-2.2deg) */}
        <div className="relative z-10 mt-3 px-5">
          <div className="chit-card -rotate-[2.2deg] p-4 transition-transform">
            <div className="flex items-center justify-between border-b border-[#c5a072]/60 pb-2">
              <button
                type="button"
                data-testid="chit-kind-truth"
                onClick={() => setKind('TRUTH')}
                className="flex min-h-[44px] items-center gap-2 border-0 bg-transparent p-0 text-left"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M20.2 3.8C15.4 3.4 9.5 7.4 6.8 12.8L4 20l7.2-2.8c5.4-2.7 9.4-8.6 9-13.4zM9.2 15.8l-2.6 1 1-2.6"
                    fill="url(#tealQuillGrad)"
                  />
                </svg>
                <span className="font-playfair text-[23px] font-bold text-[#24484e] italic">
                  Truth
                </span>
              </button>

              {kind === 'TRUTH' && (
                <span className="rounded-full bg-[#24484e] px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-[#fff8eb] uppercase">
                  Active
                </span>
              )}
            </div>

            {kind === 'TRUTH' ? (
              <div className="mt-2.5">
                <textarea
                  data-testid="chit-textarea"
                  rows={2}
                  maxLength={MAX_CHIT_LENGTH}
                  value={truthText}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="What is the weirdest food combo you actually enjoy?"
                  className="font-script w-full resize-none rounded-lg border border-[#c5a072]/70 bg-[#fffdf8]/75 p-2.5 text-[21px] leading-snug text-[#2b1d12] placeholder:text-[#8c7053]/70"
                />
                <div className="mt-1 flex items-center justify-between text-[11px]">
                  <span
                    className="font-medium"
                    style={{
                      color: localCheck && !localCheck.allowed ? '#a33a2c' : '#3f6b3e',
                    }}
                  >
                    {localCheck && !localCheck.allowed ? localCheck.reason : 'Ready for Judge Owl'}
                  </span>
                  <span className="font-semibold text-[#5e4430] tabular-nums">
                    {truthText.length}/{MAX_CHIT_LENGTH} ({remainingChars} left)
                  </span>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setKind('TRUTH')}
                className="font-script mt-2 min-h-[44px] w-full border-0 bg-transparent p-1 text-center text-[22px] text-[#3a2819]"
              >
                {truthText.trim() || 'Tap to write a Truth chit…'}
              </button>
            )}
          </div>
        </div>

        {/* Dare Chit Card (+1.8deg) */}
        <div className="relative z-10 mt-3 px-5">
          <div className="chit-card rotate-[1.8deg] p-4 transition-transform">
            <div className="flex items-center justify-between gap-2 border-b border-[#c5a072]/60 pb-2">
              <button
                type="button"
                data-testid="chit-kind-dare"
                onClick={() => setKind('DARE')}
                className="flex min-h-[44px] items-center gap-2 border-0 bg-transparent p-0 text-left"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M12.5 2c.6 3.5-2 5.4-2 8.2 0 1.4 1 2.5 2.4 2.5 1.8 0 2.9-1.7 2.4-4 2.5 2.1 3.7 4.7 3.7 7.3 0 3.7-3 6.5-7 6.5s-7-2.8-7-6.5c0-3.4 2.2-6.5 4.9-8.8 1-.9 2-2.8 2.6-5.2z"
                    fill="url(#flameGrad)"
                  />
                </svg>
                <span className="font-playfair text-[23px] font-bold text-[#a9441f] italic">
                  Dare
                </span>
              </button>

              {kind === 'DARE' && (
                <div className="flex gap-1" data-testid="dare-type-selector">
                  <button
                    type="button"
                    onClick={() => setDareType('INSTANT')}
                    className="min-h-[36px] rounded-full px-2.5 text-[11px] font-bold"
                    style={{
                      backgroundColor: dareType === 'INSTANT' ? '#2b1d12' : 'rgba(43,29,18,0.1)',
                      color: dareType === 'INSTANT' ? '#fff8eb' : '#2b1d12',
                    }}
                  >
                    Instant
                  </button>
                  <button
                    type="button"
                    onClick={() => setDareType('SOCIAL')}
                    className="min-h-[36px] rounded-full px-2.5 text-[11px] font-bold"
                    style={{
                      backgroundColor: dareType === 'SOCIAL' ? '#2b1d12' : 'rgba(43,29,18,0.1)',
                      color: dareType === 'SOCIAL' ? '#fff8eb' : '#2b1d12',
                    }}
                  >
                    Social
                  </button>
                </div>
              )}
            </div>

            {kind === 'DARE' ? (
              <div className="mt-2.5">
                <textarea
                  data-testid="chit-textarea"
                  rows={2}
                  maxLength={MAX_CHIT_LENGTH}
                  value={dareText}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Speak in a dramatic movie-trailer voice for the next 2 turns."
                  className="font-script w-full resize-none rounded-lg border border-[#c5a072]/70 bg-[#fffdf8]/75 p-2.5 text-[21px] leading-snug text-[#2b1d12] placeholder:text-[#8c7053]/70"
                />
                <div className="mt-1 flex items-center justify-between text-[11px]">
                  <span
                    className="font-medium"
                    style={{
                      color: localCheck && !localCheck.allowed ? '#a33a2c' : '#3f6b3e',
                    }}
                  >
                    {localCheck && !localCheck.allowed ? localCheck.reason : 'Ready for Judge Owl'}
                  </span>
                  <span className="font-semibold text-[#5e4430] tabular-nums">
                    {dareText.length}/{MAX_CHIT_LENGTH} ({remainingChars} left)
                  </span>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setKind('DARE')}
                className="font-script mt-2 min-h-[44px] w-full border-0 bg-transparent p-1 text-center text-[22px] text-[#3a2819]"
              >
                {dareText.trim() || 'Tap to write a Dare chit…'}
              </button>
            )}
          </div>
        </div>

        {/* Fountain Pen Accent */}
        <div className="relative z-10 mt-2 flex justify-end px-8" aria-hidden="true">
          <svg width="86" height="22" viewBox="0 0 110 28" className="opacity-75">
            <path d="M6 16 L84 8 L96 14 L84 20 Z" fill="#2b1d12" />
            <path d="M84 8 L104 14 L84 20 L89 14 Z" fill="url(#goldGrad)" />
            <circle cx="93" cy="14" r="1.4" fill="#2b1d12" />
          </svg>
        </div>

        {judgeState && (
          <div
            role="status"
            data-testid="judge-verdict-banner"
            className="relative z-10 mx-5 mt-1 flex items-center gap-2 rounded-xl border border-black/10 px-3 py-2 text-xs font-semibold"
            style={{
              backgroundColor:
                judgeState.verdict === 'FINE'
                  ? 'rgba(91, 140, 90, 0.16)'
                  : judgeState.verdict === 'TOO_MILD'
                    ? 'rgba(184, 137, 59, 0.18)'
                    : 'rgba(163, 58, 44, 0.16)',
              color:
                judgeState.verdict === 'FINE'
                  ? '#3f6b3e'
                  : judgeState.verdict === 'TOO_MILD'
                    ? '#8a6420'
                    : '#a33a2c',
            }}
          >
            {judgeState.verdict === 'FINE' && <CheckCircle2 size={15} aria-hidden="true" />}
            {judgeState.verdict === 'TOO_MILD' && <AlertCircle size={15} aria-hidden="true" />}
            {judgeState.verdict === 'NOPE' && <XCircle size={15} aria-hidden="true" />}
            <span>
              {judgeState.verdict}: {judgeState.reason}
            </span>
          </div>
        )}

        <div className="relative z-10 mt-auto flex flex-col gap-3 px-5 pt-3">
          <button
            type="button"
            className="btn-parchment w-full"
            data-testid="skip-writing-btn"
            onClick={() => void advanceTurn()}
          >
            <Sparkles size={16} aria-hidden="true" />
            <span>Use Starter Prompts</span>
          </button>

          <div className="relative">
            <button
              type="submit"
              disabled={!text.trim() || submitting}
              data-testid="seal-chit-btn"
              className="btn-teal w-full pr-12"
            >
              <span>{submitting ? 'Sealing…' : 'Seal Chits'}</span>
            </button>
            <div className="pointer-events-none absolute -top-1.5 right-3">
              <WaxSealArtwork color="red" icon="emblem" size={50} />
            </div>
          </div>
        </div>
      </form>
    </main>
  );
}
