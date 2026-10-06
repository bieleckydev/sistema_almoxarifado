'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/core/api/client';
import type { Item } from '@/core/domain/item.schema';
import {
  type DashboardItem,
  type AbaEstoque,
  type StatusCriticidade,
  MOCK_ITENS,
  METADADOS_ABAS,
  calcularStatusCriticidade,
  ESPECIFICACOES_ITENS,
} from '../data/mock-almoxarifado';

export interface UseItensEstoqueOptions {
  aba?: AbaEstoque;
  busca?: string;
  filtroSituacao?: 'todos' | StatusCriticidade;
  enabled?: boolean;
}

export interface UseItensEstoqueResult {
  itens: DashboardItem[];
  total: number;
  totalAba: number;
  totalAbaixoMinimo: number;
  totalCriticos: number;
  contagemCriticosPorAba: Record<AbaEstoque, number>;
  isLoading: boolean;
  isError: boolean;
  isFallbackMode: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Converte um Item retornado da API para a estrutura enriquecida DashboardItem da UI.
 */
function itemToDashboardItem(item: Item): DashboardItem {
  let aba: AbaEstoque = 'mp';
  if (item.tipo === 'IMPRODUTIVO_CONSUMIVEL') {
    aba = 'imp';
  } else if (item.tipo === 'ACABADO') {
    aba = 'motos';
  }

  // Tenta recuperar especificações salvas no catálogo mock por ID ou código
  const mockCorrespondente = MOCK_ITENS.find(
    (m) => m.id === item.id || m.codigo === item.codigo
  );

  return {
    ...item,
    aba,
    categoria: mockCorrespondente?.categoria || item.clienteDestino || 'Geral',
    capacidadeMaxima:
      mockCorrespondente?.capacidadeMaxima || Math.max(item.estoqueSeguranca * 3, item.estoqueAtual * 1.5, 50),
    especificacoes: mockCorrespondente?.especificacoes || ESPECIFICACOES_ITENS[item.id] || {},
  };
}

/**
 * Hook com TanStack Query para carregar a lista de materiais do almoxarifado.
 * 
 * Arquitetura Otimizada (Proposta 1):
 * - A requisição de rede busca o catálogo completo da categoria ativa ('aba') uma única vez.
 * - As métricas dos cards (total, abaixo do mínimo, críticos) permanecem sempre estáveis e consistentes.
 * - A filtragem por situação ('crit', 'low', 'ok', 'todos') e busca textual ocorre instantaneamente (0ms) em memória.
 */
export function useItensEstoque({
  aba = 'mp',
  busca = '',
  filtroSituacao = 'todos',
  enabled = true,
}: UseItensEstoqueOptions = {}): UseItensEstoqueResult {
  // Apenas a aba ativa define a consulta de rede. Filtros e buscas não re-disparam fetch HTTP!
  const queryKey = ['itens-estoque', aba];

  const query = useQuery({
    queryKey,
    enabled,
    queryFn: async () => {
      try {
        const params: Record<string, string> = {
          tipo: METADADOS_ABAS[aba].tipoDominio,
          limite: '500',
        };

        const response = await api.get<{ itens: Item[]; total: number }>('/itens', {
          params,
        });

        const itensConvertidos = response.data.itens.map(itemToDashboardItem);

        return {
          itens: itensConvertidos,
          isFallback: false,
        };
      } catch (err) {
        // Tenta buscar diretamente do Firestore no cliente autenticado
        try {
          const { collection, getDocs } = await import('firebase/firestore');
          const { db } = await import('@/core/services/firebase');
          const snap = await getDocs(collection(db, 'items'));
          if (!snap.empty) {
            const itensBanco = snap.docs.map((d) => ({
              id: d.id,
              ...d.data(),
            })) as Item[];
            const convertidos = itensBanco.map(itemToDashboardItem);
            const filtradosPorAba = convertidos.filter((i) => i.aba === aba);
            if (filtradosPorAba.length > 0) {
              return {
                itens: filtradosPorAba,
                isFallback: false,
              };
            }
          }
        } catch (clientErr) {
          console.warn('Falha na consulta direta ao Firestore no cliente:', clientErr);
        }

        // Fallback local com base completa da aba selecionada
        const baseAba = MOCK_ITENS.filter((item) => item.aba === aba);

        return {
          itens: baseAba,
          isFallback: true,
        };
      }
    },
    staleTime: 60 * 1000, // 1 minuto de cache fresco por aba
  });

  const todosItensAba = query.data?.itens || [];
  const isFallbackMode = query.data?.isFallback ?? false;

  // 1. MÉTRICAS GLOBAIS ESTÁVEIS: Calculadas sobre todos os itens da categoria ativa
  const totalAba = todosItensAba.length;
  const totalAbaixoMinimo = useMemo(
    () =>
      todosItensAba.filter(
        (i) => calcularStatusCriticidade(i.estoqueAtual, i.estoqueSeguranca) === 'low'
      ).length,
    [todosItensAba]
  );
  const totalCriticos = useMemo(
    () =>
      todosItensAba.filter(
        (i) => calcularStatusCriticidade(i.estoqueAtual, i.estoqueSeguranca) === 'crit'
      ).length,
    [todosItensAba]
  );

  // 2. FILTRAGEM INSTANTÂNEA EM MEMÓRIA (0ms): Aplica filtro de situação e busca textual
  const itens = useMemo(() => {
    let resultado = todosItensAba;

    if (filtroSituacao !== 'todos') {
      resultado = resultado.filter(
        (i) => calcularStatusCriticidade(i.estoqueAtual, i.estoqueSeguranca) === filtroSituacao
      );
    }

    const termo = busca.trim().toLowerCase();
    if (termo) {
      resultado = resultado.filter((item) => {
        const valoresEspecificacoes = Object.values(item.especificacoes || {});
        const campos = [
          item.descricao,
          item.codigo,
          item.categoria,
          item.localizacaoFisica || '',
          ...valoresEspecificacoes,
        ];
        return campos.some((campo) => campo.toLowerCase().includes(termo));
      });
    }

    return resultado;
  }, [todosItensAba, filtroSituacao, busca]);

  // 3. Contagem de alertas críticos para os badges de navegação da Sidebar
  const contagemCriticosPorAba: Record<AbaEstoque, number> = useMemo(
    () => ({
      mp:
        aba === 'mp'
          ? totalCriticos
          : MOCK_ITENS.filter(
              (i) => i.aba === 'mp' && calcularStatusCriticidade(i.estoqueAtual, i.estoqueSeguranca) === 'crit'
            ).length,
      imp:
        aba === 'imp'
          ? totalCriticos
          : MOCK_ITENS.filter(
              (i) => i.aba === 'imp' && calcularStatusCriticidade(i.estoqueAtual, i.estoqueSeguranca) === 'crit'
            ).length,
      motos:
        aba === 'motos'
          ? totalCriticos
          : MOCK_ITENS.filter(
              (i) => i.aba === 'motos' && calcularStatusCriticidade(i.estoqueAtual, i.estoqueSeguranca) === 'crit'
            ).length,
    }),
    [aba, totalCriticos]
  );

  return {
    itens,
    total: itens.length,
    totalAba,
    totalAbaixoMinimo,
    totalCriticos,
    contagemCriticosPorAba,
    isLoading: query.isLoading,
    isError: query.isError,
    isFallbackMode,
    error: (query.error as Error) || null,
    refetch: () => query.refetch(),
  };
}
