'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  type AbaEstoque,
  type StatusCriticidade,
  type DashboardItem,
  METADADOS_ABAS,
} from '@/web/data/mock-almoxarifado';
import { useItensEstoque } from '@/web/hooks/useItensEstoque';
import { useDebounce } from '@/web/hooks/useDebounce';
import { AppSidebar } from '@/web/components/layout/AppSidebar';
import { ThemeToggle } from '@/web/components/layout/ThemeToggle';
import { StockMetricsCards } from '@/web/components/dashboard/StockMetricsCards';
import { StockFilterToolbar } from '@/web/components/dashboard/StockFilterToolbar';
import { StockTable } from '@/web/components/dashboard/StockTable';
import { ItemDetailsDrawer } from '@/web/components/dashboard/ItemDetailsDrawer';
import { AuthGuard } from '@/web/components/auth/AuthGuard';

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
    <AuthGuard>
      <div className="flex flex-col md:flex-row min-h-screen bg-[#f1f4f8] dark:bg-[#0c1218] text-[#17212b] dark:text-[#e6edf3]">
      {/* Menu Lateral de Navegação Operacional */}
      <AppSidebar
        abaAtiva={abaAtiva}
        onSelectAba={handleSelectAba}
        contagemCriticos={contagemCriticosPorAba}
      />

      {/* Conteúdo Principal Full-Width de Alta Densidade */}
      <main className="flex-1 w-full px-4 py-4 md:px-7 md:py-6 flex flex-col min-w-0">
        <div key={abaAtiva} className="animate-tab-switch flex-1 flex flex-col min-w-0">
          {/* Cabeçalho Operacional Compacto */}
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h1 className="text-xl md:text-2xl font-semibold tracking-normal text-slate-900 dark:text-white">
                {metadadosAba.titulo}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-normal">
                {metadadosAba.subtitulo}
              </p>
            </div>

            {/* Ações do Cabeçalho */}
            <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
              <button
                type="button"
                onClick={() => refetch()}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                title="Recarregar dados do estoque"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Atualizar</span>
              </button>

              <ThemeToggle />
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
        </div>
      </main>

      {/* Drawer Lateral de Detalhes Técnicos e Histórico */}
      <ItemDetailsDrawer
        item={itemSelecionado}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
      />
    </div>
    </AuthGuard>
  );
}
