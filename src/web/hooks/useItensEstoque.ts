'use client';

import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { api } from '@/core/api/client';
import type { Item } from '@/core/domain/item.schema';
import {
  type DashboardItem,
  type AbaEstoque,
  type StatusCriticidade,
  METADADOS_ABAS,
  calcularStatusCriticidade,
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
  isFetching: boolean;
  isError: boolean;
  isFallbackMode: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Converte um Item retornado da API para a estrutura enriquecida DashboardItem da UI.
 */
function sanitizarTimestamp(val: unknown): string | undefined {
  if (!val) return undefined;
  if (typeof val === 'string') return val;
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'object' && val !== null) {
    const obj = val as { seconds?: number; nanoseconds?: number; toDate?: () => Date };
    if (typeof obj.toDate === 'function') {
      return obj.toDate().toISOString();
    }
    if (typeof obj.seconds === 'number') {
      const ns = typeof obj.nanoseconds === 'number' ? obj.nanoseconds : 0;
      return new Date(obj.seconds * 1000 + ns / 1000000).toISOString();
    }
  }
  return undefined;
}

function itemToDashboardItem(item: Item): DashboardItem {
  let aba: AbaEstoque = 'mp';
  if (item.tipo === 'IMPRODUTIVO_CONSUMIVEL') {
    aba = 'imp';
  } else if (item.tipo === 'ACABADO') {
    aba = 'motos';
  }

  const raw = item as Record<string, unknown>;
  const categoria =
    (typeof raw.categoria === 'string' && raw.categoria) ||
    item.clienteDestino ||
    (aba === 'mp' ? 'Matéria-prima' : aba === 'imp' ? 'Consumíveis' : 'Peças');

  const capacidadeMaxima =
    typeof raw.capacidadeMaxima === 'number' && raw.capacidadeMaxima > 0
      ? raw.capacidadeMaxima
      : Math.max(item.estoqueSeguranca * 3, item.estoqueAtual * 1.5, 50);

  const especificacoes =
    raw.especificacoes && typeof raw.especificacoes === 'object'
      ? (raw.especificacoes as Record<string, string>)
      : item.observacoes
        ? { Observações: item.observacoes }
        : {};

  const createdAt = sanitizarTimestamp(item.createdAt);
  const updatedAt = sanitizarTimestamp(item.updatedAt);

  return {
    ...item,
    createdAt,
    updatedAt,
    aba,
    categoria,
    capacidadeMaxima,
    especificacoes,
  };
}

/**
 * Busca de itens por aba: API -> Firestore direto como redundância de rede.
 */
async function fetchItensPorAba(aba: AbaEstoque): Promise<{ itens: DashboardItem[]; isFallback: boolean }> {
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
      const { collection, getDocs, query, where } = await import('firebase/firestore');
      const { db } = await import('@/core/services/firebase');
      const q = query(
        collection(db, 'items'),
        where('tipo', '==', METADADOS_ABAS[aba].tipoDominio)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const itensBanco = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Item[];
        const convertidos = itensBanco.map(itemToDashboardItem);
        return {
          itens: convertidos,
          isFallback: false,
        };
      }
    } catch (clientErr) {
      console.warn('Falha na consulta direta ao Firestore no cliente:', clientErr);
    }

    console.error(`Erro ao carregar itens da aba ${aba}:`, err);
    throw err;
  }
}

const TODAS_AS_ABAS: AbaEstoque[] = ['mp', 'imp', 'motos'];

/**
 * Hook com TanStack Query para carregar a lista de materiais do almoxarifado.
 * 
 * Arquitetura Reativa com Dados Reais:
 * - Carregamento real via API / Firestore sem qualquer exibição de dados mock.
 * - Prefetching proativo de todas as 3 abas ('mp', 'imp', 'motos') com cache de 5 minutos.
 * - PlaceholderData mantém dados anteriores apenas quando já existem (troca instantânea de abas).
 * - Exibição de skeleton / loading enquanto os dados reais do banco são consultados.
 */
export function useItensEstoque({
  aba = 'mp',
  busca = '',
  filtroSituacao = 'todos',
  enabled = true,
}: UseItensEstoqueOptions = {}): UseItensEstoqueResult {
  const queries = useQueries({
    queries: TODAS_AS_ABAS.map((chaveAba) => ({
      queryKey: ['itens-estoque', chaveAba],
      queryFn: () => fetchItensPorAba(chaveAba),
      placeholderData: (previousData: { itens: DashboardItem[]; isFallback: boolean } | undefined) => previousData,
      staleTime: 5 * 60 * 1000, // 5 minutos de cache fresco por aba
      enabled,
    })),
  });

  const indiceAbaAtiva = TODAS_AS_ABAS.indexOf(aba);
  const queryAtiva = queries[indiceAbaAtiva >= 0 ? indiceAbaAtiva : 0];

  const todosItensAba = queryAtiva.data?.itens || [];
  const isFallbackMode = queryAtiva.data?.isFallback ?? false;

  // 1. MÉTRICAS GLOBAIS ESTÁVEIS DA ABA ATIVA
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

  // 2. FILTRAGEM INSTANTÂNEA EM MEMÓRIA (0ms) PARA A TABELA
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

  // 3. CONTAGEM SIMULTÂNEA DE CRÍTICOS PARA TODAS AS ABAS NA SIDEBAR
  const contagemCriticosPorAba: Record<AbaEstoque, number> = useMemo(() => {
    const calcularCriticosAba = (indice: number) => {
      const itensAba = queries[indice]?.data?.itens || [];
      return itensAba.filter(
        (i) => calcularStatusCriticidade(i.estoqueAtual, i.estoqueSeguranca) === 'crit'
      ).length;
    };

    return {
      mp: calcularCriticosAba(0),
      imp: calcularCriticosAba(1),
      motos: calcularCriticosAba(2),
    };
  }, [queries]);

  return {
    itens,
    total: itens.length,
    totalAba,
    totalAbaixoMinimo,
    totalCriticos,
    contagemCriticosPorAba,
    isLoading: queryAtiva.isLoading,
    isFetching: queryAtiva.isFetching,
    isError: queryAtiva.isError,
    isFallbackMode,
    error: (queryAtiva.error as Error) || null,
    refetch: () => {
      queries.forEach((q) => q.refetch());
    },
  };
}
