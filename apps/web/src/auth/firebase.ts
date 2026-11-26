import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  connectAuthEmulator,
  signInAnonymously,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type Auth,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  connectFirestoreEmulator,
  type Firestore,
} from 'firebase/firestore';
import {
  getDatabase,
  connectDatabaseEmulator,
  type Database,
} from 'firebase/database';

export interface AuthProfile {
  uid: string;
  isAnonymous: boolean;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

const env = import.meta.env;
const useEmulator = env.VITE_USE_EMULATOR === 'true';
const forceLocalMemory = env.VITE_LOCAL_MEMORY === '1';

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: (env.VITE_FIREBASE_PROJECT_ID as string | undefined) || (useEmulator ? 'vowlet-local' : undefined),
  databaseURL:
    (env.VITE_FIREBASE_DATABASE_URL as string | undefined) ||
    (useEmulator ? 'http://127.0.0.1:9000/?ns=vowlet-local-default-rtdb' : undefined),
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: env.VITE_FIREBASE_APP_ID as string | undefined,
};

/**
 * Local-dev mode activates when VITE_LOCAL_MEMORY=1 or when Firebase config is absent
 * (and emulator is not explicitly enabled), allowing full local gameplay with zero keys.
 */
export const isLocalDevMode: boolean =
  forceLocalMemory || (!useEmulator && !firebaseConfig.apiKey);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let rtdb: Database | null = null;
let emulatorsConnected = false;

export function getFirebaseClients(): {
  app: FirebaseApp | null;
  auth: Auth | null;
  db: Firestore | null;
  rtdb: Database | null;
} {
  if (isLocalDevMode) {
    return { app: null, auth: null, db: null, rtdb: null };
  }

  if (!app) {
    const existing = getApps()[0];
    app = existing ?? initializeApp({
      apiKey: firebaseConfig.apiKey || 'demo-local-key',
      authDomain: firebaseConfig.authDomain || 'localhost',
      projectId: firebaseConfig.projectId || 'vowlet-local',
      databaseURL: firebaseConfig.databaseURL,
      appId: firebaseConfig.appId || '1:000000000000:web:local',
    });
  }

  if (!auth) auth = getAuth(app);
  if (!db) db = getFirestore(app);
  if (!rtdb) rtdb = getDatabase(app);

  if (useEmulator && !emulatorsConnected) {
    emulatorsConnected = true;
    try {
      connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
      connectFirestoreEmulator(db, '127.0.0.1', 8080);
      connectDatabaseEmulator(rtdb, '127.0.0.1', 9000);
    } catch {
      // Already connected in HMR
    }
  }

  return { app, auth, db, rtdb };
}

const LOCAL_UID_KEY = 'vowlet_local_uid';
const LOCAL_USER_KEY = 'vowlet_local_user';

function getOrCreateLocalProfile(): AuthProfile {
  if (typeof window === 'undefined') {
    return { uid: 'local-guest', isAnonymous: true, displayName: null, email: null, photoURL: null };
  }
  const saved = window.localStorage.getItem(LOCAL_USER_KEY);
  if (saved) {
    try {
      return JSON.parse(saved) as AuthProfile;
    } catch {
      // fall through
    }
  }
  let uid = window.localStorage.getItem(LOCAL_UID_KEY);
  if (!uid) {
    uid = `local-${crypto.randomUUID().slice(0, 8)}`;
    window.localStorage.setItem(LOCAL_UID_KEY, uid);
  }
  const profile: AuthProfile = {
    uid,
    isAnonymous: true,
    displayName: null,
    email: null,
    photoURL: null,
  };
  window.localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(profile));
  return profile;
}

export function subscribeAuth(callback: (profile: AuthProfile | null) => void): () => void {
  if (isLocalDevMode) {
    callback(getOrCreateLocalProfile());
    return () => {};
  }

  const { auth: fbAuth } = getFirebaseClients();
  if (!fbAuth) {
    callback(null);
    return () => {};
  }

  return onAuthStateChanged(fbAuth, async (user: User | null) => {
    if (!user) {
      try {
        await signInAnonymously(fbAuth);
      } catch {
        callback(null);
      }
      return;
    }
    callback({
      uid: user.uid,
      isAnonymous: user.isAnonymous,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
    });
  });
}

export async function signInWithGoogle(): Promise<AuthProfile> {
  if (isLocalDevMode) {
    const current = getOrCreateLocalProfile();
    const upgraded: AuthProfile = {
      ...current,
      isAnonymous: false,
      displayName: current.displayName || 'Local Player',
      email: 'local@vowlet.app',
    };
    window.localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(upgraded));
    return upgraded;
  }

  const { auth: fbAuth } = getFirebaseClients();
  if (!fbAuth) throw new Error('Auth not initialized');
  const provider = new GoogleAuthProvider();
  const res = await signInWithPopup(fbAuth, provider);
  return {
    uid: res.user.uid,
    isAnonymous: res.user.isAnonymous,
    displayName: res.user.displayName,
    email: res.user.email,
    photoURL: res.user.photoURL,
  };
}

export async function signOutToGuest(): Promise<AuthProfile> {
  if (isLocalDevMode) {
    const current = getOrCreateLocalProfile();
    const guest: AuthProfile = {
      uid: current.uid,
      isAnonymous: true,
      displayName: null,
      email: null,
      photoURL: null,
    };
    window.localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(guest));
    return guest;
  }

  const { auth: fbAuth } = getFirebaseClients();
  if (!fbAuth) throw new Error('Auth not initialized');
  await signOut(fbAuth);
  const cred = await signInAnonymously(fbAuth);
  return {
    uid: cred.user.uid,
    isAnonymous: true,
    displayName: null,
    email: null,
    photoURL: null,
  };
}

export async function getIdToken(): Promise<string> {
  if (isLocalDevMode) {
    const profile = getOrCreateLocalProfile();
    return `local-token:${profile.uid}`;
  }
  const { auth: fbAuth } = getFirebaseClients();
  if (!fbAuth?.currentUser) {
    if (!fbAuth) return '';
    const cred = await signInAnonymously(fbAuth);
    return cred.user.getIdToken();
  }
  return fbAuth.currentUser.getIdToken();
}

export async function getAppCheckToken(): Promise<string> {
  // In emulator or local-dev mode, App Check is bypassed or uses a debug token
  if (isLocalDevMode || useEmulator) {
    return 'local-appcheck-bypass';
  }
  return '';
}
