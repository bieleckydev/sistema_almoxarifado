import { z } from 'zod';
import { UserRoleSchema, UserSchema } from './user.schema';

export const UserAuditActionSchema = z.enum([
  'CREATE',
  'UPDATE',
  'DISABLE',
  'ENABLE',
  'RESET_PASSWORD',
  'CHANGE_ROLE',
  'DELETE',
]);
export type UserAuditAction = z.infer<typeof UserAuditActionSchema>;

export const UserAuditFieldSchema = z.enum([
  'name',
  'email',
  'role',
  'ativo',
  'mustChangePassword',
]);
export type UserAuditField = z.infer<typeof UserAuditFieldSchema>;

export const UserAuditLogSchema = z
  .object({
    targetUserId: z.string().min(1, 'Usuário alvo é obrigatório'),
    performedBy: z.string().min(1, 'Responsável pela ação é obrigatório'),
    action: UserAuditActionSchema,
    changedFields: z.array(UserAuditFieldSchema).default([]),
    reason: z.string().trim().min(3).optional(),
    createdAt: z.string().datetime(),
  })
  .strict();

export type UserAuditLog = z.infer<typeof UserAuditLogSchema>;

export const PublicUserProfileSchema = UserSchema.pick({
  id: true,
  name: true,
  email: true,
  role: true,
  ativo: true,
  mustChangePassword: true,
  createdAt: true,
  updatedAt: true,
}).strict();
export type PublicUserProfile = z.infer<typeof PublicUserProfileSchema>;

export const UserRoleChangeSchema = z.object({
  previousRole: UserRoleSchema,
  newRole: UserRoleSchema,
});
export type UserRoleChange = z.infer<typeof UserRoleChangeSchema>;
