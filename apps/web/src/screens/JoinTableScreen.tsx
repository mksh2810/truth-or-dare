import { useState } from 'react';
import { ArrowLeft, QrCode } from 'lucide-react';
import { isValidRoomCode, validatePlayerName } from '@vowlet/shared';
import { Button, SurfaceCard } from '../design';
import { useGameStore } from '../state/useGameStore';

export function JoinTableScreen() {
  const savedName = useGameStore((s) => s.displayName);
  const prefill = useGameStore((s) => s.joinPrefillCode);
  const joinRoom = useGameStore((s) => s.joinRoom);
  const setRoute = useGameStore((s) => s.setRoute);

  const [code, setCode] = useState(prefill);
  const [name, setName] = useState(savedName);
  const [spectator, setSpectator] = useState(false);
  const [showQrHint, setShowQrHint] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleCodeChange = (raw: string) => {
    // Auto-uppercase and strip ambiguous 0/O/1/I/L
    const cleaned = raw
      .toUpperCase()
      .replace(/[0O1IL]/g, '')
      .replace(/[^ABCDEFGHJKMNPQRSTUVWXYZ23456789]/g, '')
      .slice(0, 6);
    setCode(cleaned);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidRoomCode(code)) {
      setError('Enter a valid 6-character table code.');
      return;
    }
    const check = validatePlayerName(name);
    if (!check.valid) {
      setError(check.reason);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await joinRoom({ code, name: check.name, spectator });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join table');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main
      data-testid="join-table-screen"
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
        <h1 className="font-display text-2xl font-bold">Join Table</h1>
      </header>

      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-1 flex-col gap-4">
        <SurfaceCard className="space-y-4">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor="join-code" className="text-xs font-semibold uppercase tracking-wide">
                6-Character Code
              </label>
              <button
                type="button"
                onClick={() => setShowQrHint(!showQrHint)}
                className="inline-flex min-h-[44px] items-center gap-1 text-xs font-semibold text-[var(--color-truth-teal)]"
              >
                <QrCode className="h-4 w-4" aria-hidden="true" />
                Scan QR
              </button>
            </div>
            <input
              id="join-code"
              data-testid="join-code-input"
              type="text"
              inputMode="text"
              autoCapitalize="characters"
              maxLength={6}
              required
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder="ABCDEF"
              className="tabular-nums min-h-[48px] w-full rounded-[14px] border border-black/20 bg-[var(--color-linen)] px-3.5 text-center text-2xl font-bold tracking-[0.25em] uppercase"
            />
            <p className="mt-1 text-xs opacity-70">
              Codes never contain 0, O, 1, I, or L.
            </p>
            {showQrHint && (
              <p className="mt-2 rounded-xl bg-[var(--color-linen)] p-2.5 text-xs">
                Point your phone&apos;s camera app at the host&apos;s QR code to open the join link
                directly!
              </p>
            )}
          </div>

          <div>
            <label htmlFor="join-name" className="mb-1 block text-xs font-semibold uppercase tracking-wide">
              Your Name
            </label>
            <input
              id="join-name"
              data-testid="join-name-input"
              type="text"
              maxLength={16}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Kabir"
              className="min-h-[44px] w-full rounded-[14px] border border-black/20 bg-[var(--color-linen)] px-3.5 text-base"
            />
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={spectator}
            onClick={() => setSpectator(!spectator)}
            className="flex min-h-[44px] w-full items-center justify-between rounded-[14px] border border-black/15 bg-[var(--color-linen)] px-3.5 py-2 text-left text-sm"
          >
            <div>
              <p className="font-semibold">Join as Spectator</p>
              <p className="text-xs opacity-75">Watch the table if 8 seats are full</p>
            </div>
            <span className="text-xs font-bold">{spectator ? 'ON' : 'OFF'}</span>
          </button>
        </SurfaceCard>

        {error && (
          <p role="alert" className="text-center text-sm font-semibold text-[var(--color-brick)]">
            {error}
          </p>
        )}

        <Button
          type="submit"
          variant="primary-truth"
          fullWidth
          loading={submitting}
          data-testid="join-submit-btn"
        >
          Join Table
        </Button>
      </form>
    </main>
  );
}
