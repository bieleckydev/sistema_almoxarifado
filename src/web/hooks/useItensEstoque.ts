'use client';

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
 * Consome /api/itens e, caso haja erro de autorização (401) ou indisponibilidade,
 * aciona o modo de fallback transparente garantindo a continuidade da experiência.
 */
export function useItensEstoque({
  aba = 'mp',
  busca = '',
  filtroSituacao = 'todos',
  enabled = true,
}: UseItensEstoqueOptions = {}): UseItensEstoqueResult {
  const queryKey = ['itens-estoque', aba, busca, filtroSituacao];

  const query = useQuery({
    queryKey,
    enabled,
    queryFn: async () => {
      try {
        const params: Record<string, string> = {
          tipo: METADADOS_ABAS[aba].tipoDominio,
          limite: '100',
        };

        if (busca.trim()) {
          params.busca = busca.trim();
        }

        if (filtroSituacao === 'ok') {
          params.statusEstoque = 'NORMAL';
        } else if (filtroSituacao === 'low') {
          params.statusEstoque = 'ESTOQUE_BAIXO';
        } else if (filtroSituacao === 'crit') {
          params.statusEstoque = 'CRITICO_ZERADO';
        }

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

        // Filtragem direta no mock local como último recurso
        const termo = busca.trim().toLowerCase();

        const filtrados = MOCK_ITENS.filter((item) => {
          if (item.aba !== aba) return false;

          const status = calcularStatusCriticidade(item.estoqueAtual, item.estoqueSeguranca);
          if (filtroSituacao !== 'todos' && status !== filtroSituacao) {
            return false;
          }

          if (!termo) return true;

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

        return {
          itens: filtrados,
          isFallback: true,
        };
      }
    },
    staleTime: 30 * 1000,
  });

  const itens = query.data?.itens || [];
  const isFallbackMode = query.data?.isFallback ?? false;

  // Itens base da aba selecionada (para contadores de métricas da categoria ativa)
  const itensBaseAba = isFallbackMode
    ? MOCK_ITENS.filter((i) => i.aba === aba)
    : itens;

  const totalAba = itensBaseAba.length;
  const totalAbaixoMinimo = itensBaseAba.filter(
    (i) => calcularStatusCriticidade(i.estoqueAtual, i.estoqueSeguranca) === 'low'
  ).length;
  const totalCriticos = itensBaseAba.filter(
    (i) => calcularStatusCriticidade(i.estoqueAtual, i.estoqueSeguranca) === 'crit'
  ).length;

  // Contagem de alertas críticos para os badges de navegação da Sidebar
  const contagemCriticosPorAba: Record<AbaEstoque, number> = {
    mp: MOCK_ITENS.filter(
      (i) => i.aba === 'mp' && calcularStatusCriticidade(i.estoqueAtual, i.estoqueSeguranca) === 'crit'
    ).length,
    imp: MOCK_ITENS.filter(
      (i) => i.aba === 'imp' && calcularStatusCriticidade(i.estoqueAtual, i.estoqueSeguranca) === 'crit'
    ).length,
    motos: MOCK_ITENS.filter(
      (i) => i.aba === 'motos' && calcularStatusCriticidade(i.estoqueAtual, i.estoqueSeguranca) === 'crit'
    ).length,
  };

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
