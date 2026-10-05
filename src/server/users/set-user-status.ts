import 'server-only';

import type { Auth, UserRecord } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import {
  SetUserStatusCommandSchema,
  UserSchema,
  type User,
} from '../../core/domain/user.schema';
import {
  PublicUserProfileSchema,
  UserAuditLogSchema,
  type PublicUserProfile,
} from '../../core/domain/user-audit.schema';
import { adminAuth, adminDb } from '../firebase-admin';
import type { AuthenticatedIdentity } from '../auth/identity';

export class UserStatusChangeError extends Error {
  readonly statusCode: 403 | 404 | 409 | 500;
  readonly rollbackErrors: string[];

  constructor(
    message: string,
    statusCode: UserStatusChangeError['statusCode'] = 500,
    options?: ErrorOptions,
    rollbackErrors: string[] = []
  ) {
    super(message, options);
    this.name = 'UserStatusChangeError';
    this.statusCode = statusCode;
    this.rollbackErrors = rollbackErrors;
  }
}

export interface SetUserStatusResult {
  user: PublicUserProfile;
  changed: boolean;
}

interface UserStatusDependencies {
  auth: Pick<Auth, 'getUser' | 'updateUser'>;
  db: Firestore;
  now: () => Date;
}

const defaultDependencies: UserStatusDependencies = {
  auth: adminAuth,
  db: adminDb,
  now: () => new Date(),
};

function publicProfile(user: User): PublicUserProfile {
  return PublicUserProfileSchema.parse({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    ativo: user.ativo,
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  });
}

export async function setManagedUserStatus(
  actor: AuthenticatedIdentity['user'],
  targetUserId: string,
  input: unknown,
  dependencies: UserStatusDependencies = defaultDependencies
): Promise<SetUserStatusResult> {
  const command = SetUserStatusCommandSchema.parse(input);

  if (actor.role !== 'mestre') {
    throw new UserStatusChangeError('Somente um mestre pode alterar o status.', 403);
  }
  if (actor.id === targetUserId) {
    throw new UserStatusChangeError('O usuário não pode desativar o próprio acesso.', 403);
  }

  const profileReference = dependencies.db.collection('users').doc(targetUserId);
  const [authUser, profileSnapshot] = await Promise.all([
    dependencies.auth.getUser(targetUserId),
    profileReference.get(),
  ]);
  if (!profileSnapshot.exists) {
    throw new UserStatusChangeError('Perfil do usuário não foi encontrado.', 404);
  }

  const currentUser = UserSchema.parse({
    id: profileSnapshot.id,
    ...profileSnapshot.data(),
  });
  if (currentUser.id !== targetUserId) {
    throw new UserStatusChangeError('Perfil inconsistente com o UID informado.', 409);
  }
  if (currentUser.ativo === command.ativo && authUser.disabled === !command.ativo) {
    return { user: publicProfile(currentUser), changed: false };
  }
  if (currentUser.ativo !== !authUser.disabled) {
    throw new UserStatusChangeError(
      'Perfil e Authentication estão inconsistentes.',
      409
    );
  }
  if (currentUser.role === 'mestre' && !command.ativo) {
    const activeMasters = await dependencies.db.collection('users')
      .where('role', '==', 'mestre')
      .where('ativo', '==', true)
      .get();
    if (activeMasters.size <= 1) {
      throw new UserStatusChangeError('O último mestre ativo não pode ser desativado.', 409);
    }
  }

  const timestamp = dependencies.now().toISOString();
  const updatedUser = UserSchema.parse({
    ...currentUser,
    ativo: command.ativo,
    updatedAt: timestamp,
    updatedBy: actor.id,
  });
  let authChanged = false;

  try {
    await dependencies.auth.updateUser(targetUserId, { disabled: !command.ativo });
    authChanged = true;
    await dependencies.db.runTransaction(async (transaction) => {
      const latestSnapshot = await transaction.get(profileReference);
      if (!latestSnapshot.exists) {
        throw new UserStatusChangeError('Perfil do usuário não foi encontrado.', 404);
      }
      const latestUser = UserSchema.parse({
        id: latestSnapshot.id,
        ...latestSnapshot.data(),
      });
      if (latestUser.ativo !== currentUser.ativo) {
        throw new UserStatusChangeError(
          'O status do perfil foi alterado durante a operação.',
          409
        );
      }
      transaction.update(profileReference, updatedUser);
      const auditReference = dependencies.db.collection('userAuditLogs').doc();
      transaction.create(auditReference, UserAuditLogSchema.parse({
        targetUserId,
        performedBy: actor.id,
        action: command.ativo ? 'ENABLE' : 'DISABLE',
        changedFields: ['ativo'],
        reason: command.reason,
        createdAt: timestamp,
      }));
    });
  } catch (error) {
    const rollbackErrors: string[] = [];
    if (authChanged) {
      try {
        await dependencies.auth.updateUser(targetUserId, { disabled: authUser.disabled });
      } catch (rollbackError) {
        rollbackErrors.push(
          `authentication: ${rollbackError instanceof Error
            ? rollbackError.message
            : String(rollbackError)}`
        );
      }
    }
    throw new UserStatusChangeError(
      'Não foi possível concluir a alteração de status.',
      500,
      { cause: error },
      rollbackErrors
    );
  }

  return { user: publicProfile(updatedUser), changed: true };
}
