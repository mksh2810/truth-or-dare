import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signInAnonymously,
  signOut as fbSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  Auth,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  Firestore,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyFakeKeyForLocalDevelopment',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'chit-table.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'chit-table',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1234567890:web:abcdef123456',
};

// Check if Firebase has real configured credentials
export const isFirebaseConfigured = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_API_KEY !== 'AIzaSyFakeKeyForLocalDevelopment'
);

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

try {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (err) {
  console.warn('Firebase initialization error, fallback enabled:', err);
  app = null as unknown as FirebaseApp;
  auth = null as unknown as Auth;
  db = null as unknown as Firestore;
}

export { app, auth, db };

export interface UserProfile {
  uid: string;
  displayName: string;
  avatarId: string;
  isGuest: boolean;
  level: number;
  xp: number;
  gamesPlayed: number;
  passes: number;
  fails: number;
  bestStreak: number;
  unlocked: string[];
  equipped: {
    bottle: string;
    stamp: string;
  };
  dailyLast?: string;
  createdAt: any;
}

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Signs in with Google using popup, falling back to redirect if popup is blocked
 */
export async function signInWithGoogle(): Promise<FirebaseUser | null> {
  if (!auth) throw new Error('Firebase Auth is not initialized');
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    throw error;
  }
}

/**
 * Signs in as anonymous guest
 */
export async function signInAsGuest(): Promise<FirebaseUser> {
  if (!auth) throw new Error('Firebase Auth is not initialized');
  const result = await signInAnonymously(auth);
  return result.user;
}

/**
 * Signs out current user
 */
export async function signOutUser(): Promise<void> {
  if (auth) {
    await fbSignOut(auth);
  }
  localStorage.removeItem('chit_guest_user');
}

/**
 * Fetches user profile from Firestore users/{uid}
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (!db) {
    const local = localStorage.getItem(`chit_user_${uid}`);
    return local ? JSON.parse(local) : null;
  }
  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (err) {
    console.warn('Firestore getUserProfile error, reading localStorage fallback:', err);
    const local = localStorage.getItem(`chit_user_${uid}`);
    return local ? JSON.parse(local) : null;
  }
}

/**
 * Saves or updates user profile in Firestore
 */
export async function saveUserProfile(profile: UserProfile): Promise<void> {
  // Always mirror in localStorage for offline resilience
  localStorage.setItem(`chit_user_${profile.uid}`, JSON.stringify(profile));

  if (!db) return;
  try {
    const userRef = doc(db, 'users', profile.uid);
    await setDoc(userRef, {
      ...profile,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.warn('Firestore saveUserProfile failed, saved to local cache:', err);
  }
}

/**
 * Deletes user profile doc and signs out
 */
export async function deleteUserData(uid: string): Promise<void> {
  localStorage.removeItem(`chit_user_${uid}`);
  localStorage.removeItem('chit_guest_user');
  if (db) {
    try {
      await deleteDoc(doc(db, 'users', uid));
    } catch (err) {
      console.warn('Error deleting firestore user doc:', err);
    }
  }
  if (auth?.currentUser) {
    try {
      await auth.currentUser.delete();
    } catch {
      await fbSignOut(auth);
    }
  }
}
