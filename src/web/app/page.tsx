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

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
  };

  const handleClearFilters = () => {
    setTermoBusca('');
    setFiltroSituacao('todos');
  };

  const metadadosAba = METADADOS_ABAS[abaAtiva];

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#eceff3] dark:bg-[#0e151b] text-[#17212b] dark:text-[#e6edf3]">
      {/* Menu Lateral de Navegação */}
      <AppSidebar
        abaAtiva={abaAtiva}
        onSelectAba={handleSelectAba}
        contagemCriticos={contagemCriticosPorAba}
      />

      {/* Conteúdo Principal do Almoxarifado */}
      <main className="flex-1 p-5 md:p-8 lg:p-10 max-w-7xl w-full mx-auto flex flex-col min-w-0">
        {/* Cabeçalho da Categoria */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {metadadosAba.titulo}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              {metadadosAba.subtitulo} A marca vertical na barra indica o estoque mínimo de segurança.
            </p>
          </div>

          {/* Badge de Conexão com o Backend */}
          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            {isFallbackMode ? (
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                title="Operando com catálogo local de demonstração (fallback resiliente)"
              >
                <Database className="w-3.5 h-3.5" />
                Modo Demonstração
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                title="Conectado com sucesso à API REST do Almoxarifado"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Conectado à API
              </span>
            )}

            <button
              type="button"
              onClick={() => refetch()}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Recarregar dados"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Cards de Métricas e KPIs Superiores */}
        <StockMetricsCards
          totalItens={totalAba}
          totalAbaixoMinimo={totalAbaixoMinimo}
          totalCriticos={totalCriticos}
          isLoading={isLoading}
        />

        {/* Barra de Filtros e Pesquisa */}
        <StockFilterToolbar
          busca={termoBusca}
          onBuscaChange={setTermoBusca}
          filtroSituacao={filtroSituacao}
          onFiltroSituacaoChange={setFiltroSituacao}
          totalFiltrados={itens.length}
          placeholder={`Buscar em ${metadadosAba.titulo.toLowerCase()} por nome, código ou endereço...`}
        />

        {/* Tabela de Materiais do Almoxarifado */}
        <StockTable
          itens={itens}
          onSelectItem={handleSelectItem}
          selectedItemId={itemSelecionado?.id}
          isLoading={isLoading}
          onClearFilters={handleClearFilters}
        />
      </main>

      {/* Drawer Lateral de Detalhes do Produto */}
      <ItemDetailsDrawer
        item={itemSelecionado}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
      />
    </div>
  );
}
