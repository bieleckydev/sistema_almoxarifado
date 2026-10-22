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
import { api } from '@/core/api/client';

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

      // Cliente `api` envia o token de autenticação exigido pelas rotas.
      const url = `/terceiros${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await api.get<TerceirosDashboardResponse>(url);
      return res.data;
    },
    staleTime: 1000 * 30, // 30s
  });

  // Mutação para receber remessa inicial de terceiro
  const receberMaterialMutation = useMutation({
    mutationFn: async (dados: ReceberMaterialTerceiroInput) => {
      const res = await api.post('/terceiros', dados);
      return res.data;
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
      const res = await api.post('/terceiros/movimentacoes', {
          ...dados,
          tipo: 'CONSUMO_PRODUCAO',
        });
      return res.data;
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
      const res = await api.post('/terceiros/movimentacoes', {
          ...dados,
          tipo: 'DEVOLUCAO_RETORNO',
        });
      return res.data;
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

  // Mutação para registrar sucata ou perda de material de terceiro
  const registrarSucataMutation = useMutation({
    mutationFn: async (dados: {
      materialTerceiroId: string;
      quantidade: number;
      dataMovimentacao?: string;
      motivo: string;
      responsavel?: string;
      observacao?: string;
    }) => {
      const res = await api.post('/terceiros/movimentacoes', {
          ...dados,
          tipo: 'SUCATA_PERDA',
        });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['terceiros'] });
      toast(data.mensagem || 'Sucata/perda registrada com sucesso!', { type: 'success' });
    },
    onError: (err: Error) => {
      toast(err.message || 'Falha ao registrar sucata de terceiro.', { type: 'error' });
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
    registrarSucata: registrarSucataMutation.mutateAsync,
    isRegistrandoSucata: registrarSucataMutation.isPending,
  };
}
