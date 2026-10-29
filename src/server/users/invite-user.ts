import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import {
  SendUserInviteCommandSchema,
  UserSchema,
} from '../../core/domain/user.schema';
import { UserAuditLogSchema } from '../../core/domain/user-audit.schema';
import { hasUserPermission } from '../../core/domain/user-authorization';
import { adminAuth, adminDb } from '../firebase-admin';
import type { AuthenticatedIdentity } from '../auth/identity';

export class UserInviteError extends Error {
  readonly statusCode = 500;

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'UserInviteError';
  }
}

export interface UserInviteDelivery {
  sendInvite(input: {
    recipientEmail: string;
    recipientName: string;
    resetLink: string;
  }): Promise<void>;
}

export interface UserInviteDependencies {
  auth: Pick<Auth, 'generatePasswordResetLink' | 'getUser'>;
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

const defaultDependencies: UserInviteDependencies = {
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
    throw new UserInviteError('A URL de redirecionamento (FIREBASE_AUTH_CONTINUE_URL) é inválida.', { cause: error });
  }

  if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
    throw new UserInviteError('A URL de redirecionamento (FIREBASE_AUTH_CONTINUE_URL) deve usar HTTPS fora do ambiente local.');
  }

  return url.toString();
}

export async function sendUserInvite(
  actor: AuthenticatedIdentity['user'],
  targetUserId: string,
  input: unknown,
  delivery: UserInviteDelivery,
  dependencies: UserInviteDependencies = defaultDependencies
): Promise<{ sent: true; resetLink: string }> {
  if (!hasUserPermission(actor, 'users:send-invite')) {
    throw new UserInviteError('Somente um mestre pode enviar convites.');
  }

  const command = SendUserInviteCommandSchema.parse(input);
  const authUser = await dependencies.auth.getUser(targetUserId);
  if (!authUser.email) {
    throw new UserInviteError('O usuário não possui e-mail para receber o convite.');
  }

  const profileSnapshot = await dependencies.db.collection('users').doc(targetUserId).get();
  if (!profileSnapshot.exists) {
    throw new UserInviteError('Perfil do usuário não foi encontrado.');
  }

  const target = UserSchema.parse({ id: profileSnapshot.id, ...profileSnapshot.data() });
  if (target.id !== targetUserId) {
    throw new UserInviteError('Perfil inconsistente com o UID informado.');
  }
  if (!target.ativo) {
    throw new UserInviteError('Não é possível convidar um usuário inativo.');
  }

  let resetLink: string;
  try {
    resetLink = await dependencies.auth.generatePasswordResetLink(authUser.email, {
      url: validateContinueUrl(dependencies.continueUrl),
      handleCodeInApp: true,
    });
  } catch (error) {
    const isDomainNotAllowlisted =
      error instanceof Error &&
      (('code' in error && (error as any).code === 'auth/unauthorized-continue-uri') ||
        error.message.includes('Domain not allowlisted') ||
        error.message.includes('unauthorized-continue-uri'));

    if (isDomainNotAllowlisted) {
      const projectId =
        process.env.FIREBASE_ADMIN_PROJECT_ID?.trim() ||
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
        'rhowert-a57af';
      const firebaseDefaultUrl = `https://${projectId}.firebaseapp.com`;

      try {
        resetLink = await dependencies.auth.generatePasswordResetLink(authUser.email, {
          url: firebaseDefaultUrl,
          handleCodeInApp: true,
        });
      } catch (fallbackError) {
        throw new UserInviteError(
          `O domínio da aplicação não está autorizado no Firebase Authentication. Adicione '${dependencies.continueUrl}' em Firebase Console > Authentication > Settings > Authorized domains.`,
          { cause: fallbackError }
        );
      }
    } else {
      throw error;
    }
  }

  try {
    await delivery.sendInvite({
      recipientEmail: authUser.email,
      recipientName: target.name,
      resetLink,
    });
  } catch (error) {
    throw new UserInviteError('Não foi possível entregar o convite por e-mail.', {
      cause: error,
    });
  }

  const timestamp = dependencies.now().toISOString();
  const audit = UserAuditLogSchema.parse({
    targetUserId,
    performedBy: actor.id,
    action: 'SEND_INVITE',
    changedFields: [],
    reason: command.reason ?? 'Convite de acesso enviado.',
    createdAt: timestamp,
  });
  await dependencies.db.collection('userAuditLogs').add(audit);

  return { sent: true, resetLink };
}
