import { z } from 'zod';
import {
  StatusInventarioSchema,
  TipoItemSchema,
  UnidadeMedidaSchema,
} from './types';
import { SetorFabrilSchema } from './colaborador.schema';

/**
 * Escopo / abrangência da sessão de inventário.
 */
export const EscopoInventarioSchema = z.enum([
  'GERAL',
  'POR_SETOR',
  'POR_TIPO_ITEM',
  'CICLICO',
]);
export type EscopoInventario = z.infer<typeof EscopoInventarioSchema>;

export const ESCOPO_INVENTARIO_LABELS: Record<EscopoInventario, string> = {
  GERAL: 'Inventário Geral (Todos os Itens)',
  POR_SETOR: 'Inventário por Setor Fabril',
  POR_TIPO_ITEM: 'Inventário por Categoria de Material',
  CICLICO: 'Inventário Cíclico / Amostragem Rotativa',
};

/**
 * Status individual da contagem física de um item.
 */
export const StatusContagemItemSchema = z.enum([
  'PENDENTE',
  'CONCILIADO',
  'DIVERGENTE',
  'AJUSTADO',
]);
export type StatusContagemItem = z.infer<typeof StatusContagemItemSchema>;

/**
 * Schema de contagem física de um item na sessão de balanço.
 */
export const ItemContagemSchema = z.object({
  id: z.string().min(1, 'ID da contagem é obrigatório'),
  itemId: z.string().min(1, 'ID do item é obrigatório'),
  codigoItem: z.string().trim(),
  descricaoItem: z.string().trim(),
  unidade: UnidadeMedidaSchema,
  saldoSistema: z.number(),
  quantidadeContada: z
    .number()
    .min(0, 'A quantidade contada não pode ser negativa'),
  divergencia: z.number(),
  dataHoraContagem: z.string().datetime(),
  responsavelContagemId: z.string().min(1, 'Responsável pela contagem é obrigatório'),
  responsavelContagemNome: z.string().optional(),
  statusContagem: StatusContagemItemSchema.default('PENDENTE'),
  ajusteMovimentacaoId: z.string().optional(),
  observacao: z.string().trim().optional(),
});

export type ItemContagem = z.infer<typeof ItemContagemSchema>;

/**
 * Schema consolidado da sessão de inventário físico e conferência cíclica.
 */
export const SessaoInventarioSchema = z.object({
  id: z.string().min(1, 'ID da sessão de inventário é obrigatório'),
  titulo: z
    .string()
    .trim()
    .min(3, 'O título do inventário deve ter no mínimo 3 caracteres'),
  escopo: EscopoInventarioSchema,
  setorAlvo: SetorFabrilSchema.optional(),
  tipoItemAlvo: TipoItemSchema.optional(),
  status: StatusInventarioSchema.default('ABERTO'),
  dataInicio: z.string().datetime(),
  dataFechamento: z.string().datetime().optional(),
  responsavelAberturaId: z.string().min(1, 'Responsável pela abertura é obrigatório'),
  responsavelFechamentoId: z.string().optional(),
  contagens: z.array(ItemContagemSchema).default([]),
  totalItens: z.number().int().min(0).default(0),
  totalConciliados: z.number().int().min(0).default(0),
  totalDivergentes: z.number().int().min(0).default(0),
  acuraciaPercentual: z.number().min(0).max(100).default(100),
  observacoes: z.string().trim().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type SessaoInventario = z.infer<typeof SessaoInventarioSchema>;

/**
 * Input para abertura de uma nova sessão de inventário.
 */
export const AbrirSessaoInventarioSchema = z.object({
  titulo: z
    .string()
    .trim()
    .min(3, 'O título do inventário deve ter no mínimo 3 caracteres'),
  escopo: EscopoInventarioSchema,
  setorAlvo: SetorFabrilSchema.optional(),
  tipoItemAlvo: TipoItemSchema.optional(),
  itensIds: z.array(z.string()).optional(),
  responsavelAberturaId: z.string().min(1, 'Responsável pela abertura é obrigatório'),
  observacoes: z.string().trim().optional(),
  dataInicio: z.string().datetime().optional(),
});

export type AbrirSessaoInventarioInput = z.input<typeof AbrirSessaoInventarioSchema>;

/**
 * Input para lançamento ou atualização de contagem física de um item.
 */
export const RegistrarContagemItemSchema = z.object({
  sessaoId: z.string().min(1, 'ID da sessão é obrigatório'),
  itemId: z.string().min(1, 'ID do item é obrigatório'),
  quantidadeContada: z
    .number()
    .min(0, 'A quantidade contada não pode ser negativa'),
  responsavelContagemId: z.string().min(1, 'Responsável pela contagem é obrigatório'),
  responsavelContagemNome: z.string().optional(),
  observacao: z.string().trim().optional(),
  dataHoraContagem: z.string().datetime().optional(),
});

export type RegistrarContagemItemInput = z.input<typeof RegistrarContagemItemSchema>;

/**
 * Input para encerramento e apuração final de inventário.
 */
export const FechamentoInventarioSchema = z.object({
  sessaoId: z.string().min(1, 'ID da sessão é obrigatório'),
  responsavelFechamentoId: z.string().min(1, 'Responsável pelo fechamento é obrigatório'),
  gerarAjustesAutomaticos: z.boolean().default(true),
  observacoes: z.string().trim().optional(),
  dataFechamento: z.string().datetime().optional(),
});

export type FechamentoInventarioInput = z.input<typeof FechamentoInventarioSchema>;

/**
 * Função pura para calcular a divergência entre saldo do sistema e contagem física.
 */
export function calcularDivergenciaItem(
  saldoSistema: number,
  quantidadeContada: number
): {
  divergencia: number;
  status: 'CONCILIADO' | 'DIVERGENTE';
} {
  const divergencia = Math.round((quantidadeContada - saldoSistema + Number.EPSILON) * 10000) / 10000;
  const status = Math.abs(divergencia) < 0.0001 ? 'CONCILIADO' : 'DIVERGENTE';
  return { divergencia, status };
}

/**
 * Função pura para calcular a acurácia global do inventário (percentual de itens sem divergência).
 */
export function calcularMetricasSessao(
  contagens: Array<{ saldoSistema: number; quantidadeContada: number }>
): {
  totalItens: number;
  totalConciliados: number;
  totalDivergentes: number;
  acuraciaPercentual: number;
} {
  const totalItens = contagens.length;
  if (totalItens === 0) {
    return {
      totalItens: 0,
      totalConciliados: 0,
      totalDivergentes: 0,
      acuraciaPercentual: 100,
    };
  }

  let conciliados = 0;
  for (const c of contagens) {
    const { status } = calcularDivergenciaItem(c.saldoSistema, c.quantidadeContada);
    if (status === 'CONCILIADO') {
      conciliados++;
    }
  }

  const divergentes = totalItens - conciliados;
  const acuraciaPercentual =
    Math.round(((conciliados / totalItens) * 100 + Number.EPSILON) * 100) / 100;

  return {
    totalItens,
    totalConciliados: conciliados,
    totalDivergentes: divergentes,
    acuraciaPercentual,
  };
}

/**
 * Item consolidado no fechamento mensal de estoque.
 * Registra o saldo inicial do mês (vindo do mês anterior), a movimentação do mês e o saldo final.
 */
export const FechamentoMensalItemSchema = z.object({
  itemId: z.string().min(1),
  codigo: z.string().trim(),
  descricao: z.string().trim(),
  unidade: UnidadeMedidaSchema,
  saldoInicial: z.number(),
  totalEntradas: z.number().min(0).default(0),
  totalSaidas: z.number().min(0).default(0),
  totalAjustes: z.number().default(0),
  saldoFinal: z.number(),
});

export type FechamentoMensalItem = z.infer<typeof FechamentoMensalItemSchema>;

/**
 * Schema consolidado do fechamento periódico/mensal de estoque.
 * Substitui o transporte manual de saldos entre abas da planilha ESTOQUE 2026.xlsx.
 */
export const FechamentoMensalSchema = z.object({
  id: z.string().min(1),
  ano: z.number().int().min(2020).max(2100),
  mes: z.number().int().min(1).max(12),
  dataFechamento: z.string().datetime(),
  responsavelId: z.string().min(1),
  status: z.enum(['ABERTO', 'FECHADO']).default('FECHADO'),
  itens: z.array(FechamentoMensalItemSchema),
  observacoes: z.string().trim().optional(),
  createdAt: z.string().datetime().optional(),
});

export type FechamentoMensal = z.infer<typeof FechamentoMensalSchema>;

/**
 * Input para acionar a rotina de fechamento mensal de saldo.
 */
export const ExecutarFechamentoMensalSchema = z.object({
  ano: z.number().int().min(2020).max(2100),
  mes: z.number().int().min(1).max(12),
  responsavelId: z.string().min(1, 'Identificador do responsável é obrigatório'),
  observacoes: z.string().trim().optional(),
});

export type ExecutarFechamentoMensalInput = z.input<typeof ExecutarFechamentoMensalSchema>;

