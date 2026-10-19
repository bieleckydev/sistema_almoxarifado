'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  TerceirosDashboardResponse,
  MaterialTerceiroEnriquecido,
} from '@/web/app/api/terceiros/route';
import type {
  ReceberMaterialTerceiroInput,
  ConsumirMaterialTerceiroInput,
  DevolverMaterialTerceiroInput,
  MovimentacaoTerceiro,
} from '@/core/domain/material-terceiro.schema';
import { useToast } from './useToast';

export interface UseMaterialTerceirosFiltros {
  clienteId?: string;
  busca?: string;
}

export function useMaterialTerceiros(filtros?: UseMaterialTerceirosFiltros) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const queryKey = ['terceiros', filtros?.clienteId, filtros?.busca];

  const query = useQuery<TerceirosDashboardResponse>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filtros?.clienteId && filtros.clienteId !== 'TODOS') {
        params.set('clienteId', filtros.clienteId);
      }
      if (filtros?.busca) {
        params.set('busca', filtros.busca);
      }

      const url = `/api/terceiros${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Erro ao carregar materiais de terceiros.');
      }
      return res.json();
    },
    staleTime: 1000 * 30, // 30s
  });

  // Mutação para receber remessa inicial de terceiro
  const receberMaterialMutation = useMutation({
    mutationFn: async (dados: ReceberMaterialTerceiroInput) => {
      const res = await fetch('/api/terceiros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Erro ao registrar remessa de terceiro.');
      }

      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['terceiros'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-resumo'] });
      toast(data.mensagem || 'Material de terceiro recebido com sucesso!', { type: 'success' });
    },
    onError: (err: Error) => {
      toast(err.message || 'Falha ao registrar recebimento de terceiro.', { type: 'error' });
    },
  });

  // Mutação para apontar consumo na produção
  const consumirMaterialMutation = useMutation({
    mutationFn: async (dados: ConsumirMaterialTerceiroInput) => {
      const res = await fetch('/api/terceiros/movimentacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...dados,
          tipo: 'CONSUMO_PRODUCAO',
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Erro ao registrar consumo na produção.');
      }

      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['terceiros'] });
      toast(data.mensagem || 'Consumo na produção registrado!', { type: 'success' });
    },
    onError: (err: Error) => {
      toast(err.message || 'Falha ao registrar consumo de material.', { type: 'error' });
    },
  });

  // Mutação para devolução ao cliente com emissão de NF-e
  const devolverMaterialMutation = useMutation({
    mutationFn: async (dados: DevolverMaterialTerceiroInput) => {
      const res = await fetch('/api/terceiros/movimentacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...dados,
          tipo: 'DEVOLUCAO_RETORNO',
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || 'Erro ao registrar devolução.');
      }

      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['terceiros'] });
      queryClient.invalidateQueries({ queryKey: ['faturamento'] });
      toast(data.mensagem || 'Devolução registrada e NF-e de retorno emitida!', { type: 'success' });
    },
    onError: (err: Error) => {
      toast(err.message || 'Falha ao registrar devolução ao cliente.', { type: 'error' });
    },
  });

  return {
    ...query,
    materiais: query.data?.materiais ?? [],
    movimentacoesRecentes: query.data?.movimentacoesRecentes ?? [],
    kpis: query.data?.kpis ?? {
      totalMateriais: 0,
      saldoTotalItens: 0,
      clientesAtivosCount: 0,
      movimentacoesMesCount: 0,
    },
    receberMaterial: receberMaterialMutation.mutateAsync,
    isRecebendo: receberMaterialMutation.isPending,
    consumirMaterial: consumirMaterialMutation.mutateAsync,
    isConsumindo: consumirMaterialMutation.isPending,
    devolverMaterial: devolverMaterialMutation.mutateAsync,
    isDevolvendo: devolverMaterialMutation.isPending,
  };
}
