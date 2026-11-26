import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { BottomSheet } from '../design';

export type LegalTab = 'terms' | 'privacy' | 'safe-dares' | 'recording';

export interface LegalSheetProps {
  open: boolean;
  onClose: () => void;
  initialTab?: LegalTab;
}

export function LegalSheet({ open, onClose, initialTab = 'terms' }: LegalSheetProps) {
  const [tab, setTab] = useState<LegalTab>(initialTab);

  const tabs: Array<{ id: LegalTab; label: string }> = [
    { id: 'terms', label: 'Terms' },
    { id: 'privacy', label: 'Privacy' },
    { id: 'safe-dares', label: 'Safe Dares' },
    { id: 'recording', label: 'Recording' },
  ];

  return (
    <BottomSheet open={open} onClose={onClose} title="Table Policies" data-testid="legal-sheet">
      <div
        className="mb-4 flex items-center gap-2 px-3 py-2 text-xs font-bold"
        style={{
          backgroundColor: 'rgba(184, 137, 59, 0.16)',
          color: 'var(--color-brass-text)',
          borderRadius: 'var(--radius-control)',
          border: '1px solid rgba(184, 137, 59, 0.4)',
        }}
      >
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>DRAFT — NOT LEGALLY REVIEWED (Private Beta)</span>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className="min-h-[44px] px-3 py-1.5 text-xs font-semibold"
            style={{
              borderRadius: 'var(--radius-pill)',
              backgroundColor: tab === t.id ? 'var(--color-ink)' : 'var(--color-linen)',
              color: tab === t.id ? 'var(--color-cream)' : 'var(--color-ink)',
              border: 'var(--border-ink-hairline)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-3 text-sm leading-relaxed">
        {tab === 'terms' && (
          <>
            <p className="font-semibold">1. Eligibility (18+ Self-Declaration)</p>
            <p>
              Vowlet is intended strictly for adults aged 18 and older playing with consenting
              friends. By entering a table, you self-declare that you are 18+.
            </p>
            <p className="font-semibold">2. Respect &amp; Consent</p>
            <p>
              Every player may Skip any prompt at any time. Never pressure anyone to perform a
              truth or dare they are uncomfortable with.
            </p>
          </>
        )}

        {tab === 'privacy' && (
          <>
            <p className="font-semibold">Data We Store</p>
            <p>
              Guest players only store a temporary display name and session score while a room is
              active. Rooms expire automatically 4 hours after last activity.
            </p>
            <p className="font-semibold">Delete My Data</p>
            <p>
              You can clear your local preferences or request account deletion anytime in Settings.
            </p>
          </>
        )}

        {tab === 'safe-dares' && (
          <>
            <p className="font-semibold">Safe Dares &amp; Content Policy</p>
            <p>
              All chits must be alcohol-free, drug-free, non-explicit, and physically safe. No
              trespassing, driving, fire, heights, ingestion, nudity, PII, or harassment.
            </p>
          </>
        )}

        {tab === 'recording' && (
          <>
            <p className="font-semibold">Call &amp; Room Recording Notice</p>
            <p>
              Vowlet does not record your room. However, others in the room or on an external video
              call (Meet, WhatsApp, Discord) can record audio or video. Play accordingly.
            </p>
          </>
        )}
      </div>
    </BottomSheet>
  );
}
