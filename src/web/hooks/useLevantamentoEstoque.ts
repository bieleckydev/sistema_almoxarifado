'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/core/api/client';
import type { Movimentacao } from '@/core/domain/movimentacao.schema';
import type { MovimentacaoParaGiro } from '@/core/services/estoque-calculator';
import { useItensEstoque } from './useItensEstoque';
import { montarLinhasLevantamento, type LinhaLevantamento } from '../components/dashboard/levantamento/levantamento';

/** Tamanho máximo de página aceito pela API de movimentações. */
const LOTE_MOVIMENTACOES = 1000;
/** Teto de segurança de páginas por janela (até 20 mil movimentações). */
const MAX_PAGINAS = 20;

interface MovimentacoesJanela {
  movimentacoes: MovimentacaoParaGiro[];
  total: number;
  /** true quando a janela tinha mais movimentações do que o teto de leitura. */
  truncado: boolean;
}

function inicioDaJanelaIso(janelaDias: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (janelaDias - 1));
  return d.toISOString();
}

/**
 * Lê todas as movimentações da janela seguindo o cursor da API.
 * Mantém apenas os campos necessários para o cálculo de giro.
 */
async function buscarMovimentacoesDaJanela(janelaDias: number): Promise<MovimentacoesJanela> {
  const dataInicio = inicioDaJanelaIso(janelaDias);
  const movimentacoes: MovimentacaoParaGiro[] = [];
  let cursor: string | undefined;
  let total = 0;

  for (let pagina = 0; pagina < MAX_PAGINAS; pagina++) {
    const params: Record<string, string> = {
      dataInicio,
      limite: String(LOTE_MOVIMENTACOES),
    };
    if (cursor) params.cursor = cursor;

    const res = await api.get<{ movimentacoes: Movimentacao[]; total: number }>('/movimentacoes', {
      params,
    });
    const lote = res.data?.movimentacoes || [];
    total = res.data?.total ?? total;

    for (const m of lote) {
      movimentacoes.push({
        itemId: m.itemId,
        tipo: m.tipo,
        quantidade: m.quantidade,
        dataMovimentacao: m.dataMovimentacao,
        estornado: m.estornado,
        estornoDe: m.estornoDe,
      });
    }

    if (lote.length < LOTE_MOVIMENTACOES || movimentacoes.length >= total) {
      return { movimentacoes, total, truncado: false };
    }
    cursor = lote[lote.length - 1].id;
  }

  return { movimentacoes, total, truncado: movimentacoes.length < total };
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
    queryFn: () => buscarMovimentacoesDaJanela(janelaDias),
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
