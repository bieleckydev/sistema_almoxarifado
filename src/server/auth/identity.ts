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
    // checkRevoked=true: tokens de usuários desativados ou com sessão revogada são recusados.
    decodedToken = await dependencies.auth.verifyIdToken(token, true);
  } catch (err: unknown) {
    throw new IdentityError('Token de autenticação inválido ou expirado.', 401, { cause: err });
  }

  // Sem fallback: se o perfil não puder ser lido (ex.: Admin SDK sem credenciais),
  // a requisição falha. Nunca conceder papel a partir de um erro de infraestrutura.
  const userSnapshot = await dependencies.db.collection('users').doc(decodedToken.uid).get();

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
