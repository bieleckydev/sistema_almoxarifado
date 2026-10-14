'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/core/api/client';
import type { Cliente, ClienteFiltros, CreateClienteInput } from '@/core/domain/cliente.schema';

export interface UseClientesResult {
  clientes: Cliente[];
  total: number;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useClientes(filtros?: Partial<ClienteFiltros>): UseClientesResult {
  const queryParams = new URLSearchParams();
  if (filtros?.busca) queryParams.set('busca', filtros.busca);
  if (filtros?.tipo && filtros.tipo !== 'TODOS') queryParams.set('tipo', filtros.tipo);
  if (filtros?.apenasAtivos !== undefined) {
    queryParams.set('apenasAtivos', String(filtros.apenasAtivos));
  }

  const queryString = queryParams.toString();
  const endpoint = queryString ? `/clientes?${queryString}` : '/clientes';

  const { data, isLoading, isFetching, error, refetch } = useQuery<{
    dados: Cliente[];
    total: number;
  }>({
    queryKey: ['clientes-lista', filtros],
    queryFn: async () => {
      const res = await api.get<{ dados: Cliente[]; total: number }>(endpoint);
      return res.data;
    },
    staleTime: 60 * 1000,
  });

  return {
    clientes: data?.dados ?? [],
    total: data?.total ?? 0,
    isLoading,
    isFetching,
    error: error as Error | null,
    refetch,
  };
}

export function useCriarCliente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (novoCliente: CreateClienteInput) => {
      const res = await api.post('/clientes', novoCliente);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes-lista'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-resumo-geral'] });
      queryClient.invalidateQueries({ queryKey: ['global-search-index'] });
    },
  });
}
