import { useState } from 'react';
import { Check, Copy, ExternalLink, X } from 'lucide-react';
import { detectInAppBrowser } from '../pwa/inAppBrowser';
import { Button } from '../design';

export function InAppBrowserHelp() {
  const info = detectInAppBrowser();
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!info.isInApp || dismissed) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div
      role="region"
      aria-label="Open in system browser"
      data-testid="in-app-browser-help"
      className="mx-auto mt-2 w-full max-w-[398px] p-3.5"
      style={{
        backgroundColor: 'var(--color-cream)',
        color: 'var(--color-ink)',
        borderRadius: 'var(--radius-card)',
        border: 'var(--border-ink-strong)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <ExternalLink className="h-4 w-4 shrink-0 text-[var(--color-terracotta-text)]" aria-hidden="true" />
          <p className="text-xs font-semibold">
            You&apos;re in {info.name}. Open in Safari or Chrome for the best experience.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss browser tip"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <p className="mt-1 text-xs opacity-80">
        Tap the <strong>•••</strong> or <strong>Share</strong> menu and choose{' '}
        <strong>Open in Browser</strong>, or copy the link below:
      </p>
      <div className="mt-2.5">
        <Button variant="secondary" fullWidth onClick={() => void handleCopy()}>
          {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          {copied ? 'Link Copied!' : 'Copy Table Link'}
        </Button>
      </div>
    </div>
  );
}
