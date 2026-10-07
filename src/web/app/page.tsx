'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  type AbaEstoque,
  type TelaOuAba,
  type StatusCriticidade,
  type DashboardItem,
  METADADOS_ABAS,
} from '@/web/data/mock-almoxarifado';
import { useItensEstoque } from '@/web/hooks/useItensEstoque';
import { useDebounce } from '@/web/hooks/useDebounce';
import { useDashboardResumo } from '@/web/hooks/useDashboardResumo';
import { AppSidebar } from '@/web/components/layout/AppSidebar';
import { ThemeToggle } from '@/web/components/layout/ThemeToggle';
import { StockMetricsCards } from '@/web/components/dashboard/StockMetricsCards';
import { StockFilterToolbar } from '@/web/components/dashboard/StockFilterToolbar';
import { StockTable } from '@/web/components/dashboard/StockTable';
import { ItemDetailsDrawer } from '@/web/components/dashboard/ItemDetailsDrawer';
import { InicioDashboardView } from '@/web/components/dashboard/inicio/InicioDashboardView';
import { AuthGuard } from '@/web/components/auth/AuthGuard';

export default function AlmoxarifadoDashboardPage() {
  // Tela inicial definida como 'inicio' (hub executivo da V2)
  const [telaAtiva, setTelaAtiva] = useState<TelaOuAba>('inicio');
  const [termoBusca, setTermoBusca] = useState('');
  const [filtroSituacao, setFiltroSituacao] = useState<'todos' | StatusCriticidade>('todos');
  const [itemSelecionado, setItemSelecionado] = useState<DashboardItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Otimização de busca com debounce de 300ms
  const buscaDebounced = useDebounce(termoBusca, 300);

  // Hook consolidado para resumo geral (Vendas, Clientes, Movimentações)
  const { data: resumoGeral } = useDashboardResumo();

  // Determina aba de estoque ativa (fallback seguro para 'mp' quando estiver em telas de gestão/início)
  const abaEstoqueAtiva: AbaEstoque =
    telaAtiva === 'imp' || telaAtiva === 'motos' ? telaAtiva : 'mp';

  // Hook consolidado com TanStack Query para dados reais de estoque
  const {
    itens,
    totalAba,
    totalAbaixoMinimo,
    totalCriticos,
    contagemCriticosPorAba,
    isLoading,
    isFetching,
    refetch,
  } = useItensEstoque({
    aba: abaEstoqueAtiva,
    busca: buscaDebounced,
    filtroSituacao,
  });

  const handleSelectTela = (novaTela: TelaOuAba) => {
    setTelaAtiva(novaTela);
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

  const isAbaEstoque = telaAtiva === 'mp' || telaAtiva === 'imp' || telaAtiva === 'motos';
  const metadadosAba = isAbaEstoque ? METADADOS_ABAS[telaAtiva] : null;

  return (
    <AuthGuard>
      <div className="flex flex-col md:flex-row min-h-screen bg-[#f1f4f8] dark:bg-[#0c1218] text-[#17212b] dark:text-[#e6edf3]">
        {/* Menu Lateral de Navegação Operacional com Seções V2 */}
        <AppSidebar
          telaAtiva={telaAtiva}
          onSelectTela={handleSelectTela}
          contagemCriticos={contagemCriticosPorAba}
          pedidosAtrasadosCount={resumoGeral?.vendas.atrasados ?? 0}
        />

        {/* Conteúdo Principal Full-Width de Alta Densidade */}
        <main className="flex-1 w-full px-4 py-4 md:px-7 md:py-6 flex flex-col min-w-0">
          {telaAtiva === 'inicio' ? (
            /* 1. Hub Executivo / Dashboard Inicial */
            <InicioDashboardView onNavegar={handleSelectTela} />
          ) : isAbaEstoque && metadadosAba ? (
            /* 2. Catálogo Operacional de Estoque (MP / IMP / MOTOS) */
            <div key={telaAtiva} className="animate-tab-switch flex-1 flex flex-col min-w-0">
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
                    disabled={isLoading || isFetching}
                    className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                    title="Recarregar dados do estoque"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
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
          ) : (
            /* 3. Placeholder / Próximos Módulos (Vendas, Clientes, Saída manual) */
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center animate-fade-in">
              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mb-4">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white capitalize">
                Módulo de {telaAtiva}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                Conectando ao banco de dados Firestore...
              </p>
              <button
                type="button"
                onClick={() => setTelaAtiva('inicio')}
                className="mt-5 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
              >
                Voltar para o Início
              </button>
            </div>
          )}
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
