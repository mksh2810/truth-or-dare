import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button';
import { useAuthStore } from '../auth/authStore';
import { createRoom } from '../../lib/firestore-room';

export interface CreateTableScreenProps {
  onCreate?: (settings: {
    maxPlayers: number;
    tier: 'mild' | 'spicy' | 'legend';
    timer: 'short' | 'normal' | 'long';
    dareMode: 'room' | 'live';
  }) => void;
  createdCode?: string | null;
  onEnterLobby?: () => void;
}

export const CreateTableScreen: React.FC<CreateTableScreenProps> = ({
  onCreate,
  createdCode: propCreatedCode,
  onEnterLobby,
}) => {
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const [players, setPlayers] = useState(4);
  const [tier, setTier] = useState<'mild' | 'spicy' | 'legend'>('spicy');
  const [timer, setTimer] = useState<'short' | 'normal' | 'long'>('normal');
  const [dareMode, setDareMode] = useState<'room' | 'live'>('room');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [internalCode, setInternalCode] = useState<string | null>(null);

  const activeCode = propCreatedCode || internalCode;

  const handleCreate = async () => {
    if (onCreate) {
      onCreate({
        maxPlayers: players,
        tier,
        timer,
        dareMode,
      });
      return;
    }

    if (!profile) return;
    setLoading(true);
    try {
      const code = await createRoom(profile, {
        maxPlayers: players,
        tier,
        timer,
        dareMode,
      });
      setInternalCode(code);
    } catch (err) {
      console.error('Failed to create room:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (activeCode) {
      navigator.clipboard.writeText(activeCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleGoToLobby = () => {
    if (onEnterLobby) {
      onEnterLobby();
    } else if (activeCode) {
      navigate(`/table/${activeCode}`);
    }
  };

  // Frame 2: After table creation
  if (activeCode) {
    return (
      <div className="w-full flex-1 flex flex-col justify-between py-6 max-w-[390px] mx-auto text-center">
        <div className="space-y-6 pt-4">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-ink-muted">
            TABLE READY
          </span>
          <h1 className="font-display text-3xl font-black text-ink">
            Share the Code
          </h1>

          {/* Ticket stub */}
          <div className="relative p-6 bg-chit border-2 border-ink shadow-hard rounded-btn space-y-4">
            <div className="font-mono text-xs text-ink-muted uppercase">Party Code</div>
            <div className="font-mono text-5xl font-black tracking-widest text-dare py-2">
              {activeCode}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="flex-1 h-12 bg-chit-shade text-ink border-2 border-ink shadow-hard-sm rounded-btn font-mono text-xs font-bold uppercase btn-press"
              >
                {copied ? 'Copied! ✓' : 'Copy Code'}
              </button>
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: 'Join my Chit Table!',
                      text: `Join our Truth or Dare table with code: ${activeCode}`,
                      url: `${window.location.origin}/join/${activeCode}`,
                    }).catch(() => {});
                  } else {
                    handleCopy();
                  }
                }}
                className="flex-1 h-12 bg-highlighter text-ink border-2 border-ink shadow-hard-sm rounded-btn font-mono text-xs font-bold uppercase btn-press"
              >
                Share Link
              </button>
            </div>
          </div>
        </div>

        <div className="pt-6">
          <Button fullWidth onClick={handleGoToLobby}>
            Go to Lobby
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex-1 flex flex-col justify-between py-6 max-w-[390px] mx-auto">
      <div className="space-y-6">
        <div>
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-ink-muted">
            NEW GAME
          </span>
          <h1 className="font-display text-3xl font-black text-ink mt-1">
            Set the Table
          </h1>
        </div>

        {/* 1. Players Stepper */}
        <div className="p-4 bg-chit border-2 border-ink shadow-hard-sm rounded-btn flex items-center justify-between">
          <span className="font-mono text-sm font-bold uppercase text-ink">
            Max Players
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPlayers(Math.max(2, players - 1))}
              className="w-9 h-9 border-2 border-ink bg-chit-shade rounded-btn font-mono font-bold text-lg btn-press flex items-center justify-center"
            >
              -
            </button>
            <span className="font-mono text-lg font-black w-6 text-center">
              {players}
            </span>
            <button
              onClick={() => setPlayers(Math.min(8, players + 1))}
              className="w-9 h-9 border-2 border-ink bg-chit-shade rounded-btn font-mono font-bold text-lg btn-press flex items-center justify-center"
            >
              +
            </button>
          </div>
        </div>

        {/* 2. Spice Tier (Mild, Spicy, Legend) */}
        <div className="space-y-2">
          <label className="font-mono text-xs font-bold uppercase text-ink">
            Spice Tier
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['mild', 'spicy', 'legend'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTier(t)}
                className={`h-12 border-2 border-ink rounded-btn font-mono text-xs font-bold uppercase tracking-wider btn-press ${
                  tier === t
                    ? 'bg-dare text-white shadow-hard-sm'
                    : 'bg-chit text-ink shadow-none'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Timers (Short, Normal, Long) */}
        <div className="space-y-2">
          <label className="font-mono text-xs font-bold uppercase text-ink">
            Timer Speed
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['short', 'normal', 'long'] as const).map((tm) => (
              <button
                key={tm}
                onClick={() => setTimer(tm)}
                className={`h-12 border-2 border-ink rounded-btn font-mono text-xs font-bold uppercase tracking-wider btn-press ${
                  timer === tm
                    ? 'bg-ink text-white shadow-hard-sm'
                    : 'bg-chit text-ink shadow-none'
                }`}
              >
                {tm}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Dares Mode */}
        <div className="space-y-2">
          <label className="font-mono text-xs font-bold uppercase text-ink">
            Dare Delivery
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setDareMode('room')}
              className={`h-12 border-2 border-ink rounded-btn font-mono text-xs font-bold uppercase btn-press ${
                dareMode === 'room'
                  ? 'bg-truth text-white shadow-hard-sm'
                  : 'bg-chit text-ink'
              }`}
            >
              In the Room
            </button>
            <button
              onClick={() => setDareMode('live')}
              className={`h-12 border-2 border-ink rounded-btn font-mono text-xs font-bold uppercase btn-press ${
                dareMode === 'live'
                  ? 'bg-truth text-white shadow-hard-sm'
                  : 'bg-chit text-ink'
              }`}
            >
              Remote Live
            </button>
          </div>
        </div>
      </div>

      <div className="pt-6 space-y-3">
        {/* Grey line for Stranger Roulette (Rule 10 in 3.2) */}
        <p className="font-mono text-xs text-ink-muted text-center">
          Stranger Roulette is coming soon.
        </p>

        <Button
          fullWidth
          disabled={loading}
          onClick={handleCreate}
        >
          {loading ? 'Setting Table...' : 'Create Table'}
        </Button>
      </div>
    </div>
  );
};
