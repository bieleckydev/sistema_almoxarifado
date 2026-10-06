'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/core/api/client';
import type { Movimentacao } from '@/core/domain/movimentacao.schema';
import { isMovimentacaoEntrada } from '@/core/services/estoque-calculator';
import { formatDate } from '@/core/utils/formatters';
import type { DashboardMovimentacao } from '../data/mock-almoxarifado';

export interface UseExtratoItemOptions {
  itemId: string | null | undefined;
  enabled?: boolean;
}

export interface UseExtratoItemResult {
  movimentacoes: DashboardMovimentacao[];
  total: number;
  isLoading: boolean;
  isError: boolean;
  isFallbackMode: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Converte a entidade de domínio Movimentacao para o modelo de apresentação DashboardMovimentacao.
 */
function movimentacaoToDashboardMovimentacao(m: Movimentacao): DashboardMovimentacao {
  const isEntrada = isMovimentacaoEntrada(m.tipo);
  const responsavel =
    m.colaboradorNome ||
    m.fornecedor ||
    m.destinatario ||
    (m.setor ? `Setor ${m.setor}` : 'Almoxarifado');

  return {
    id: m.id,
    itemId: m.itemId,
    tipo: isEntrada ? 'Entrada' : 'Saída',
    quantidade: m.quantidade,
    dataHora: formatDate(m.dataMovimentacao, 'dd/MM, HH:mm'),
    responsavel,
  };
}

/**
 * Hook para consultar o extrato histórico de movimentações reais de um item específico.
 * Consome /api/movimentacoes/extrato/[itemId] sem fallback para dados mock.
 */
export function useExtratoItem({
  itemId,
  enabled = true,
}: UseExtratoItemOptions): UseExtratoItemResult {
  const isQueryEnabled = Boolean(enabled && itemId);

  const query = useQuery({
    queryKey: ['extrato-item', itemId],
    enabled: isQueryEnabled,
    queryFn: async () => {
      if (!itemId) return { movimentacoes: [], isFallback: false };

      try {
        const response = await api.get<Movimentacao[]>(
          `/movimentacoes/extrato/${encodeURIComponent(itemId)}`
        );

        return {
          movimentacoes: response.data.map(movimentacaoToDashboardMovimentacao),
          isFallback: false,
        };
      } catch (err) {
        console.error(
          `Extrato do item ${itemId} indisponível via API:`,
          err
        );

        return {
          movimentacoes: [],
          isFallback: false,
        };
      }
    },
    staleTime: 15 * 1000,
  });

  const movimentacoes = query.data?.movimentacoes || [];
  const isFallbackMode = query.data?.isFallback ?? false;

  return {
    movimentacoes,
    total: movimentacoes.length,
    isLoading: query.isLoading,
    isError: query.isError,
    isFallbackMode,
    error: (query.error as Error) || null,
    refetch: () => query.refetch(),
  };
}
