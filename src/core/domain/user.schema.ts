import { z } from 'zod';

export const UserRoleSchema = z.enum(['mestre', 'admin', 'operador', 'requisitante']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const ManagedUserRoleSchema = z.enum(['admin', 'operador', 'requisitante']);
export type ManagedUserRole = z.infer<typeof ManagedUserRoleSchema>;

export const UserSchema = z.object({
  id: z.string().min(1, 'ID do usuário é obrigatório'),
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('E-mail inválido'),
  role: UserRoleSchema.default('requisitante'),
  ativo: z.boolean().default(true),
  mustChangePassword: z.boolean().default(false),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  createdBy: z.string().min(1).optional(),
  updatedBy: z.string().min(1).optional(),
});

export type User = z.infer<typeof UserSchema>;

const UserNameSchema = z.string().trim().min(1, 'Nome é obrigatório');
const UserEmailSchema = z.string().trim().email('E-mail inválido');
const AuditReasonSchema = z.string().trim().min(3, 'O motivo deve conter no mínimo 3 caracteres').optional();

export const CreateUserCommandSchema = z
  .object({
    name: UserNameSchema,
    email: UserEmailSchema,
    role: ManagedUserRoleSchema.default('requisitante'),
    sendInvite: z.boolean().default(true),
    idempotencyKey: z
      .string()
      .trim()
      .min(8)
      .max(128)
      .regex(/^[^/]+$/, 'A chave de idempotência não pode conter "/"')
      .optional(),
  })
  .strict();

export type CreateUserCommand = z.infer<typeof CreateUserCommandSchema>;

export const UpdateUserProfileCommandSchema = z
  .object({
    name: UserNameSchema.optional(),
    email: UserEmailSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Informe ao menos um campo para atualizar',
  });

export type UpdateUserProfileCommand = z.infer<typeof UpdateUserProfileCommandSchema>;

export const ChangeUserRoleCommandSchema = z
  .object({
    role: UserRoleSchema,
    reason: AuditReasonSchema,
  })
  .strict();

export type ChangeUserRoleCommand = z.infer<typeof ChangeUserRoleCommandSchema>;

export const SetUserStatusCommandSchema = z
  .object({
    ativo: z.boolean(),
    reason: AuditReasonSchema,
  })
  .strict();

export type SetUserStatusCommand = z.infer<typeof SetUserStatusCommandSchema>;

export const SendUserInviteCommandSchema = z
  .object({
    reason: AuditReasonSchema,
  })
  .strict();

export type SendUserInviteCommand = z.infer<typeof SendUserInviteCommandSchema>;

export const ResetUserPasswordCommandSchema = z
  .object({
    reason: AuditReasonSchema,
  })
  .strict();

export type ResetUserPasswordCommand = z.infer<typeof ResetUserPasswordCommandSchema>;
