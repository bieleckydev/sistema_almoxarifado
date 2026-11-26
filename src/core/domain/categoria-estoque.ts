import { z } from 'zod';
import type { TipoItem } from './types';

/**
 * As três categorias oficiais de estoque do almoxarifado:
 * - mp: Matéria-Prima (itens PRODUTIVO_MATERIA_PRIMA)
 * - imp: Materiais Improdutivos (itens IMPRODUTIVO_CONSUMIVEL)
 * - motos: Peças de Motos (itens ACABADO)
 */
export const CategoriaEstoqueSchema = z.enum(['mp', 'imp', 'motos']);

export type CategoriaEstoque = z.infer<typeof CategoriaEstoqueSchema>;

/** Ordem canônica de exibição das categorias. */
export const CATEGORIAS_ESTOQUE: readonly CategoriaEstoque[] = ['mp', 'imp', 'motos'];

export const CATEGORIA_ESTOQUE_LABELS: Record<CategoriaEstoque, string> = {
  mp: 'Matéria-Prima',
  imp: 'Materiais Improdutivos',
  motos: 'Peças de Motos',
};

/** Tipo de item do domínio correspondente a cada categoria. */
export const TIPO_ITEM_POR_CATEGORIA: Record<CategoriaEstoque, TipoItem> = {
  mp: 'PRODUTIVO_MATERIA_PRIMA',
  imp: 'IMPRODUTIVO_CONSUMIVEL',
  motos: 'ACABADO',
};

/**
 * Resolve a categoria de estoque a partir do tipo do item.
 * Tipos ausentes ou desconhecidos (dados legados) caem em Matéria-Prima.
 */
export function categoriaEstoqueDoTipo(tipo: unknown): CategoriaEstoque {
  if (tipo === 'IMPRODUTIVO_CONSUMIVEL') return 'imp';
  if (tipo === 'ACABADO') return 'motos';
  return 'mp';
}
