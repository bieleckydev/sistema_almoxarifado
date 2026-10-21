import { z } from 'zod';

export const EventoAuditoriaOperacionalSchema = z.object({
  id: z.string().optional(),
  quando: z.string().datetime().or(z.string().min(1)),
  usuarioId: z.string().min(1, 'ID do usuário é obrigatório'),
  usuarioNome: z.string().min(1, 'Nome do usuário é obrigatório'),
  papel: z.string().min(1, 'Papel do usuário é obrigatório'),
  acao: z.string().min(1, 'Ação realizada é obrigatória'),
  detalhe: z.string().min(1, 'Detalhe da ação é obrigatório'),
  entidade: z.string().optional(),
  entidadeId: z.string().optional(),
  createdAt: z.string().datetime().optional(),
});

export type EventoAuditoriaOperacional = z.infer<typeof EventoAuditoriaOperacionalSchema>;

export const RegistrarEventoAuditoriaInputSchema = EventoAuditoriaOperacionalSchema.omit({
  id: true,
  createdAt: true,
});

export type RegistrarEventoAuditoriaInput = z.infer<typeof RegistrarEventoAuditoriaInputSchema>;
