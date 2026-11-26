'use client';

import { useMemo } from 'react';
import {
  buscarItensParaPedido,
  type FiltroCategoriaPedido,
  type ItemBuscavelPedido,
  type ResultadoBuscaItensPedido,
} from '@/core/services/busca-itens-pedido';
import type { DashboardItem } from '../data/mock-almoxarifado';
import { useDebounce } from './useDebounce';
import { useItensEstoque } from './useItensEstoque';

/** Item do catálogo pronto para ser adicionado a um pedido de venda. */
export interface ItemCatalogoPedido extends ItemBuscavelPedido {
  estoqueSeguranca: number;
}

export interface UseBuscaItensPedidoOptions {
  termo: string;
  categoria: FiltroCategoriaPedido;
  incluirSemSaldo?: boolean;
  limite?: number;
  enabled?: boolean;
}

export interface UseBuscaItensPedidoResult extends ResultadoBuscaItensPedido<ItemCatalogoPedido> {
  /** Acesso direto por ID (inclui itens fora do filtro atual). */
  itensPorId: Map<string, ItemCatalogoPedido>;
  /** true enquanto o termo digitado ainda não foi aplicado (debounce). */
  isDigitando: boolean;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

function paraItemCatalogo(item: DashboardItem): ItemCatalogoPedido {
  return {
    id: item.id,
    codigo: item.codigo,
    descricao: item.descricao,
    categoria: item.aba,
    estoqueAtual: Number(item.estoqueAtual) || 0,
    estoqueSeguranca: Number(item.estoqueSeguranca) || 0,
    unidade: item.unidade,
    localizacaoFisica: item.localizacaoFisica,
    ativo: item.ativo,
  };
}

/**
 * Busca preditiva de materiais para pedidos de venda nas três categorias de estoque.
 * Reaproveita o cache de `useItensEstoque` (['itens-estoque', aba]); nenhuma leitura
 * extra ao banco é feita ao abrir o pedido.
 */
export function useBuscaItensPedido({
  termo,
  categoria,
  incluirSemSaldo = false,
  limite,
  enabled = true,
}: UseBuscaItensPedidoOptions): UseBuscaItensPedidoResult {
  const { todosItens, isLoadingTodos, isError, refetch } = useItensEstoque({ enabled });
  const termoAplicado = useDebounce(termo, 150);

  const catalogo = useMemo(() => todosItens.map(paraItemCatalogo), [todosItens]);
  const itensPorId = useMemo(() => new Map(catalogo.map((i) => [i.id, i])), [catalogo]);

  const resultado = useMemo(
    () =>
      buscarItensParaPedido(catalogo, {
        termo: termoAplicado,
        categoria,
        incluirSemSaldo,
        limite,
      }),
    [catalogo, termoAplicado, categoria, incluirSemSaldo, limite]
  );

  return {
    ...resultado,
    itensPorId,
    isDigitando: termo !== termoAplicado,
    isLoading: isLoadingTodos,
    isError,
    refetch,
  };
}
