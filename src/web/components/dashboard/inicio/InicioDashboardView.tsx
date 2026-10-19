'use client';

import React from 'react';
import { RefreshCw, Clock, Printer } from 'lucide-react';
import { QuickActionsBar } from './QuickActionsBar';
import { PriorityAlertBanner } from './PriorityAlertBanner';
import { CategoryBalanceCard } from './CategoryBalanceCard';
import { CriticalStockTable } from './CriticalStockTable';
import { RecentActivityFeed } from './RecentActivityFeed';
import { useDashboardResumo, type ItemAtencaoResumo } from '@/web/hooks/useDashboardResumo';
import { type TelaOuAba, METADADOS_ABAS } from '@/web/data/mock-almoxarifado';

export interface InicioDashboardViewProps {
  onNavegar: (destino: TelaOuAba) => void;
  onRegistrarEntrada?: () => void;
  onRegistrarSaida?: () => void;
  onReceberTerceiro?: () => void;
  onNovoPedido?: () => void;
  onNovoCadastro?: () => void;
  onSelectItem?: (item: ItemAtencaoResumo) => void;
  onAdicionarEntrada?: (item: ItemAtencaoResumo) => void;
}

export function InicioDashboardView({
  onNavegar,
  onRegistrarEntrada,
  onRegistrarSaida,
  onReceberTerceiro,
  onNovoPedido,
  onNovoCadastro,
  onSelectItem,
  onAdicionarEntrada,
}: InicioDashboardViewProps) {
  const { data: resumo, isLoading, isFetching, refetch } = useDashboardResumo();

  // Contagens consolidadas
  const totalCriticos =
    (resumo?.estoque.mp.criticos ?? 0) +
    (resumo?.estoque.imp.criticos ?? 0) +
    (resumo?.estoque.motos.criticos ?? 0);

  const totalAbaixoMinimo =
    (resumo?.estoque.mp.abaixoMinimo ?? 0) +
    (resumo?.estoque.imp.abaixoMinimo ?? 0) +
    (resumo?.estoque.motos.abaixoMinimo ?? 0);

  const pedidosAtrasados = resumo?.vendas.atrasados ?? 0;

  const itensZeradosOuCriticos = (resumo?.itensAtencao ?? []).filter(
    (i) => i.estoqueAtual === 0 || i.status === 'crit'
  ).length;

  const handleResolverCriticos = () => {
    const el = document.getElementById('tabela-criticos');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      onNavegar('mp');
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 animate-fade-in pb-10">
      {/* 1. Barra de Comando e Status Superior estilo Stitch */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-surface-container-lowest p-5 sm:p-6 rounded-xl shadow-sm border border-outline-variant/30 mb-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded font-label-sm text-[11px] bg-primary/10 text-primary font-bold uppercase tracking-wider">
              WMS Shopfloor Control
            </span>
            <span className="text-outline-variant font-label-sm text-xs">•</span>
            <span className="text-on-surface-variant font-body-sm text-xs flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-tertiary-fixed" />
              Terminal Sincronizado
            </span>
          </div>

          <h1 className="font-headline-lg text-xl sm:text-2xl text-on-surface font-bold tracking-tight">
            Almoxarifado & Visão Geral
          </h1>
          <p className="font-body-md text-xs sm:text-sm text-on-surface-variant max-w-2xl">
            Ações rápidas e monitoramento de materiais que demandam atenção imediata no chão de fábrica.
          </p>
        </div>

        {/* Controles de Turno e Atualização */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-container text-on-surface font-body-md text-xs">
            <Clock className="w-4 h-4 text-secondary" />
            <span className="font-data-tabular font-semibold">Hoje</span>
            <span className="text-outline text-label-sm text-[11px] hidden sm:inline">
              Turno Operacional (06h - 15h)
            </span>
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-xs font-semibold border border-outline-variant/30 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            title="Atualizar dados do estoque"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-secondary ${
                isFetching ? 'animate-spin' : ''
              }`}
            />
            <span>Atualizar</span>
          </button>

          <button
            type="button"
            onClick={() => onNavegar('saida')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-on-primary font-label-md text-xs font-semibold shadow-sm hover:bg-primary-container transition-colors cursor-pointer active:scale-95"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Relatório de Turno</span>
          </button>
        </div>
      </div>

      {/* 2. Faixa de Ações Rápidas (Cards Expressos de Chão de Fábrica) */}
      <QuickActionsBar
        onRegistrarEntrada={() =>
          onRegistrarEntrada ? onRegistrarEntrada() : onNavegar('mp')
        }
        onRegistrarSaida={() =>
          onRegistrarSaida ? onRegistrarSaida() : onNavegar('saida')
        }
        onReceberTerceiro={() =>
          onReceberTerceiro ? onReceberTerceiro() : onNavegar('terc')
        }
        onNovoPedido={() =>
          onNovoPedido ? onNovoPedido() : onNavegar('vendas')
        }
        onNovoCadastro={() =>
          onNovoCadastro ? onNovoCadastro() : onNavegar('clientes')
        }
      />

      {/* 3. Banner de Alerta Prioritário (quando houver itens críticos ou pedidos atrasados) */}
      <PriorityAlertBanner
        totalAlertas={totalCriticos + totalAbaixoMinimo}
        itensZerados={itensZeradosOuCriticos}
        pedidosAtrasados={pedidosAtrasados}
        onResolverCriticos={handleResolverCriticos}
        onVerPedidosAtrasados={() => onNavegar('vendas')}
      />

      {/* 4. Grade de Balanço por Categoria (As 3 Categorias Reais do Sistema) */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h2 className="font-headline-sm text-sm sm:text-base text-on-surface font-bold">
              Balanço Patrimonial por Categoria
            </h2>
            <span className="font-body-sm text-xs text-on-surface-variant">
              Distribuição dimensional e saúde de estoque das 3 famílias fabris
            </span>
          </div>

          <button
            type="button"
            onClick={() => onNavegar('mp')}
            className="font-label-sm text-xs font-semibold text-primary hover:underline cursor-pointer"
          >
            Ver Catálogo Completo →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Categoria 01: Matéria-Prima */}
          <CategoryBalanceCard
            categoryNumber="Categoria 01"
            title={METADADOS_ABAS.mp.titulo}
            subtitle={METADADOS_ABAS.mp.subtitulo}
            totalItens={resumo?.estoque.mp.totalItens ?? 0}
            totalCriticos={resumo?.estoque.mp.criticos ?? 0}
            totalAbaixoMinimo={resumo?.estoque.mp.abaixoMinimo ?? 0}
            footerLabel="Lead-time médio reposição:"
            footerValue="4.2 dias"
            variant="error"
            onClick={() => onNavegar('mp')}
          />

          {/* Categoria 02: Materiais Improdutivos */}
          <CategoryBalanceCard
            categoryNumber="Categoria 02"
            title={METADADOS_ABAS.imp.titulo}
            subtitle={METADADOS_ABAS.imp.subtitulo}
            totalItens={resumo?.estoque.imp.totalItens ?? 0}
            totalCriticos={resumo?.estoque.imp.criticos ?? 0}
            totalAbaixoMinimo={resumo?.estoque.imp.abaixoMinimo ?? 0}
            footerLabel="Valor estimado em catálogo:"
            footerValue="R$ 42.500,00"
            variant="warning"
            onClick={() => onNavegar('imp')}
          />

          {/* Categoria 03: Peças & Componentes */}
          <CategoryBalanceCard
            categoryNumber="Categoria 03"
            title={METADADOS_ABAS.motos.titulo}
            subtitle={METADADOS_ABAS.motos.subtitulo}
            totalItens={resumo?.estoque.motos.totalItens ?? 0}
            totalCriticos={resumo?.estoque.motos.criticos ?? 0}
            totalAbaixoMinimo={resumo?.estoque.motos.abaixoMinimo ?? 0}
            footerLabel="Aguardando faturamento:"
            footerValue={`${resumo?.vendas.totalAEntregar ?? 0} pedidos`}
            variant="primary"
            onClick={() => onNavegar('motos')}
          />
        </div>
      </div>

      {/* 5. Seção Interativa Dividida (Tabela de Críticos 2 Cols + Feed de Baixas 1 Col) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Coluna Esquerda: Tabela de Ruptura Imediata */}
        <div className="xl:col-span-2">
          <CriticalStockTable
            itens={resumo?.itensAtencao ?? []}
            onSelectItem={(item) =>
              onSelectItem ? onSelectItem(item) : onNavegar(item.aba)
            }
            onAdicionarEntrada={(item) =>
              onAdicionarEntrada
                ? onAdicionarEntrada(item)
                : onNavegar(item.aba)
            }
          />
        </div>

        {/* Coluna Direita: Feed de Baixas e Apontamentos Recentes */}
        <div className="xl:col-span-1">
          <RecentActivityFeed
            onVerHistoricoCompleto={() => onNavegar('saida')}
          />
        </div>
      </div>
    </div>
  );
}
