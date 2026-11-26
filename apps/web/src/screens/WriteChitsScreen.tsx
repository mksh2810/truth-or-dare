import { useState } from 'react';
import { CheckCircle2, AlertCircle, XCircle, SkipForward } from 'lucide-react';
import {
  MAX_CHIT_LENGTH,
  checkDeterministicModeration,
  type DareType,
  type JudgeVerdict,
  type PromptKind,
} from '@vowlet/shared';
import { Button, OwlMascot, SurfaceCard, SyncIndicator, TimerRing } from '../design';
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
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [judgeState, setJudgeState] = useState<{
    verdict: JudgeVerdict;
    reason: string;
  } | null>(null);

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
      className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col gap-4 px-4 py-4"
      style={{
        paddingTop: 'calc(var(--safe-top) + 12px)',
        paddingBottom: 'calc(var(--safe-bottom) + 20px)',
      }}
    >
      <header className="flex items-center justify-between gap-2">
        <TimerRing
          deadlineAt={writingDeadlineMs}
          totalSec={room.settings.writingDeadlineSec}
          clockOffsetMs={clockOffsetMs}
          onExpire={() => void advanceTurn()}
        />
        <div className="text-center">
          <h1 className="font-display text-xl font-bold">Write Chits</h1>
          <p className="text-xs opacity-75">{chits.length} sealed at table</p>
        </div>
        <SyncIndicator state={syncState} />
      </header>

      <OwlMascot
        pose={owlPose}
        size="sm"
        line={
          judgeState?.reason ??
          'Write a consent-safe Truth or Dare. Keep it fun, zero alcohol or PII!'
        }
      />

      <form onSubmit={(e) => void handleSeal(e)} className="flex flex-1 flex-col gap-3">
        <SurfaceCard className="space-y-3">
          {/* Truth / Dare Toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              data-testid="chit-kind-truth"
              onClick={() => setKind('TRUTH')}
              className="min-h-[44px] rounded-[14px] text-sm font-bold"
              style={{
                backgroundColor: kind === 'TRUTH' ? 'var(--color-truth-teal)' : 'var(--color-linen)',
                color: kind === 'TRUTH' ? 'var(--color-cream)' : 'var(--color-ink)',
                border: 'var(--border-ink-hairline)',
              }}
            >
              Truth
            </button>
            <button
              type="button"
              data-testid="chit-kind-dare"
              onClick={() => setKind('DARE')}
              className="min-h-[44px] rounded-[14px] text-sm font-bold"
              style={{
                backgroundColor: kind === 'DARE' ? 'var(--color-dare-terracotta)' : 'var(--color-linen)',
                color: kind === 'DARE' ? 'var(--color-cream)' : 'var(--color-ink)',
                border: 'var(--border-ink-hairline)',
              }}
            >
              Dare
            </button>
          </div>

          {/* Dare Type Selector */}
          {kind === 'DARE' && (
            <div className="grid grid-cols-2 gap-2" data-testid="dare-type-selector">
              <button
                type="button"
                onClick={() => setDareType('INSTANT')}
                className="min-h-[44px] rounded-[14px] px-2 text-xs font-semibold"
                style={{
                  backgroundColor: dareType === 'INSTANT' ? 'var(--color-ink)' : 'var(--color-linen)',
                  color: dareType === 'INSTANT' ? 'var(--color-cream)' : 'var(--color-ink)',
                  border: 'var(--border-ink-hairline)',
                }}
              >
                Instant (at table)
              </button>
              <button
                type="button"
                onClick={() => setDareType('SOCIAL')}
                className="min-h-[44px] rounded-[14px] px-2 text-xs font-semibold"
                style={{
                  backgroundColor: dareType === 'SOCIAL' ? 'var(--color-ink)' : 'var(--color-linen)',
                  color: dareType === 'SOCIAL' ? 'var(--color-cream)' : 'var(--color-ink)',
                  border: 'var(--border-ink-hairline)',
                }}
              >
                Social (phone/call)
              </button>
            </div>
          )}

          {/* Chit Textarea */}
          <div>
            <textarea
              data-testid="chit-textarea"
              rows={3}
              maxLength={MAX_CHIT_LENGTH}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (judgeState) setJudgeState(null);
              }}
              placeholder={
                kind === 'TRUTH'
                  ? 'e.g. What is the weirdest food combo you actually enjoy?'
                  : 'e.g. Speak in a dramatic movie-trailer voice for 20 seconds.'
              }
              className="font-chit w-full rounded-[14px] border border-black/20 bg-[var(--color-linen)] p-3 text-lg leading-snug"
            />
            <div className="mt-1 flex items-center justify-between text-xs">
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
                {text.length} / {MAX_CHIT_LENGTH} ({remainingChars} left)
              </span>
            </div>
          </div>

          {/* Judge Verdict Banner */}
          {judgeState && (
            <div
              role="status"
              data-testid="judge-verdict-banner"
              className="flex items-center gap-2 rounded-[14px] px-3 py-2 text-xs font-semibold"
              style={{
                backgroundColor:
                  judgeState.verdict === 'FINE'
                    ? 'rgba(91, 140, 90, 0.14)'
                    : judgeState.verdict === 'TOO_MILD'
                      ? 'rgba(184, 137, 59, 0.16)'
                      : 'rgba(163, 58, 44, 0.14)',
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
          )}
        </SurfaceCard>

        <Button
          type="submit"
          variant={kind === 'TRUTH' ? 'primary-truth' : 'primary-dare'}
          fullWidth
          disabled={!text.trim()}
          loading={submitting}
          data-testid="seal-chit-btn"
        >
          Seal Chit
        </Button>

        <Button
          variant="secondary"
          fullWidth
          data-testid="skip-writing-btn"
          onClick={() => void advanceTurn()}
        >
          <SkipForward className="h-4 w-4" aria-hidden="true" />
          Skip Writing &amp; Spin
        </Button>
      </form>
    </main>
  );
}
