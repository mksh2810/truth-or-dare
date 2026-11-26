import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import type { SurfaceMode } from './Button';

export interface SurfaceCardProps {
  surface?: SurfaceMode;
  className?: string;
  style?: React.CSSProperties;
  children: ReactNode;
  'data-testid'?: string;
}

export function SurfaceCard({
  surface = 'linen',
  className = '',
  style,
  children,
  'data-testid': testId,
}: SurfaceCardProps) {
  const isLamplit = surface === 'lamplit';

  return (
    <div
      data-testid={testId}
      className={`p-4 ${className}`}
      style={{
        backgroundColor: isLamplit ? 'rgba(42, 29, 20, 0.88)' : 'var(--color-cream)',
        color: isLamplit ? 'var(--color-lamplit-text)' : 'var(--color-ink)',
        borderRadius: 'var(--radius-card)',
        border: isLamplit ? 'var(--border-lamplit-hairline)' : 'var(--border-ink-hairline)',
        boxShadow: 'var(--shadow-card)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  'data-testid'?: string;
}

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  'data-testid': testId,
}: BottomSheetProps) {
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    closeBtnRef.current?.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
      prevFocus?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-testid={testId}
        className="w-full max-w-[430px] max-h-[90dvh] overflow-y-auto p-5"
        style={{
          backgroundColor: 'var(--color-cream)',
          color: 'var(--color-ink)',
          borderTopLeftRadius: 'var(--radius-card)',
          borderTopRightRadius: 'var(--radius-card)',
          borderTop: 'var(--border-ink-hairline)',
          boxShadow: 'var(--shadow-sheet)',
          paddingBottom: 'calc(var(--safe-bottom) + 20px)',
        }}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-bold">{title}</h2>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label={`Close ${title}`}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/15 bg-black/5 text-[var(--color-ink)]"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
