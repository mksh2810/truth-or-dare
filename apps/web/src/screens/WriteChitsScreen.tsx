import { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Feather,
  Flame,
  Sparkles,
  XCircle,
} from 'lucide-react';
import {
  MAX_CHIT_LENGTH,
  checkDeterministicModeration,
  type DareType,
  type JudgeVerdict,
  type PromptKind,
} from '@vowlet/shared';
import {
  BotanicalCorners,
  OwlMascot,
  ParchmentCard,
  SmallRedWaxSeal,
  SyncIndicator,
  TimerRing,
} from '../design';
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

  const owlPose =
    judgeState?.verdict === 'FINE'
      ? 'approve'
      : judgeState?.verdict === 'NOPE'
        ? 'disapprove'
        : judgeState?.verdict === 'TOO_MILD'
          ? 'judging'
          : 'idle';

  return (
    <main
      data-testid="write-chits-screen"
      className="linen-backdrop relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col gap-3 overflow-hidden px-4 py-4"
      style={{
        paddingTop: 'calc(var(--safe-top) + 12px)',
        paddingBottom: 'calc(var(--safe-bottom) + 20px)',
      }}
    >
      <BotanicalCorners surface="linen" />

      <header className="relative z-10 flex items-center justify-between gap-2">
        <TimerRing
          deadlineAt={writingDeadlineMs}
          totalSec={room.settings.writingDeadlineSec}
          clockOffsetMs={clockOffsetMs}
          size={52}
          onExpire={() => void advanceTurn()}
        />
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold leading-tight">Write Your Chits</h1>
          <p className="text-[11px] opacity-80">
            {chits.length} sealed • consent-safe only
          </p>
        </div>
        <SyncIndicator state={syncState} />
      </header>

      <form
        onSubmit={(e) => void handleSeal(e)}
        className="relative z-10 flex flex-1 flex-col justify-between gap-3"
      >
        <div className="space-y-3.5 py-1">
          {/* Tilted Truth Parchment Card */}
          <ParchmentCard tiltDeg={-1.5} className="transition-all">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                data-testid="chit-kind-truth"
                onClick={() => setKind('TRUTH')}
                className="inline-flex min-h-[44px] items-center gap-2 text-left"
              >
                <Feather className="h-5 w-5 text-[var(--color-truth-teal)]" aria-hidden="true" />
                <span className="font-display text-2xl font-bold italic text-[var(--color-truth-teal)]">
                  Truth
                </span>
              </button>
              {kind === 'TRUTH' && (
                <span className="rounded-full bg-[var(--color-truth-teal)] px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-[var(--color-cream)] uppercase">
                  Active
                </span>
              )}
            </div>

            {kind === 'TRUTH' ? (
              <div className="mt-2">
                <textarea
                  data-testid="chit-textarea"
                  rows={3}
                  maxLength={MAX_CHIT_LENGTH}
                  value={truthText}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="What is the weirdest food combo you actually enjoy?"
                  className="font-chit w-full resize-none rounded-[10px] border border-[#8A6420]/25 bg-white/55 p-2.5 text-lg leading-snug text-[var(--color-ink)] placeholder:text-[#23201C]/45"
                />
                <div className="mt-1 flex items-center justify-between text-[11px]">
                  <span
                    className="font-medium"
                    style={{
                      color:
                        localCheck && !localCheck.allowed
                          ? 'var(--color-brick)'
                          : 'var(--color-sage-text)',
                    }}
                  >
                    {localCheck && !localCheck.allowed ? localCheck.reason : 'Ready for Judge Owl'}
                  </span>
                  <span className="tabular-nums font-semibold opacity-75">
                    {truthText.length}/{MAX_CHIT_LENGTH} ({remainingChars} left)
                  </span>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setKind('TRUTH')}
                className="font-chit mt-1 block w-full py-2 text-left text-base italic text-[#23201C]/70"
              >
                {truthText.trim() || 'Tap to write a Truth chit…'}
              </button>
            )}
          </ParchmentCard>

          {/* Tilted Dare Parchment Card */}
          <ParchmentCard tiltDeg={1.5} className="transition-all">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                data-testid="chit-kind-dare"
                onClick={() => setKind('DARE')}
                className="inline-flex min-h-[44px] items-center gap-2 text-left"
              >
                <Flame className="h-5 w-5 text-[var(--color-dare-terracotta)]" aria-hidden="true" />
                <span className="font-display text-2xl font-bold italic text-[var(--color-terracotta-text)]">
                  Dare
                </span>
              </button>

              {kind === 'DARE' && (
                <div className="flex gap-1" data-testid="dare-type-selector">
                  <button
                    type="button"
                    onClick={() => setDareType('INSTANT')}
                    className="min-h-[34px] rounded-full px-2.5 text-[11px] font-bold"
                    style={{
                      backgroundColor:
                        dareType === 'INSTANT' ? 'var(--color-ink)' : 'rgba(35,32,28,0.08)',
                      color: dareType === 'INSTANT' ? 'var(--color-cream)' : 'var(--color-ink)',
                    }}
                  >
                    Instant
                  </button>
                  <button
                    type="button"
                    onClick={() => setDareType('SOCIAL')}
                    className="min-h-[34px] rounded-full px-2.5 text-[11px] font-bold"
                    style={{
                      backgroundColor:
                        dareType === 'SOCIAL' ? 'var(--color-ink)' : 'rgba(35,32,28,0.08)',
                      color: dareType === 'SOCIAL' ? 'var(--color-cream)' : 'var(--color-ink)',
                    }}
                  >
                    Social
                  </button>
                </div>
              )}
            </div>

            {kind === 'DARE' ? (
              <div className="mt-2">
                <textarea
                  data-testid="chit-textarea"
                  rows={3}
                  maxLength={MAX_CHIT_LENGTH}
                  value={dareText}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Speak in a dramatic movie-trailer voice for the next 2 turns."
                  className="font-chit w-full resize-none rounded-[10px] border border-[#8A6420]/25 bg-white/55 p-2.5 text-lg leading-snug text-[var(--color-ink)] placeholder:text-[#23201C]/45"
                />
                <div className="mt-1 flex items-center justify-between text-[11px]">
                  <span
                    className="font-medium"
                    style={{
                      color:
                        localCheck && !localCheck.allowed
                          ? 'var(--color-brick)'
                          : 'var(--color-sage-text)',
                    }}
                  >
                    {localCheck && !localCheck.allowed ? localCheck.reason : 'Ready for Judge Owl'}
                  </span>
                  <span className="tabular-nums font-semibold opacity-75">
                    {dareText.length}/{MAX_CHIT_LENGTH} ({remainingChars} left)
                  </span>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setKind('DARE')}
                className="font-chit mt-1 block w-full py-2 text-left text-base italic text-[#23201C]/70"
              >
                {dareText.trim() || 'Tap to write a Dare chit…'}
              </button>
            )}
          </ParchmentCard>

          {/* Judge Verdict Banner */}
          {judgeState ? (
            <div
              role="status"
              data-testid="judge-verdict-banner"
              className="flex items-center gap-2 rounded-[14px] border border-black/10 px-3 py-2 text-xs font-semibold"
              style={{
                backgroundColor:
                  judgeState.verdict === 'FINE'
                    ? 'rgba(91, 140, 90, 0.16)'
                    : judgeState.verdict === 'TOO_MILD'
                      ? 'rgba(184, 137, 59, 0.18)'
                      : 'rgba(163, 58, 44, 0.16)',
                color:
                  judgeState.verdict === 'FINE'
                    ? 'var(--color-sage-text)'
                    : judgeState.verdict === 'TOO_MILD'
                      ? 'var(--color-brass-text)'
                      : 'var(--color-brick)',
              }}
            >
              {judgeState.verdict === 'FINE' && <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />}
              {judgeState.verdict === 'TOO_MILD' && <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />}
              {judgeState.verdict === 'NOPE' && <XCircle className="h-4 w-4 shrink-0" aria-hidden="true" />}
              <span>
                {judgeState.verdict}: {judgeState.reason}
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-xs opacity-75">
              <OwlMascot pose={owlPose} size="sm" />
              <span className="max-w-[230px] text-left">
                Judge Owl checks every chit. Zero alcohol, zero PII, consent-safe!
              </span>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="space-y-2.5">
          <div className="flex justify-center">
            <button
              type="button"
              data-testid="skip-writing-btn"
              onClick={() => void advanceTurn()}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[#8A6420]/30 bg-[var(--color-cream)] px-5 py-2 text-xs font-semibold text-[var(--color-ink)] shadow-sm transition-transform active:scale-95"
            >
              <Sparkles className="h-3.5 w-3.5 text-[var(--color-brass-text)]" aria-hidden="true" />
              <span>Use Starter Prompts</span>
            </button>
          </div>

          <div className="relative flex items-center pr-3">
            <button
              type="submit"
              disabled={!text.trim() || submitting}
              data-testid="seal-chit-btn"
              className="relative flex min-h-[50px] w-full items-center justify-center rounded-[16px] px-5 py-2.5 pr-12 text-base font-bold text-[var(--color-cream)] transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                background: 'linear-gradient(180deg, #336775 0%, #244C57 100%)',
                border: '1px solid rgba(35, 32, 28, 0.35)',
                boxShadow: '0 4px 14px rgba(35, 32, 28, 0.24)',
              }}
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-[3px] rounded-[13px] border border-[#FFFDF9]/25"
              />
              <span>{submitting ? 'Sealing…' : 'Seal Chits'}</span>
            </button>
            <SmallRedWaxSeal size={48} className="pointer-events-none absolute right-0" />
          </div>
        </div>
      </form>
    </main>
  );
}
