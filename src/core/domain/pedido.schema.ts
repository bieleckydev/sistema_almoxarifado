import { z } from 'zod';

/**
 * Status do ciclo de vida operacional de um pedido de venda / expedição.
 * - PENDENTE: Pedido recebido, aguardando separação no estoque
 * - SEPARADO: Materiais já separados fisicamente e conferidos
 * - ENTREGUE: Materiais despachados/entregues ao cliente (baixa definitiva no estoque)
 * - CANCELADO: Pedido cancelado sem movimentação de estoque
 */
export const StatusPedidoSchema = z.enum([
  'PENDENTE',
  'SEPARADO',
  'ENTREGUE',
  'CANCELADO',
]);

export type StatusPedido = z.infer<typeof StatusPedidoSchema>;

export const STATUS_PEDIDO_LABELS: Record<StatusPedido, string> = {
  PENDENTE: 'Pendente',
  SEPARADO: 'Separado',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado',
};

/**
 * Normaliza variações de escrita e maiúsculas/minúsculas para StatusPedido.
 */
export function normalizarStatusPedido(valor: unknown): StatusPedido {
  if (typeof valor !== 'string') return 'PENDENTE';
  const normalizado = valor.trim().toUpperCase();

  switch (normalizado) {
    case 'PENDENTE':
      return 'PENDENTE';
    case 'SEPARADO':
      return 'SEPARADO';
    case 'ENTREGUE':
      return 'ENTREGUE';
    case 'CANCELADO':
      return 'CANCELADO';
    default:
      return 'PENDENTE';
  }
}

export const StatusPedidoFlexivelSchema = z.preprocess(
  (val) => (typeof val === 'string' ? normalizarStatusPedido(val) : val),
  StatusPedidoSchema
);

/**
 * Regex para validação de datas no padrão ISO YYYY-MM-DD.
 */
export const DATA_ISO_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/* =========================================================================
   Setor de destino do pedido
   ========================================================================= */

export interface SetorDestinoOpcao {
  codigo: string;
  rotulo: string;
}

/**
 * Catálogo padrão de setores de destino de um pedido de venda.
 * Novos destinos podem ser somados com montarCatalogoSetoresDestino; o schema aceita
 * qualquer código normalizado, então um destino novo não exige mudança de schema.
 */
export const SETORES_DESTINO_PADRAO: readonly SetorDestinoOpcao[] = [
  { codigo: 'PRODUCAO', rotulo: 'Produção' },
  { codigo: 'EXPEDICAO', rotulo: 'Expedição' },
  { codigo: 'OFICINA', rotulo: 'Oficina' },
  { codigo: 'MONTAGEM', rotulo: 'Montagem' },
  { codigo: 'CLIENTE_EXTERNO', rotulo: 'Terceiros / Cliente Externo' },
];

/** Destino assumido quando o pedido não informa setor (fluxo padrão de venda). */
export const SETOR_DESTINO_PADRAO = 'EXPEDICAO';

/**
 * Grafias antigas ou redundantes que apontam para um destino do catálogo padrão.
 */
const ALIASES_SETOR_DESTINO: Record<string, string> = {
  LOGISTICA: 'EXPEDICAO',
  EXPEDICAO_LOGISTICA: 'EXPEDICAO',
  FABRICA: 'PRODUCAO',
  FABRICACAO: 'PRODUCAO',
  LINHA_DE_MONTAGEM: 'MONTAGEM',
  LINHA_MONTAGEM: 'MONTAGEM',
  TERCEIROS: 'CLIENTE_EXTERNO',
  TERCEIRO: 'CLIENTE_EXTERNO',
  CLIENTE: 'CLIENTE_EXTERNO',
  EXTERNO: 'CLIENTE_EXTERNO',
  TERCEIROS_CLIENTE_EXTERNO: 'CLIENTE_EXTERNO',
};

/**
 * Normaliza um setor de destino para o código canônico:
 * sem acentos, maiúsculo, separado por "_" e com aliases legados resolvidos.
 * Ex.: "Expedição" -> "EXPEDICAO", "Terceiros / Cliente Externo" -> "CLIENTE_EXTERNO".
 */
export function normalizarSetorDestino(valor: string): string {
  const codigo = valor
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return ALIASES_SETOR_DESTINO[codigo] ?? codigo;
}

export const SetorDestinoSchema = z
  .string()
  .trim()
  .min(2, 'Informe o setor de destino')
  .max(40, 'O setor de destino deve ter no máximo 40 caracteres')
  .transform(normalizarSetorDestino)
  .refine((codigo) => codigo.length >= 2, 'Setor de destino inválido');

/**
 * Soma destinos extras ao catálogo padrão, sem duplicar códigos já existentes.
 */
export function montarCatalogoSetoresDestino(
  extras: ReadonlyArray<{ codigo?: string; rotulo: string }> = []
): SetorDestinoOpcao[] {
  const catalogo: SetorDestinoOpcao[] = [...SETORES_DESTINO_PADRAO];
  const codigos = new Set(catalogo.map((s) => s.codigo));
  for (const extra of extras) {
    const rotulo = extra.rotulo.trim();
    const codigo = normalizarSetorDestino(extra.codigo || rotulo);
    if (codigo.length < 2 || codigos.has(codigo)) continue;
    codigos.add(codigo);
    catalogo.push({ codigo, rotulo });
  }
  return catalogo;
}

/**
 * Rótulo de exibição de um setor de destino. Códigos fora do catálogo
 * (destinos livres) são exibidos em formato legível.
 */
export function rotuloSetorDestino(
  codigo: string | undefined,
  catalogo: readonly SetorDestinoOpcao[] = SETORES_DESTINO_PADRAO
): string {
  if (!codigo) return '';
  const normalizado = normalizarSetorDestino(codigo);
  const conhecido = catalogo.find((s) => s.codigo === normalizado);
  if (conhecido) return conhecido.rotulo;
  return normalizado
    .split('_')
    .filter(Boolean)
    .map((p) => p.charAt(0) + p.slice(1).toLowerCase())
    .join(' ');
}

export const ItemPedidoSchema = z.object({
  itemId: z.string().min(1, 'ID do item é obrigatório'),
  quantidade: z
    .number()
    .positive('A quantidade do item deve ser maior que zero'),
  precoUnitario: z
    .number()
    .nonnegative('O preço unitário não pode ser negativo')
    .optional()
    .default(0),
  observacao: z.string().trim().optional(),
});

export type ItemPedido = z.infer<typeof ItemPedidoSchema>;

/**
 * Metadados de faturamento vinculado ao pedido de venda.
 */
export const FaturamentoPedidoSchema = z.object({
  numeroNFe: z.string().trim().min(1, 'Número da NF-e é obrigatório'),
  serie: z.string().trim().default('1'),
  dataEmissao: z.string().regex(DATA_ISO_REGEX, 'Data de emissão inválida (AAAA-MM-DD)'),
  dataVencimento: z
    .string()
    .regex(DATA_ISO_REGEX, 'Data de vencimento inválida (AAAA-MM-DD)')
    .optional(),
  valorTotal: z.number().nonnegative().optional(),
});

export type FaturamentoPedido = z.infer<typeof FaturamentoPedidoSchema>;

/**
 * Schema principal da entidade Pedido de Venda / Expedição.
 */
export const PedidoSchema = z.object({
  id: z.string().min(1, 'ID do pedido é obrigatório'),
  numeroSequencial: z
    .number()
    .int('O número sequencial deve ser um inteiro')
    .positive('O número sequencial deve ser positivo'),
  clienteId: z.string().min(1, 'Cliente é obrigatório'),
  prazoEntrega: z
    .string()
    .regex(DATA_ISO_REGEX, 'Prazo de entrega deve estar no formato AAAA-MM-DD'),
  status: StatusPedidoFlexivelSchema.default('PENDENTE'),
  /** Opcional apenas para pedidos legados, criados antes do campo existir. */
  setorDestino: SetorDestinoSchema.optional(),
  itens: z
    .array(ItemPedidoSchema)
    .min(1, 'O pedido deve conter pelo menos um item'),
  valorTotal: z.number().nonnegative().optional(),
  faturamento: FaturamentoPedidoSchema.optional(),
  motivoCancelamento: z.string().trim().optional(),
  observacoes: z.string().trim().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type Pedido = z.infer<typeof PedidoSchema>;

/**
 * Schema para criação de um novo pedido de venda.
 */
export const CreatePedidoSchema = z.object({
  id: z.string().optional(),
  numeroSequencial: z
    .number()
    .int()
    .positive()
    .optional(),
  clienteId: z.string().min(1, 'Selecione um cliente para o pedido'),
  prazoEntrega: z
    .string()
    .regex(DATA_ISO_REGEX, 'Informe uma data de entrega válida (AAAA-MM-DD)'),
  status: StatusPedidoFlexivelSchema.optional().default('PENDENTE'),
  setorDestino: SetorDestinoSchema.optional().default(SETOR_DESTINO_PADRAO),
  itens: z
    .array(ItemPedidoSchema)
    .min(1, 'Adicione pelo menos um item ao pedido'),
  valorTotal: z.number().nonnegative().optional(),
  faturamento: FaturamentoPedidoSchema.optional(),
  observacoes: z
    .string()
    .trim()
    .optional(),
});

export type CreatePedidoInput = z.input<typeof CreatePedidoSchema>;

/**
 * Schema para atualização de pedido existente.
 */
export const UpdatePedidoSchema = CreatePedidoSchema.partial().extend({
  id: z.string().min(1, 'ID do pedido é obrigatório para atualização'),
});

export type UpdatePedidoInput = z.infer<typeof UpdatePedidoSchema>;

/**
 * Schema para filtros de listagem e consulta de pedidos.
 */
export const PedidoFiltrosSchema = z.object({
  clienteId: z.string().optional(),
  status: z.union([StatusPedidoSchema, z.literal('TODOS')]).optional().default('TODOS'),
  apenasAtrasados: z.boolean().optional().default(false),
  busca: z.string().trim().optional(),
});

export type PedidoFiltros = z.infer<typeof PedidoFiltrosSchema>;

/* =========================================================================
   Funções puras de regras de negócio para Pedidos
   ========================================================================= */

/**
 * Retorna a data de hoje no formato ISO YYYY-MM-DD baseado no fuso horário local.
 */
export function obterDataAtualISO(): string {
  const d = new Date();
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 10);
}

/**
 * Verifica se um pedido está em atraso com relação à data de referência.
 * Pedidos com status 'ENTREGUE' ou 'CANCELADO' nunca são considerados atrasados.
 */
export function isPedidoAtrasado(
  pedido: Pick<Pedido, 'status' | 'prazoEntrega'>,
  dataReferencia: string = obterDataAtualISO()
): boolean {
  if (pedido.status === 'ENTREGUE' || pedido.status === 'CANCELADO') {
    return false;
  }
  return pedido.prazoEntrega < dataReferencia;
}

export interface ItemSemSaldoInfo {
  itemId: string;
  quantidadeDesejada: number;
  quantidadeDisponivel: number;
  deficit: number;
}

/**
 * Retorna os itens do pedido cujo saldo físico disponível em estoque
 * não é suficiente para atender a quantidade demandada.
 */
export function obterItensSemSaldo(
  pedido: { itens: Array<Pick<ItemPedido, 'itemId' | 'quantidade'>> },
  mapaEstoqueAtual: Map<string, number> | Record<string, number>
): ItemSemSaldoInfo[] {
  const itensFaltantes: ItemSemSaldoInfo[] = [];

  for (const item of pedido.itens) {
    const estoqueDisponivel =
      mapaEstoqueAtual instanceof Map
        ? mapaEstoqueAtual.get(item.itemId) ?? 0
        : mapaEstoqueAtual[item.itemId] ?? 0;

    if (item.quantidade > estoqueDisponivel) {
      itensFaltantes.push({
        itemId: item.itemId,
        quantidadeDesejada: item.quantidade,
        quantidadeDisponivel: estoqueDisponivel,
        deficit: item.quantidade - estoqueDisponivel,
      });
    }
  }

  return itensFaltantes;
}

/**
 * Verifica se um pedido pendente possui itens com falta de estoque.
 */
export function hasPedidoFaltaEstoque(
  pedido: { status: StatusPedido; itens: Array<Pick<ItemPedido, 'itemId' | 'quantidade'>> },
  mapaEstoqueAtual: Map<string, number> | Record<string, number>
): boolean {
  if (pedido.status !== 'PENDENTE') {
    return false;
  }
  return obterItensSemSaldo(pedido, mapaEstoqueAtual).length > 0;
}

/**
 * Retorna o próximo status válido do fluxo operacional do pedido:
 * PENDENTE -> SEPARADO -> ENTREGUE
 */
export function obterProximoStatus(statusAtual: StatusPedido): StatusPedido | null {
  switch (statusAtual) {
    case 'PENDENTE':
      return 'SEPARADO';
    case 'SEPARADO':
      return 'ENTREGUE';
    default:
      return null;
  }
}

/**
 * Calcula o valor total financeiro do pedido somando (quantidade * precoUnitario) de cada item.
 */
export function calcularTotalPedido(
  itens: Array<{ quantidade: number; precoUnitario?: number }>
): number {
  return itens.reduce(
    (total, item) => total + item.quantidade * (item.precoUnitario || 0),
    0
  );
}

/**
 * Informa se o pedido já foi faturado (possui registro de NF-e).
 */
export function isPedidoFaturado(
  pedido: { faturamento?: unknown }
): boolean {
  return Boolean(pedido.faturamento);
}

/**
 * Informa se o pedido é elegível para faturamento (separado ou entregue e ainda não faturado).
 */
/**
 * Janela padrão (em dias, pelo prazo de entrega) para listar pedidos já encerrados
 * (entregues/cancelados). Pedidos em aberto são sempre listados.
 */
export const JANELA_PEDIDOS_ENCERRADOS_DIAS = 90;

export function isPedidoElegivelFaturamento(
  pedido: { status: StatusPedido; faturamento?: unknown }
): boolean {
  return (
    (pedido.status === 'SEPARADO' || pedido.status === 'ENTREGUE') &&
    !pedido.faturamento
  );
}

