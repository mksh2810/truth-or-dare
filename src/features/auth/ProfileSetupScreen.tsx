import React, { useState } from 'react';
import { Button } from '../../components/Button';
import { StickerAvatar, STICKER_LIST } from '../../components/StickerAvatar';

export interface ProfileSetupScreenProps {
  initialName?: string;
  initialAvatarId?: string;
  onSave?: (name: string, avatarId: string) => void;
}

export const ProfileSetupScreen: React.FC<ProfileSetupScreenProps> = ({
  initialName = '',
  initialAvatarId = 'owl',
  onSave,
}) => {
  const [name, setName] = useState(initialName);
  const [selectedAvatar, setSelectedAvatar] = useState(initialAvatarId);
  const [is18Plus, setIs18Plus] = useState(true);
  const [error, setError] = useState('');

  const handleDone = () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }
    if (trimmed.length > 16) {
      setError('Name must be 16 characters or less');
      return;
    }
    if (!is18Plus) {
      setError('You must confirm you are 18+ to enter');
      return;
    }
    setError('');
    onSave?.(trimmed, selectedAvatar);
  };

  return (
    <div className="w-full flex-1 flex flex-col justify-between py-6 max-w-[390px] mx-auto">
      <div className="space-y-6">
        <div>
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-ink-muted">
            SET UP YOUR CHIT
          </span>
          <h1 className="font-display text-3xl font-black text-ink mt-1">
            Pick Your Persona
          </h1>
        </div>

        {/* Selected Avatar Preview */}
        <div className="flex flex-col items-center justify-center p-4 bg-chit border-2 border-ink shadow-hard rounded-btn">
          <StickerAvatar avatarId={selectedAvatar} size="lg" />
          <span className="font-mono text-xs uppercase font-bold text-ink-muted mt-2">
            Tap below to change avatar
          </span>
        </div>

        {/* 12 Sticker Avatar Grid */}
        <div className="space-y-2">
          <label className="font-mono text-xs font-bold uppercase text-ink">
            Avatar Sticker
          </label>
          <div className="grid grid-cols-4 gap-2.5 max-h-44 overflow-y-auto p-1">
            {STICKER_LIST.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedAvatar(s.id)}
                className={`p-2 rounded-btn border-2 flex items-center justify-center text-2xl transition-transform ${
                  selectedAvatar === s.id
                    ? 'border-ink bg-highlighter shadow-hard-sm scale-105'
                    : 'border-transparent hover:border-ink/20'
                }`}
              >
                <span>{s.emoji}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Name input */}
        <div className="space-y-2">
          <label className="font-mono text-xs font-bold uppercase text-ink">
            Display Name (2-16 chars)
          </label>
          <input
            type="text"
            value={name}
            maxLength={16}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError('');
            }}
            placeholder="e.g. Felix, Riya..."
            className="w-full h-14 px-4 bg-chit border-2 border-ink shadow-hard-sm rounded-btn font-mono text-lg font-bold text-ink focus:outline-none focus:ring-2 focus:ring-highlighter"
          />
          {error && (
            <p className="font-mono text-xs text-fail font-bold">{error}</p>
          )}
        </div>

        {/* 18+ Confirmation */}
        <label className="flex items-center gap-3 cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={is18Plus}
            onChange={(e) => setIs18Plus(e.target.checked)}
            className="w-5 h-5 rounded border-2 border-ink text-dare focus:ring-0 focus:outline-none"
          />
          <span className="font-mono text-xs text-ink select-none">
            I confirm I am 18 years or older.
          </span>
        </label>
      </div>

      <div className="pt-6">
        <Button fullWidth onClick={handleDone}>
          Done
        </Button>
      </div>
    </div>
  );
};
