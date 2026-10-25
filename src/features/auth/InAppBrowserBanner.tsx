import React from 'react';
import { copyOrShareCurrentUrl } from '../../lib/browser';

export const InAppBrowserBanner: React.FC = () => {
  const [copied, setCopied] = React.useState(false);

  const handleOpenExternal = async () => {
    const success = await copyOrShareCurrentUrl();
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div className="w-full mb-3 p-3 bg-highlighter border-2 border-ink shadow-hard-sm rounded-btn text-left flex items-start gap-2.5">
      <span className="text-xl">⚠️</span>
      <div className="flex-1">
        <div className="font-mono text-xs font-bold uppercase text-ink">
          In-App Browser Detected
        </div>
        <p className="font-sans text-[11px] text-ink leading-tight mt-0.5">
          Google Sign-In is blocked inside Instagram / WhatsApp. Tap below to copy link and open in <strong>Chrome</strong> or <strong>Safari</strong>.
        </p>
        <button
          onClick={handleOpenExternal}
          className="mt-1.5 px-2.5 py-1 bg-chit text-ink font-mono text-[10px] font-bold uppercase rounded border border-ink shadow-sm btn-press"
        >
          {copied ? 'Link Copied! Open Chrome / Safari' : 'Copy Link for Safari / Chrome'}
        </button>
      </div>
    </div>
  );
};
