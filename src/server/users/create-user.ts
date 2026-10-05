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

  constructor(message: string, authUid?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'UserCreationError';
    this.authUid = authUid;
  }
}

export interface CreateUserResult {
  user: PublicUserProfile;
  invitationRequested: boolean;
}

interface UserCreationDependencies {
  auth: Pick<Auth, 'createUser'>;
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

  try {
    await dependencies.db.collection('users').doc(authUser.uid).create(user);
    const audit = UserAuditLogSchema.parse({
      targetUserId: authUser.uid,
      performedBy: actor.id,
      action: 'CREATE',
      changedFields: ['name', 'email', 'role', 'ativo', 'mustChangePassword'],
      createdAt: timestamp,
    });
    await dependencies.db.collection('userAuditLogs').add(audit);
  } catch (error) {
    throw new UserCreationError(
      'Usuário criado no Authentication, mas o perfil não foi concluído no Firestore.',
      authUser.uid,
      { cause: error }
    );
  }

  return {
    user: publicProfile(user),
    invitationRequested: command.sendInvite,
  };
}
