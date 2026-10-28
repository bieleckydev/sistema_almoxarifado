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

const defaultDependencies: UserInviteDependencies = {
  auth: adminAuth,
  db: adminDb,
  continueUrl: process.env.FIREBASE_AUTH_CONTINUE_URL?.trim() ?? '',
  now: () => new Date(),
};

function validateContinueUrl(value: string): string {
  if (!value) {
    throw new UserInviteError(
      'FIREBASE_AUTH_CONTINUE_URL não está configurada no ambiente server-side.'
    );
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch (error) {
    throw new UserInviteError('FIREBASE_AUTH_CONTINUE_URL é inválida.', { cause: error });
  }

  if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
    throw new UserInviteError('FIREBASE_AUTH_CONTINUE_URL deve usar HTTPS fora do ambiente local.');
  }

  return url.toString();
}

export async function sendUserInvite(
  actor: AuthenticatedIdentity['user'],
  targetUserId: string,
  input: unknown,
  delivery: UserInviteDelivery,
  dependencies: UserInviteDependencies = defaultDependencies
): Promise<{ sent: true }> {
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

  const resetLink = await dependencies.auth.generatePasswordResetLink(authUser.email, {
    url: validateContinueUrl(dependencies.continueUrl),
    handleCodeInApp: true,
  });

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

  return { sent: true };
}
