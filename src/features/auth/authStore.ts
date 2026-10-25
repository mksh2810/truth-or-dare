import { create } from 'zustand';
import {
  auth,
  signInWithGoogle,
  signInAsGuest,
  signOutUser,
  getUserProfile,
  saveUserProfile,
  deleteUserData,
  UserProfile,
} from '../../lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { isInAppBrowser } from '../../lib/browser';

interface AuthState {
  user: FirebaseUser | { uid: string; isAnonymous: boolean } | null;
  profile: UserProfile | null;
  loading: boolean;
  agreedConsent: boolean;
  isInApp: boolean;
  error: string | null;
  setAgreedConsent: (agreed: boolean) => void;
  loginGoogle: () => Promise<void>;
  loginGuest: (name: string, avatarId?: string) => Promise<void>;
  saveProfile: (name: string, avatarId: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteUserAndData: () => Promise<void>;
  initAuthListener: () => () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  agreedConsent: localStorage.getItem('chit_consent_18') === 'true',
  isInApp: isInAppBrowser(),
  error: null,

  setAgreedConsent: (agreed: boolean) => {
    localStorage.setItem('chit_consent_18', String(agreed));
    set({ agreedConsent: agreed });
  },

  loginGoogle: async () => {
    set({ loading: true, error: null });
    try {
      const fbUser = await signInWithGoogle();
      if (fbUser) {
        let prof = await getUserProfile(fbUser.uid);
        if (!prof) {
          prof = {
            uid: fbUser.uid,
            displayName: fbUser.displayName || 'Player',
            avatarId: 'owl',
            isGuest: false,
            totalXp: 0,
            gamesPlayed: 0,
            passes: 0,
            fails: 0,
            bestStreak: 0,
            unlocked: ['bottle-default'],
            equipped: { bottle: 'default', stamp: 'FINE' },
            shareChitsForLearning: true,
            createdAt: new Date().toISOString(),
          };
          await saveUserProfile(prof);
        }
        set({ user: fbUser, profile: prof, loading: false });
      }
    } catch (err: any) {
      console.error('Google Sign-in error:', err);
      set({ error: err.message || 'Failed to sign in with Google', loading: false });
    }
  },

  loginGuest: async (displayName: string, avatarId: string = 'fox') => {
    set({ loading: true, error: null });
    try {
      let uid = '';
      if (auth) {
        try {
          const guestUser = await signInAsGuest();
          uid = guestUser.uid;
        } catch {
          uid = 'guest-' + Math.random().toString(36).substring(2, 9);
        }
      } else {
        uid = 'guest-' + Math.random().toString(36).substring(2, 9);
      }

      const prof: UserProfile = {
        uid,
        displayName: displayName.trim() || 'Guest Player',
        avatarId,
        isGuest: true,
        totalXp: 0,
        gamesPlayed: 0,
        passes: 0,
        fails: 0,
        bestStreak: 0,
        unlocked: ['bottle-default'],
        equipped: { bottle: 'default', stamp: 'FINE' },
        shareChitsForLearning: true,
        createdAt: new Date().toISOString(),
      };

      await saveUserProfile(prof);
      set({
        user: { uid, isAnonymous: true },
        profile: prof,
        loading: false,
      });
    } catch (err: any) {
      console.error('Guest Sign-in error:', err);
      set({ error: err.message || 'Failed to play as guest', loading: false });
    }
  },

  saveProfile: async (displayName: string, avatarId: string) => {
    const { user, profile } = get();
    if (!user) return;
    const uid = user.uid;
    const updated: UserProfile = {
      ...(profile || {
        uid,
        displayName,
        avatarId,
        isGuest: 'isAnonymous' in user ? Boolean(user.isAnonymous) : true,
        totalXp: 0,
        gamesPlayed: 0,
        passes: 0,
        fails: 0,
        bestStreak: 0,
        unlocked: ['bottle-default'],
        equipped: { bottle: 'default', stamp: 'FINE' },
        createdAt: new Date().toISOString(),
      }),
      displayName: displayName.trim(),
      avatarId,
    };
    await saveUserProfile(updated);
    set({ profile: updated });
  },

  logout: async () => {
    set({ loading: true });
    await signOutUser();
    set({ user: null, profile: null, loading: false });
  },

  deleteUserAndData: async () => {
    const { user } = get();
    if (!user) return;
    set({ loading: true });
    await deleteUserData(user.uid);
    set({ user: null, profile: null, loading: false });
  },

  initAuthListener: () => {
    if (!auth) {
      // Check cached localStorage user
      const cached = localStorage.getItem('chit_guest_user');
      if (cached) {
        try {
          const prof = JSON.parse(cached);
          set({ user: { uid: prof.uid, isAnonymous: true }, profile: prof, loading: false });
          return () => {};
        } catch {
          // ignore
        }
      }
      set({ loading: false });
      return () => {};
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const prof = await getUserProfile(fbUser.uid);
        set({ user: fbUser, profile: prof, loading: false });
      } else {
        set({ user: null, profile: null, loading: false });
      }
    });

    return unsubscribe;
  },
}));
