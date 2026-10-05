import 'server-only';

import { randomBytes } from 'node:crypto';
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import {
  ResetUserPasswordCommandSchema,
  UserSchema,
} from '../../core/domain/user.schema';
import { UserAuditLogSchema } from '../../core/domain/user-audit.schema';
import { hasUserPermission } from '../../core/domain/user-authorization';
import { adminAuth, adminDb } from '../firebase-admin';
import type { AuthenticatedIdentity } from '../auth/identity';

const TEMPORARY_PASSWORD_LENGTH = 20;
const TEMPORARY_PASSWORD_ALPHABET =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*-_=+';

export class TemporaryPasswordError extends Error {
  readonly statusCode = 500;

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'TemporaryPasswordError';
  }
}

export interface TemporaryPasswordDependencies {
  auth: Pick<Auth, 'getUser' | 'updateUser'>;
  db: Pick<Firestore, 'collection'>;
  now: () => Date;
}

const defaultDependencies: TemporaryPasswordDependencies = {
  auth: adminAuth,
  db: adminDb,
  now: () => new Date(),
};

export function generateTemporaryPassword(
  random: (size: number) => Buffer = randomBytes
): string {
  const bytes = random(TEMPORARY_PASSWORD_LENGTH);
  let password = '';

  for (let index = 0; index < TEMPORARY_PASSWORD_LENGTH; index += 1) {
    password += TEMPORARY_PASSWORD_ALPHABET[bytes[index] % TEMPORARY_PASSWORD_ALPHABET.length];
  }

  return password;
}

export async function setTemporaryUserPassword(
  actor: AuthenticatedIdentity['user'],
  targetUserId: string,
  input: unknown,
  dependencies: TemporaryPasswordDependencies = defaultDependencies
): Promise<{ temporaryPassword: string; mustChangePassword: true }> {
  if (!hasUserPermission(actor, 'users:reset-password')) {
    throw new TemporaryPasswordError('Somente um mestre pode definir senha temporária.');
  }

  const command = ResetUserPasswordCommandSchema.parse(input);
  const authUser = await dependencies.auth.getUser(targetUserId);
  const profileReference = dependencies.db.collection('users').doc(targetUserId);
  const profileSnapshot = await profileReference.get();

  if (!profileSnapshot.exists) {
    throw new TemporaryPasswordError('Perfil do usuário não foi encontrado.');
  }

  const target = UserSchema.parse({ id: profileSnapshot.id, ...profileSnapshot.data() });
  if (target.id !== targetUserId || !authUser.email) {
    throw new TemporaryPasswordError('Perfil e Authentication estão inconsistentes.');
  }
  if (!target.ativo || authUser.disabled) {
    throw new TemporaryPasswordError('Não é possível definir senha para usuário inativo.');
  }

  const temporaryPassword = generateTemporaryPassword();
  await dependencies.auth.updateUser(targetUserId, { password: temporaryPassword });

  try {
    const timestamp = dependencies.now().toISOString();
    await profileReference.update({
      mustChangePassword: true,
      updatedAt: timestamp,
      updatedBy: actor.id,
    });
    await dependencies.db.collection('userAuditLogs').add(
      UserAuditLogSchema.parse({
        targetUserId,
        performedBy: actor.id,
        action: 'RESET_PASSWORD',
        changedFields: ['mustChangePassword'],
        reason: command.reason ?? 'Senha temporária definida.',
        createdAt: timestamp,
      })
    );
  } catch (error) {
    throw new TemporaryPasswordError(
      'A senha foi atualizada no Authentication, mas o perfil não foi sincronizado; reconciliação necessária.',
      { cause: error }
    );
  }

  return { temporaryPassword, mustChangePassword: true };
}
