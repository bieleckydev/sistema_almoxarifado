'use client';

import React, { useState } from 'react';
import { Database, CheckCircle2, RefreshCw } from 'lucide-react';
import {
  type AbaEstoque,
  type StatusCriticidade,
  type DashboardItem,
  METADADOS_ABAS,
} from '@/web/data/mock-almoxarifado';
import { useItensEstoque } from '@/web/hooks/useItensEstoque';
import { useDebounce } from '@/web/hooks/useDebounce';
import { AppSidebar } from '@/web/components/layout/AppSidebar';
import { StockMetricsCards } from '@/web/components/dashboard/StockMetricsCards';
import { StockFilterToolbar } from '@/web/components/dashboard/StockFilterToolbar';
import { StockTable } from '@/web/components/dashboard/StockTable';
import { ItemDetailsDrawer } from '@/web/components/dashboard/ItemDetailsDrawer';

export default function AlmoxarifadoDashboardPage() {
  const [abaAtiva, setAbaAtiva] = useState<AbaEstoque>('mp');
  const [termoBusca, setTermoBusca] = useState('');
  const [filtroSituacao, setFiltroSituacao] = useState<'todos' | StatusCriticidade>('todos');
  const [itemSelecionado, setItemSelecionado] = useState<DashboardItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Otimização de busca com debounce de 300ms
  const buscaDebounced = useDebounce(termoBusca, 300);

  // Hook consolidado com TanStack Query e fallback
  const {
    itens,
    totalAba,
    totalAbaixoMinimo,
    totalCriticos,
    contagemCriticosPorAba,
    isLoading,
    isFallbackMode,
    refetch,
  } = useItensEstoque({
    aba: abaAtiva,
    busca: buscaDebounced,
    filtroSituacao,
  });

  const handleSelectAba = (novaAba: AbaEstoque) => {
    setAbaAtiva(novaAba);
    setTermoBusca('');
    setFiltroSituacao('todos');
    setItemSelecionado(null);
    setIsDrawerOpen(false);
  };

  const handleSelectItem = (item: DashboardItem) => {
    setItemSelecionado(item);
    setIsDrawerOpen(true);
  };

  const handleRegistrarBaixaRapida = (item: DashboardItem) => {
    setItemSelecionado(item);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
  };

  const handleClearFilters = () => {
    setTermoBusca('');
    setFiltroSituacao('todos');
  };

  const metadadosAba = METADADOS_ABAS[abaAtiva];

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#f1f4f8] dark:bg-[#0c1218] text-[#17212b] dark:text-[#e6edf3]">
      {/* Menu Lateral de Navegação Operacional */}
      <AppSidebar
        abaAtiva={abaAtiva}
        onSelectAba={handleSelectAba}
        contagemCriticos={contagemCriticosPorAba}
      />

      {/* Conteúdo Principal Full-Width de Alta Densidade */}
      <main className="flex-1 w-full px-4 py-4 md:px-7 md:py-6 flex flex-col min-w-0">
        {/* Cabeçalho Operacional Compacto */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {metadadosAba.titulo}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {metadadosAba.subtitulo}
            </p>
          </div>

          {/* Status do Sistema e Sincronização */}
          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            {isFallbackMode ? (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60"
                title="Catálogo de demonstração local ativo"
              >
                <Database className="w-3.5 h-3.5" />
                Demonstração Local
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60"
                title="Conectado ao Backend em produção"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                API Conectada
              </span>
            )}

            <button
              type="button"
              onClick={() => refetch()}
              className="p-1.5 rounded text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
              title="Atualizar dados"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Cards de Métricas Operacionais Clicáveis */}
        <StockMetricsCards
          totalItens={totalAba}
          totalAbaixoMinimo={totalAbaixoMinimo}
          totalCriticos={totalCriticos}
          filtroAtivo={filtroSituacao}
          onFiltrarPorStatus={setFiltroSituacao}
          isLoading={isLoading}
        />

        {/* Barra de Filtros e Busca Rápida */}
        <StockFilterToolbar
          busca={termoBusca}
          onBuscaChange={setTermoBusca}
          filtroSituacao={filtroSituacao}
          onFiltroSituacaoChange={setFiltroSituacao}
          totalFiltrados={itens.length}
        />

        {/* Tabela de Alta Densidade com Ações Contextuais */}
        <StockTable
          itens={itens}
          onSelectItem={handleSelectItem}
          onRegistrarBaixaRapida={handleRegistrarBaixaRapida}
          selectedItemId={itemSelecionado?.id}
          isLoading={isLoading}
          onClearFilters={handleClearFilters}
        />
      </main>

      {/* Drawer Lateral de Detalhes Técnicos e Histórico */}
      <ItemDetailsDrawer
        item={itemSelecionado}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
      />
    </div>
  );
}
