/**
 * Endereços e variáveis do ambiente E2E. O prefixo `demo-` faz o SDK do Firebase
 * recusar qualquer acesso fora do emulador.
 */
const host = '127.0.0.1';
const projectId = 'demo-almoxarifado';
const appPort = 3100;

export const E2E = {
  projectId,
  appPort,
  appUrl: `http://${host}:${appPort}`,
  authUrl: `http://${host}:9099`,
  firestoreUrl: `http://${host}:8080`,
  envDoApp: {
    NEXT_PUBLIC_USE_FIREBASE_EMULATOR: 'true',
    NEXT_PUBLIC_FIREBASE_EMULATOR_HOST: host,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: projectId,
    NEXT_PUBLIC_FIREBASE_API_KEY: 'demo-api-key',
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: `${projectId}.firebaseapp.com`,
    NEXT_PUBLIC_FIREBASE_APP_ID: 'demo-app-id',
    FIREBASE_ADMIN_PROJECT_ID: projectId,
    FIREBASE_AUTH_EMULATOR_HOST: `${host}:9099`,
    FIRESTORE_EMULATOR_HOST: `${host}:8080`,
    // Credenciais reais do .env.local nunca devem valer durante os testes.
    FIREBASE_ADMIN_CLIENT_EMAIL: '',
    FIREBASE_ADMIN_PRIVATE_KEY: '',
    GOOGLE_APPLICATION_CREDENTIALS: '',
    USER_EMAIL_DELIVERY_URL: '',
    ERROR_ALERT_WEBHOOK_URL: '',
  } as Record<string, string>,
};

export interface UsuarioE2E {
  email: string;
  senha: string;
  nome: string;
  papel: string;
}

export const USUARIOS: Record<'mestre' | 'requisitante', UsuarioE2E> = {
  mestre: { email: 'mestre@e2e.test', senha: 'Senha-E2E-123!', nome: 'Mestre E2E', papel: 'mestre' },
  requisitante: {
    email: 'requisitante@e2e.test',
    senha: 'Senha-E2E-123!',
    nome: 'Requisitante E2E',
    papel: 'requisitante',
  },
};
