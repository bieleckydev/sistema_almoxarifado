import 'server-only';

import { cert, getApps, getApp, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

const DEFAULT_PROJECT_ID = 'rhowert-a57af';

function createAdminApp(): App {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    return getApp();
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID?.trim() || DEFAULT_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (clientEmail && privateKey) {
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
    });
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()) {
    return initializeApp({
      projectId,
    });
  }

  // Keep module loading safe during framework build/generation. Firebase
  // Admin will report the missing credential when a request uses a service.
  return initializeApp({ projectId });
}

const adminApp = createAdminApp();

export const adminAuth: Auth = getAuth(adminApp);
export const adminDb: Firestore = getFirestore(adminApp);
export { adminApp };

export function getAdminProjectId(): string {
  return process.env.FIREBASE_ADMIN_PROJECT_ID?.trim() || DEFAULT_PROJECT_ID;
}

export function getAdminEnvironmentStatus(): {
  configured: boolean;
  projectId: string;
  credentialSource: 'service-account-environment' | 'application-default-credentials' | 'emulator';
  isEmulator: boolean;
} {
  const isEmulator = Boolean(
    process.env.FIRESTORE_EMULATOR_HOST?.trim() ||
      process.env.FIREBASE_AUTH_EMULATOR_HOST?.trim()
  );
  const hasServiceAccountEnvironment = Boolean(
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim() &&
      process.env.FIREBASE_ADMIN_PRIVATE_KEY?.trim()
  );
  const hasApplicationDefaultCredentials = Boolean(
    process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()
  );

  let credentialSource:
    | 'service-account-environment'
    | 'application-default-credentials'
    | 'emulator' = 'application-default-credentials';

  if (isEmulator) {
    credentialSource = 'emulator';
  } else if (hasServiceAccountEnvironment) {
    credentialSource = 'service-account-environment';
  }

  return {
    configured: isEmulator || hasServiceAccountEnvironment || hasApplicationDefaultCredentials,
    projectId: getAdminProjectId(),
    credentialSource,
    isEmulator,
  };
}
