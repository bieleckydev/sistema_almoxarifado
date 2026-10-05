import type { User, UserRole } from './user.schema';

export type UserPermission =
  | 'users:read'
  | 'users:create'
  | 'users:update'
  | 'users:change-role'
  | 'users:change-status'
  | 'users:reset-password'
  | 'users:send-invite'
  | 'audit:read'
  | 'catalog:manage'
  | 'stock:operate'
  | 'imports:manage';

const ROLE_PERMISSIONS: Record<UserRole, readonly UserPermission[]> = {
  mestre: [
    'users:read',
    'users:create',
    'users:update',
    'users:change-role',
    'users:change-status',
    'users:reset-password',
    'users:send-invite',
    'audit:read',
    'catalog:manage',
    'stock:operate',
    'imports:manage',
  ],
  admin: [
    'catalog:manage',
    'stock:operate',
  ],
  operador: ['stock:operate'],
  requisitante: [],
};

export function hasUserPermission(user: User, permission: UserPermission): boolean {
  return user.ativo && ROLE_PERMISSIONS[user.role].includes(permission);
}

export function canManageTargetUser(actor: User, target: User): boolean {
  return hasUserPermission(actor, 'users:update')
    && actor.id !== target.id
    && (actor.role === 'mestre' || target.role !== 'mestre');
}

export function canChangeTargetRole(actor: User, target: User): boolean {
  return canManageTargetUser(actor, target)
    && target.role !== 'mestre'
    && hasUserPermission(actor, 'users:change-role');
}

export function canChangeOwnRole(actor: User): boolean {
  return false;
}

export function canCreateUserWithRole(actor: User, role: UserRole): boolean {
  return hasUserPermission(actor, 'users:create')
    && role !== 'mestre';
}

export function getRolePermissions(role: UserRole): readonly UserPermission[] {
  return ROLE_PERMISSIONS[role];
}
