import { z } from 'zod';
import { DATA_ISO_REGEX } from './pedido.schema';

/**
 * Tipo da nota fiscal emitida pela empresa:
 * - VENDA: Faturamento de produtos próprios ou matéria-prima expedida a clientes.
 * - RETORNO_INDUSTRIALIZACAO: Retorno de material de terceiros após beneficiamento (com cobrança de serviço).
 */
export const TipoNotaFiscalEmitidaSchema = z.enum([
  'VENDA',
  'RETORNO_INDUSTRIALIZACAO',
]);

export type TipoNotaFiscalEmitida = z.infer<typeof TipoNotaFiscalEmitidaSchema>;

export const TIPO_NF_EMITIDA_LABELS: Record<TipoNotaFiscalEmitida, string> = {
  VENDA: 'Venda de Mercadoria',
  RETORNO_INDUSTRIALIZACAO: 'Retorno de Industrialização',
};

/**
 * Normaliza variações de escrita e rótulos para o enum canônico.
 */
export function normalizarTipoNotaEmitida(valor: unknown): TipoNotaFiscalEmitida {
  if (typeof valor !== 'string') return 'VENDA';
  const normalizado = valor.trim().toUpperCase();

  if (normalizado === 'VENDA') {
    return 'VENDA';
  }
  if (
    normalizado === 'RETORNO' ||
    normalizado === 'RETORNO_INDUSTRIALIZACAO' ||
    normalizado.includes('INDUSTRIALIZA')
  ) {
    return 'RETORNO_INDUSTRIALIZACAO';
  }
  return 'VENDA';
}

export const TipoNotaFiscalEmitidaFlexivelSchema = z.preprocess(
  (val) => (typeof val === 'string' ? normalizarTipoNotaEmitida(val) : val),
  TipoNotaFiscalEmitidaSchema
);

/**
 * Schema principal de uma Nota Fiscal emitida (Faturamento).
 */
export const NotaFiscalEmitidaSchema = z.object({
  id: z.string().min(1, 'ID da nota fiscal é obrigatório'),
  numeroNF: z.string().trim().min(1, 'Número da NF-e é obrigatório'),
  serie: z.string().trim().default('1'),
  dataEmissao: z.string().regex(DATA_ISO_REGEX, 'Data de emissão inválida (AAAA-MM-DD)'),
  dataVencimento: z
    .string()
    .regex(DATA_ISO_REGEX, 'Data de vencimento inválida (AAAA-MM-DD)')
    .optional(),
  tipo: TipoNotaFiscalEmitidaFlexivelSchema.default('VENDA'),
  clienteId: z.string().min(1, 'ID do cliente destinatário é obrigatório'),
  valorTotal: z.number().nonnegative('O valor total não pode ser negativo'),
  referencia: z.string().trim().min(1, 'Referência do documento é obrigatória'),
  pedidoId: z.string().optional(),
  materialTerceiroId: z.string().optional(),
  cancelada: z.boolean().optional(),
  motivoCancelamento: z.string().trim().optional(),
  observacoes: z.string().trim().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type NotaFiscalEmitida = z.infer<typeof NotaFiscalEmitidaSchema>;

/**
 * Schema para emissão e registro de faturamento de pedido de venda.
 */
export const FaturarPedidoInputSchema = z.object({
  pedidoId: z.string().min(1, 'ID do pedido é obrigatório para faturamento'),
  numeroNF: z.string().trim().min(1, 'Informe o número da NF-e'),
  serie: z.string().trim().default('1'),
  dataEmissao: z.string().regex(DATA_ISO_REGEX, 'Data de emissão inválida (AAAA-MM-DD)'),
  dataVencimento: z
    .string()
    .regex(DATA_ISO_REGEX, 'Data de vencimento inválida (AAAA-MM-DD)')
    .optional(),
  observacoes: z.string().trim().optional(),
});

export type FaturarPedidoInput = z.input<typeof FaturarPedidoInputSchema>;

/**
 * Schema para registro direto de Nota Fiscal emitida (venda ou devolução).
 */
export const RegistrarNotaFiscalEmitidaSchema = z.object({
  numeroNF: z.string().trim().min(1, 'Informe o número da NF-e'),
  serie: z.string().trim().default('1'),
  dataEmissao: z.string().regex(DATA_ISO_REGEX, 'Data de emissão inválida (AAAA-MM-DD)'),
  dataVencimento: z
    .string()
    .regex(DATA_ISO_REGEX, 'Data de vencimento inválida (AAAA-MM-DD)')
    .optional(),
  tipo: TipoNotaFiscalEmitidaFlexivelSchema.default('VENDA'),
  clienteId: z.string().min(1, 'Selecione o cliente'),
  valorTotal: z.number().nonnegative('Valor total não pode ser negativo'),
  referencia: z.string().trim().min(1, 'Informe a referência'),
  pedidoId: z.string().optional(),
  materialTerceiroId: z.string().optional(),
  observacoes: z.string().trim().optional(),
});

export type RegistrarNotaFiscalEmitidaInput = z.input<typeof RegistrarNotaFiscalEmitidaSchema>;

/* =========================================================================
   Funções utilitárias puras para faturamento
   ========================================================================= */

/**
 * Calcula a soma dos valores totais faturados em uma lista de notas fiscais.
 */
export function calcularTotalNotasEmitidas(
  notas: Array<Pick<NotaFiscalEmitida, 'valorTotal'>>
): number {
  return notas.reduce((acc, curr) => acc + (curr.valorTotal || 0), 0);
}

/**
 * Calcula o total faturado agrupado por tipo de nota.
 */
export function calcularTotalPorTipo(
  notas: Array<Pick<NotaFiscalEmitida, 'tipo' | 'valorTotal'>>,
  tipo: TipoNotaFiscalEmitida
): number {
  return notas
    .filter((n) => n.tipo === tipo)
    .reduce((acc, curr) => acc + (curr.valorTotal || 0), 0);
}

/**
 * Formata o identificador oficial da nota no padrão "NF 1520 / 1".
 */
export function formatarNumeroSerieNF(numeroNF: string, serie: string = '1'): string {
  return `NF ${numeroNF} / ${serie}`;
}
