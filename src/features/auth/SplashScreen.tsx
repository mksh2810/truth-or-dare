import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bottle } from '../../components/Bottle';
import { useAuthStore } from './authStore';
import { InAppBrowserBanner } from './InAppBrowserBanner';

export const SplashScreen: React.FC = () => {
  const navigate = useNavigate();
  const {
    agreedConsent,
    setAgreedConsent,
    loginGoogle,
    loginGuest,
    isInApp,
    loading,
    error,
  } = useAuthStore();

  const [guestName, setGuestName] = useState('');
  const [showGuestModal, setShowGuestModal] = useState(false);

  const handleGoogle = async () => {
    if (!agreedConsent) return;
    await loginGoogle();
    navigate('/home');
  };

  const handleGuestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedConsent || !guestName.trim()) return;
    await loginGuest(guestName.trim());
    navigate('/home');
  };

  return (
    <div className="w-full flex-1 flex flex-col justify-between py-6 max-w-[390px] mx-auto text-center">
      {/* In-app browser warning banner */}
      {isInApp && <InAppBrowserBanner />}

      {/* Hero: Drawn Bottle on Taped Paper Frame */}
      <div className="pt-2 flex flex-col items-center">
        <div className="relative p-6 bg-chit border-2 border-ink shadow-hard rounded-btn -rotate-2 mb-6">
          {/* Top tape strip */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-20 h-6 bg-highlighter/90 border border-ink/40 shadow-sm rotate-2" />
          <Bottle skin="green" rotation={15} />
        </div>

        {/* Title: TRUTH or DARE */}
        <h1 className="font-display text-4xl md:text-5xl font-black tracking-tight leading-none mb-2">
          <span className="text-truth">TRUTH</span>{' '}
          <span className="text-ink text-2xl font-serif font-normal italic">or</span>{' '}
          <span className="text-dare relative inline-block">
            DARE
            <span className="absolute left-0 -bottom-1 w-full h-2 bg-highlighter -z-10 rounded-full" />
          </span>
        </h1>

        <p className="font-handwriting text-xl text-ink-muted italic">
          Write it. Do it. Get judged.
        </p>
      </div>

      {/* Primary Actions & 18+ Checkbox */}
      <div className="w-full space-y-4 pt-4">
        {error && (
          <div className="p-2.5 bg-fail/10 border-2 border-fail rounded-btn font-mono text-xs text-fail font-bold">
            {error}
          </div>
        )}

        {/* 18+ & Camera Consent Checkbox (AUTH-2) */}
        <label className="flex items-center justify-center gap-3 cursor-pointer text-left px-2">
          <input
            type="checkbox"
            checked={agreedConsent}
            onChange={(e) => setAgreedConsent(e.target.checked)}
            className="w-5 h-5 rounded border-2 border-ink text-dare focus:ring-0 focus:outline-none cursor-pointer"
          />
          <span className="font-mono text-xs text-ink leading-tight select-none">
            I'm 18+ and I know my friends can see me on camera.
          </span>
        </label>

        {/* Buttons (Google & Guest) */}
        <div className="space-y-3">
          <button
            onClick={handleGoogle}
            disabled={!agreedConsent || loading}
            className="w-full h-14 bg-white text-ink border-2 border-ink shadow-hard rounded-btn font-mono font-bold uppercase tracking-wider text-sm flex items-center justify-center gap-3 btn-press disabled:opacity-50"
          >
            <span className="text-lg">G</span>
            <span>{loading ? 'Signing in...' : 'Continue with Google'}</span>
          </button>

          <button
            onClick={() => {
              if (agreedConsent) setShowGuestModal(true);
            }}
            disabled={!agreedConsent || loading}
            className="w-full h-14 bg-peach text-ink border-2 border-ink shadow-hard rounded-btn font-mono font-bold uppercase tracking-wider text-sm btn-press disabled:opacity-50"
          >
            Play as Guest
          </button>
        </div>

        {/* Text link: Have a code? */}
        <div className="pt-2">
          <button
            onClick={() => navigate('/join')}
            className="font-mono text-xs font-bold text-ink underline underline-offset-4 hover:text-dare"
          >
            Have a party code?
          </button>
        </div>
      </div>

      {/* Guest Name Modal */}
      {showGuestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
          <div className="w-full max-w-[340px] bg-paper border-2 border-ink shadow-hard-lg rounded-btn p-5 text-left space-y-4">
            <h3 className="font-display text-2xl font-black text-ink">
              Guest Name
            </h3>
            <p className="font-sans text-xs text-ink-muted">
              Enter your name to join friends at the table.
            </p>
            <form onSubmit={handleGuestSubmit} className="space-y-3">
              <input
                type="text"
                autoFocus
                maxLength={16}
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Your name (e.g. Aman)"
                className="w-full h-12 px-3 bg-chit border-2 border-ink rounded-btn font-mono text-base font-bold text-ink focus:outline-none focus:ring-2 focus:ring-highlighter"
              />
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGuestModal(false)}
                  className="flex-1 h-12 bg-chit-shade text-ink border-2 border-ink rounded-btn font-mono text-xs font-bold uppercase btn-press"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={guestName.trim().length < 2}
                  className="flex-1 h-12 bg-dare text-white border-2 border-ink rounded-btn font-mono text-xs font-bold uppercase btn-press disabled:opacity-50"
                >
                  Enter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
