import type { Firestore } from 'firebase-admin/firestore';
import {
  ChangeUserRoleCommandSchema,
  UserSchema,
  type User,
} from '../../core/domain/user.schema';
import {
  UserAuditLogSchema,
  toPublicUserProfile,
  type PublicUserProfile,
} from '../../core/domain/user-audit.schema';
import { adminDb } from '../firebase-admin';
import type { AuthenticatedIdentity } from '../auth/identity';

export class UserRoleChangeError extends Error {
  readonly statusCode: 403 | 404 | 409 | 500;

  constructor(
    message: string,
    statusCode: UserRoleChangeError['statusCode'] = 500,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = 'UserRoleChangeError';
    this.statusCode = statusCode;
  }
}

export interface ChangeUserRoleResult {
  user: PublicUserProfile;
  changed: boolean;
}

interface UserRoleChangeDependencies {
  db: Firestore;
  now: () => Date;
}

const defaultDependencies: UserRoleChangeDependencies = {
  db: adminDb,
  now: () => new Date(),
};

function publicProfile(user: User): PublicUserProfile {
  return toPublicUserProfile(user);
}

export async function changeManagedUserRole(
  actor: AuthenticatedIdentity['user'],
  targetUserId: string,
  input: unknown,
  dependencies: UserRoleChangeDependencies = defaultDependencies
): Promise<ChangeUserRoleResult> {
  const command = ChangeUserRoleCommandSchema.parse(input);

  if (actor.id === targetUserId) {
    throw new UserRoleChangeError('O usuário não pode alterar o próprio papel.', 403);
  }

  if (actor.role !== 'mestre') {
    throw new UserRoleChangeError('Somente um mestre pode alterar papéis.', 403);
  }

  const targetReference = dependencies.db.collection('users').doc(targetUserId);
  return dependencies.db.runTransaction(async (transaction) => {
    const targetSnapshot = await transaction.get(targetReference);
    if (!targetSnapshot.exists) {
      throw new UserRoleChangeError('Perfil do usuário não foi encontrado.', 404);
    }

    const currentUser = UserSchema.parse({
      id: targetSnapshot.id,
      ...targetSnapshot.data(),
    });
    if (currentUser.id !== targetUserId) {
      throw new UserRoleChangeError('Perfil inconsistente com o UID informado.', 409);
    }
    if (currentUser.role === 'mestre' && command.role === 'mestre') {
      return { user: publicProfile(currentUser), changed: false };
    }
    if (currentUser.role === command.role) {
      return { user: publicProfile(currentUser), changed: false };
    }

    if (currentUser.role === 'mestre' && command.role !== 'mestre') {
      const mastersSnapshot = await transaction.get(
        dependencies.db.collection('users').where('role', '==', 'mestre')
      );
      if (mastersSnapshot.size <= 1) {
        throw new UserRoleChangeError(
          'O último mestre não pode ser rebaixado.',
          409
        );
      }
    }

    const timestamp = dependencies.now().toISOString();
    const updatedUser = UserSchema.parse({
      ...currentUser,
      role: command.role,
      updatedAt: timestamp,
      updatedBy: actor.id,
    });
    transaction.update(targetReference, updatedUser);

    const auditReference = dependencies.db.collection('userAuditLogs').doc();
    const audit = UserAuditLogSchema.parse({
      targetUserId,
      performedBy: actor.id,
      action: 'CHANGE_ROLE',
      changedFields: ['role'],
      reason: command.reason,
      createdAt: timestamp,
    });
    transaction.create(auditReference, audit);

    return { user: publicProfile(updatedUser), changed: true };
  });
}
