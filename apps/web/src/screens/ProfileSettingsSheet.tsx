import { Suspense, lazy, useState } from 'react';
import { LogIn, LogOut, Trash2, Volume2, VolumeX } from 'lucide-react';
import { BottomSheet, Button } from '../design';
import { signInWithGoogle, signOutToGuest } from '../auth/firebase';
import { useGameStore } from '../state/useGameStore';
import type { LegalTab } from '../legal/policies';

const LegalSheet = lazy(() =>
  import('./LegalSheet').then((m) => ({ default: m.LegalSheet })),
);

export interface ProfileSettingsSheetProps {
  open: boolean;
  onClose: () => void;
}

export function ProfileSettingsSheet({ open, onClose }: ProfileSettingsSheetProps) {
  const auth = useGameStore((s) => s.auth);
  const setAuth = useGameStore((s) => s.setAuth);
  const displayName = useGameStore((s) => s.displayName);
  const setDisplayName = useGameStore((s) => s.setDisplayName);
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const setSoundEnabled = useGameStore((s) => s.setSoundEnabled);
  const reducedMotionOverride = useGameStore((s) => s.reducedMotionOverride);
  const setReducedMotionOverride = useGameStore((s) => s.setReducedMotionOverride);
  const level = useGameStore((s) => s.level);
  const lifetimeXp = useGameStore((s) => s.lifetimeXp);
  const deleteUserData = useGameStore((s) => s.deleteUserData);
  const showToast = useGameStore((s) => s.showToast);

  const [legalTab, setLegalTab] = useState<LegalTab | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isSignedIn = Boolean(auth && !auth.isAnonymous);

  const handleGoogleSignIn = async () => {
    try {
      const profile = await signInWithGoogle();
      setAuth(profile);
      showToast('Signed in! Your XP & tables will be saved.', 'success');
    } catch {
      showToast('Sign-in was cancelled or unavailable.', 'error');
    }
  };

  const handleSignOut = async () => {
    const guest = await signOutToGuest();
    setAuth(guest);
    showToast('Switched to Guest mode.', 'info');
  };

  return (
    <>
      <BottomSheet
        open={open}
        onClose={onClose}
        title="Profile & Settings"
        data-testid="settings-sheet"
      >
        <div className="space-y-5">
          {/* Account */}
          <div className="rounded-[14px] border border-black/10 bg-[var(--color-linen)] p-3.5">
            {isSignedIn ? (
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{auth?.email || 'Signed-in Player'}</p>
                  <p className="text-xs font-medium text-[var(--color-brass-text)]">
                    Level {level} • {lifetimeXp} Lifetime XP
                  </p>
                </div>
                <Button variant="secondary" onClick={() => void handleSignOut()}>
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Sign out
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-xs opacity-80">
                  Playing as Guest. Sign in with Google to keep your Lifetime XP and saved tables.
                </p>
                <Button variant="primary-truth" fullWidth onClick={() => void handleGoogleSignIn()}>
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                  Sign in with Google
                </Button>
              </div>
            )}
          </div>

          {/* Default Display Name */}
          <div>
            <label htmlFor="settings-name" className="mb-1 block text-xs font-semibold">
              Default Display Name
            </label>
            <input
              id="settings-name"
              type="text"
              maxLength={16}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your table name"
              className="min-h-[44px] w-full rounded-[14px] border border-black/20 bg-[var(--color-linen)] px-3 text-sm"
            />
          </div>

          {/* Toggles */}
          <div className="space-y-2">
            <button
              type="button"
              role="switch"
              aria-checked={soundEnabled}
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="flex min-h-[44px] w-full items-center justify-between rounded-[14px] border border-black/10 bg-[var(--color-linen)] px-3.5 py-2.5 text-sm font-medium"
            >
              <span className="flex items-center gap-2">
                {soundEnabled ? (
                  <Volume2 className="h-4 w-4 text-[var(--color-sage-text)]" aria-hidden="true" />
                ) : (
                  <VolumeX className="h-4 w-4 opacity-60" aria-hidden="true" />
                )}
                Sound Effects
              </span>
              <span className="text-xs font-bold">{soundEnabled ? 'ON' : 'OFF'}</span>
            </button>

            <button
              type="button"
              role="switch"
              aria-checked={reducedMotionOverride}
              onClick={() => setReducedMotionOverride(!reducedMotionOverride)}
              className="flex min-h-[44px] w-full items-center justify-between rounded-[14px] border border-black/10 bg-[var(--color-linen)] px-3.5 py-2.5 text-sm font-medium"
            >
              <span>Reduced Motion</span>
              <span className="text-xs font-bold">{reducedMotionOverride ? 'ON' : 'AUTO'}</span>
            </button>
          </div>

          {/* Legal Links */}
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              onClick={() => setLegalTab('terms')}
              className="min-h-[44px] underline"
            >
              Terms (DRAFT)
            </button>
            <button
              type="button"
              onClick={() => setLegalTab('privacy')}
              className="min-h-[44px] underline"
            >
              Privacy (DRAFT)
            </button>
            <button
              type="button"
              onClick={() => setLegalTab('content')}
              className="min-h-[44px] underline"
            >
              Content (DRAFT)
            </button>
            <button
              type="button"
              onClick={() => setLegalTab('safe-dares')}
              className="min-h-[44px] underline"
            >
              Safe Dares (DRAFT)
            </button>
          </div>

          {/* Delete My Data */}
          {!confirmDelete ? (
            <Button
              variant="ghost"
              fullWidth
              onClick={() => setConfirmDelete(true)}
              style={{ color: 'var(--color-brick)' }}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete My Data
            </Button>
          ) : (
            <div className="rounded-[14px] border border-[var(--color-brick)] bg-red-50 p-3 text-center">
              <p className="mb-2 text-xs font-semibold text-[var(--color-brick)]">
                Clear all local preferences, consent, and saved tables?
              </p>
              <div className="flex gap-2">
                <Button
                  variant="danger"
                  fullWidth
                  loading={deleting}
                  onClick={() => {
                    setDeleting(true);
                    void deleteUserData().finally(() => {
                      setDeleting(false);
                      setConfirmDelete(false);
                      onClose();
                    });
                  }}
                >
                  Confirm Delete
                </Button>
                <Button variant="secondary" fullWidth onClick={() => setConfirmDelete(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </BottomSheet>

      {legalTab !== null && (
        <Suspense fallback={null}>
          <LegalSheet
            open={legalTab !== null}
            onClose={() => setLegalTab(null)}
            initialTab={legalTab ?? 'terms'}
          />
        </Suspense>
      )}
    </>
  );
}
