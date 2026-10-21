import { z } from 'zod';
import {
  TipoItemSchema,
  UnidadeMedidaSchema,
  StatusEstoqueSchema,
} from './types';

/**
 * Regex para validação de códigos padronizados do almoxarifado:
 * - 10-XXX: Matéria-prima produtiva (tubos de aço, perfis NBR/SAE)
 * - 20-XXX: Matéria-prima metálica (chapas e barras de aço/alumínio)
 * - 90-XXXX: Materiais improdutivos e consumíveis (flap, solda, brocas, EPIs)
 * - 100-XXXX: Peças acabadas e prontas para entrega
 * - 200-XXXX: Suportes e subconjuntos mecânicos
 * - 500-XXXX: Componentes e fixadores (eixos, buchas, pinos, parafusos)
 * - 900-XXXX: Materiais de embalagem e expedição
 * Também aceita códigos corporativos alfanuméricos com os prefixos permitidos e ponto/hífen.
 */
export const ITEM_CODIGO_REGEX = /^(10|20|90|100|200|500|900)-[A-Za-z0-9\-\.]+$/;

/**
 * Detalhes de embalagem e fator multiplicador para conversão de compra vs consumo.
 * Exemplo: Comprado em PACOTE com 10 UNIDADES. Fator de conversão = 10.
 */
export const EmbalagemDetalheSchema = z.object({
  possuiEmbalagem: z.boolean().default(false),
  unidadeCompra: UnidadeMedidaSchema.optional(),
  unidadeConsumo: UnidadeMedidaSchema.optional(),
  fatorConversao: z
    .number()
    .positive('O fator de conversão de embalagem deve ser maior que zero')
    .default(1),
  descricaoEmbalagem: z
    .string()
    .trim()
    .optional(),
});

export type EmbalagemDetalhe = z.infer<typeof EmbalagemDetalheSchema>;

/**
 * Schema principal da entidade Item do Almoxarifado.
 */
export const ItemSchema = z.object({
  id: z.string().min(1, 'ID do item é obrigatório'),
  codigo: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      ITEM_CODIGO_REGEX,
      'Código de item inválido. Deve seguir o padrão com prefixo fabril cadastrado'
    ),
  descricao: z
    .string()
    .trim()
    .min(3, 'A descrição deve conter no mínimo 3 caracteres'),
  tipo: TipoItemSchema,
  unidade: UnidadeMedidaSchema,
  estoqueSeguranca: z
    .number()
    .min(0, 'O estoque de segurança não pode ser negativo')
    .default(0),
  estoqueAtual: z
    .number()
    .min(0, 'O estoque atual não pode ser negativo')
    .default(0),
  custoUnitario: z
    .number()
    .min(0, 'O custo unitário não pode ser negativo')
    .optional(),
  capacidadeMaxima: z
    .number()
    .min(0.001, 'A capacidade máxima deve ser maior que zero')
    .optional(),
  loteBase: z
    .string()
    .trim()
    .optional(),
  especificacoes: z
    .record(z.string(), z.string())
    .optional(),
  categoria: z.string().trim().optional(),
  embalagem: EmbalagemDetalheSchema.default({
    possuiEmbalagem: false,
    fatorConversao: 1,
  }),
  localizacaoFisica: z.string().trim().optional(),
  clienteDestino: z.string().trim().optional(),
  ativo: z.boolean().default(true),
  observacoes: z.string().trim().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type Item = z.infer<typeof ItemSchema>;

/**
 * Schema para criação de um novo item.
 */
export const CreateItemSchema = ItemSchema.omit({
  id: true,
  estoqueAtual: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  id: z.string().optional(),
  estoqueInicial: z
    .number()
    .min(0, 'O estoque inicial não pode ser negativo')
    .default(0),
});

export type CreateItemInput = z.infer<typeof CreateItemSchema>;

/**
 * Schema para atualização parcial de item.
 */
export const UpdateItemSchema = CreateItemSchema.partial();

export type UpdateItemInput = z.infer<typeof UpdateItemSchema>;

/**
 * Schema de filtros para consulta e listagem de itens no catálogo.
 */
export const ItemFiltrosSchema = z.object({
  busca: z.string().trim().optional(),
  tipo: TipoItemSchema.optional(),
  statusEstoque: StatusEstoqueSchema.optional(),
  apenasAtivos: z.boolean().default(true),
  clienteDestino: z.string().trim().optional(),
  pagina: z.number().int().min(1).default(1),
  limite: z.number().int().min(1).max(1000).default(20),
});

export type ItemFiltros = z.input<typeof ItemFiltrosSchema>;

/**
 * Utilitário de conversão de embalagens em unidades base.
 * @param quantidadeEmbalagens Quantidade de pacotes/caixas compradas ou recebidas
 * @param fatorConversao Quantidade de unidades contidas em 1 embalagem
 * @returns Quantidade total convertida para a unidade de consumo/estoque
 */
export function converterEmbalagemParaUnidade(
  quantidadeEmbalagens: number,
  fatorConversao: number = 1
): number {
  if (quantidadeEmbalagens < 0) {
    throw new Error('A quantidade de embalagens não pode ser negativa');
  }
  if (fatorConversao <= 0) {
    throw new Error('O fator de conversão deve ser maior que zero');
  }
  return quantidadeEmbalagens * fatorConversao;
}

/**
 * Utilitário de conversão de unidades base em embalagens inteiras e sobra fracionada.
 * @param quantidadeUnidades Quantidade avulsa em estoque
 * @param fatorConversao Quantidade por embalagem
 * @returns Quantidade de embalagens fechadas e unidades residuais
 */
export function converterUnidadeParaEmbalagem(
  quantidadeUnidades: number,
  fatorConversao: number = 1
): { embalagensFechadas: number; sobraAvulsa: number } {
  if (quantidadeUnidades < 0) {
    throw new Error('A quantidade de unidades não pode ser negativa');
  }
  if (fatorConversao <= 0) {
    throw new Error('O fator de conversão deve ser maior que zero');
  }
  const embalagensFechadas = Math.floor(quantidadeUnidades / fatorConversao);
  const sobraAvulsa = quantidadeUnidades % fatorConversao;
  return { embalagensFechadas, sobraAvulsa };
}
