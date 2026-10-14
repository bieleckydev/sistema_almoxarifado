'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/core/api/client';
import type { PedidoFiltros, StatusPedido, CreatePedidoInput } from '@/core/domain/pedido.schema';
import type { PedidoEnriquecido } from '../app/api/pedidos/route';

export interface UsePedidosResult {
  pedidos: PedidoEnriquecido[];
  total: number;
  pedidosAEntregar: number;
  pedidosAtrasados: number;
  pedidosSemEstoque: number;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  refetch: () => void;
}

export function usePedidos(filtros?: Partial<PedidoFiltros>): UsePedidosResult {
  const queryParams = new URLSearchParams();
  if (filtros?.busca) queryParams.set('busca', filtros.busca);
  if (filtros?.status && filtros.status !== 'TODOS') queryParams.set('status', filtros.status);
  if (filtros?.clienteId) queryParams.set('clienteId', filtros.clienteId);
  if (filtros?.apenasAtrasados) queryParams.set('apenasAtrasados', 'true');

  const queryString = queryParams.toString();
  const endpoint = queryString ? `/pedidos?${queryString}` : '/pedidos';

  const { data, isLoading, isFetching, error, refetch } = useQuery<{
    dados: PedidoEnriquecido[];
    total: number;
  }>({
    queryKey: ['pedidos-lista', filtros],
    queryFn: async () => {
      const res = await api.get<{ dados: PedidoEnriquecido[]; total: number }>(endpoint);
      return res.data;
    },
    staleTime: 30 * 1000,
  });

  const pedidos = data?.dados ?? [];
  const total = data?.total ?? 0;

  // Métricas calculadas para os KPIs de topo
  const abertos = pedidos.filter((p) => p.status !== 'ENTREGUE' && p.status !== 'CANCELADO');
  const pedidosAEntregar = abertos.length;
  const pedidosAtrasados = abertos.filter((p) => p.atrasado).length;
  const pedidosSemEstoque = abertos.filter((p) => p.faltaEstoque).length;

  return {
    pedidos,
    total,
    pedidosAEntregar,
    pedidosAtrasados,
    pedidosSemEstoque,
    isLoading,
    isFetching,
    error: error as Error | null,
    refetch,
  };
}

export function useCriarPedido() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (novoPedido: CreatePedidoInput) => {
      const res = await api.post('/pedidos', novoPedido);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos-lista'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-resumo-geral'] });
      queryClient.invalidateQueries({ queryKey: ['global-search-index'] });
    },
  });
}

export function useAtualizarStatusPedido() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: StatusPedido }) => {
      const res = await api.patch(`/pedidos/${id}`, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos-lista'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-resumo-geral'] });
      queryClient.invalidateQueries({ queryKey: ['itens-estoque'] });
      queryClient.invalidateQueries({ queryKey: ['extrato-item'] });
      queryClient.invalidateQueries({ queryKey: ['global-search-index'] });
    },
  });
}
