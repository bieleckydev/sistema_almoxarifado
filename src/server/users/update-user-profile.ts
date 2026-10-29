import type { Auth, UserRecord } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import {
  UpdateUserProfileCommandSchema,
  UserSchema,
  type User,
} from '../../core/domain/user.schema';
import {
  UserAuditLogSchema,
  toPublicUserProfile,
  type PublicUserProfile,
} from '../../core/domain/user-audit.schema';
import { hasUserPermission } from '../../core/domain/user-authorization';
import { adminAuth, adminDb } from '../firebase-admin';
import type { AuthenticatedIdentity } from '../auth/identity';

export class UserProfileUpdateError extends Error {
  readonly statusCode: 403 | 404 | 409 | 500;
  readonly rollbackErrors: string[];

  constructor(
    message: string,
    statusCode: UserProfileUpdateError['statusCode'] = 500,
    options?: ErrorOptions,
    rollbackErrors: string[] = []
  ) {
    super(message, options);
    this.name = 'UserProfileUpdateError';
    this.statusCode = statusCode;
    this.rollbackErrors = rollbackErrors;
  }
}

export interface UpdateUserProfileResult {
  user: PublicUserProfile;
  changedFields: Array<'name' | 'email'>;
}

interface UserProfileUpdateDependencies {
  auth: Pick<Auth, 'getUser' | 'updateUser'>;
  db: Pick<Firestore, 'collection'>;
  now: () => Date;
}

const defaultDependencies: UserProfileUpdateDependencies = {
  auth: adminAuth,
  db: adminDb,
  now: () => new Date(),
};

function publicProfile(user: User): PublicUserProfile {
  return toPublicUserProfile(user);
}

function authUpdateFor(
  command: { name?: string; email?: string }
): Parameters<Auth['updateUser']>[1] {
  return {
    ...(command.name === undefined ? {} : { displayName: command.name }),
    ...(command.email === undefined ? {} : { email: command.email }),
  };
}

function authRestoreFor(user: UserRecord): Parameters<Auth['updateUser']>[1] {
  return {
    ...(user.displayName === undefined ? {} : { displayName: user.displayName }),
    ...(user.email === undefined ? {} : { email: user.email }),
  };
}

function changedFields(
  current: User,
  command: { name?: string; email?: string }
): Array<'name' | 'email'> {
  return [
    ...(command.name !== undefined && command.name !== current.name ? ['name' as const] : []),
    ...(command.email !== undefined && command.email !== current.email ? ['email' as const] : []),
  ];
}

async function compensate(
  targetId: string,
  previousUser: User,
  previousAuthUser: UserRecord,
  dependencies: UserProfileUpdateDependencies,
  authChanged: boolean,
  profileChanged: boolean
): Promise<string[]> {
  const errors: string[] = [];
  if (profileChanged) {
    try {
      await dependencies.db.collection('users').doc(targetId).update({
        name: previousUser.name,
        email: previousUser.email,
        ...(previousUser.updatedAt === undefined ? {} : { updatedAt: previousUser.updatedAt }),
        ...(previousUser.updatedBy === undefined ? {} : { updatedBy: previousUser.updatedBy }),
      });
    } catch (error) {
      errors.push(`perfil: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (authChanged) {
    try {
      await dependencies.auth.updateUser(targetId, authRestoreFor(previousAuthUser));
    } catch (error) {
      errors.push(`authentication: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return errors;
}

export async function updateManagedUserProfile(
  actor: AuthenticatedIdentity['user'],
  targetUserId: string,
  input: unknown,
  dependencies: UserProfileUpdateDependencies = defaultDependencies
): Promise<UpdateUserProfileResult> {
  const command = UpdateUserProfileCommandSchema.parse(input);
  const isSelf = actor.id === targetUserId;

  if (!isSelf && !hasUserPermission(actor, 'users:update')) {
    throw new UserProfileUpdateError('Somente um mestre pode editar outro perfil.', 403);
  }

  const profileReference = dependencies.db.collection('users').doc(targetUserId);
  const [authUser, profileSnapshot] = await Promise.all([
    dependencies.auth.getUser(targetUserId),
    profileReference.get(),
  ]);

  if (!profileSnapshot.exists) {
    throw new UserProfileUpdateError('Perfil do usuário não foi encontrado.', 404);
  }

  const currentUser = UserSchema.parse({
    id: profileSnapshot.id,
    ...profileSnapshot.data(),
  });
  if (currentUser.id !== targetUserId) {
    throw new UserProfileUpdateError('Perfil inconsistente com o UID informado.', 409);
  }
  if (currentUser.email !== (authUser.email ?? currentUser.email)) {
    throw new UserProfileUpdateError('Perfil e Authentication estão inconsistentes.', 409);
  }

  const fields = changedFields(currentUser, command);
  if (fields.length === 0) {
    return { user: publicProfile(currentUser), changedFields: [] };
  }

  const timestamp = dependencies.now().toISOString();
  const updatedUser = UserSchema.parse({
    ...currentUser,
    ...command,
    updatedAt: timestamp,
    updatedBy: actor.id,
  });
  let authChanged = false;
  let profileChanged = false;

  try {
    await dependencies.auth.updateUser(targetUserId, authUpdateFor(command));
    authChanged = true;
    await profileReference.update(updatedUser);
    profileChanged = true;

    const audit = UserAuditLogSchema.parse({
      targetUserId,
      performedBy: actor.id,
      action: 'UPDATE',
      changedFields: fields,
      createdAt: timestamp,
    });
    await dependencies.db.collection('userAuditLogs').add(audit);
  } catch (error) {
    const rollbackErrors = await compensate(
      targetUserId,
      currentUser,
      authUser,
      dependencies,
      authChanged,
      profileChanged
    );
    throw new UserProfileUpdateError(
      'Não foi possível concluir a atualização do perfil.',
      500,
      { cause: error },
      rollbackErrors
    );
  }

  return {
    user: publicProfile(updatedUser),
    changedFields: fields,
  };
}
