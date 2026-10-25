import React, { useState } from 'react';
import { Bottle } from '../../components/Bottle';

export interface SplashScreenProps {
  onGoogleSignIn?: () => void;
  onGuestSignIn?: () => void;
  onHaveCode?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onGoogleSignIn,
  onGuestSignIn,
  onHaveCode,
}) => {
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="w-full flex-1 flex flex-col justify-between py-6 max-w-[390px] mx-auto text-center">
      {/* Hero: Drawn Bottle on Taped Paper Frame */}
      <div className="pt-6 flex flex-col items-center">
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
        {/* 18+ & Camera Consent */}
        <label className="flex items-center justify-center gap-3 cursor-pointer text-left px-2">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="w-5 h-5 rounded border-2 border-ink text-dare focus:ring-0 focus:outline-none cursor-pointer"
          />
          <span className="font-mono text-xs text-ink leading-tight select-none">
            I'm 18+ and I know my friends can see me on camera.
          </span>
        </label>

        {/* Buttons */}
        <div className="space-y-3">
          <button
            onClick={onGoogleSignIn}
            disabled={!agreed}
            className="w-full h-14 bg-white text-ink border-2 border-ink shadow-hard rounded-btn font-mono font-bold uppercase tracking-wider text-sm flex items-center justify-center gap-3 btn-press disabled:opacity-50"
          >
            <span className="text-lg">G</span>
            <span>Continue with Google</span>
          </button>

          <button
            onClick={onGuestSignIn}
            disabled={!agreed}
            className="w-full h-14 bg-peach text-ink border-2 border-ink shadow-hard rounded-btn font-mono font-bold uppercase tracking-wider text-sm btn-press disabled:opacity-50"
          >
            Play as Guest
          </button>
        </div>

        {/* Text link: Have a code? */}
        <div className="pt-2">
          <button
            onClick={onHaveCode}
            className="font-mono text-xs font-bold text-ink underline underline-offset-4 hover:text-dare"
          >
            Have a party code?
          </button>
        </div>
      </div>
    </div>
  );
};
