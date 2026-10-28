import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import { ResetUserPasswordCommandSchema, UserSchema } from '../../core/domain/user.schema';
import { UserAuditLogSchema } from '../../core/domain/user-audit.schema';
import { hasUserPermission } from '../../core/domain/user-authorization';
import { adminAuth, adminDb } from '../firebase-admin';
import type { AuthenticatedIdentity } from '../auth/identity';

export class PasswordResetError extends Error {
  readonly statusCode = 500;

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'PasswordResetError';
  }
}

export interface PasswordResetDelivery {
  sendPasswordReset(input: {
    recipientEmail: string;
    recipientName: string;
    resetLink: string;
  }): Promise<void>;
}

export interface PasswordResetDependencies {
  auth: Pick<Auth, 'getUser' | 'generatePasswordResetLink'>;
  db: Pick<Firestore, 'collection'>;
  continueUrl: string;
  now: () => Date;
}

export function resolveContinueUrl(customUrl?: string): string {
  const envUrl = customUrl?.trim() || process.env.FIREBASE_AUTH_CONTINUE_URL?.trim();
  if (envUrl) {
    return envUrl;
  }

  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProd) {
    return `https://${vercelProd.replace(/\/+$/, '')}/login`;
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return `https://${vercelUrl.replace(/\/+$/, '')}/login`;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) {
    return `${appUrl.replace(/\/+$/, '')}/login`;
  }

  return 'http://localhost:3000/login';
}

const defaultDependencies: PasswordResetDependencies = {
  auth: adminAuth,
  db: adminDb,
  continueUrl: resolveContinueUrl(),
  now: () => new Date(),
};

export function validateContinueUrl(value?: string): string {
  const urlToValidate = value?.trim() || resolveContinueUrl();
  let url: URL;
  try {
    url = new URL(urlToValidate);
  } catch (error) {
    throw new PasswordResetError('A URL de redirecionamento (FIREBASE_AUTH_CONTINUE_URL) é inválida.', { cause: error });
  }

  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) {
    throw new PasswordResetError(
      'A URL de redirecionamento (FIREBASE_AUTH_CONTINUE_URL) deve usar HTTPS fora do ambiente local.'
    );
  }

  return url.toString();
}

export async function sendPasswordReset(
  actor: AuthenticatedIdentity['user'],
  targetUserId: string,
  input: unknown,
  delivery: PasswordResetDelivery,
  dependencies: PasswordResetDependencies = defaultDependencies
): Promise<{ sent: true; resetLink: string }> {
  if (!hasUserPermission(actor, 'users:reset-password')) {
    throw new PasswordResetError('Somente um mestre pode solicitar redefinição de senha.');
  }

  const command = ResetUserPasswordCommandSchema.parse(input);
  const authUser = await dependencies.auth.getUser(targetUserId);
  if (!authUser.email) {
    throw new PasswordResetError('O usuário não possui e-mail para redefinição.');
  }

  const profileSnapshot = await dependencies.db.collection('users').doc(targetUserId).get();
  if (!profileSnapshot.exists) {
    throw new PasswordResetError('Perfil do usuário não foi encontrado.');
  }

  const target = UserSchema.parse({ id: profileSnapshot.id, ...profileSnapshot.data() });
  if (target.id !== targetUserId) {
    throw new PasswordResetError('Perfil inconsistente com o UID informado.');
  }
  if (!target.ativo || authUser.disabled) {
    throw new PasswordResetError('Não é possível redefinir senha de usuário inativo.');
  }

  const resetLink = await dependencies.auth.generatePasswordResetLink(authUser.email, {
    url: validateContinueUrl(dependencies.continueUrl),
    handleCodeInApp: true,
  });

  try {
    await delivery.sendPasswordReset({
      recipientEmail: authUser.email,
      recipientName: target.name,
      resetLink,
    });
  } catch (error) {
    throw new PasswordResetError('Não foi possível entregar o link de redefinição.', {
      cause: error,
    });
  }

  const timestamp = dependencies.now().toISOString();
  await dependencies.db.collection('userAuditLogs').add(
    UserAuditLogSchema.parse({
      targetUserId,
      performedBy: actor.id,
      action: 'RESET_PASSWORD',
      changedFields: [],
      reason: command.reason ?? 'Link de redefinição de senha enviado.',
      createdAt: timestamp,
    })
  );

  return { sent: true, resetLink };
}
