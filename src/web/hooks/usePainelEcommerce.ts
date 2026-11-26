'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useItensEstoque } from './useItensEstoque';
import { buscarMovimentacoesGiro } from './buscarMovimentacoesGiro';
import { calcularIntervaloIsoPeriodo, usePeriodoStore, type PeriodoFiltro } from './usePeriodoGlobal';
import {
  calcularJanelaDoHistorico,
  montarLinhasPainelEcommerce,
  type LinhaPainelEcommerce,
} from '../components/gestao/ecommerce/painel-ecommerce';

export interface UsePainelEcommerceResult {
  periodo: PeriodoFiltro;
  textoIntervalo: string;
  setPeriodo: (periodo: PeriodoFiltro) => void;
  /** Duração em dias usada para normalizar a demanda. */
  janelaDias: number;
  linhas: LinhaPainelEcommerce[];
  totalMovimentacoes: number;
  truncado: boolean;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  refetch: () => void;
}

/**
 * Dados do Painel E-commerce: peças de motos cruzadas com as saídas (vendas e
 * consumo) do período de análise global, sincronizado com o restante do sistema.
 */
export function usePainelEcommerce(): UsePainelEcommerceResult {
  const periodo = usePeriodoStore((s) => s.periodo);
  const textoIntervalo = usePeriodoStore((s) => s.textoIntervalo);
  const setPeriodo = usePeriodoStore((s) => s.setPeriodo);

  const { todosItens, isLoadingTodos, refetch: refetchItens } = useItensEstoque();

  // Os limites mudam só na virada do dia, então a chave fica estável dentro do dia.
  const intervalo = calcularIntervaloIsoPeriodo(periodo);

  const query = useQuery({
    queryKey: ['painel-ecommerce-movimentacoes', periodo, intervalo.dataInicio, intervalo.dataFim],
    queryFn: () =>
      buscarMovimentacoesGiro({ dataInicio: intervalo.dataInicio, dataFim: intervalo.dataFim }),
    // Sem placeholderData: saídas de outro período distorceriam cobertura e recomendação.
    staleTime: 2 * 60 * 1000,
  });

  const movimentacoes = query.data?.movimentacoes;
  const janelaDias = intervalo.janelaDias ?? calcularJanelaDoHistorico(movimentacoes || []);

  const linhas = useMemo(
    () => montarLinhasPainelEcommerce(todosItens, movimentacoes || [], janelaDias),
    [todosItens, movimentacoes, janelaDias]
  );

  return {
    periodo,
    textoIntervalo,
    setPeriodo,
    janelaDias,
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
