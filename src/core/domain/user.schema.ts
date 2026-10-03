import { z } from 'zod';

export const UserRoleSchema = z.enum(['admin', 'operador', 'requisitante']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('E-mail inválido'),
  role: UserRoleSchema.default('requisitante'),
  createdAt: z.string().optional(),
});

export type User = z.infer<typeof UserSchema>;
