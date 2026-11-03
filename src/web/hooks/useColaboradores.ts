'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/core/api/client';
import type {
  Colaborador,
  ColaboradorFiltros,
  CreateColaboradorInput,
} from '@/core/domain/colaborador.schema';

export interface UseColaboradoresResult {
  colaboradores: Colaborador[];
  total: number;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useColaboradores(filtros?: Partial<ColaboradorFiltros>): UseColaboradoresResult {
  const queryParams = new URLSearchParams();
  if (filtros?.busca) queryParams.set('busca', filtros.busca);
  if (filtros?.setor) queryParams.set('setor', filtros.setor);
  if (filtros?.apenasAtivos !== undefined) {
    queryParams.set('apenasAtivos', String(filtros.apenasAtivos));
  }
  if (filtros?.apenasInativos) {
    queryParams.set('apenasInativos', 'true');
  }
  if (filtros?.limite !== undefined) {
    queryParams.set('limite', String(filtros.limite));
  }
  if (filtros?.pagina !== undefined) {
    queryParams.set('pagina', String(filtros.pagina));
  }

  const queryString = queryParams.toString();
  const endpoint = queryString ? `/colaboradores?${queryString}` : '/colaboradores';

  const { data, isLoading, isFetching, error, refetch } = useQuery<{
    colaboradores: Colaborador[];
    total: number;
  }>({
    queryKey: ['colaboradores-lista', filtros],
    queryFn: async () => {
      const res = await api.get<{ colaboradores: Colaborador[]; total: number }>(endpoint);
      return res.data;
    },
    staleTime: 60 * 1000,
  });

  return {
    colaboradores: data?.colaboradores ?? [],
    total: data?.total ?? 0,
    isLoading,
    isFetching,
    error: error as Error | null,
    refetch,
  };
}

export type AtualizarColaboradorInput = Partial<Omit<CreateColaboradorInput, 'id'>>;

/**
 * Atualiza dados de um colaborador. Também inativa (`{ ativo: false }`) ou reativa (`{ ativo: true }`).
 */
export function useAtualizarColaborador() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dados }: { id: string; dados: AtualizarColaboradorInput }) => {
      const res = await api.patch<Colaborador>(`/colaboradores/${id}`, dados);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaboradores-lista'] });
    },
  });
}

export function useCriarColaborador() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (novoColaborador: CreateColaboradorInput) => {
      const res = await api.post('/colaboradores', novoColaborador);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaboradores-lista'] });
    },
  });
}
