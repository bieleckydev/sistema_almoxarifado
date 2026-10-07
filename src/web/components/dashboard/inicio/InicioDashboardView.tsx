'use client';

import React from 'react';
import { RefreshCw } from 'lucide-react';
import { SummaryNavCard, type SummaryBadge } from './SummaryNavCard';
import { useDashboardResumo } from '@/web/hooks/useDashboardResumo';
import { type TelaOuAba, METADADOS_ABAS, type AbaEstoque } from '@/web/data/mock-almoxarifado';

export interface InicioDashboardViewProps {
  onNavegar: (destino: TelaOuAba) => void;
}

export function InicioDashboardView({ onNavegar }: InicioDashboardViewProps) {
  const { data: resumo, isLoading, isFetching, refetch } = useDashboardResumo();

  const getBadgesEstoque = (aba: AbaEstoque): SummaryBadge[] => {
    if (!resumo) return [];
    const dados = resumo.estoque[aba];
    const badges: SummaryBadge[] = [];

    if (dados.criticos > 0) {
      badges.push({
        label: `${dados.criticos} crítico${dados.criticos > 1 ? 's' : ''}`,
        variant: 'crit',
      });
    }

    if (dados.abaixoMinimo > 0) {
      badges.push({
        label: `${dados.abaixoMinimo} abaixo do mínimo`,
        variant: 'low',
      });
    }

    if (dados.criticos === 0 && dados.abaixoMinimo === 0) {
      badges.push({
        label: 'Estoque em dia',
        variant: 'ok',
      });
    }

    return badges;
  };

  const getBadgesVendas = (): SummaryBadge[] => {
    if (!resumo) return [];
    const atrasados = resumo.vendas.atrasados;
    if (atrasados > 0) {
      return [
        {
          label: `${atrasados} atrasado${atrasados > 1 ? 's' : ''}`,
          variant: 'crit',
        },
      ];
    }
    return [
      {
        label: 'Sem atrasos',
        variant: 'ok',
      },
    ];
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 animate-fade-in">
      {/* Cabeçalho da Visão Geral */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Almoxarifado
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-normal">
            Escolha uma área operacional para começar.
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer self-start sm:self-center shrink-0 disabled:opacity-50"
          title="Atualizar indicadores"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          <span>Atualizar</span>
        </button>
      </header>

      {/* 1. Seção Estoque */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
          <span>Estoque</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <SummaryNavCard
            titulo={METADADOS_ABAS.mp.titulo}
            valor={resumo?.estoque.mp.totalItens ?? 0}
            legenda="itens cadastrados"
            badges={getBadgesEstoque('mp')}
            borderTopColor="sky"
            isLoading={isLoading}
            onClick={() => onNavegar('mp')}
          />

          <SummaryNavCard
            titulo={METADADOS_ABAS.imp.titulo}
            valor={resumo?.estoque.imp.totalItens ?? 0}
            legenda="itens cadastrados"
            badges={getBadgesEstoque('imp')}
            borderTopColor="sky"
            isLoading={isLoading}
            onClick={() => onNavegar('imp')}
          />

          <SummaryNavCard
            titulo={METADADOS_ABAS.motos.titulo}
            valor={resumo?.estoque.motos.totalItens ?? 0}
            legenda="itens cadastrados"
            badges={getBadgesEstoque('motos')}
            borderTopColor="sky"
            isLoading={isLoading}
            onClick={() => onNavegar('motos')}
          />
        </div>
      </section>

      {/* 2. Seção Gestão */}
      <section>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
          <span>Gestão</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <SummaryNavCard
            titulo="Vendas"
            valor={resumo?.vendas.totalAEntregar ?? 0}
            legenda="pedidos a entregar"
            badges={getBadgesVendas()}
            borderTopColor="brand"
            isLoading={isLoading}
            onClick={() => onNavegar('vendas')}
          />

          <SummaryNavCard
            titulo="Clientes"
            valor={resumo?.clientes.totalCadastros ?? 0}
            legenda="cadastros ativos"
            borderTopColor="brand"
            isLoading={isLoading}
            onClick={() => onNavegar('clientes')}
          />

          <SummaryNavCard
            titulo="Saída manual"
            valor={resumo?.movimentacoesHoje.total ?? 0}
            legenda="movimentações hoje"
            borderTopColor="brand"
            isLoading={isLoading}
            onClick={() => onNavegar('saida')}
          />
        </div>
      </section>
    </div>
  );
}
