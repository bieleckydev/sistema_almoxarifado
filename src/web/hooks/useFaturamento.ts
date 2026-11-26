'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/core/api/client';
import type {
  FaturamentoDashboardResponse,
  PedidoAFaturarItem,
  NotaFiscalEmitidaEnriquecida,
} from '../app/api/faturamento/route';
import {
  PERIODO_FATURAMENTO_PADRAO,
  type FaturarPedidoInput,
  type PeriodoFaturamento,
} from '@/core/domain/nota-fiscal-emitida.schema';

export interface UseFaturamentoResult {
  pedidosAFaturar: PedidoAFaturarItem[];
  notasEmitidas: NotaFiscalEmitidaEnriquecida[];
  kpis: {
    totalPedidosAFaturar: number;
    valorPedidosAFaturar: number;
    totalNotasEmitidas: number;
    valorTotalFaturado: number;
  };
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  refetch: () => void;
  faturarPedido: (dados: FaturarPedidoInput) => Promise<{
    mensagem: string;
    notaFiscal: unknown;
    faturamento: unknown;
  }>;
  isFaturando: boolean;
}

/**
 * @param periodo Janela das notas emitidas e do total faturado. Os pedidos a faturar
 * não dependem do período.
 */
export function useFaturamento(
  periodo: PeriodoFaturamento = PERIODO_FATURAMENTO_PADRAO
): UseFaturamentoResult {
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching, error, refetch } = useQuery<FaturamentoDashboardResponse>({
    // O prefixo 'faturamento-dashboard' mantém as invalidações existentes valendo para todos os períodos.
    queryKey: ['faturamento-dashboard', periodo],
    queryFn: async () => {
      const res = await api.get<FaturamentoDashboardResponse>('/faturamento', {
        params: { periodo },
      });
      return res.data;
    },
    staleTime: 30 * 1000,
  });

  const mutationFaturar = useMutation({
    mutationFn: async (dados: FaturarPedidoInput) => {
      const res = await api.post<{
        mensagem: string;
        notaFiscal: unknown;
        faturamento: unknown;
      }>('/faturamento', dados);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faturamento-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos-lista'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-resumo-geral'] });
      queryClient.invalidateQueries({ queryKey: ['global-search-index'] });
    },
  });

  const pedidosAFaturar = data?.pedidosAFaturar || [];
  const notasEmitidas = data?.notasEmitidas || [];
  const kpis = data?.kpis || {
    totalPedidosAFaturar: 0,
    valorPedidosAFaturar: 0,
    totalNotasEmitidas: 0,
    valorTotalFaturado: 0,
  };

  return {
    pedidosAFaturar,
    notasEmitidas,
    kpis,
    isLoading,
    isFetching,
    error: error as Error | null,
    refetch,
    faturarPedido: mutationFaturar.mutateAsync,
    isFaturando: mutationFaturar.isPending,
  };
}
