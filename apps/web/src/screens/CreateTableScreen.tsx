import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { validatePlayerName, type PackId, type TotalRounds } from '@vowlet/shared';
import { Button, SurfaceCard } from '../design';
import { useGameStore } from '../state/useGameStore';

const PACKS: Array<{ id: PackId; label: string }> = [
  { id: 'friends', label: 'Friends' },
  { id: 'couples', label: 'Couples' },
  { id: 'office-safe', label: 'Office-Safe' },
  { id: 'trip', label: 'Trip' },
  { id: 'hinglish-special', label: 'Hinglish Special' },
];

export function CreateTableScreen() {
  const savedName = useGameStore((s) => s.displayName);
  const createRoom = useGameStore((s) => s.createRoom);
  const setRoute = useGameStore((s) => s.setRoute);

  const [name, setName] = useState(savedName);
  const [rounds, setRounds] = useState<TotalRounds>(10);
  const [quickPlay, setQuickPlay] = useState(false);
  const [tableMode, setTableMode] = useState(false);
  const [packId, setPackId] = useState<PackId>('friends');
  const [voteSec, setVoteSec] = useState<number>(20);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const check = validatePlayerName(name);
    if (!check.valid) {
      setError(check.reason);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await createRoom({
        name: check.name,
        settings: {
          rounds,
          quickPlay,
          tableMode,
          packIds: [packId],
          voteDeadlineSec: voteSec,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create table');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main
      data-testid="create-table-screen"
      className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-4 py-5"
      style={{
        paddingTop: 'calc(var(--safe-top) + 16px)',
        paddingBottom: 'calc(var(--safe-bottom) + 24px)',
      }}
    >
      <header className="mb-4 flex items-center gap-2">
        <button
          type="button"
          aria-label="Back to Home"
          onClick={() => setRoute('HOME')}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/15 bg-[var(--color-cream)]"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <h1 className="font-display text-2xl font-bold">Create Table</h1>
      </header>

      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-1 flex-col gap-4">
        <SurfaceCard className="space-y-4">
          <div>
            <label htmlFor="create-name" className="mb-1 block text-xs font-semibold uppercase tracking-wide">
              Your Name
            </label>
            <input
              id="create-name"
              data-testid="create-name-input"
              type="text"
              maxLength={16}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Maya"
              className="min-h-[44px] w-full rounded-[14px] border border-black/20 bg-[var(--color-linen)] px-3.5 text-base"
            />
          </div>

          {/* Length Preset */}
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide">Game Length</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { val: 5, label: 'Short (5)' },
                { val: 10, label: 'Standard (10)' },
                { val: 15, label: 'Long (15)' },
              ] as const).map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setRounds(opt.val)}
                  className="min-h-[44px] rounded-[14px] px-2 text-xs font-semibold"
                  style={{
                    backgroundColor: rounds === opt.val ? 'var(--color-ink)' : 'var(--color-linen)',
                    color: rounds === opt.val ? 'var(--color-cream)' : 'var(--color-ink)',
                    border: 'var(--border-ink-hairline)',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Starter Pack */}
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide">Starter Pack</p>
            <div className="flex flex-wrap gap-2">
              {PACKS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPackId(p.id)}
                  className="min-h-[44px] rounded-full px-3 text-xs font-semibold"
                  style={{
                    backgroundColor: packId === p.id ? 'var(--color-truth-teal)' : 'var(--color-linen)',
                    color: packId === p.id ? 'var(--color-cream)' : 'var(--color-ink)',
                    border: 'var(--border-ink-hairline)',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Vote Timer Preset */}
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide">Vote Window</p>
            <div className="grid grid-cols-2 gap-2">
              {[20, 30].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setVoteSec(sec)}
                  className="min-h-[44px] rounded-[14px] text-xs font-semibold tabular-nums"
                  style={{
                    backgroundColor: voteSec === sec ? 'var(--color-ink)' : 'var(--color-linen)',
                    color: voteSec === sec ? 'var(--color-cream)' : 'var(--color-ink)',
                    border: 'var(--border-ink-hairline)',
                  }}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>

          {/* Quick Play & Table Mode */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              role="switch"
              aria-checked={quickPlay}
              data-testid="create-quickplay-toggle"
              onClick={() => setQuickPlay(!quickPlay)}
              className="flex min-h-[44px] w-full items-center justify-between rounded-[14px] border border-black/15 bg-[var(--color-linen)] px-3.5 py-2 text-left text-sm"
            >
              <div>
                <p className="font-semibold">Quick Play</p>
                <p className="text-xs opacity-75">Skip writing chits and use starter deck</p>
              </div>
              <span className="text-xs font-bold">{quickPlay ? 'ON' : 'OFF'}</span>
            </button>

            <button
              type="button"
              role="switch"
              aria-checked={tableMode}
              onClick={() => setTableMode(!tableMode)}
              className="flex min-h-[44px] w-full items-center justify-between rounded-[14px] border border-black/15 bg-[var(--color-linen)] px-3.5 py-2 text-left text-sm"
            >
              <div>
                <p className="font-semibold">Table Mode</p>
                <p className="text-xs opacity-75">Shared screen display for TV or laptop</p>
              </div>
              <span className="text-xs font-bold">{tableMode ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </SurfaceCard>

        {error && (
          <p role="alert" className="text-center text-sm font-semibold text-[var(--color-brick)]">
            {error}
          </p>
        )}

        <Button
          type="submit"
          variant="primary-dare"
          fullWidth
          loading={submitting}
          data-testid="create-submit-btn"
        >
          Create Table
        </Button>
      </form>
    </main>
  );
}
