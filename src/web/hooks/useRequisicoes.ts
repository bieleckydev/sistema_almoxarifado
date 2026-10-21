'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/core/api/client';
import type {
  Requisicao,
  CriarRequisicaoInput,
  StatusRequisicao,
} from '@/core/domain/requisicao.schema';

export function useRequisicoes(filtros?: { status?: string }) {
  const queryParams = new URLSearchParams();
  if (filtros?.status && filtros.status !== 'TODOS') queryParams.set('status', filtros.status);

  const endpoint = queryParams.toString()
    ? `/requisicoes?${queryParams.toString()}`
    : '/requisicoes';

  return useQuery<{
    dados: Requisicao[];
    total: number;
    pendentes: number;
  }>({
    queryKey: ['requisicoes-lista', filtros],
    queryFn: async () => {
      const res = await api.get<{
        dados: Requisicao[];
        total: number;
        pendentes: number;
      }>(endpoint);
      return res.data;
    },
    staleTime: 30 * 1000,
  });
}

export function useCriarRequisicao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dados: CriarRequisicaoInput) => {
      const res = await api.post('/requisicoes', dados);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requisicoes-lista'] });
    },
  });
}

export function useAtualizarStatusRequisicao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      motivoRejeicao,
    }: {
      id: string;
      status: StatusRequisicao;
      motivoRejeicao?: string;
    }) => {
      const res = await api.patch(`/requisicoes/${id}`, { status, motivoRejeicao });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requisicoes-lista'] });
      queryClient.invalidateQueries({ queryKey: ['itens-estoque'] });
      queryClient.invalidateQueries({ queryKey: ['movimentacoes-lista'] });
    },
  });
}
