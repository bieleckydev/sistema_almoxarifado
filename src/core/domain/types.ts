import { z } from 'zod';

/**
 * Classificação principal do item no almoxarifado industrial.
 * - PRODUTIVO_MATERIA_PRIMA: Tubos de aço, chapas, perfis (prefixo 10-XXX, medidos em KG/Metros)
 * - IMPRODUTIVO_CONSUMIVEL: Flap, solda, brocas, EPIs, químicos (prefixo 90-XXXX)
 * - ACABADO: Peças usinadas/soldadas prontas para entrega a clientes (prefixo 100-XXXX)
 */
export const TipoItemSchema = z.enum([
  'PRODUTIVO_MATERIA_PRIMA',
  'IMPRODUTIVO_CONSUMIVEL',
  'ACABADO',
]);
export type TipoItem = z.infer<typeof TipoItemSchema>;

export const TIPO_ITEM_LABELS: Record<TipoItem, string> = {
  PRODUTIVO_MATERIA_PRIMA: 'Matéria-Prima Produtiva',
  IMPRODUTIVO_CONSUMIVEL: 'Material Improdutivo / Consumível',
  ACABADO: 'Produto Acabado',
};

/**
 * Unidades de medida suportadas para estoque e movimentações.
 */
export const UnidadeMedidaSchema = z.enum([
  'KG',
  'UNIDADE',
  'METRO',
  'PACOTE',
  'PECA',
  'LITRO',
]);
export type UnidadeMedida = z.infer<typeof UnidadeMedidaSchema>;

export const UNIDADE_MEDIDA_LABELS: Record<UnidadeMedida, string> = {
  KG: 'Quilograma (KG)',
  UNIDADE: 'Unidade (UN)',
  METRO: 'Metro (M)',
  PACOTE: 'Pacote (PCT)',
  PECA: 'Peça (PÇ)',
  LITRO: 'Litro (L)',
};

/**
 * Naturezas de movimentação de estoque.
 */
export const TipoMovimentacaoSchema = z.enum([
  'ENTRADA_COMPRA',
  'ENTRADA_PRODUCAO',
  'SAIDA_CONSUMO_INTERNO',
  'SAIDA_EXPEDICAO',
  'AJUSTE_INVENTARIO_POSITIVO',
  'AJUSTE_INVENTARIO_NEGATIVO',
]);
export type TipoMovimentacao = z.infer<typeof TipoMovimentacaoSchema>;

export const TIPO_MOVIMENTACAO_LABELS: Record<TipoMovimentacao, string> = {
  ENTRADA_COMPRA: 'Entrada por Compra (NFe)',
  ENTRADA_PRODUCAO: 'Entrada de Produção Interna',
  SAIDA_CONSUMO_INTERNO: 'Saída para Consumo Interno',
  SAIDA_EXPEDICAO: 'Saída para Expedição / Cliente',
  AJUSTE_INVENTARIO_POSITIVO: 'Ajuste de Inventário (+)',
  AJUSTE_INVENTARIO_NEGATIVO: 'Ajuste de Inventário (-)',
};

/**
 * Classificação de saúde e criticidade do estoque atual em relação ao estoque de segurança.
 */
export const StatusEstoqueSchema = z.enum([
  'NORMAL',
  'ESTOQUE_BAIXO',
  'CRITICO_ZERADO',
]);
export type StatusEstoque = z.infer<typeof StatusEstoqueSchema>;

export const STATUS_ESTOQUE_LABELS: Record<StatusEstoque, string> = {
  NORMAL: 'Estoque Normal',
  ESTOQUE_BAIXO: 'Estoque Baixo (Ponto de Pedido)',
  CRITICO_ZERADO: 'Crítico / Zerado',
};

/**
 * Status do processo de conferência física e fiscal da NFe contra Pedido de Compra.
 */
export const StatusConferenciaNFeSchema = z.enum([
  'RECEBIDA',
  'EM_CONFERENCIA',
  'DIVERGENTE',
  'APROVADA',
  'ARQUIVADA',
]);
export type StatusConferenciaNFe = z.infer<typeof StatusConferenciaNFeSchema>;

export const STATUS_CONFERENCIA_NFE_LABELS: Record<StatusConferenciaNFe, string> = {
  RECEBIDA: 'Recebida',
  EM_CONFERENCIA: 'Em Conferência',
  DIVERGENTE: 'Com Divergência',
  APROVADA: 'Aprovada',
  ARQUIVADA: 'Arquivada',
};

/**
 * Status da sessão de inventário e contagem física.
 */
export const StatusInventarioSchema = z.enum([
  'ABERTO',
  'EM_ANDAMENTO',
  'CONCLUIDO',
  'CANCELADO',
]);
export type StatusInventario = z.infer<typeof StatusInventarioSchema>;

export const STATUS_INVENTARIO_LABELS: Record<StatusInventario, string> = {
  ABERTO: 'Aberto',
  EM_ANDAMENTO: 'Em Andamento',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
};
