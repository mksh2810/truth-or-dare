import React, { useState } from 'react';
import { Button } from '../../components/Button';
import { Chit } from '../../components/Chit';
import { Stamp } from '../../components/Stamp';

export interface OnboardingScreenProps {
  onComplete?: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);

  const cards = [
    {
      stepLabel: '1 OF 3',
      title: 'Write Your Chits',
      description:
        'Everyone writes one truth and one dare. Our grumpy AI Judge owl inspects every chit before it enters the pool.',
      preview: (
        <Chit
          type="truth"
          text="What is your most embarrassing guilty pleasure song?"
          stamp="FINE"
        />
      ),
    },
    {
      stepLabel: '2 OF 3',
      title: 'Spin & Perform',
      description:
        'The bottle spins and picks a player. Draw a peer’s secret chit. Speak the truth or perform the dare!',
      preview: (
        <Chit
          type="dare"
          text="Give an impassioned graduation speech to a house plant."
          taped
        />
      ),
    },
    {
      stepLabel: '3 OF 3',
      title: 'Vote & Rank Up',
      description:
        'The whole table votes Pass or Fail. Earn XP, climb ranks from Fresh Chit to Legend, and unlock new bottles.',
      preview: (
        <div className="flex flex-col items-center gap-3 py-2">
          <Stamp type="PASSED" size="lg" rotation={-4} />
          <span className="font-mono text-xs font-bold text-ink uppercase">
            +50 XP Awarded
          </span>
        </div>
      ),
    },
  ];

  const current = cards[step];

  const handleNext = () => {
    if (step < cards.length - 1) {
      setStep(step + 1);
    } else {
      onComplete?.();
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col justify-between py-6 max-w-[390px] mx-auto">
      {/* Top indicator */}
      <div className="flex items-center justify-between pb-4">
        <span className="font-mono text-xs font-bold uppercase tracking-widest text-ink-muted">
          HOW TO PLAY · {current.stepLabel}
        </span>
        <div className="flex gap-1.5">
          {cards.map((_, i) => (
            <div
              key={i}
              className={`w-6 h-2 rounded-full border border-ink ${
                i === step ? 'bg-dare' : 'bg-chit-shade'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Center card */}
      <div className="flex-1 flex flex-col justify-center space-y-6">
        <div>
          <h2 className="font-display text-3xl font-bold text-ink mb-2">
            {current.title}
          </h2>
          <p className="text-base md:text-[17px] text-ink leading-relaxed font-sans">
            {current.description}
          </p>
        </div>

        <div className="py-2">{current.preview}</div>
      </div>

      {/* Bottom Button */}
      <div className="pt-6">
        <Button fullWidth onClick={handleNext}>
          {step === cards.length - 1 ? 'Start Playing' : 'Next'}
        </Button>
      </div>
    </div>
  );
};
