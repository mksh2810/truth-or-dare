import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { BottomSheet } from '../design';
import {
  POLICY_DOCUMENTS,
  getPolicyDocument,
  type LegalTab,
} from '../legal/policies';

export type { LegalTab };

export interface LegalSheetProps {
  open: boolean;
  onClose: () => void;
  initialTab?: LegalTab;
}

export function LegalSheet({ open, onClose, initialTab = 'terms' }: LegalSheetProps) {
  const [tab, setTab] = useState<LegalTab>(initialTab);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const activeDoc = getPolicyDocument(tab);

  return (
    <BottomSheet open={open} onClose={onClose} title="Table Policies" data-testid="legal-sheet">
      <div
        role="note"
        data-testid="legal-draft-banner"
        className="mb-4 flex items-center gap-2 px-3 py-2 text-xs font-bold"
        style={{
          backgroundColor: 'rgba(184, 137, 59, 0.16)',
          color: 'var(--color-brass-text)',
          borderRadius: 'var(--radius-control)',
          border: '1px solid rgba(184, 137, 59, 0.4)',
        }}
      >
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{activeDoc.banner}</span>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5" role="tablist" aria-label="Policy documents">
        {POLICY_DOCUMENTS.map((doc) => (
          <button
            key={doc.id}
            type="button"
            role="tab"
            aria-selected={tab === doc.id}
            onClick={() => setTab(doc.id)}
            className="min-h-[44px] min-w-[44px] px-3 py-1.5 text-xs font-semibold"
            style={{
              borderRadius: 'var(--radius-pill)',
              backgroundColor: tab === doc.id ? 'var(--color-ink)' : 'var(--color-linen)',
              color: tab === doc.id ? 'var(--color-cream)' : 'var(--color-ink)',
              border: 'var(--border-ink-hairline)',
            }}
          >
            {doc.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" aria-label={activeDoc.title} className="space-y-3 text-sm leading-relaxed">
        {activeDoc.sections.map((section) => (
          <div key={section.heading} className="space-y-1">
            <p className="font-semibold">{section.heading}</p>
            <p>{section.body}</p>
          </div>
        ))}
      </div>
    </BottomSheet>
  );
}
