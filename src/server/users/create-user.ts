import 'server-only';

import type { Auth, UserRecord } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import {
  CreateUserCommandSchema,
  UserSchema,
  type CreateUserCommand,
  type User,
} from '../../core/domain/user.schema';
import { UserAuditLogSchema, type PublicUserProfile } from '../../core/domain/user-audit.schema';
import { canCreateUserWithRole } from '../../core/domain/user-authorization';
import { adminAuth, adminDb } from '../firebase-admin';
import type { AuthenticatedIdentity } from '../auth/identity';

export class UserCreationError extends Error {
  readonly statusCode = 500;
  readonly authUid?: string;
  readonly compensation?: {
    profileDeleted: boolean;
    authenticationUserDeleted: boolean;
    errors: string[];
  };

  constructor(
    message: string,
    authUid?: string,
    options?: ErrorOptions,
    compensation?: UserCreationError['compensation']
  ) {
    super(message, options);
    this.name = 'UserCreationError';
    this.authUid = authUid;
    this.compensation = compensation;
  }
}

export interface CreateUserResult {
  user: PublicUserProfile;
  invitationRequested: boolean;
}

interface UserCreationDependencies {
  auth: Pick<Auth, 'createUser' | 'deleteUser' | 'getUser'>;
  db: Pick<Firestore, 'collection'>;
  now: () => Date;
}

const defaultDependencies: UserCreationDependencies = {
  auth: adminAuth,
  db: adminDb,
  now: () => new Date(),
};

function publicProfile(user: User): PublicUserProfile {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    ativo: user.ativo,
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export type UserReconciliationResult =
  | { status: 'CONSISTENT'; uid: string }
  | { status: 'AUTH_DELETED'; uid: string }
  | { status: 'PROFILE_DELETED'; uid: string };

export async function reconcileUserCreation(
  uid: string,
  dependencies: Pick<UserCreationDependencies, 'auth' | 'db'> = defaultDependencies
): Promise<UserReconciliationResult> {
  const profileReference = dependencies.db.collection('users').doc(uid);
  const [authUser, profileSnapshot] = await Promise.all([
    dependencies.auth.getUser(uid).catch((error: unknown) => {
      if (error instanceof Error && 'code' in error && error.code === 'auth/user-not-found') {
        return null;
      }
      throw error;
    }),
    profileReference.get(),
  ]);

  if (authUser && profileSnapshot.exists) {
    return { status: 'CONSISTENT', uid };
  }

  if (authUser && !profileSnapshot.exists) {
    await dependencies.auth.deleteUser(uid);
    return { status: 'AUTH_DELETED', uid };
  }

  if (!authUser && profileSnapshot.exists) {
    await profileReference.delete();
    return { status: 'PROFILE_DELETED', uid };
  }

  return { status: 'CONSISTENT', uid };
}

function buildAuthenticationUser(command: CreateUserCommand): Parameters<Auth['createUser']>[0] {
  return {
    email: command.email,
    displayName: command.name,
    emailVerified: false,
    disabled: false,
  };
}

function buildUserProfile(
  authUser: UserRecord,
  command: CreateUserCommand,
  actor: AuthenticatedIdentity['user'],
  timestamp: string
): User {
  return UserSchema.parse({
    id: authUser.uid,
    name: command.name,
    email: authUser.email ?? command.email,
    role: command.role,
    ativo: true,
    mustChangePassword: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    createdBy: actor.id,
    updatedBy: actor.id,
  });
}

export async function createManagedUser(
  actor: AuthenticatedIdentity['user'],
  input: unknown,
  dependencies: UserCreationDependencies = defaultDependencies
): Promise<CreateUserResult> {
  const command = CreateUserCommandSchema.parse(input);

  if (!canCreateUserWithRole(actor, command.role)) {
    throw new UserCreationError('Somente um mestre pode criar este perfil.');
  }

  const timestamp = dependencies.now().toISOString();
  const authUser = await dependencies.auth.createUser(buildAuthenticationUser(command));
  const user = buildUserProfile(authUser, command, actor, timestamp);
  let profileCreated = false;

  try {
    await dependencies.db.collection('users').doc(authUser.uid).create(user);
    profileCreated = true;
    const audit = UserAuditLogSchema.parse({
      targetUserId: authUser.uid,
      performedBy: actor.id,
      action: 'CREATE',
      changedFields: ['name', 'email', 'role', 'ativo', 'mustChangePassword'],
      createdAt: timestamp,
    });
    await dependencies.db.collection('userAuditLogs').add(audit);
  } catch (error) {
    const compensationErrors: string[] = [];
    let profileDeleted = !profileCreated;
    let authenticationUserDeleted = false;

    if (profileCreated) {
      try {
        await dependencies.db.collection('users').doc(authUser.uid).delete();
        profileDeleted = true;
      } catch (cleanupError) {
        compensationErrors.push(
          `Falha ao remover o perfil do Firestore: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`
        );
      }
    }

    try {
      await dependencies.auth.deleteUser(authUser.uid);
      authenticationUserDeleted = true;
    } catch (cleanupError) {
      compensationErrors.push(
        `Falha ao remover o usuário do Authentication: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`
      );
    }

    throw new UserCreationError(
      compensationErrors.length === 0
        ? 'A criação do usuário falhou e as alterações parciais foram desfeitas.'
        : 'A criação do usuário falhou e a compensação ficou incompleta; reconciliação necessária.',
      authUser.uid,
      { cause: error },
      {
        profileDeleted,
        authenticationUserDeleted,
        errors: compensationErrors,
      }
    );
  }

  return {
    user: publicProfile(user),
    invitationRequested: command.sendInvite,
  };
}
