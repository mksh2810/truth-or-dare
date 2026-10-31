import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CodeBoxes } from '../../components/CodeBoxes';
import { Button } from '../../components/Button';
import { useAuthStore } from '../auth/authStore';
import { joinRoom, sanitizeRoomCode } from '../../lib/firestore-room';

export interface JoinTableScreenProps {
  initialCode?: string;
  isGuest?: boolean;
  onJoin?: (code: string, guestName?: string) => void;
  error?: string | null;
}

export const JoinTableScreen: React.FC<JoinTableScreenProps> = ({
  initialCode = '',
  isGuest = false,
  onJoin,
  error: serverError = null,
}) => {
  const navigate = useNavigate();
  const params = useParams<{ code?: string }>();
  const { profile, loginGuest, saveProfile } = useAuthStore();

  const [code, setCode] = useState(params.code ? sanitizeRoomCode(params.code) : initialCode);
  const [guestName, setGuestName] = useState(profile?.displayName || '');
  const [localError, setLocalError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (params.code) {
      setCode(sanitizeRoomCode(params.code));
    }
  }, [params.code]);

  const handleJoin = async () => {
    const cleanCode = sanitizeRoomCode(code);
    if (cleanCode.length < 6) {
      setLocalError('Please enter a 6-character room code');
      return;
    }

    if (onJoin) {
      if (isGuest && guestName.trim().length < 2) {
        setLocalError('Please enter your name (min 2 characters)');
        return;
      }
      setLocalError('');
      onJoin(cleanCode, guestName.trim());
      return;
    }

    // Direct routing flow
    let currentProfile = profile;
    if (!currentProfile) {
      const name = guestName.trim() || 'Guest';
      await loginGuest(name);
      currentProfile = useAuthStore.getState().profile;
    } else if (guestName.trim() && guestName.trim() !== currentProfile.displayName) {
      await saveProfile(guestName.trim(), currentProfile.avatarId);
      currentProfile = useAuthStore.getState().profile;
    }

    if (!currentProfile) {
      setLocalError('Failed to initialize player session.');
      return;
    }

    setLoading(true);
    setLocalError('');
    try {
      const res = await joinRoom(cleanCode, currentProfile);
      if (res.success) {
        navigate(`/table/${cleanCode}`);
      } else {
        setLocalError(res.error || 'Failed to join table');
      }
    } catch (err: any) {
      setLocalError(err.message || 'Error joining table');
    } finally {
      setLoading(false);
    }
  };

  const displayError = localError || serverError;

  return (
    <div className="w-full flex-1 flex flex-col justify-between py-6 max-w-[390px] mx-auto text-center">
      <div className="space-y-6 pt-4">
        <div>
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-ink-muted">
            ENTER PARTY
          </span>
          <h1 className="font-display text-3xl font-black text-ink mt-1">
            Join a Table
          </h1>
        </div>

        {/* 6 Code Boxes */}
        <div className="space-y-2">
          <label className="font-mono text-xs font-bold uppercase text-ink">
            Enter 6-Digit Code
          </label>
          <CodeBoxes
            value={code}
            onChange={(val) => {
              setCode(val);
              if (localError) setLocalError('');
            }}
          />
        </div>

        {/* Name input if Guest without profile */}
        {(!profile || isGuest) && !profile?.displayName && (
          <div className="space-y-2 text-left">
            <label className="font-mono text-xs font-bold uppercase text-ink">
              Your Name
            </label>
            <input
              type="text"
              maxLength={16}
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="e.g. Aman"
              className="w-full h-14 px-4 bg-chit border-2 border-ink shadow-hard-sm rounded-btn font-mono text-lg font-bold text-ink focus:outline-none focus:ring-2 focus:ring-highlighter"
            />
          </div>
        )}

        {displayError && (
          <div className="p-3 bg-fail/10 border-2 border-fail rounded-btn font-mono text-xs text-fail font-bold">
            {displayError}
          </div>
        )}
      </div>

      <div className="pt-6">
        <Button fullWidth onClick={handleJoin}>
          Join Table
        </Button>
      </div>
    </div>
  );
};
