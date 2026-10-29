import { z } from 'zod';
import { QuantidadeFracionariaSchema } from './quantidade';

export const StatusRequisicaoSchema = z.enum([
  'PENDENTE',
  'APROVADA',
  'REJEITADA',
  'ENTREGUE',
  'CANCELADA',
]);

export type StatusRequisicao = z.infer<typeof StatusRequisicaoSchema>;

export const ItemRequisicaoSchema = z.object({
  itemId: z.string().min(1, 'ID do item é obrigatório'),
  codigo: z.string().optional(),
  descricao: z.string().optional(),
  unidade: z.string().default('UNIDADE'),
  quantidadeSolicitada: QuantidadeFracionariaSchema,
  quantidadeAtendida: QuantidadeFracionariaSchema.optional(),
});

export type ItemRequisicao = z.infer<typeof ItemRequisicaoSchema>;

export const RequisicaoSchema = z.object({
  id: z.string().min(1),
  numeroSequencial: z.number().int().positive().optional(),
  requisitanteId: z.string().min(1),
  requisitanteNome: z.string().min(1),
  setor: z.string().min(1, 'Setor de destino é obrigatório'),
  prioridade: z.enum(['BAIXA', 'NORMAL', 'URGENTE']).default('NORMAL'),
  status: StatusRequisicaoSchema.default('PENDENTE'),
  itens: z.array(ItemRequisicaoSchema).min(1, 'Adicione pelo menos um item'),
  observacao: z.string().optional(),
  motivoRejeicao: z.string().optional(),
  aprovadoPor: z.string().optional(),
  aprovadoEm: z.string().optional(),
  entreguePor: z.string().optional(),
  entregueEm: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Requisicao = z.infer<typeof RequisicaoSchema>;

export const CriarRequisicaoInputSchema = z.object({
  setor: z.string().min(1, 'Setor de destino é obrigatório'),
  prioridade: z.enum(['BAIXA', 'NORMAL', 'URGENTE']).default('NORMAL'),
  itens: z.array(ItemRequisicaoSchema).min(1, 'Adicione pelo menos um item'),
  observacao: z.string().optional(),
});

export type CriarRequisicaoInput = z.infer<typeof CriarRequisicaoInputSchema>;
