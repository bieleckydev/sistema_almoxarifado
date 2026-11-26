'use client';

import { useState, useMemo } from 'react';
import { calcularValorTotalItem } from '@/core/services/custo-medio';
import { RefreshCw, Plus, Layers, Package, Wrench, Archive } from 'lucide-react';
import {
  type AbaEstoque,
  type TelaOuAba,
  type StatusCriticidade,
  type DashboardItem,
  type ModuloCorporativo,
  METADADOS_ABAS,
  obterModuloDeTela,
} from '@/web/data/mock-almoxarifado';
import type { TipoParceiro } from '@/core/domain/cliente.schema';
import { useItensEstoque } from '@/web/hooks/useItensEstoque';
import { useDebounce } from '@/web/hooks/useDebounce';
import { useDashboardResumo } from '@/web/hooks/useDashboardResumo';
import { useRequisicoes } from '@/web/hooks/useRequisicoes';
import { useAuthStore } from '@/core/store/useAuthStore';
import { usePermissao } from '@/web/hooks/usePermissao';
import { AppSidebar } from '@/web/components/layout/AppSidebar';
import { AppTopHeader } from '@/web/components/layout/AppTopHeader';
import { MobileBottomNav } from '@/web/components/layout/MobileBottomNav';
import { StockMetricsCards } from '@/web/components/dashboard/StockMetricsCards';
import { StockFilterToolbar } from '@/web/components/dashboard/StockFilterToolbar';
import { StockTable } from '@/web/components/dashboard/StockTable';
import { ItemDetailsDrawer } from '@/web/components/dashboard/ItemDetailsDrawer';
import { ItemCreateDrawer } from '@/web/components/dashboard/drawers/ItemCreateDrawer';
import { ItemEditDrawer } from '@/web/components/dashboard/drawers/ItemEditDrawer';
import { InactiveItemsDrawer } from '@/web/components/dashboard/drawers/InactiveItemsDrawer';
import { EtiquetaItemModal } from '@/web/components/dashboard/modals/EtiquetaItemModal';
import { MovementFormDrawer } from '@/web/components/dashboard/drawers/MovementFormDrawer';
import { QuickItemPickerDrawer } from '@/web/components/dashboard/drawers/QuickItemPickerDrawer';
import { VendasView } from '@/web/components/gestao/vendas/VendasView';
import { OrderCreateDrawer } from '@/web/components/gestao/vendas/OrderCreateDrawer';
import { ClientesView } from '@/web/components/gestao/clientes/ClientesView';
import { ClientCreateDrawer } from '@/web/components/gestao/clientes/ClientCreateDrawer';
import { SaidaManualView } from '@/web/components/gestao/saida/SaidaManualView';
import { FaturamentoView } from '@/web/components/gestao/faturamento/FaturamentoView';
import { FaturarPedidoDrawer } from '@/web/components/gestao/faturamento/FaturarPedidoDrawer';
import { TerceirosView } from '@/web/components/gestao/terceiros/TerceirosView';
import { ReceberTerceiroDrawer } from '@/web/components/gestao/terceiros/ReceberTerceiroDrawer';
import { InventarioView } from '@/web/components/gestao/inventario/InventarioView';
import { RequisicoesView } from '@/web/components/gestao/requisicoes/RequisicoesView';
import { AuditoriaView } from '@/web/components/gestao/auditoria/AuditoriaView';
import { UsuariosView } from '@/web/components/gestao/usuarios/UsuariosView';
import { ColaboradoresView } from '@/web/components/gestao/colaboradores/ColaboradoresView';
import { UserCreateDrawer } from '@/web/components/gestao/usuarios/UserCreateDrawer';
import { useFaturamento } from '@/web/hooks/useFaturamento';
import { useMaterialTerceiros } from '@/web/hooks/useMaterialTerceiros';
import type { PedidoAFaturarItem } from '@/web/app/api/faturamento/route';
import { InicioDashboardView } from '@/web/components/dashboard/inicio/InicioDashboardView';
import { LevantamentoEstoqueView } from '@/web/components/dashboard/levantamento/LevantamentoEstoqueView';
import { PainelEcommerceView } from '@/web/components/gestao/ecommerce/PainelEcommerceView';
import { ToastContainer } from '@/web/components/feedback/ToastContainer';
import { AuthGuard } from '@/web/components/auth/AuthGuard';
import { useToast } from '@/web/hooks/useToast';
import type { GlobalSearchResult } from '@/web/hooks/useGlobalSearch';

export default function AlmoxarifadoDashboardPage() {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const { podeVer, gerarAvisoTelaBloqueada } = usePermissao();

  // Navegação 3.0: Módulo contextual e tela ativa
  const [moduloAtivo, setModuloAtivo] = useState<ModuloCorporativo>('inicio');
  const [telaAtiva, setTelaAtiva] = useState<TelaOuAba>('inicio');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [termoBusca, setTermoBusca] = useState('');
  const [filtroSituacao, setFiltroSituacao] = useState<'todos' | StatusCriticidade>('todos');
  const [itemSelecionado, setItemSelecionado] = useState<DashboardItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [triggerExportCSV, setTriggerExportCSV] = useState<boolean>(false);

  // Estados dos Drawers e Modais Operacionais
  const [isItemCreateOpen, setIsItemCreateOpen] = useState(false);
  const [isInactiveItemsOpen, setIsInactiveItemsOpen] = useState(false);
  const [isUserCreateOpen, setIsUserCreateOpen] = useState(false);
  const [itemParaEditar, setItemParaEditar] = useState<DashboardItem | null>(null);
  const [itemParaEtiqueta, setItemParaEtiqueta] = useState<DashboardItem | null>(null);
  const [isOrderCreateOpen, setIsOrderCreateOpen] = useState(false);
  const [isClientCreateOpen, setIsClientCreateOpen] = useState(false);
  const [clientCreateTipoInicial, setClientCreateTipoInicial] = useState<TipoParceiro | undefined>(undefined);
  const [filtroClientesInicial, setFiltroClientesInicial] = useState<'TODOS' | TipoParceiro>('TODOS');
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
  const [pedidoFaturarState, setPedidoFaturarState] = useState<{
    isOpen: boolean;
    pedido: PedidoAFaturarItem | null;
  }>({
    isOpen: false,
    pedido: null,
  });
  const [isReceberTerceiroOpen, setIsReceberTerceiroOpen] = useState(false);

  const { faturarPedido, kpis: faturamentoKpis } = useFaturamento();
  const { receberMaterial, isRecebendo: isRecebendoTerceiro } = useMaterialTerceiros();

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

  // Total de itens críticos consolidados para a badge do Estoque
  const totalCriticosGerais = Object.values(contagemCriticosPorAba).reduce(
    (acc, curr) => acc + curr,
    0
  );

  // Valor total consolidado em estoque para a aba ativa (3.0)
  const valorTotalEstoque = useMemo(() => {
    return itens.reduce(
      (acc, item) => acc + calcularValorTotalItem(item.estoqueAtual, item.custoUnitario),
      0
    );
  }, [itens]);

  // Hook para monitorar requisições pendentes para a badge da sidebar
  const { data: requisicoesData } = useRequisicoes();

  const handleSelectTela = (novaTela: TelaOuAba) => {
    // Verificação de permissão baseada no perfil de acesso (RBAC 3.0)
    if (!podeVer(novaTela)) {
      toast(gerarAvisoTelaBloqueada(novaTela), { type: 'error' });
      return;
    }

    setTelaAtiva(novaTela);
    setTermoBusca('');
    setFiltroSituacao('todos');
    setItemSelecionado(null);
    setIsDrawerOpen(false);
    setFiltroClientesInicial('TODOS');
    // Atualiza o módulo corporativo contextual inferido pela tela
    setModuloAtivo((prev) => obterModuloDeTela(novaTela, prev));
  };

  const handleSelectModulo = (novoModulo: ModuloCorporativo) => {
    setModuloAtivo(novoModulo);
    if (novoModulo === 'inicio') {
      handleSelectTela('inicio');
    } else if (novoModulo === 'estoque') {
      handleSelectTela('mp');
    } else if (novoModulo === 'compras') {
      handleSelectTela('saida');
    } else if (novoModulo === 'vendas') {
      handleSelectTela('vendas');
    }
  };

  const handleRibbonAction = (action: string) => {
    const separadorIndex = action.indexOf(':');
    const tipo = separadorIndex < 0 ? action : action.slice(0, separadorIndex);
    const param = separadorIndex < 0 ? '' : action.slice(separadorIndex + 1);

    if (tipo === 'v') {
      if (param === 'inicio') {
        handleSelectModulo('inicio');
      } else if (param === 'mp' || param === 'imp' || param === 'motos') {
        setModuloAtivo('estoque');
        handleSelectTela(param as TelaOuAba);
      } else if (param === 'vendas') {
        setModuloAtivo('vendas');
        handleSelectTela('vendas');
      } else if (param === 'fat') {
        setModuloAtivo('vendas');
        handleSelectTela('fat');
      } else if (param === 'ecom') {
        setModuloAtivo('vendas');
        handleSelectTela('ecom');
      } else if (param === 'terc') {
        setModuloAtivo('estoque');
        handleSelectTela('terc');
      } else if (param === 'saida') {
        handleSelectTela('saida');
      } else if (param === 'clientes') {
        handleSelectTela('clientes');
      }
    } else if (tipo === 'receberterceiro') {
      setIsReceberTerceiroOpen(true);
    } else if (tipo === 'novoitem') {
      const aba = (param || 'mp') as AbaEstoque;
      setModuloAtivo('estoque');
      handleSelectTela(aba);
      setIsItemCreateOpen(true);
    } else if (tipo === 'pick') {
      setPickerDrawerState({
        isOpen: true,
        tipo: param === 'Saída' ? 'Saída' : 'Entrada',
      });
    } else if (tipo === 'novopedido') {
      setIsOrderCreateOpen(true);
    } else if (tipo === 'novocad') {
      handleOpenClientCreate((param as TipoParceiro) || 'CLIENTE');
    } else if (tipo === 'fc') {
      const tipoFiltro = (param as 'TODOS' | TipoParceiro) || 'TODOS';
      setFiltroClientesInicial(tipoFiltro);
      handleSelectTela('clientes');
    } else if (tipo === 'csv') {
      handleSelectTela('saida');
      setTriggerExportCSV(true);
    }
  };

  const handleSelectItem = (item: DashboardItem) => {
    setItemSelecionado(item);
    setIsDrawerOpen(true);
  };

  const handleOpenClientCreate = (tipo?: TipoParceiro) => {
    setClientCreateTipoInicial(tipo);
    setIsClientCreateOpen(true);
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
    } else if (result.type === 'faturamento') {
      setTelaAtiva('fat');
    } else if (result.type === 'terceiro') {
      setTelaAtiva('terc');
    }
  };

  const isAbaEstoque = telaAtiva === 'mp' || telaAtiva === 'imp' || telaAtiva === 'motos';
  const metadadosAba = isAbaEstoque ? METADADOS_ABAS[telaAtiva] : null;

  return (
    <AuthGuard>
      <div className="flex flex-col md:flex-row min-h-screen bg-surface text-on-surface">
        {/* Menu Lateral de Navegação em Módulos WMS Stitch */}
        <AppSidebar
          moduloAtivo={moduloAtivo}
          telaAtiva={telaAtiva}
          onSelectModulo={handleSelectModulo}
          onSelectTela={handleSelectTela}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          totalCriticos={totalCriticosGerais}
          contagemCriticos={contagemCriticosPorAba}
          pedidosAtrasadosCount={resumoGeral?.vendas.atrasados ?? 0}
          pedidosAFaturarCount={faturamentoKpis?.totalPedidosAFaturar ?? 0}
          requisicoesPendentesCount={requisicoesData?.pendentes ?? 0}
        />

        {/* Coluna Central com Header e Conteúdo */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Barra Superior Master WMS Stitch */}
          <AppTopHeader
            telaAtiva={telaAtiva}
            onSelectTela={handleSelectTela}
            onSelectSearchResult={handleSelectSearchResult}
            onRegistrarEntrada={() => setPickerDrawerState({ isOpen: true, tipo: 'Entrada' })}
            onRegistrarSaida={() => setPickerDrawerState({ isOpen: true, tipo: 'Saída' })}
            onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
            totalAlertas={totalCriticosGerais}
          />

          {/* Conteúdo Principal Full-Width de Alta Densidade */}
          <main className="flex-1 w-full px-3 py-3 sm:px-4 sm:py-4 md:px-7 md:py-6 pb-24 md:pb-6 flex flex-col min-w-0">
            {telaAtiva === 'inicio' ? (
              /* 1. Hub Executivo / Dashboard Inicial */
              <InicioDashboardView
                onNavegar={handleSelectTela}
                onRegistrarEntrada={() => setPickerDrawerState({ isOpen: true, tipo: 'Entrada' })}
                onRegistrarSaida={() => setPickerDrawerState({ isOpen: true, tipo: 'Saída' })}
                onReceberTerceiro={() => setIsReceberTerceiroOpen(true)}
                onNovoPedido={() => setIsOrderCreateOpen(true)}
                onNovoMaterial={() => setIsItemCreateOpen(true)}
                onNovoUsuario={user?.role === 'mestre' ? () => setIsUserCreateOpen(true) : undefined}
                onNovoCadastro={() => setIsItemCreateOpen(true)}
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
                {/* Abas Superiores de Categoria & Ações de Topo no padrão Stitch Screen 3 */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/20 mb-4 pb-2">
                  <nav className="flex items-center gap-1.5 overflow-x-auto" aria-label="Categorias de estoque">
                    {[
                      { id: 'mp' as const, rotulo: 'Matéria-prima', icon: Layers },
                      { id: 'imp' as const, rotulo: 'Materiais Improdutivos', icon: Package },
                      { id: 'motos' as const, rotulo: 'Peças & Componentes', icon: Wrench },
                    ].map(({ id, rotulo, icon: IconComponent }) => {
                      const isActive = telaAtiva === id;
                      const criticos = contagemCriticosPorAba[id] || 0;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => handleSelectTela(id)}
                          className={`flex items-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            isActive
                              ? 'bg-primary text-on-primary shadow-xs'
                              : 'bg-surface-container-low hover:bg-surface-container text-secondary hover:text-on-surface'
                          }`}
                        >
                          <IconComponent className="w-4 h-4 shrink-0" />
                          <span>{rotulo}</span>
                          {criticos > 0 && (
                            <span
                              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                                isActive
                                  ? 'bg-white/20 text-white'
                                  : 'bg-error-container text-on-error-container'
                              }`}
                            >
                              {criticos}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </nav>

                  {/* Ações do Cabeçalho */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => setIsItemCreateOpen(true)}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-on-primary bg-primary hover:bg-primary/90 transition-colors cursor-pointer shadow-xs"
                      title="Cadastrar novo item nesta categoria"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>
                        {telaAtiva === 'mp'
                          ? 'Nova matéria-prima'
                          : telaAtiva === 'imp'
                          ? 'Novo improdutivo'
                          : 'Nova peça de moto'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsInactiveItemsOpen(true)}
                      className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-medium text-secondary hover:text-on-surface bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 transition-colors cursor-pointer"
                      title="Ver e reativar itens inativos desta categoria"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Inativos</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => refetch()}
                      disabled={isLoading || isFetching}
                      className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-medium text-secondary hover:text-on-surface bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 transition-colors cursor-pointer disabled:opacity-50"
                      title="Recarregar dados do estoque"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                      <span className="hidden sm:inline">Atualizar</span>
                    </button>
                  </div>
                </div>

                {/* Cards de Métricas Operacionais Clicáveis */}
                <StockMetricsCards
                  totalItens={totalAba}
                  totalAbaixoMinimo={totalAbaixoMinimo}
                  totalCriticos={totalCriticos}
                  valorTotalEstoque={valorTotalEstoque}
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
                  onImprimirEtiqueta={(item) => setItemParaEtiqueta(item)}
                  selectedItemId={itemSelecionado?.id}
                  isLoading={isLoading}
                  onClearFilters={handleClearFilters}
                />
              </div>
            ) : telaAtiva === 'levantamento' ? (
              /* Levantamento e queima de estoque (giro, excedente e exportação CSV) */
              <LevantamentoEstoqueView onSelectItem={handleSelectItem} />
            ) : telaAtiva === 'vendas' ? (
              /* 3. Módulo de Vendas e Pedidos */
              <VendasView
                onNovoPedido={() => setIsOrderCreateOpen(true)}
                onFaturarPedido={(p) => {
                  setPedidoFaturarState({
                    isOpen: true,
                    pedido: {
                      id: p.id,
                      numeroSequencial: p.numeroSequencial,
                      clienteId: p.clienteId,
                      clienteNome: p.clienteNome,
                      prazoEntrega: p.prazoEntrega,
                      status: p.status,
                      valorTotal: p.valorTotal || 0,
                      itensResumo: p.itensDetalhes
                        .map((i) => `${i.quantidade}x ${i.nome}`)
                        .join(', '),
                    },
                  });
                }}
              />
            ) : telaAtiva === 'fat' ? (
              /* 4. Módulo de Faturamento e Notas Fiscais */
              <FaturamentoView onNavegarPedidos={() => handleSelectTela('vendas')} />
            ) : telaAtiva === 'ecom' ? (
              /* Painel e-commerce de peças de motos (vender x produzir) */
              <PainelEcommerceView
                onSelectItem={handleSelectItem}
                onRegistrarEntrada={(item) => handleOpenMovement(item, 'Entrada')}
                onNovoPedido={() => setIsOrderCreateOpen(true)}
              />
            ) : telaAtiva === 'terc' ? (
              /* 5. Módulo de Material de Terceiros (Industrialização por Encomenda) */
              <TerceirosView onNavegarFaturamento={() => handleSelectTela('fat')} />
            ) : telaAtiva === 'clientes' ? (
              /* 5. Módulo de Clientes, Fornecedores e Parceiros */
              <ClientesView
                onNovoCadastro={handleOpenClientCreate}
                filtroInicial={filtroClientesInicial}
              />
            ) : telaAtiva === 'saida' ? (
              /* 5. Módulo de Saída Manual, Relatórios Analíticos e Exportação CSV */
              <SaidaManualView
                triggerExportCsv={triggerExportCSV}
                onExportCsvDone={() => setTriggerExportCSV(false)}
                onSelectItem={(item) => {
                  setItemSelecionado(item);
                  setIsDrawerOpen(true);
                }}
              />
            ) : telaAtiva === 'req' ? (
              /* 6. Módulo de Requisições de Material (3.0) */
              <RequisicoesView />
            ) : telaAtiva === 'inv' ? (
              /* 7. Módulo de Inventário Físico & Contagem Direta (3.0) */
              <InventarioView />
            ) : telaAtiva === 'aud' ? (
              /* 8. Módulo de Auditoria Operacional & Compliance (3.0) */
              <AuditoriaView />
            ) : telaAtiva === 'colab' ? (
              /* Cadastro de colaboradores fabris (baixas internas) */
              <ColaboradoresView />
            ) : telaAtiva === 'usuarios' ? (
              /* 9. Módulo de Gestão de Usuários & Acessos (Mestre) */
              <UsuariosView onNovoUsuario={() => setIsUserCreateOpen(true)} />
            ) : (
              /* 9. Fallback / Telas Desconhecidas */
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
          onEditarItem={(item) => {
            handleCloseDrawer();
            setItemParaEditar(item);
          }}
          onImprimirEtiqueta={(item) => {
            setItemParaEtiqueta(item);
          }}
          onMovimentacaoEstornada={() => {
            refetch();
          }}
        />

        {/* Gaveta de Edição de Cadastro de Material (3.0) */}
        <ItemEditDrawer
          isOpen={Boolean(itemParaEditar)}
          item={itemParaEditar}
          onClose={() => setItemParaEditar(null)}
          onItemUpdated={(itemAtualizado) => {
            refetch();
            setItemSelecionado(itemAtualizado.ativo === false ? null : itemAtualizado);
          }}
        />

        {/* Gaveta de Itens Inativos (reativação) */}
        <InactiveItemsDrawer
          isOpen={isInactiveItemsOpen}
          aba={abaEstoqueAtiva}
          onClose={() => setIsInactiveItemsOpen(false)}
          onItemReativado={() => refetch()}
        />

        {/* Modal de Impressão de Etiqueta Térmica (3.0) */}
        <EtiquetaItemModal
          isOpen={Boolean(itemParaEtiqueta)}
          item={itemParaEtiqueta}
          onClose={() => setItemParaEtiqueta(null)}
        />

        {/* Gaveta de Criação de Pedido de Venda */}
        <OrderCreateDrawer
          isOpen={isOrderCreateOpen}
          onClose={() => setIsOrderCreateOpen(false)}
        />

        {/* Gaveta de Criação de Cliente / Parceiro */}
        <ClientCreateDrawer
          isOpen={isClientCreateOpen}
          onClose={() => {
            setIsClientCreateOpen(false);
            setClientCreateTipoInicial(undefined);
          }}
          tipoInicial={clientCreateTipoInicial}
        />

        {/* Gaveta de Criação de Usuário (Mestre) */}
        <UserCreateDrawer
          isOpen={isUserCreateOpen}
          onClose={() => setIsUserCreateOpen(false)}
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

        {/* Gaveta de Faturamento de Pedido */}
        <FaturarPedidoDrawer
          isOpen={pedidoFaturarState.isOpen}
          pedido={pedidoFaturarState.pedido}
          onClose={() => setPedidoFaturarState({ isOpen: false, pedido: null })}
          onFaturar={async (dados) => {
            await faturarPedido(dados);
          }}
        />

        {/* Gaveta de Recebimento de Material de Terceiro */}
        <ReceberTerceiroDrawer
          isOpen={isReceberTerceiroOpen}
          onClose={() => setIsReceberTerceiroOpen(false)}
          onSalvar={async (dados) => {
            await receberMaterial(dados);
            setIsReceberTerceiroOpen(false);
          }}
          isSalvando={isRecebendoTerceiro}
        />


        {/* Barra de Navegação Inferior Móvel para Tablets e Celulares */}
        <MobileBottomNav
          telaAtiva={telaAtiva}
          onSelectTela={handleSelectTela}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        />

        {/* Notificações Toast Operacionais Flutuantes */}
        <ToastContainer />
      </div>
    </AuthGuard>
  );
}
