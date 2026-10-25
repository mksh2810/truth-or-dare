import React from 'react';

const TOKENS = [
  { name: 'paper', hex: '#FFF8F5', text: 'Text', use: 'Page background' },
  { name: 'chit', hex: '#FFFFFF', text: 'Text', use: 'Chit and card surface' },
  { name: 'chit-shade', hex: '#F3ECE8', text: 'Text', use: 'Inputs, quiet panels' },
  { name: 'ink', hex: '#1C1917', text: 'White', use: 'Text and borders' },
  { name: 'ink-muted', hex: '#6B5B53', text: 'White', use: 'Secondary text' },
  { name: 'dare', hex: '#B91C14', text: 'White', use: 'Dare colour, primary button' },
  { name: 'truth', hex: '#2757D6', text: 'White', use: 'Truth colour' },
  { name: 'highlighter', hex: '#F6C244', text: 'Text', use: 'Tape, XP bar, accents' },
  { name: 'peach', hex: '#FFDDB0', text: 'Text', use: 'Secondary button fill' },
  { name: 'pass', hex: '#2F8F5B', text: 'White', use: 'PASSED stamp' },
  { name: 'fail', hex: '#B91C14', text: 'White', use: 'NOT IT stamp' },
];

export default function DevKit() {
  return (
    <div className="w-full py-8 space-y-8">
      <div className="space-y-2">
        <span className="font-mono text-xs uppercase tracking-widest text-ink-muted">
          Design System · Stage 0
        </span>
        <h1 className="font-display text-3xl font-black tracking-tight text-ink">
          Chit Table Dev Kit
        </h1>
        <p className="font-handwriting text-lg text-ink-muted italic">
          Design tokens, fonts, hard shadows and UI playground.
        </p>
      </div>

      {/* Token Colors */}
      <section className="space-y-4">
        <h2 className="font-mono text-sm uppercase tracking-wider font-bold border-b-2 border-ink pb-1">
          Color Tokens
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {TOKENS.map((token) => (
            <div
              key={token.name}
              className="p-3 border-2 border-ink shadow-hard rounded-btn flex flex-col justify-between"
              style={{
                backgroundColor: token.hex,
                color: token.text === 'White' ? '#FFFFFF' : '#1C1917',
              }}
            >
              <div className="font-mono font-bold text-xs uppercase">{token.name}</div>
              <div className="font-mono text-[11px] opacity-85 mt-2">{token.hex}</div>
              <div className="text-[10px] mt-1 font-mono opacity-75">{token.use}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Typography Preview */}
      <section className="space-y-4">
        <h2 className="font-mono text-sm uppercase tracking-wider font-bold border-b-2 border-ink pb-1">
          Typography
        </h2>
        <div className="space-y-3 bg-white p-4 border-2 border-ink shadow-hard rounded-btn">
          <div>
            <div className="text-[10px] font-mono text-ink-muted uppercase">Display · Fraunces</div>
            <div className="font-display text-2xl font-bold text-ink">TRUTH or DARE</div>
          </div>
          <div className="pt-2 border-t border-chit-shade">
            <div className="text-[10px] font-mono text-ink-muted uppercase">Handwriting · Newsreader Italic</div>
            <div className="font-handwriting text-xl italic text-ink">
              “What is the most embarrassing thing in your search history?”
            </div>
          </div>
          <div className="pt-2 border-t border-chit-shade">
            <div className="text-[10px] font-mono text-ink-muted uppercase">Mono UI · DM Mono</div>
            <div className="font-mono text-sm tracking-widest text-ink uppercase">
              ROOM CODE: 4A8K9Z · 00:42 SEC
            </div>
          </div>
        </div>
      </section>

      {/* Button & Shadow Showcase */}
      <section className="space-y-4">
        <h2 className="font-mono text-sm uppercase tracking-wider font-bold border-b-2 border-ink pb-1">
          Borders & Hard Shadows
        </h2>
        <div className="flex flex-col gap-3">
          <button className="h-14 w-full bg-dare text-white font-mono font-bold uppercase rounded-btn border-2 border-ink shadow-hard btn-press">
            Primary Button (Dare Red · 56px)
          </button>
          <button className="h-12 w-full bg-peach text-ink font-mono font-bold uppercase rounded-btn border-2 border-ink shadow-hard btn-press">
            Secondary Button (Peach · 48px)
          </button>
          <button className="h-12 w-full bg-white text-ink font-mono font-semibold uppercase rounded-btn border-2 border-ink shadow-hard-sm btn-press">
            Quiet Card (48px)
          </button>
        </div>
      </section>
    </div>
  );
}
