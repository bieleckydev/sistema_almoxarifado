import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyCnHGqObVleQlBd8xVKAvjTMF-h84fn8vY',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'rhowert-a57af.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'rhowert-a57af',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'rhowert-a57af.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '176275071459',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:176275071459:web:f17c16256c3c5deac600d6',
};

const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db: Firestore = getFirestore(app);
const auth: Auth = getAuth(app);

// Suporte a emuladores locais caso flag de ambiente esteja ativa
if (
  typeof window !== 'undefined' &&
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true'
) {
  try {
    const host = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST || 'localhost';
    connectFirestoreEmulator(db, host, 8080);
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
  } catch {
    // Ignora reconexões em hot reload
  }
}

export { app, db, auth, firebaseConfig };
