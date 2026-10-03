import { z } from 'zod';
import { StatusConferenciaNFeSchema, UnidadeMedidaSchema } from './types';

/**
 * Status individual da conciliação de cada item da NFe contra o Pedido de Compra.
 */
export const StatusItemConciliacaoSchema = z.enum([
  'PENDENTE',
  'CONCILIADO',
  'DIVERGENCIA_QUANTIDADE',
  'DIVERGENCIA_VALOR',
  'NAO_CONSTA_NO_PEDIDO',
]);
export type StatusItemConciliacao = z.infer<typeof StatusItemConciliacaoSchema>;

export const STATUS_ITEM_CONCILIACAO_LABELS: Record<StatusItemConciliacao, string> = {
  PENDENTE: 'Pendente de Conferência',
  CONCILIADO: 'Conciliado com Sucesso',
  DIVERGENCIA_QUANTIDADE: 'Divergência de Quantidade',
  DIVERGENCIA_VALOR: 'Divergência de Valor/Preço',
  NAO_CONSTA_NO_PEDIDO: 'Item Não Consta no Pedido',
};

/**
 * Item constante na Nota Fiscal Eletrônica (NFe).
 */
export const ItemNotaFiscalSchema = z.object({
  id: z.string().min(1),
  numeroItem: z.number().int().min(1),
  codigoFornecedor: z.string().trim().min(1, 'Código do fornecedor é obrigatório'),
  codigoInternoRhowert: z.string().trim().optional(),
  descricao: z.string().trim().min(2, 'Descrição do produto é obrigatória'),
  ncm: z.string().trim().optional(),
  cfop: z.string().trim().optional(),
  unidadeComercial: z.string().trim().min(1),
  quantidadeFaturada: z
    .number()
    .positive('A quantidade faturada deve ser maior que zero'),
  valorUnitario: z
    .number()
    .min(0, 'O valor unitário não pode ser negativo'),
  valorTotal: z
    .number()
    .min(0, 'O valor total não pode ser negativo'),
  quantidadeRecebidaFisica: z
    .number()
    .min(0)
    .optional(),
  statusConciliacao: StatusItemConciliacaoSchema.default('PENDENTE'),
  pedidoCompraItemId: z.string().optional(),
});

export type ItemNotaFiscal = z.infer<typeof ItemNotaFiscalSchema>;

/**
 * Nota Fiscal Eletrônica (NFe) recebida no almoxarifado.
 */
export const NotaFiscalSchema = z.object({
  id: z.string().min(1),
  chaveAcesso: z
    .string()
    .trim()
    .regex(/^\d{44}$/, 'A chave de acesso da NFe deve conter exatamente 44 dígitos numéricos'),
  numero: z.string().trim().min(1, 'Número da nota fiscal é obrigatório'),
  serie: z.string().trim().default('1'),
  cnpjFornecedor: z.string().trim().min(11, 'CNPJ do fornecedor inválido'),
  razaoSocialFornecedor: z.string().trim().min(2, 'Razão social do fornecedor é obrigatória'),
  nomeFantasiaFornecedor: z.string().trim().optional(),
  dataEmissao: z.string().datetime(),
  dataRecebimento: z.string().datetime(),
  valorTotalNota: z.number().min(0),
  status: StatusConferenciaNFeSchema.default('RECEBIDA'),
  numeroPedidoCompra: z.string().trim().optional(),
  itens: z.array(ItemNotaFiscalSchema).min(1, 'A NFe deve conter pelo menos um item faturado'),
  observacoes: z.string().trim().optional(),
  caminhoArquivoNFe: z.string().trim().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type NotaFiscal = z.infer<typeof NotaFiscalSchema>;

/**
 * Item contratado no Pedido de Compra da fábrica (emitido pela contabilidade/compras).
 */
export const ItemPedidoCompraSchema = z.object({
  id: z.string().min(1),
  numeroItem: z.number().int().min(1),
  itemId: z.string().optional(),
  codigoInternoRhowert: z.string().trim().min(1, 'Código Rhowert é obrigatório'),
  descricao: z.string().trim().min(2),
  unidade: UnidadeMedidaSchema,
  quantidadeAutorizada: z
    .number()
    .positive('A quantidade autorizada deve ser maior que zero'),
  quantidadeJaEntregue: z
    .number()
    .min(0)
    .default(0),
  valorUnitarioContratado: z
    .number()
    .min(0, 'O valor contratado não pode ser negativo'),
  valorTotalContratado: z
    .number()
    .min(0),
  toleranciaPercentual: z
    .number()
    .min(0)
    .max(50)
    .default(5), // Tolerância padrão de 5% (especialmente tubos e aços pesados em KG)
});

export type ItemPedidoCompra = z.infer<typeof ItemPedidoCompraSchema>;

/**
 * Status do Pedido de Compra da empresa.
 */
export const StatusPedidoCompraSchema = z.enum([
  'PENDENTE',
  'PARCIALMENTE_ATENDIDO',
  'CONCLUIDO',
  'CANCELADO',
]);
export type StatusPedidoCompra = z.infer<typeof StatusPedidoCompraSchema>;

/**
 * Pedido de Compra formalizado pela contabilidade / compras.
 */
export const PedidoCompraSchema = z.object({
  id: z.string().min(1),
  numeroPedido: z.string().trim().min(1, 'Número do pedido de compra é obrigatório'),
  cnpjFornecedor: z.string().trim().min(11, 'CNPJ do fornecedor é obrigatório'),
  razaoSocialFornecedor: z.string().trim().min(2),
  dataAutorizacao: z.string().datetime(),
  previsaoEntrega: z.string().datetime().optional(),
  statusPedido: StatusPedidoCompraSchema.default('PENDENTE'),
  itens: z.array(ItemPedidoCompraSchema).min(1, 'O pedido de compra deve conter ao menos um item'),
  valorTotalPedido: z.number().min(0),
  compradorNome: z.string().trim().optional(),
  observacoes: z.string().trim().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type PedidoCompra = z.infer<typeof PedidoCompraSchema>;

/**
 * Input para cadastro ou importação de Nota Fiscal.
 */
export const CreateNotaFiscalSchema = NotaFiscalSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  id: z.string().optional(),
});

export type CreateNotaFiscalInput = z.input<typeof CreateNotaFiscalSchema>;

/**
 * Input para cadastro de Pedido de Compra.
 */
export const CreatePedidoCompraSchema = PedidoCompraSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  id: z.string().optional(),
});

export type CreatePedidoCompraInput = z.input<typeof CreatePedidoCompraSchema>;
