import { z } from 'zod';

export const UserRoleSchema = z.enum(['mestre', 'admin', 'operador', 'requisitante']);
export type UserRole = z.infer<typeof UserRoleSchema>;

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
