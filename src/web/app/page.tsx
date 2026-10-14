'use client';

import { useState } from 'react';
import { RefreshCw, Plus } from 'lucide-react';
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
import { AppTopHeader } from '@/web/components/layout/AppTopHeader';
import { StockMetricsCards } from '@/web/components/dashboard/StockMetricsCards';
import { StockFilterToolbar } from '@/web/components/dashboard/StockFilterToolbar';
import { StockTable } from '@/web/components/dashboard/StockTable';
import { ItemDetailsDrawer } from '@/web/components/dashboard/ItemDetailsDrawer';
import { ItemCreateDrawer } from '@/web/components/dashboard/drawers/ItemCreateDrawer';
import { MovementFormDrawer } from '@/web/components/dashboard/drawers/MovementFormDrawer';
import { QuickItemPickerDrawer } from '@/web/components/dashboard/drawers/QuickItemPickerDrawer';
import { VendasView } from '@/web/components/gestao/vendas/VendasView';
import { OrderCreateDrawer } from '@/web/components/gestao/vendas/OrderCreateDrawer';
import { ClientesView } from '@/web/components/gestao/clientes/ClientesView';
import { ClientCreateDrawer } from '@/web/components/gestao/clientes/ClientCreateDrawer';
import { InicioDashboardView } from '@/web/components/dashboard/inicio/InicioDashboardView';
import { ToastContainer } from '@/web/components/feedback/ToastContainer';
import { AuthGuard } from '@/web/components/auth/AuthGuard';
import { useToast } from '@/web/hooks/useToast';
import type { GlobalSearchResult } from '@/web/hooks/useGlobalSearch';

export default function AlmoxarifadoDashboardPage() {
  const { toast } = useToast();

  // Tela inicial definida como 'inicio' (hub executivo da V2)
  const [telaAtiva, setTelaAtiva] = useState<TelaOuAba>('inicio');
  const [termoBusca, setTermoBusca] = useState('');
  const [filtroSituacao, setFiltroSituacao] = useState<'todos' | StatusCriticidade>('todos');
  const [itemSelecionado, setItemSelecionado] = useState<DashboardItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Estados dos Drawers e Modais Operacionais
  const [isItemCreateOpen, setIsItemCreateOpen] = useState(false);
  const [isOrderCreateOpen, setIsOrderCreateOpen] = useState(false);
  const [isClientCreateOpen, setIsClientCreateOpen] = useState(false);
  const [movementDrawerState, setMovementDrawerState] = useState<{
    isOpen: boolean;
    item: DashboardItem | null;
    tipo: 'Entrada' | 'Saída';
  }>({
    isOpen: false,
    item: null,
    tipo: 'Entrada',
  });
  const [pickerDrawerState, setPickerDrawerState] = useState<{
    isOpen: boolean;
    tipo: 'Entrada' | 'Saída';
  }>({
    isOpen: false,
    tipo: 'Entrada',
  });

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

  const handleOpenMovement = (item: DashboardItem, tipo: 'Entrada' | 'Saída') => {
    setMovementDrawerState({
      isOpen: true,
      item,
      tipo,
    });
  };

  const handleOpenMovementFromAtencao = async (
    itemAtencao: { id: string; nome: string; codigo: string; aba: AbaEstoque },
    tipo: 'Entrada' | 'Saída'
  ) => {
    const itemExistente = itens.find((i) => i.id === itemAtencao.id);
    if (itemExistente) {
      handleOpenMovement(itemExistente, tipo);
      return;
    }
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('@/core/services/firebase');
      const docSnap = await getDoc(doc(db, 'items', itemAtencao.id));
      if (docSnap.exists()) {
        const data = docSnap.data();
        const aba: AbaEstoque = itemAtencao.aba;
        const itemCompleto: DashboardItem = {
          id: docSnap.id,
          codigo: String(data.codigo || itemAtencao.codigo),
          descricao: String(data.descricao || data.nome || itemAtencao.nome),
          categoria: String(data.categoria || METADADOS_ABAS[aba].titulo),
          unidade: data.unidade || 'UNIDADE',
          estoqueAtual: Number(data.estoqueAtual) || 0,
          estoqueSeguranca: Number(data.estoqueSeguranca) || 0,
          capacidadeMaxima: Number(data.capacidadeMaxima) || 100,
          aba,
          tipo: data.tipo || 'PRODUTIVO_MATERIA_PRIMA',
          ativo: data.ativo ?? true,
          especificacoes: (data.especificacoes as Record<string, string>) || {},
          localizacaoFisica: data.localizacaoFisica || undefined,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
        };
        handleOpenMovement(itemCompleto, tipo);
      }
    } catch (err) {
      console.warn('Erro ao carregar item para movimentação:', err);
    }
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
  };

  const handleClearFilters = () => {
    setTermoBusca('');
    setFiltroSituacao('todos');
  };

  const handleSelectSearchResult = async (result: GlobalSearchResult) => {
    if (result.type === 'item' || result.type === 'nfe') {
      if (result.targetAba) {
        setTelaAtiva(result.targetAba);
      }
      if (result.targetItemId) {
        const itemEncontrado = itens.find((i) => i.id === result.targetItemId);
        if (itemEncontrado) {
          setItemSelecionado(itemEncontrado);
          setIsDrawerOpen(true);
        } else {
          try {
            const { doc, getDoc } = await import('firebase/firestore');
            const { db } = await import('@/core/services/firebase');
            const docSnap = await getDoc(doc(db, 'items', result.targetItemId));
            if (docSnap.exists()) {
              const data = docSnap.data();
              let aba: AbaEstoque = 'mp';
              if (data.tipo === 'IMPRODUTIVO_CONSUMIVEL') aba = 'imp';
              else if (data.tipo === 'ACABADO') aba = 'motos';

              const itemCompleto: DashboardItem = {
                id: docSnap.id,
                codigo: String(data.codigo || ''),
                descricao: String(data.descricao || data.nome || result.title),
                categoria: String(data.categoria || METADADOS_ABAS[aba].titulo),
                unidade: data.unidade || 'UNIDADE',
                estoqueAtual: Number(data.estoqueAtual) || 0,
                estoqueSeguranca: Number(data.estoqueSeguranca) || 0,
                capacidadeMaxima: Number(data.capacidadeMaxima) || 100,
                aba,
                tipo: data.tipo || 'PRODUTIVO_MATERIA_PRIMA',
                ativo: data.ativo ?? true,
                especificacoes: (data.especificacoes as Record<string, string>) || {},
                localizacaoFisica: data.localizacaoFisica || undefined,
                createdAt: data.createdAt || new Date().toISOString(),
                updatedAt: data.updatedAt || new Date().toISOString(),
              };
              setItemSelecionado(itemCompleto);
              setIsDrawerOpen(true);
              return;
            }
          } catch (err) {
            console.warn('Erro ao carregar item via busca global:', err);
          }
        }
      }
    } else if (result.type === 'cliente') {
      setTelaAtiva('clientes');
    } else if (result.type === 'pedido') {
      setTelaAtiva('vendas');
    }
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

        {/* Coluna Central com Topbar e Conteúdo */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header Superior com Breadcrumbs e Busca Geral */}
          <AppTopHeader
            telaAtiva={telaAtiva}
            onSelectTela={handleSelectTela}
            onSelectSearchResult={handleSelectSearchResult}
          />

          {/* Conteúdo Principal Full-Width de Alta Densidade */}
          <main className="flex-1 w-full px-4 py-4 md:px-7 md:py-6 flex flex-col min-w-0">
            {telaAtiva === 'inicio' ? (
              /* 1. Hub Executivo / Dashboard Inicial */
              <InicioDashboardView
                onNavegar={handleSelectTela}
                onRegistrarEntrada={() => setPickerDrawerState({ isOpen: true, tipo: 'Entrada' })}
                onRegistrarSaida={() => setPickerDrawerState({ isOpen: true, tipo: 'Saída' })}
                onNovoPedido={() => setIsOrderCreateOpen(true)}
                onNovoCadastro={() => setIsClientCreateOpen(true)}
                onSelectItem={async (itemAtencao) => {
                  setTelaAtiva(itemAtencao.aba);
                  await handleSelectSearchResult({
                    id: itemAtencao.id,
                    type: 'item',
                    title: itemAtencao.nome,
                    subtitle: itemAtencao.codigo,
                    targetAba: itemAtencao.aba,
                    targetItemId: itemAtencao.id,
                  });
                }}
                onAdicionarEntrada={(itemAtencao) => {
                  handleOpenMovementFromAtencao(itemAtencao, 'Entrada');
                }}
              />
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
                      onClick={() => setIsItemCreateOpen(true)}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-semibold text-white bg-[#1d4ea3] dark:bg-[#3273dc] hover:bg-blue-800 dark:hover:bg-blue-600 transition-colors cursor-pointer shadow-xs"
                      title="Cadastrar novo item nesta categoria"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>
                        {telaAtiva === 'mp'
                          ? 'Nova matéria-prima'
                          : telaAtiva === 'imp'
                          ? 'Novo material improdutivo'
                          : 'Nova peça de moto'}
                      </span>
                    </button>

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

                {/* Barra de Filtros e Busca Rápida com Contagem por Situação */}
                <StockFilterToolbar
                  busca={termoBusca}
                  onBuscaChange={setTermoBusca}
                  filtroSituacao={filtroSituacao}
                  onFiltroSituacaoChange={setFiltroSituacao}
                  contagemPorSituacao={{
                    todos: totalAba,
                    ok: Math.max(0, totalAba - totalAbaixoMinimo - totalCriticos),
                    low: totalAbaixoMinimo,
                    crit: totalCriticos,
                  }}
                  totalFiltrados={itens.length}
                />

                {/* Tabela de Alta Densidade com Ações Contextuais */}
                <StockTable
                  itens={itens}
                  onSelectItem={handleSelectItem}
                  onRegistrarEntrada={(item) => handleOpenMovement(item, 'Entrada')}
                  onRegistrarSaida={(item) => handleOpenMovement(item, 'Saída')}
                  onRegistrarBaixaRapida={(item) => handleOpenMovement(item, 'Saída')}
                  selectedItemId={itemSelecionado?.id}
                  isLoading={isLoading}
                  onClearFilters={handleClearFilters}
                />
              </div>
            ) : telaAtiva === 'vendas' ? (
              /* 3. Módulo de Vendas e Pedidos */
              <VendasView onNovoPedido={() => setIsOrderCreateOpen(true)} />
            ) : telaAtiva === 'clientes' ? (
              /* 4. Módulo de Clientes, Fornecedores e Parceiros */
              <ClientesView onNovoCadastro={() => setIsClientCreateOpen(true)} />
            ) : (
              /* 5. Placeholder / Próximos Módulos (Saída manual) */
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
        </div>

        {/* Drawer Lateral de Detalhes Técnicos e Histórico */}
        <ItemDetailsDrawer
          item={itemSelecionado}
          isOpen={isDrawerOpen}
          onClose={handleCloseDrawer}
          onRegistrarEntrada={(item) => {
            handleCloseDrawer();
            handleOpenMovement(item, 'Entrada');
          }}
          onRegistrarSaida={(item) => {
            handleCloseDrawer();
            handleOpenMovement(item, 'Saída');
          }}
        />

        {/* Gaveta de Criação de Pedido de Venda */}
        <OrderCreateDrawer
          isOpen={isOrderCreateOpen}
          onClose={() => setIsOrderCreateOpen(false)}
        />

        {/* Gaveta de Criação de Cliente / Parceiro */}
        <ClientCreateDrawer
          isOpen={isClientCreateOpen}
          onClose={() => setIsClientCreateOpen(false)}
        />

        {/* Gaveta de Criação de Item */}
        <ItemCreateDrawer
          isOpen={isItemCreateOpen}
          onClose={() => setIsItemCreateOpen(false)}
          aba={abaEstoqueAtiva}
          onItemCreated={(item) => {
            refetch();
            toast(`Material ${item.descricao} cadastrado com sucesso!`, { type: 'success' });
          }}
        />

        {/* Gaveta de Movimentação Física (Entrada / Saída) */}
        <MovementFormDrawer
          isOpen={movementDrawerState.isOpen}
          tipo={movementDrawerState.tipo}
          item={movementDrawerState.item}
          onClose={() => setMovementDrawerState((prev) => ({ ...prev, isOpen: false }))}
          onSuccess={() => {
            refetch();
            toast(
              movementDrawerState.tipo === 'Entrada'
                ? 'Entrada registrada com sucesso!'
                : 'Retirada registrada com sucesso!',
              { type: 'success' }
            );
          }}
        />

        {/* Modal Seletor Rápido de Materiais (usado pelas Ações Rápidas do Início) */}
        <QuickItemPickerDrawer
          isOpen={pickerDrawerState.isOpen}
          tipo={pickerDrawerState.tipo}
          onClose={() => setPickerDrawerState((prev) => ({ ...prev, isOpen: false }))}
          onSelectItem={(item) => {
            setPickerDrawerState((prev) => ({ ...prev, isOpen: false }));
            setMovementDrawerState({
              isOpen: true,
              item,
              tipo: pickerDrawerState.tipo,
            });
          }}
        />

        {/* Notificações Toast Operacionais Flutuantes */}
        <ToastContainer />
      </div>
    </AuthGuard>
  );
}
