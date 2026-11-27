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
import { MainButton, Paper, Seal, TopBar } from '../design/VowletUiPrimitives';
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
      <form className="chits-screen parchment" onSubmit={(e) => void handleSeal(e)}>
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

        <h1>Write Your Chits</h1>
        <p className="intro">
          Create one Truth and one Dare,
          <br />
          or pick from starter prompts. ({chits.length} sealed)
        </p>

        <Paper
          title={
            <>
              <button
                type="button"
                data-testid="chit-kind-truth"
                onClick={() => setKind('TRUTH')}
                className="inline-flex min-h-[44px] items-center gap-2 border-0 bg-transparent p-0 text-inherit"
              >
                <span>♧ Truth</span>
              </button>
              {kind === 'TRUTH' && (
                <span className="rounded-full bg-[#2e5e6b] px-2.5 py-0.5 font-sans text-[10px] font-bold tracking-wider text-[#fffdf9] uppercase not-italic">
                  Active
                </span>
              )}
            </>
          }
        >
          {kind === 'TRUTH' ? (
            <div className="mt-2">
              <textarea
                data-testid="chit-textarea"
                rows={3}
                maxLength={MAX_CHIT_LENGTH}
                value={truthText}
                onChange={(e) => setText(e.target.value)}
                placeholder="What is the weirdest food combo you actually enjoy?"
                className="w-full resize-none rounded-lg border border-[#caa77d] bg-white/60 p-2.5 text-lg leading-snug text-[#34271d]"
                style={{ fontFamily: 'Caveat, cursive' }}
              />
              <div className="mt-1 flex items-center justify-between text-[11px]">
                <span
                  style={{
                    color: localCheck && !localCheck.allowed ? '#a33a2c' : '#3f6b3e',
                  }}
                >
                  {localCheck && !localCheck.allowed ? localCheck.reason : 'Ready for Judge Owl'}
                </span>
                <span className="tabular-nums font-semibold">
                  {truthText.length}/{MAX_CHIT_LENGTH} ({remainingChars} left)
                </span>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setKind('TRUTH')}
              className="w-full border-0 bg-transparent p-0 text-inherit"
            >
              <p>{truthText.trim() || 'Tap to write a Truth chit…'}</p>
            </button>
          )}
        </Paper>

        <Paper
          tone="dare"
          title={
            <>
              <button
                type="button"
                data-testid="chit-kind-dare"
                onClick={() => setKind('DARE')}
                className="inline-flex min-h-[44px] items-center gap-2 border-0 bg-transparent p-0 text-inherit"
              >
                <span>♨ Dare</span>
              </button>
              {kind === 'DARE' && (
                <div className="flex gap-1 font-sans not-italic" data-testid="dare-type-selector">
                  <button
                    type="button"
                    onClick={() => setDareType('INSTANT')}
                    className="min-h-[34px] rounded-full px-2.5 text-[11px] font-bold"
                    style={{
                      backgroundColor: dareType === 'INSTANT' ? '#23201c' : 'rgba(35,32,28,0.1)',
                      color: dareType === 'INSTANT' ? '#fffdf9' : '#23201c',
                    }}
                  >
                    Instant
                  </button>
                  <button
                    type="button"
                    onClick={() => setDareType('SOCIAL')}
                    className="min-h-[34px] rounded-full px-2.5 text-[11px] font-bold"
                    style={{
                      backgroundColor: dareType === 'SOCIAL' ? '#23201c' : 'rgba(35,32,28,0.1)',
                      color: dareType === 'SOCIAL' ? '#fffdf9' : '#23201c',
                    }}
                  >
                    Social
                  </button>
                </div>
              )}
            </>
          }
        >
          {kind === 'DARE' ? (
            <div className="mt-2">
              <textarea
                data-testid="chit-textarea"
                rows={3}
                maxLength={MAX_CHIT_LENGTH}
                value={dareText}
                onChange={(e) => setText(e.target.value)}
                placeholder="Speak in a dramatic movie-trailer voice for the next 2 turns."
                className="w-full resize-none rounded-lg border border-[#caa77d] bg-white/60 p-2.5 text-lg leading-snug text-[#34271d]"
                style={{ fontFamily: 'Caveat, cursive' }}
              />
              <div className="mt-1 flex items-center justify-between text-[11px]">
                <span
                  style={{
                    color: localCheck && !localCheck.allowed ? '#a33a2c' : '#3f6b3e',
                  }}
                >
                  {localCheck && !localCheck.allowed ? localCheck.reason : 'Ready for Judge Owl'}
                </span>
                <span className="tabular-nums font-semibold">
                  {dareText.length}/{MAX_CHIT_LENGTH} ({remainingChars} left)
                </span>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setKind('DARE')}
              className="w-full border-0 bg-transparent p-0 text-inherit"
            >
              <p>{dareText.trim() || 'Tap to write a Dare chit…'}</p>
            </button>
          )}
        </Paper>

        {judgeState && (
          <div
            role="status"
            data-testid="judge-verdict-banner"
            className="mx-5 mt-2 flex items-center gap-2 rounded-xl border border-black/10 px-3 py-2 text-xs font-semibold"
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

        <button
          type="button"
          className="community-btn"
          data-testid="skip-writing-btn"
          onClick={() => void advanceTurn()}
        >
          <Sparkles size={15} aria-hidden="true" />
          Use Starter Prompts
        </button>

        <MainButton
          type="submit"
          disabled={!text.trim() || submitting}
          data-testid="seal-chit-btn"
        >
          {submitting ? 'Sealing…' : 'Seal Chits'} <Seal>✦</Seal>
        </MainButton>
      </form>
    </main>
  );
}
