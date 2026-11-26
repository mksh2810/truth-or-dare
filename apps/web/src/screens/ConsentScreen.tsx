import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Button, OwlMascot, SurfaceCard, VowletWordmark } from '../design';
import { useGameStore } from '../state/useGameStore';
import { LegalSheet, type LegalTab } from './LegalSheet';

export function ConsentScreen() {
  const acceptConsent = useGameStore((s) => s.acceptConsent);
  const [checked, setChecked] = useState(false);
  const [legalTab, setLegalTab] = useState<LegalTab | null>(null);

  return (
    <main
      data-testid="consent-screen"
      className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col justify-between px-4 py-6"
      style={{
        paddingTop: 'calc(var(--safe-top) + 24px)',
        paddingBottom: 'calc(var(--safe-bottom) + 24px)',
      }}
    >
      <div className="flex flex-col items-center gap-4">
        <OwlMascot pose="idle" size="md" />
        <VowletWordmark />
      </div>

      <SurfaceCard className="my-5 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-[var(--color-truth-teal)]" aria-hidden="true" />
          <h2 className="font-display text-xl font-bold">Before you pull up a chair</h2>
        </div>

        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed">
          <li>
            <strong>18+ Table:</strong> Vowlet is for adults aged 18 and older playing with
            consenting friends.
          </li>
          <li>
            <strong>Table Rules:</strong> Keep prompts alcohol-free, drug-free, and physically safe.
            Anyone may Skip a prompt anytime.
          </li>
          <li>
            <strong>Recording Notice:</strong> Vowlet doesn&apos;t record you, but{' '}
            <strong>others in the room or on a video call can record</strong>.
          </li>
        </ul>

        <div className="flex flex-wrap gap-3 text-xs">
          <button
            type="button"
            onClick={() => setLegalTab('terms')}
            className="min-h-[44px] font-semibold text-[var(--color-truth-teal)] underline"
          >
            Terms (DRAFT)
          </button>
          <button
            type="button"
            onClick={() => setLegalTab('privacy')}
            className="min-h-[44px] font-semibold text-[var(--color-truth-teal)] underline"
          >
            Privacy (DRAFT)
          </button>
          <button
            type="button"
            onClick={() => setLegalTab('safe-dares')}
            className="min-h-[44px] font-semibold text-[var(--color-truth-teal)] underline"
          >
            Safe Dares (DRAFT)
          </button>
        </div>

        <label className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-[14px] border border-black/15 bg-[var(--color-linen)] p-3 text-sm">
          <input
            type="checkbox"
            data-testid="consent-checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-dare-terracotta)]"
          />
          <span>I self-declare that I am 18+ and agree to the table rules.</span>
        </label>

        <Button
          variant="primary-dare"
          fullWidth
          disabled={!checked}
          data-testid="consent-accept"
          onClick={acceptConsent}
        >
          I&apos;m 18+ &amp; Agree
        </Button>
      </SurfaceCard>

      <p className="text-center text-xs opacity-70">
        Private Beta • DRAFT policies not yet legally reviewed
      </p>

      <LegalSheet
        open={legalTab !== null}
        onClose={() => setLegalTab(null)}
        initialTab={legalTab ?? 'terms'}
      />
    </main>
  );
}
