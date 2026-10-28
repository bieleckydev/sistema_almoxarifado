import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import {
  DeleteUserCommandSchema,
  UserSchema,
  type User,
} from '../../core/domain/user.schema';
import { UserAuditLogSchema } from '../../core/domain/user-audit.schema';
import { adminAuth, adminDb } from '../firebase-admin';
import type { AuthenticatedIdentity } from '../auth/identity';

export class UserDeletionError extends Error {
  readonly statusCode: 403 | 404 | 409 | 500;
  readonly rollbackErrors: string[];

  constructor(
    message: string,
    statusCode: UserDeletionError['statusCode'] = 500,
    options?: ErrorOptions,
    rollbackErrors: string[] = []
  ) {
    super(message, options);
    this.name = 'UserDeletionError';
    this.statusCode = statusCode;
    this.rollbackErrors = rollbackErrors;
  }
}

interface UserDeletionDependencies {
  auth: Pick<Auth, 'getUser' | 'deleteUser'>;
  db: Firestore;
  now: () => Date;
}

const defaultDependencies: UserDeletionDependencies = {
  auth: adminAuth,
  db: adminDb,
  now: () => new Date(),
};

export interface DeleteUserResult {
  deleted: true;
  userId: string;
}

export async function deleteManagedUser(
  actor: AuthenticatedIdentity['user'],
  targetUserId: string,
  input: unknown,
  dependencies: UserDeletionDependencies = defaultDependencies
): Promise<DeleteUserResult> {
  const command = DeleteUserCommandSchema.parse(input);

  if (actor.role !== 'mestre') {
    throw new UserDeletionError('Somente um mestre pode excluir usuários.', 403);
  }
  if (actor.id === targetUserId) {
    throw new UserDeletionError('O usuário não pode excluir o próprio acesso.', 403);
  }

  const profileReference = dependencies.db.collection('users').doc(targetUserId);
  const auditReference = dependencies.db.collection('userAuditLogs').doc();
  const [authUser, profileSnapshot] = await Promise.all([
    dependencies.auth.getUser(targetUserId),
    profileReference.get(),
  ]);
  if (!profileSnapshot.exists) {
    throw new UserDeletionError('Perfil do usuário não foi encontrado.', 404);
  }

  const currentUser = UserSchema.parse({
    id: profileSnapshot.id,
    ...profileSnapshot.data(),
  });
  if (currentUser.id !== targetUserId) {
    throw new UserDeletionError('Perfil inconsistente com o UID informado.', 409);
  }
  if (currentUser.ativo || !authUser.disabled) {
    throw new UserDeletionError(
      'Somente usuários previamente desativados podem ser excluídos.',
      409
    );
  }
  if (currentUser.role === 'mestre') {
    const masters = await dependencies.db.collection('users')
      .where('role', '==', 'mestre')
      .get();
    if (masters.size <= 1) {
      throw new UserDeletionError('O último mestre não pode ser excluído.', 409);
    }
  }

  const timestamp = dependencies.now().toISOString();
  const audit = UserAuditLogSchema.parse({
    targetUserId,
    performedBy: actor.id,
    action: 'DELETE',
    changedFields: [],
    reason: command.reason,
    createdAt: timestamp,
  });

  try {
    await dependencies.db.runTransaction(async (transaction) => {
      const latestSnapshot = await transaction.get(profileReference);
      if (!latestSnapshot.exists) {
        throw new UserDeletionError('Perfil do usuário não foi encontrado.', 404);
      }
      const latestUser = UserSchema.parse({
        id: latestSnapshot.id,
        ...latestSnapshot.data(),
      });
      if (latestUser.ativo) {
        throw new UserDeletionError(
          'O usuário foi reativado durante a operação.',
          409
        );
      }
      transaction.delete(profileReference);
      transaction.create(auditReference, audit);
    });
  } catch (error) {
    if (error instanceof UserDeletionError) throw error;
    throw new UserDeletionError(
      'Não foi possível preparar a exclusão do perfil.',
      500,
      { cause: error }
    );
  }

  try {
    await dependencies.auth.deleteUser(targetUserId);
  } catch (error) {
    const rollbackErrors: string[] = [];
    try {
      await dependencies.db.runTransaction(async (transaction) => {
        transaction.create(profileReference, currentUser);
        transaction.delete(auditReference);
      });
    } catch (rollbackError) {
      rollbackErrors.push(
        `firestore: ${rollbackError instanceof Error
          ? rollbackError.message
          : String(rollbackError)}`
      );
    }
    throw new UserDeletionError(
      'A exclusão no Authentication falhou; a operação precisa ser reconciliada.',
      500,
      { cause: error },
      rollbackErrors
    );
  }

  return { deleted: true, userId: targetUserId };
}
