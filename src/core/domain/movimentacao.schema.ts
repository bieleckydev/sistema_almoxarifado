import { z } from 'zod';
import { TipoMovimentacaoSchema } from './types';
import { SetorFabrilSchema } from './colaborador.schema';

/**
 * Status de entrega/despacho para movimentações de saída de expedição de produtos acabados.
 */
export const StatusExpedicaoSchema = z.enum([
  'PENDENTE',
  'DESPACHADO',
  'ENTREGUE',
  'CANCELADO',
]);
export type StatusExpedicao = z.infer<typeof StatusExpedicaoSchema>;

/**
 * Schema de entrada de material no almoxarifado (por compra/NFe ou produção interna).
 */
export const RegistrarEntradaSchema = z.object({
  itemId: z.string().min(1, 'ID do item é obrigatório'),
  tipo: z
    .enum(['ENTRADA_COMPRA', 'ENTRADA_PRODUCAO'])
    .default('ENTRADA_COMPRA'),
  quantidade: z
    .number()
    .positive('A quantidade de entrada deve ser maior que zero'),
  numeroNF: z.string().trim().optional(),
  documentoFiscalId: z.string().trim().optional(),
  fornecedor: z.string().trim().optional(),
  numeroPedidoRhowert: z.string().trim().optional(),
  valorUnitario: z
    .number()
    .min(0, 'O valor unitário não pode ser negativo')
    .optional(),
  observacoes: z.string().trim().optional(),
  dataMovimentacao: z.string().datetime().optional(),
});

export type RegistrarEntradaInput = z.input<typeof RegistrarEntradaSchema>;

/**
 * Schema de baixa interna para consumo fabril por colaborador (flap, solda, brocas, EPIs).
 */
export const RegistrarBaixaInternaSchema = z.object({
  itemId: z.string().min(1, 'ID do item é obrigatório'),
  tipo: z.literal('SAIDA_CONSUMO_INTERNO').default('SAIDA_CONSUMO_INTERNO'),
  quantidade: z
    .number()
    .positive('A quantidade da baixa deve ser maior que zero'),
  colaboradorId: z.string().min(1, 'ID do colaborador é obrigatório'),
  setor: SetorFabrilSchema.optional(),
  observacao: z.string().trim().optional(),
  dataMovimentacao: z.string().datetime().optional(),
});

export type RegistrarBaixaInternaInput = z.input<typeof RegistrarBaixaInternaSchema>;

/**
 * Schema de saída de produto acabado para expedição / cliente / filial.
 */
export const RegistrarSaidaExpedicaoSchema = z.object({
  itemId: z.string().min(1, 'ID do item é obrigatório'),
  tipo: z.literal('SAIDA_EXPEDICAO').default('SAIDA_EXPEDICAO'),
  quantidade: z
    .number()
    .positive('A quantidade de expedição deve ser maior que zero'),
  clienteDestino: z
    .string()
    .trim()
    .min(2, 'O cliente ou filial de destino é obrigatório'),
  numeroNF: z.string().trim().optional(),
  status: StatusExpedicaoSchema.default('DESPACHADO'),
  observacao: z.string().trim().optional(),
  dataMovimentacao: z.string().datetime().optional(),
});

export type RegistrarSaidaExpedicaoInput = z.input<typeof RegistrarSaidaExpedicaoSchema>;

/**
 * Item individual no lote de baixa rápida (carrinho de retirada do operador).
 */
export const ItemBaixaLoteSchema = z.object({
  itemId: z.string().min(1, 'ID do item é obrigatório'),
  quantidade: z
    .number()
    .positive('A quantidade deve ser maior que zero'),
  observacao: z.string().trim().optional(),
});

export type ItemBaixaLote = z.infer<typeof ItemBaixaLoteSchema>;

/**
 * Schema de baixa em lote para operações ágeis no chão de fábrica.
 * Permite ao almoxarife registrar múltiplos itens de uma vez para o mesmo colaborador.
 */
export const RegistrarBaixaLoteSchema = z.object({
  colaboradorId: z.string().min(1, 'ID do colaborador é obrigatório'),
  setor: SetorFabrilSchema.optional(),
  itens: z
    .array(ItemBaixaLoteSchema)
    .min(1, 'O lote deve conter pelo menos um item para baixa'),
  observacaoGeral: z.string().trim().optional(),
  dataMovimentacao: z.string().datetime().optional(),
});

export type RegistrarBaixaLoteInput = z.input<typeof RegistrarBaixaLoteSchema>;

/**
 * Schema de ajuste de inventário (correção por contagem física).
 */
export const RegistrarAjusteInventarioSchema = z.object({
  itemId: z.string().min(1, 'ID do item é obrigatório'),
  tipo: z.enum(['AJUSTE_INVENTARIO_POSITIVO', 'AJUSTE_INVENTARIO_NEGATIVO']),
  quantidade: z
    .number()
    .positive('A quantidade de ajuste deve ser maior que zero'),
  motivo: z.string().trim().min(3, 'O motivo do ajuste é obrigatório'),
  inventarioId: z.string().optional(),
  responsavelId: z.string().optional(),
  dataMovimentacao: z.string().datetime().optional(),
});

export type RegistrarAjusteInventarioInput = z.input<typeof RegistrarAjusteInventarioSchema>;

/**
 * Entidade consolidada de Movimentação de Estoque com trilha de auditoria de saldo.
 */
export const MovimentacaoSchema = z.object({
  id: z.string().min(1, 'ID da movimentação é obrigatório'),
  itemId: z.string().min(1, 'ID do item é obrigatório'),
  tipo: TipoMovimentacaoSchema,
  quantidade: z.number().positive('A quantidade deve ser maior que zero'),
  saldoAnterior: z.number(),
  saldoResultante: z.number(),
  dataMovimentacao: z.string().datetime(),
  colaboradorId: z.string().optional(),
  colaboradorMatricula: z.string().optional(),
  colaboradorNome: z.string().optional(),
  setor: SetorFabrilSchema.optional(),
  destinatario: z.string().optional(),
  numeroNF: z.string().optional(),
  documentoFiscalId: z.string().optional(),
  numeroPedidoRhowert: z.string().optional(),
  fornecedor: z.string().optional(),
  status: z.string().optional(),
  observacao: z.string().optional(),
  createdAt: z.string().datetime().optional(),
});

export type Movimentacao = z.infer<typeof MovimentacaoSchema>;

/**
 * Schema de filtros para histórico e extrato de movimentações.
 */
export const MovimentacaoFiltrosSchema = z.object({
  itemId: z.string().optional(),
  colaboradorId: z.string().optional(),
  tipo: TipoMovimentacaoSchema.optional(),
  dataInicio: z.string().datetime().optional(),
  dataFim: z.string().datetime().optional(),
  numeroNF: z.string().optional(),
  pagina: z.number().int().min(1).default(1),
  limite: z.number().int().min(1).max(100).default(20),
});

export type MovimentacaoFiltros = z.input<typeof MovimentacaoFiltrosSchema>;
