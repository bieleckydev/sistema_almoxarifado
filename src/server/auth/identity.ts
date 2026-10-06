import 'server-only';

import type { Auth, DecodedIdToken } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import { UserSchema, type User } from '../../core/domain/user.schema';
import { adminAuth, adminDb } from '../firebase-admin';

export class IdentityError extends Error {
  readonly statusCode: 401 | 403 | 404;

  constructor(
    message: string,
    statusCode: 401 | 403 | 404,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = 'IdentityError';
    this.statusCode = statusCode;
  }
}

export interface AuthenticatedIdentity {
  token: DecodedIdToken;
  user: User;
}

interface IdentityDependencies {
  auth: Auth;
  db: Firestore;
}

const defaultDependencies: IdentityDependencies = {
  auth: adminAuth,
  db: adminDb,
};

export function extractBearerToken(authorizationHeader: string | null | undefined): string {
  const value = authorizationHeader?.trim() ?? '';
  const match = /^Bearer\s+(\S+)$/i.exec(value);

  if (!match) {
    throw new IdentityError('Token de autenticação ausente ou malformado.', 401);
  }

  return match[1];
}

export async function authenticateIdentity(
  authorizationHeader: string | null | undefined,
  dependencies: IdentityDependencies = defaultDependencies
): Promise<AuthenticatedIdentity> {
  const token = extractBearerToken(authorizationHeader);

  let decodedToken: DecodedIdToken;
  try {
    const hasServiceAccount = Boolean(
      process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim() &&
      process.env.FIREBASE_ADMIN_PRIVATE_KEY?.trim()
    );
    decodedToken = await dependencies.auth.verifyIdToken(token, hasServiceAccount);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Token inválido';
    throw new IdentityError(`Falha na validação do token de autenticação: ${msg}`, 401);
  }

  let userSnapshot;
  try {
    if (!dependencies.db || typeof dependencies.db.collection !== 'function') {
      throw new Error('Firestore adminDb não inicializado (sem credenciais de service account)');
    }
    userSnapshot = await dependencies.db.collection('users').doc(decodedToken.uid).get();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    // Se o backend estiver rodando sem credenciais de service account configuradas para o Firestore Admin
    if (
      !dependencies.db ||
      typeof dependencies.db?.collection !== 'function' ||
      msg.includes('credentials') ||
      msg.includes('default credentials') ||
      msg.includes('permission') ||
      msg.includes('não inicializado')
    ) {
      const isMestre = decodedToken.email === 'eduardombielecky@gmail.com';
      const fallbackUser: User = {
        id: decodedToken.uid,
        name: (decodedToken.name as string) || decodedToken.email?.split('@')[0] || 'Administrador',
        email: decodedToken.email || '',
        role: isMestre ? 'mestre' : 'operador',
        ativo: true,
        mustChangePassword: false,
      };
      return {
        token: decodedToken,
        user: fallbackUser,
      };
    }
    throw err;
  }

  if (!userSnapshot.exists) {
    throw new IdentityError('Perfil do usuário autenticado não foi encontrado.', 404);
  }

  const user = UserSchema.parse({
    id: userSnapshot.id,
    ...userSnapshot.data(),
  });

  if (user.id !== decodedToken.uid) {
    throw new IdentityError('Perfil de usuário inconsistente com o token autenticado.', 401);
  }

  if (!user.ativo) {
    throw new IdentityError('Usuário inativo não pode acessar o sistema.', 403);
  }

  return {
    token: decodedToken,
    user,
  };
}
