import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

export const useFirebaseEmulators = import.meta.env.VITE_USE_FIREBASE_EMULATORS !== 'false';
export const authEmulatorUrl = `http://${import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1'}:${import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_PORT || '9099'}`;

const firebaseConfig = useFirebaseEmulators ? {
  apiKey: 'demo-api-key',
  authDomain: 'localhost',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'demo-omreznina',
  appId: 'demo-omreznina-local',
} : {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app: FirebaseApp = initializeApp(firebaseConfig);
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);

if (useFirebaseEmulators) {
  connectAuthEmulator(auth, authEmulatorUrl, { disableWarnings: true });
  connectFirestoreEmulator(
    db,
    import.meta.env.VITE_FIREBASE_FIRESTORE_EMULATOR_HOST || '127.0.0.1',
    Number(import.meta.env.VITE_FIREBASE_FIRESTORE_EMULATOR_PORT || '8081'),
  );
}

export { auth, db };
