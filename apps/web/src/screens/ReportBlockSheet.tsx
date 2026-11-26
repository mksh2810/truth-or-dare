import { useState } from 'react';
import { BottomSheet, Button } from '../design';
import { useGameStore } from '../state/useGameStore';

export interface ReportBlockSheetProps {
  open: boolean;
  onClose: () => void;
  targetUid?: string;
  targetName?: string;
}

const REASONS = [
  'Harassment or bullying',
  'Unsafe or harmful dare',
  'Explicit or minor-related content',
  'Personal info (PII) shared',
  'Other',
];

export function ReportBlockSheet({
  open,
  onClose,
  targetUid,
  targetName,
}: ReportBlockSheetProps) {
  const submitReport = useGameStore((s) => s.submitReport);
  const [reason, setReason] = useState(REASONS[0] ?? 'Other');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await submitReport({
        targetUid,
        reason,
        details: details.trim() || undefined,
      });
      setDetails('');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={targetName ? `Report ${targetName}` : 'Report Issue'}
      data-testid="report-block-sheet"
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-75">Reason</p>
          {REASONS.map((r) => (
            <label
              key={r}
              className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border border-black/10 bg-[var(--color-linen)] px-3 py-2 text-sm"
            >
              <input
                type="radio"
                name="report-reason"
                checked={reason === r}
                onChange={() => setReason(r)}
                className="h-4 w-4 accent-[var(--color-dare-terracotta)]"
              />
              <span>{r}</span>
            </label>
          ))}
        </div>

        <div>
          <label htmlFor="report-details" className="mb-1 block text-xs font-semibold opacity-75">
            Optional details
          </label>
          <textarea
            id="report-details"
            rows={2}
            maxLength={240}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Add any helpful context…"
            className="w-full rounded-[14px] border border-black/20 bg-[var(--color-linen)] p-3 text-sm"
          />
        </div>

        <Button
          variant="danger"
          fullWidth
          loading={submitting}
          onClick={() => void handleSubmit()}
        >
          Submit Report
        </Button>
      </div>
    </BottomSheet>
  );
}
