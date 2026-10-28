import {
  canChangeTargetRole,
  canCreateUserWithRole,
  canManageTargetUser,
  hasUserPermission,
  type UserPermission,
} from '../../core/domain/user-authorization';
import type { UserRole } from '../../core/domain/user.schema';
import type { AuthenticatedIdentity } from './identity';

export class AuthorizationError extends Error {
  readonly statusCode = 403;

  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export function requirePermission(
  identity: AuthenticatedIdentity,
  permission: UserPermission
): void {
  if (!hasUserPermission(identity.user, permission)) {
    throw new AuthorizationError(`Permissão insuficiente para: ${permission}.`);
  }
}

export function requireTargetUserManagement(
  identity: AuthenticatedIdentity,
  target: AuthenticatedIdentity['user']
): void {
  if (!canManageTargetUser(identity.user, target)) {
    throw new AuthorizationError('Usuário não pode gerenciar este perfil.');
  }
}

export function requireTargetRoleChange(
  identity: AuthenticatedIdentity,
  target: AuthenticatedIdentity['user']
): void {
  if (!canChangeTargetRole(identity.user, target)) {
    throw new AuthorizationError('Usuário não pode alterar o papel deste perfil.');
  }
}

export function requireUserCreation(
  identity: AuthenticatedIdentity,
  role: UserRole
): void {
  if (!canCreateUserWithRole(identity.user, role)) {
    throw new AuthorizationError('Usuário não pode criar um perfil com este papel.');
  }
}
