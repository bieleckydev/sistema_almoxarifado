import { z } from 'zod';
import { DATA_ISO_REGEX } from './pedido.schema';

/**
 * Tipo de movimentação de material de terceiros:
 * - ENTRADA_REMESSA: Material enviado pelo cliente com NF-e de remessa para industrialização.
 * - CONSUMO_PRODUCAO: Consumo do material do cliente na linha de produção (OF / Ordem de Produção).
 * - DEVOLUCAO_RETORNO: Retorno do material beneficiado ou saldo residual ao cliente com NF-e de retorno.
 */
export const TipoMovimentacaoTerceiroSchema = z.enum([
  'ENTRADA_REMESSA',
  'CONSUMO_PRODUCAO',
  'DEVOLUCAO_RETORNO',
]);

export type TipoMovimentacaoTerceiro = z.infer<typeof TipoMovimentacaoTerceiroSchema>;

export const TIPO_MOV_TERCEIRO_LABELS: Record<TipoMovimentacaoTerceiro, string> = {
  ENTRADA_REMESSA: 'Entrada (Remessa)',
  CONSUMO_PRODUCAO: 'Consumo na Produção',
  DEVOLUCAO_RETORNO: 'Devolução ao Cliente',
};

/**
 * Normaliza variações de escrita e rótulos legados para o enum canônico.
 */
export function normalizarTipoMovTerceiro(valor: unknown): TipoMovimentacaoTerceiro {
  if (typeof valor !== 'string') return 'ENTRADA_REMESSA';
  const normalizado = valor.trim().toUpperCase();

  if (normalizado === 'ENTRADA' || normalizado === 'ENTRADA_REMESSA') {
    return 'ENTRADA_REMESSA';
  }
  if (normalizado === 'CONSUMO' || normalizado === 'CONSUMO_PRODUCAO') {
    return 'CONSUMO_PRODUCAO';
  }
  if (normalizado === 'DEVOLUCAO' || normalizado === 'DEVOLUCAO_RETORNO' || normalizado === 'DEVOLUÇÃO') {
    return 'DEVOLUCAO_RETORNO';
  }
  return 'ENTRADA_REMESSA';
}

export const TipoMovTerceiroFlexivelSchema = z.preprocess(
  (val) => (typeof val === 'string' ? normalizarTipoMovTerceiro(val) : val),
  TipoMovimentacaoTerceiroSchema
);

/**
 * Schema de um registro histórico de movimentação do material sob custódia.
 */
export const MovimentacaoTerceiroSchema = z.object({
  id: z.string().min(1, 'ID da movimentação é obrigatório'),
  materialTerceiroId: z.string().min(1, 'ID do material é obrigatório'),
  tipo: TipoMovTerceiroFlexivelSchema,
  quantidade: z.number().positive('A quantidade deve ser maior que zero'),
  saldoAnterior: z.number().nonnegative('O saldo anterior não pode ser negativo'),
  saldoResultante: z.number().nonnegative('O saldo resultante não pode ser negativo'),
  documento: z.string().trim().min(1, 'Informe o documento ou NF de referência'),
  dataMovimentacao: z.string().regex(DATA_ISO_REGEX, 'Data deve estar no formato AAAA-MM-DD'),
  responsavel: z.string().trim().min(1, 'Responsável ou setor é obrigatório'),
  valorServico: z.number().nonnegative().optional(),
  observacao: z.string().trim().optional(),
  createdAt: z.string().datetime().optional(),
});

export type MovimentacaoTerceiro = z.infer<typeof MovimentacaoTerceiroSchema>;

/**
 * Schema principal da entidade Material de Terceiro (estoque em poder da empresa para beneficiamento).
 */
export const MaterialTerceiroSchema = z.object({
  id: z.string().min(1, 'ID do material de terceiro é obrigatório'),
  clienteId: z.string().min(1, 'Proprietário (Cliente) é obrigatório'),
  descricao: z.string().trim().min(2, 'Descrição do material deve ter pelo menos 2 caracteres'),
  codigoSku: z.string().trim().optional().default(''),
  unidade: z.string().trim().default('un'),
  saldoAtual: z.number().nonnegative('O saldo não pode ser negativo').default(0),
  numeroNFRemessa: z.string().trim().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type MaterialTerceiro = z.infer<typeof MaterialTerceiroSchema>;

/**
 * Schema para recebimento de material do cliente (gera saldo em terceiros).
 */
export const ReceberMaterialTerceiroSchema = z.object({
  clienteId: z.string().min(1, 'Selecione o proprietário (cliente)'),
  descricao: z.string().trim().min(2, 'Informe o nome do material recebido'),
  codigoSku: z.string().trim().optional(),
  unidade: z.string().trim().default('un'),
  quantidade: z.number().positive('Informe uma quantidade recebida maior que zero'),
  dataRecebimento: z.string().regex(DATA_ISO_REGEX, 'Data de recebimento inválida (AAAA-MM-DD)'),
  numeroNFRemessa: z.string().trim().min(1, 'Informe o número da NF-e de remessa do cliente'),
  responsavel: z.string().trim().optional().default('Recebimento'),
  observacao: z.string().trim().optional(),
});

export type ReceberMaterialTerceiroInput = z.input<typeof ReceberMaterialTerceiroSchema>;

/**
 * Schema para consumo de material de terceiros na produção.
 */
export const ConsumirMaterialTerceiroSchema = z.object({
  materialTerceiroId: z.string().min(1, 'ID do material é obrigatório'),
  quantidade: z.number().positive('Quantidade a consumir deve ser maior que zero'),
  dataMovimentacao: z.string().regex(DATA_ISO_REGEX, 'Data inválida (AAAA-MM-DD)'),
  ordemProducaoOuDocumento: z.string().trim().min(1, 'Informe a ordem de produção ou documento'),
  responsavel: z.string().trim().optional().default('Produção'),
  observacao: z.string().trim().optional(),
});

export type ConsumirMaterialTerceiroInput = z.input<typeof ConsumirMaterialTerceiroSchema>;

/**
 * Schema para devolução de material ao cliente com cobrança de serviço de industrialização.
 */
export const DevolverMaterialTerceiroSchema = z.object({
  materialTerceiroId: z.string().min(1, 'ID do material é obrigatório'),
  quantidade: z.number().positive('Quantidade a devolver deve ser maior que zero'),
  dataMovimentacao: z.string().regex(DATA_ISO_REGEX, 'Data inválida (AAAA-MM-DD)'),
  numeroNFRetorno: z.string().trim().min(1, 'Informe o número da NF-e de retorno'),
  valorServico: z.number().nonnegative('O valor do serviço não pode ser negativo').optional().default(0),
  responsavel: z.string().trim().optional().default('Expedição'),
  observacao: z.string().trim().optional(),
});

export type DevolverMaterialTerceiroInput = z.input<typeof DevolverMaterialTerceiroSchema>;

/* =========================================================================
   Funções utilitárias puras de cálculo de estoque de terceiros
   ========================================================================= */

/**
 * Calcula o saldo atual a partir do histórico de movimentações de terceiros:
 * Entradas somam; Consumos e Devoluções subtraem.
 */
export function calcularSaldoTerceiro(
  historico: Array<{ tipo: TipoMovimentacaoTerceiro; quantidade: number }>
): number {
  return historico.reduce((saldo, mov) => {
    if (mov.tipo === 'ENTRADA_REMESSA') {
      return saldo + mov.quantidade;
    }
    return saldo - mov.quantidade;
  }, 0);
}

/**
 * Consolida os totais acumulados de movimentação por tipo.
 */
export function calcularTotaisTerceiro(
  historico: Array<{ tipo: TipoMovimentacaoTerceiro; quantidade: number }>
): {
  recebido: number;
  consumido: number;
  devolvido: number;
  saldo: number;
} {
  let recebido = 0;
  let consumido = 0;
  let devolvido = 0;

  for (const mov of historico) {
    if (mov.tipo === 'ENTRADA_REMESSA') {
      recebido += mov.quantidade;
    } else if (mov.tipo === 'CONSUMO_PRODUCAO') {
      consumido += mov.quantidade;
    } else if (mov.tipo === 'DEVOLUCAO_RETORNO') {
      devolvido += mov.quantidade;
    }
  }

  return {
    recebido,
    consumido,
    devolvido,
    saldo: recebido - consumido - devolvido,
  };
}

/**
 * Valida se há saldo suficiente para consumo ou devolução.
 */
export function validarSaldoSuficienteTerceiro(
  saldoAtual: number,
  quantidadeRequisitada: number
): boolean {
  return saldoAtual >= quantidadeRequisitada;
}
