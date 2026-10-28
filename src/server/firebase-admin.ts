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
  const rawPrivateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.trim();

  let privateKey = rawPrivateKey;
  if (privateKey) {
    // Remove aspas envolventes caso o usuário tenha colado com aspas duplas ou simples no painel
    if (
      (privateKey.startsWith('"') && privateKey.endsWith('"')) ||
      (privateKey.startsWith("'") && privateKey.endsWith("'"))
    ) {
      privateKey = privateKey.slice(1, -1);
    }
    // Converte literais \n em quebras de linha reais
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  if (clientEmail && privateKey) {
    try {
      return initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        projectId,
      });
    } catch (certError) {
      console.error(
        'Aviso: Falha ao inicializar credenciais da conta de serviço Firebase Admin via cert(). Continuando com fallback de projectId:',
        certError instanceof Error ? certError.message : certError
      );
    }
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()) {
    try {
      return initializeApp({
        projectId,
      });
    } catch (gacError) {
      console.error(
        'Aviso: Falha ao inicializar via GOOGLE_APPLICATION_CREDENTIALS:',
        gacError instanceof Error ? gacError.message : gacError
      );
    }
  }

  // Mantém o carregamento do módulo seguro durante build e inicialização serverless.
  // O Firebase Admin reportará ausência de credenciais somente quando um serviço for acionado.
  return initializeApp({ projectId });
}

let _adminApp: App | null = null;
export function getAdminApp(): App {
  if (!_adminApp) {
    _adminApp = createAdminApp();
  }
  return _adminApp;
}

let _adminAuth: Auth | null = null;
export function getAdminAuth(): Auth {
  if (!_adminAuth) {
    _adminAuth = getAuth(getAdminApp());
  }
  return _adminAuth;
}

let _adminDb: Firestore | null = null;
export function getAdminDb(): Firestore {
  if (!_adminDb) {
    _adminDb = getFirestore(getAdminApp());
  }
  return _adminDb;
}

// Proxies com resolução preguiçosa para compatibilidade direta com `import { adminAuth, adminDb, adminApp }`
export const adminApp = new Proxy({} as App, {
  get(_target, prop) {
    const instance = getAdminApp();
    const value = Reflect.get(instance, prop);
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});

export const adminAuth = new Proxy({} as Auth, {
  get(_target, prop) {
    const instance = getAdminAuth();
    const value = Reflect.get(instance, prop);
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});

export const adminDb = new Proxy({} as Firestore, {
  get(_target, prop) {
    const instance = getAdminDb();
    const value = Reflect.get(instance, prop);
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});

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
