'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/core/api/client';
import type { Movimentacao } from '@/core/domain/movimentacao.schema';
import { isMovimentacaoEntrada } from '@/core/services/estoque-calculator';
import { useItensEstoque } from './useItensEstoque';
import type { DashboardItem } from '../data/mock-almoxarifado';
import { formatarDataBR } from '../components/gestao/saida/exportCsv';
import {
  usePeriodoStore,
  type PeriodoFiltro,
  calcularIntervaloPeriodo,
} from './usePeriodoGlobal';

export type { PeriodoFiltro };

export interface MovimentacaoEnriquecida {
  id: string;
  itemId: string;
  tipo: 'Entrada' | 'Saída';
  quantidade: number;
  data: string; // YYYY-MM-DD
  hora: string; // HH:mm
  quem: string;
  obs?: string;
  info?: Record<string, string>;
  item?: DashboardItem;
  rotulo: string; // 'Hoje, 09:42' etc.
}

export interface ResumoItemPeriodo {
  itemId: string;
  item: DashboardItem;
  totalEntrou: number;
  totalSaiu: number;
  estoqueAtual: number;
}

export const isoDate = (d: Date) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export const diaAntes = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return isoDate(d);
};

export const hoje = () => diaAntes(0);
export const ontem = () => diaAntes(1);

export function formatarRotuloDataHora(dataISO: string, horaStr: string): string {
  const dataYMD = dataISO.split('T')[0];
  const prefixo =
    dataYMD === hoje() ? 'Hoje' : dataYMD === ontem() ? 'Ontem' : formatarDataBR(dataYMD);
  return `${prefixo}, ${horaStr || '00:00'}`;
}

export function isNoPeriodo(dataStr: string, periodo: PeriodoFiltro): boolean {
  const d = dataStr.split('T')[0];
  if (periodo === 'Tudo') return true;
  if (periodo === 'Hoje') return d === hoje();
  if (periodo === 'Ontem') return d === ontem();
  if (periodo === '7 dias') return d >= diaAntes(6);
  return true;
}

export function matchMovimentacao(
  mov: MovimentacaoEnriquecida,
  termo: string
): boolean {
  const t = termo.trim().toLowerCase();
  if (!t) return true;
  const item = mov.item;
  const campos = [
    item?.descricao || '',
    item?.codigo || '',
    mov.quem || '',
    mov.obs || '',
    ...(mov.info ? Object.values(mov.info) : []),
  ];
  return campos.some((c) => String(c).toLowerCase().includes(t));
}

export interface RegistrarMovimentacaoParams {
  itemId: string;
  tipo: 'Entrada' | 'Saída';
  quantidade: number;
  quem: string;
  colaboradorId?: string;
  setor?: string;
  observacao?: string;
  data: string; // YYYY-MM-DD
  info?: Record<string, string>;
}

export function useMovimentacoesPeriodo(periodoCustom?: PeriodoFiltro) {
  const queryClient = useQueryClient();
  const periodoGlobal = usePeriodoStore((s) => s.periodo);
  const setPeriodoGlobal = usePeriodoStore((s) => s.setPeriodo);

  const periodo = periodoCustom || periodoGlobal;
  const setPeriodo = setPeriodoGlobal;
  const [busca, setBusca] = useState('');

  // 1. Catálogo geral de itens para relacionamento e enriquecimento
  const { itens, isLoading: isLoadingItens } = useItensEstoque();

  const itensMap = useMemo(() => {
    const map = new Map<string, DashboardItem>();
    itens.forEach((it) => {
      map.set(it.id, it);
    });
    return map;
  }, [itens]);

  // 2. Consulta Movimentações no backend
  const {
    data: movimentacoesRaw = [],
    isLoading: isLoadingMovs,
    isFetching,
    refetch,
  } = useQuery<Movimentacao[]>({
    queryKey: ['movimentacoes-periodo'],
    queryFn: async () => {
      try {
        const res = await api.get<{ movimentacoes: Movimentacao[]; total: number }>(
          '/movimentacoes?limite=500'
        );
        return res.data?.movimentacoes || [];
      } catch (err) {
        console.warn('Erro ao consultar /api/movimentacoes:', err);
        return [];
      }
    },
    staleTime: 30 * 1000,
  });

  // 3. Converte e enriquece movimentações
  const todasMovimentacoes = useMemo<MovimentacaoEnriquecida[]>(() => {
    if (movimentacoesRaw.length > 0) {
      return movimentacoesRaw.map((m) => {
        const isEntrada = isMovimentacaoEntrada(m.tipo);
        const dataYMD = m.dataMovimentacao ? m.dataMovimentacao.split('T')[0] : hoje();
        let hora = '00:00';
        if (m.dataMovimentacao && m.dataMovimentacao.includes('T')) {
          const timePart = m.dataMovimentacao.split('T')[1];
          hora = timePart.slice(0, 5);
        }

        const quem =
          m.colaboradorNome ||
          m.colaboradorId ||
          m.fornecedor ||
          m.destinatario ||
          (m.setor ? `Setor ${m.setor}` : 'Produção');

        const item = itensMap.get(m.itemId);

        const info: Record<string, string> = {};
        if (m.numeroNF) info['NF-e'] = m.numeroNF;
        if (m.fornecedor) info['Fornecedor'] = m.fornecedor;
        if (item?.especificacoes) {
          Object.entries(item.especificacoes).forEach(([k, v]) => {
            if (v && !info[k]) info[k] = v;
          });
        }

        return {
          id: m.id,
          itemId: m.itemId,
          tipo: isEntrada ? 'Entrada' : 'Saída',
          quantidade: m.quantidade,
          data: dataYMD,
          hora,
          quem,
          obs: m.observacao,
          info: Object.keys(info).length > 0 ? info : undefined,
          item,
          rotulo: formatarRotuloDataHora(dataYMD, hora),
        };
      });
    }

    // Se ainda não houver movimentações cadastradas no backend, gera movimentações de demonstração
    // com base nos itens cadastrados para espelhar a riqueza do protótipo
    if (itens.length === 0) return [];

    const mockSeed: Array<{
      itemIndex: number;
      tipo: 'Entrada' | 'Saída';
      quantidade: number;
      quem: string;
      dia: 'hoje' | 'ontem' | '7dias';
      hora: string;
      obs?: string;
    }> = [
      { itemIndex: 7, tipo: 'Saída', quantidade: 6, quem: 'Manutenção', dia: 'hoje', hora: '09:42' },
      { itemIndex: 9, tipo: 'Saída', quantidade: 3, quem: 'Produção', dia: 'hoje', hora: '09:15' },
      { itemIndex: 0, tipo: 'Entrada', quantidade: 20, quem: 'Recebimento', dia: 'hoje', hora: '08:30' },
      { itemIndex: 17, tipo: 'Saída', quantidade: 4, quem: 'Oficina', dia: 'ontem', hora: '17:10' },
      { itemIndex: 4, tipo: 'Saída', quantidade: 12, quem: 'Serralheria', dia: 'ontem', hora: '16:58' },
      { itemIndex: 3, tipo: 'Saída', quantidade: 8, quem: 'Soldagem', dia: 'ontem', hora: '15:20' },
      { itemIndex: 12, tipo: 'Entrada', quantidade: 24, quem: 'Recebimento', dia: 'ontem', hora: '11:05' },
      { itemIndex: 13, tipo: 'Saída', quantidade: 3, quem: 'Balcão', dia: 'ontem', hora: '08:47' },
    ];

    return mockSeed.map((seed, idx) => {
      const it = itens[seed.itemIndex % itens.length];
      const dataYMD = seed.dia === 'hoje' ? hoje() : seed.dia === 'ontem' ? ontem() : diaAntes(2);
      return {
        id: `mock-mov-${idx + 1}`,
        itemId: it.id,
        tipo: seed.tipo,
        quantidade: seed.quantidade,
        data: dataYMD,
        hora: seed.hora,
        quem: seed.quem,
        obs: seed.obs,
        info: it.especificacoes,
        item: it,
        rotulo: formatarRotuloDataHora(dataYMD, seed.hora),
      };
    });
  }, [movimentacoesRaw, itens, itensMap]);

  // 4. Filtra por período e busca
  const movimentacoesFiltradas = useMemo<MovimentacaoEnriquecida[]>(() => {
    return todasMovimentacoes
      .filter((m) => isNoPeriodo(m.data, periodo) && matchMovimentacao(m, busca))
      .sort((a, b) => (b.data + b.hora).localeCompare(a.data + a.hora));
  }, [todasMovimentacoes, periodo, busca]);

  // 5. Calcula resumo consolidado por produto no período
  const resumoItens = useMemo<ResumoItemPeriodo[]>(() => {
    const mapa = new Map<string, { entrou: number; saiu: number; item: DashboardItem }>();

    for (const m of movimentacoesFiltradas) {
      if (!m.item) continue;
      const registro = mapa.get(m.itemId) || {
        entrou: 0,
        saiu: 0,
        item: m.item,
      };

      if (m.tipo === 'Entrada') {
        registro.entrou += m.quantidade;
      } else {
        registro.saiu += m.quantidade;
      }

      mapa.set(m.itemId, registro);
    }

    return Array.from(mapa.values())
      .map(({ item, entrou, saiu }) => ({
        itemId: item.id,
        item,
        totalEntrou: entrou,
        totalSaiu: saiu,
        estoqueAtual: item.estoqueAtual,
      }))
      .sort((a, b) => a.item.descricao.localeCompare(b.item.descricao));
  }, [movimentacoesFiltradas]);

  // 6. Mutação para registrar movimentação avulsa
  const mutationRegistrar = useMutation({
    mutationFn: async (params: RegistrarMovimentacaoParams) => {
      const isEntrada = params.tipo === 'Entrada';
      const dataHoraIso = new Date(params.data + 'T12:00:00Z').toISOString();

      if (isEntrada) {
        return api.post('/movimentacoes/entrada', {
          itemId: params.itemId,
          tipo: 'ENTRADA_COMPRA',
          quantidade: params.quantidade,
          fornecedor: params.quem.trim() || undefined,
          observacoes: params.observacao?.trim() || undefined,
          dataMovimentacao: dataHoraIso,
        });
      } else {
        const idColaborador = params.colaboradorId || params.quem.trim();
        return api.post('/movimentacoes/baixa-interna', {
          itemId: params.itemId,
          quantidade: params.quantidade,
          colaboradorId: idColaborador,
          setor: params.setor,
          observacao: params.observacao?.trim() || undefined,
          dataMovimentacao: dataHoraIso,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimentacoes-periodo'] });
      queryClient.invalidateQueries({ queryKey: ['itens-estoque'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-resumo-geral'] });
      queryClient.invalidateQueries({ queryKey: ['global-search-index'] });
    },
  });

  return {
    periodo,
    setPeriodo,
    busca,
    setBusca,
    itens,
    movimentacoes: movimentacoesFiltradas,
    todasMovimentacoes,
    resumoItens,
    isLoading: isLoadingItens || isLoadingMovs,
    isFetching,
    refetch,
    registrarMovimentacao: mutationRegistrar.mutateAsync,
    isRegistrando: mutationRegistrar.isPending,
  };
}
