'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useItensEstoque } from './useItensEstoque';
import { buscarMovimentacoesGiro } from './buscarMovimentacoesGiro';
import { montarLinhasLevantamento, type LinhaLevantamento } from '../components/dashboard/levantamento/levantamento';

function inicioDaJanelaIso(janelaDias: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (janelaDias - 1));
  return d.toISOString();
}

export interface UseLevantamentoEstoqueResult {
  linhas: LinhaLevantamento[];
  totalMovimentacoes: number;
  truncado: boolean;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  refetch: () => void;
}

/**
 * Dados da visão de Levantamento / Queima de Estoque: todos os itens das três
 * categorias cruzados com as saídas (vendas e consumo) da janela escolhida.
 */
export function useLevantamentoEstoque(janelaDias: number): UseLevantamentoEstoqueResult {
  const { todosItens, isLoadingTodos, refetch: refetchItens } = useItensEstoque();

  const query = useQuery({
    queryKey: ['levantamento-movimentacoes', janelaDias],
    queryFn: () => buscarMovimentacoesGiro({ dataInicio: inicioDaJanelaIso(janelaDias) }),
    // Sem placeholderData: reaproveitar saídas de outra janela distorceria cobertura e giro.
    staleTime: 2 * 60 * 1000,
  });

  const movimentacoes = query.data?.movimentacoes;
  const linhas = useMemo(
    () => montarLinhasLevantamento(todosItens, movimentacoes || [], janelaDias),
    [todosItens, movimentacoes, janelaDias]
  );

  return {
    linhas,
    totalMovimentacoes: query.data?.total ?? 0,
    truncado: query.data?.truncado ?? false,
    isLoading: isLoadingTodos || query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    refetch: () => {
      refetchItens();
      query.refetch();
    },
  };
}
