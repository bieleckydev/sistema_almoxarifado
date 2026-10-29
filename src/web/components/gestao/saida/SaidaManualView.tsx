'use client';

import React, { useState, useMemo } from 'react';
import {
  Download,
  RefreshCw,
  Search,
  X,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Layers,
  Wrench,
  Bike,
  AlertCircle,
  Loader2,
  Calendar,
  Send,
  History,
  CheckSquare,
  Package,
  Activity,
  Radio,
  FileSpreadsheet,
  Tag,
  ArrowUpDown,
  ShoppingCart,
} from 'lucide-react';
import {
  useMovimentacoesPeriodo,
  type PeriodoFiltro,
  hoje,
} from '@/web/hooks/useMovimentacoesPeriodo';
import { exportarMovimentacoesCSV } from './exportCsv';
import { useToast } from '@/web/hooks/useToast';
import {
  type DashboardItem,
  UNIDADE_LABELS,
  METADADOS_ABAS,
} from '@/web/data/mock-almoxarifado';
import { ColaboradorSelect } from '@/web/components/common/ColaboradorSelect';
import type { Colaborador } from '@/core/domain/colaborador.schema';

export interface SaidaManualViewProps {
  onSelectItem?: (item: DashboardItem) => void;
  triggerExportCsv?: boolean;
  onExportCsvDone?: () => void;
  onAbrirBaixaRapida?: () => void;
}

const PERIODOS: PeriodoFiltro[] = ['Hoje', 'Ontem', '7 dias', 'Tudo'];

export function SaidaManualView({
  onSelectItem,
  triggerExportCsv,
  onExportCsvDone,
  onAbrirBaixaRapida,
}: SaidaManualViewProps) {
  const { toast } = useToast();
  const {
    periodo,
    setPeriodo,
    busca,
    setBusca,
    itens,
    movimentacoes,
    resumoItens,
    isLoading,
    isFetching,
    refetch,
    registrarMovimentacao,
    isRegistrando,
  } = useMovimentacoesPeriodo();

  // Estados do formulário embutido "Registrar movimentação"
  const [dataMov, setDataMov] = useState(hoje());
  const [tipoMov, setTipoMov] = useState<'Saída' | 'Entrada'>('Saída');
  const [itemId, setItemId] = useState<string>('');
  const [quantidade, setQuantidade] = useState<number>(1);
  const [quem, setQuem] = useState('Produção');
  const [colaboradorSelecionado, setColaboradorSelecionado] = useState<Colaborador | null>(null);
  const [documentoOp, setDocumentoOp] = useState('');
  const [observacao, setObservacao] = useState('');
  const [erroForm, setErroForm] = useState<string | null>(null);

  // Filtro local de tipo para o ledger histórico
  const [filtroTipoLedger, setFiltroTipoLedger] = useState<'todos' | 'Saída' | 'Entrada'>('todos');

  // Inicializa o primeiro item selecionado quando a lista de itens carrega
  React.useEffect(() => {
    if (!itemId && itens.length > 0) {
      setItemId(itens[0].id);
    }
  }, [itemId, itens]);

  const itemSelecionado = useMemo(() => {
    return itens.find((it) => it.id === itemId) || itens[0] || null;
  }, [itens, itemId]);

  // Agrupamento dos itens para o <select>
  const itensPorAba = useMemo(() => {
    return {
      mp: itens.filter((it) => it.aba === 'mp'),
      imp: itens.filter((it) => it.aba === 'imp'),
      motos: itens.filter((it) => it.aba === 'motos'),
    };
  }, [itens]);

  // Estatísticas do turno/período para os 4 KPI Cards
  const statsPeriodo = useMemo(() => {
    const totalApontamentos = movimentacoes.length;
    const saidas = movimentacoes.filter((m) => m.tipo === 'Saída');
    const entradas = movimentacoes.filter((m) => m.tipo === 'Entrada');
    const totalQtdSaidas = saidas.reduce((acc, m) => acc + m.quantidade, 0);
    const totalQtdEntradas = entradas.reduce((acc, m) => acc + m.quantidade, 0);
    const skusMovimentados = resumoItens.length;

    return {
      totalApontamentos,
      totalSaidasCount: saidas.length,
      totalEntradasCount: entradas.length,
      totalQtdSaidas,
      totalQtdEntradas,
      skusMovimentados,
    };
  }, [movimentacoes, resumoItens]);

  // Movimentações filtradas por tipo na tabela do ledger
  const movimentacoesFiltradas = useMemo(() => {
    if (filtroTipoLedger === 'todos') return movimentacoes;
    return movimentacoes.filter((m) => m.tipo === filtroTipoLedger);
  }, [movimentacoes, filtroTipoLedger]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroForm(null);

    if (!dataMov) {
      setErroForm('Informe a data da operação.');
      return;
    }

    if (!itemSelecionado) {
      setErroForm('Selecione um produto para movimentar.');
      return;
    }

    if (quantidade <= 0) {
      setErroForm('Informe uma quantidade válida maior que zero.');
      return;
    }

    if (tipoMov === 'Saída') {
      if (!colaboradorSelecionado) {
        setErroForm('Selecione o colaborador responsável pela retirada do material.');
        return;
      }
    } else {
      if (!quem.trim()) {
        setErroForm('Informe o fornecedor ou procedência de entrada.');
        return;
      }
    }

    const unidadeFmt =
      UNIDADE_LABELS[itemSelecionado.unidade] || itemSelecionado.unidade.toLowerCase();

    if (tipoMov === 'Saída' && quantidade > itemSelecionado.estoqueAtual) {
      setErroForm(
        `Saldo insuficiente: há apenas ${itemSelecionado.estoqueAtual.toLocaleString('pt-BR')} ${unidadeFmt} disponíveis de ${itemSelecionado.descricao}.`
      );
      return;
    }

    // Monta observação com documento/OP se fornecido
    const obsFinal = documentoOp.trim()
      ? `[Doc: ${documentoOp.trim()}] ${observacao.trim()}`.trim()
      : observacao.trim();

    try {
      await registrarMovimentacao({
        itemId: itemSelecionado.id,
        tipo: tipoMov,
        quantidade,
        quem: tipoMov === 'Saída' ? colaboradorSelecionado!.nome : quem.trim(),
        colaboradorId: tipoMov === 'Saída' ? colaboradorSelecionado!.id : undefined,
        setor: tipoMov === 'Saída' ? colaboradorSelecionado!.setor : undefined,
        observacao: obsFinal || undefined,
        data: dataMov,
      });

      toast('Movimentação registrada com sucesso!', { type: 'success' });
      setObservacao('');
      setDocumentoOp('');
      setQuantidade(1);
      setColaboradorSelecionado(null);
      setErroForm(null);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as Error)?.message ||
        'Erro ao processar movimentação.';
      setErroForm(msg);
    }
  };

  const handleExportarCSV = () => {
    if (movimentacoes.length === 0) {
      toast('Não há movimentações para exportar no período selecionado.', {
        type: 'info',
      });
      return;
    }

    const listaExportar = movimentacoes.map((m) => {
      const unidadeFmt = m.item
        ? UNIDADE_LABELS[m.item.unidade] || m.item.unidade.toLowerCase()
        : 'un';

      return {
        data: m.data,
        hora: m.hora,
        tipo: m.tipo,
        codigo: m.item?.codigo || '',
        item: m.item?.descricao || 'Material',
        quantidade: m.quantidade,
        unidade: unidadeFmt,
        responsavel: m.quem,
        nfe: m.info?.['NF-e'] || '',
        observacao: m.obs || '',
      };
    });

    exportarMovimentacoesCSV(listaExportar);
    toast('Relatório CSV gerado com sucesso!', { type: 'success' });
  };

  // Disparo automático via Ribbon (ação 'csv')
  React.useEffect(() => {
    if (triggerExportCsv && movimentacoes.length > 0) {
      handleExportarCSV();
      onExportCsvDone?.();
    }
  }, [triggerExportCsv, movimentacoes.length]);

  return (
    <div className="flex-1 flex flex-col min-w-0 animate-fade-in gap-5">
      {/* 1. Cabeçalho Principal no padrão Stitch */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant/20">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-normal text-on-surface">
            Movimentação &amp; Apontamentos Rápidos
          </h1>
          <p className="text-xs text-secondary mt-0.5 font-normal">
            Lançamento direto em grade com conferência automática de saldo físico e auditoria de turno.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          {onAbrirBaixaRapida && (
            <button
              type="button"
              onClick={onAbrirBaixaRapida}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-amber-800 dark:text-amber-200 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 border border-amber-200/50 dark:border-amber-800/40 transition-colors cursor-pointer shadow-xs"
              title="Abrir carrinho de retirada em lote para o chão de fábrica"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Retirada em Lote</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportarCSV}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-on-primary bg-primary hover:bg-primary/90 transition-colors cursor-pointer shadow-xs"
            title="Exportar dados do relatório para arquivo CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Baixar CSV</span>
          </button>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isLoading || isFetching}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-medium text-secondary hover:text-on-surface bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 transition-colors cursor-pointer disabled:opacity-50"
            title="Recarregar movimentações"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </header>

      {/* 2. Grid de 4 Cards de KPIs de Movimentação (Stitch Screen 1) */}
      <section
        aria-label="Indicadores de movimentação"
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
      >
        {/* Card 1: Total de Apontamentos */}
        <div className="relative overflow-hidden rounded-xl bg-surface-container-lowest p-4 border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
          <div className="flex items-start justify-between">
            <div>
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-semibold">
                Apontamentos no Turno
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-kpi-value text-3xl font-extrabold text-on-surface tabular-nums">
                  {statsPeriodo.totalApontamentos.toLocaleString('pt-BR')}
                </span>
                <span className="font-label-md text-label-md text-secondary">
                  registros
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-outline-variant/20 flex items-center justify-between text-xs text-secondary">
            <span>Período: <strong>{periodo}</strong></span>
            <span className="text-primary font-medium">100% auditado</span>
          </div>
        </div>

        {/* Card 2: Baixas / Saídas */}
        <div className="relative overflow-hidden rounded-xl bg-surface-container-lowest p-4 border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-error" />
          <div className="flex items-start justify-between">
            <div>
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-error font-semibold">
                Saídas / Baixas
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-kpi-value text-3xl font-extrabold text-error tabular-nums">
                  {statsPeriodo.totalSaidasCount.toLocaleString('pt-BR')}
                </span>
                <span className="font-label-md text-label-md text-error/80">
                  baixas
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-error-container flex items-center justify-center text-error shrink-0">
              <ArrowDownRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-outline-variant/20 flex items-center justify-between text-xs text-secondary">
            <span className="text-error font-medium">Consumo de produção</span>
            <span className="font-mono text-error">-{statsPeriodo.totalQtdSaidas.toLocaleString('pt-BR')} un</span>
          </div>
        </div>

        {/* Card 3: Entradas / Recebimentos */}
        <div className="relative overflow-hidden rounded-xl bg-surface-container-lowest p-4 border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-tertiary" />
          <div className="flex items-start justify-between">
            <div>
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-semibold">
                Entradas Registradas
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-kpi-value text-3xl font-extrabold text-on-surface tabular-nums">
                  {statsPeriodo.totalEntradasCount.toLocaleString('pt-BR')}
                </span>
                <span className="font-label-md text-label-md text-secondary">
                  entradas
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-tertiary/10 flex items-center justify-center text-tertiary shrink-0">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-outline-variant/20 flex items-center justify-between text-xs text-secondary">
            <span className="text-tertiary font-medium">Reposição e compras</span>
            <span className="font-mono text-tertiary">+{statsPeriodo.totalQtdEntradas.toLocaleString('pt-BR')} un</span>
          </div>
        </div>

        {/* Card 4: SKUs Movimentados */}
        <div className="relative overflow-hidden rounded-xl bg-surface-container-lowest p-4 border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-secondary-fixed-dim" />
          <div className="flex items-start justify-between">
            <div>
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-semibold">
                Materiais Ativos
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-kpi-value text-3xl font-extrabold text-on-surface tabular-nums">
                  {statsPeriodo.skusMovimentados.toLocaleString('pt-BR')}
                </span>
                <span className="font-label-md text-label-md text-secondary">
                  SKUs
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-secondary shrink-0">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-outline-variant/20 flex items-center justify-between text-xs text-secondary">
            <span>Com variação de saldo</span>
            <span className="text-on-surface font-semibold">{itens.length} em catálogo</span>
          </div>
        </div>
      </section>

      {/* 3. Painel de Apontamento Rápido em Grade (Fast Entry Pointing Form) */}
      <section
        aria-label="Registrar movimentação avulsa"
        className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-5 shadow-xs relative overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-outline-variant/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-headline-sm text-sm font-bold text-on-surface">
                Registrar Movimentação &amp; Apontamento Manual
              </h2>
              <p className="font-body-sm text-xs text-secondary">
                Lançamento direto em grade com conferência automática de saldo físico.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-tertiary/10 text-tertiary text-xs font-semibold">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>Coletor RF Operacional</span>
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 text-xs">
            {/* Campo 1: Data */}
            <div className="lg:col-span-3 flex flex-col gap-1.5">
              <label className="font-label-md text-xs font-semibold text-secondary flex items-center justify-between">
                <span>Data da Operação</span>
                <span className="text-primary text-[10px] uppercase font-bold">Obrigatório</span>
              </label>
              <div className="relative flex items-center">
                <Calendar className="absolute left-3 w-4 h-4 text-outline pointer-events-none" />
                <input
                  type="date"
                  name="data"
                  value={dataMov}
                  max={hoje()}
                  onChange={(e) => setDataMov(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-surface-container-low text-on-surface text-xs font-medium border border-outline-variant/20 focus:bg-surface-container-lowest focus:border-primary/50 outline-none transition-colors shadow-2xs"
                />
              </div>
            </div>

            {/* Campo 2: Tipo de Movimento */}
            <div className="lg:col-span-3 flex flex-col gap-1.5">
              <label className="font-label-md text-xs font-semibold text-secondary flex items-center justify-between">
                <span>Natureza da Operação</span>
                <span className="text-secondary text-[10px]">Tipo</span>
              </label>
              <div className="relative flex items-center">
                <ArrowUpDown className="absolute left-3 w-4 h-4 text-outline pointer-events-none" />
                <select
                  name="tipo"
                  value={tipoMov}
                  onChange={(e) => setTipoMov(e.target.value as 'Saída' | 'Entrada')}
                  className="w-full pl-9 pr-8 py-2 rounded-lg bg-surface-container-low text-on-surface text-xs font-semibold border border-outline-variant/20 focus:bg-surface-container-lowest focus:border-primary/50 outline-none transition-colors shadow-2xs appearance-none cursor-pointer"
                >
                  <option value="Saída">Saída / Baixa para Produção</option>
                  <option value="Entrada">Entrada por Compra / Devolução</option>
                </select>
              </div>
            </div>

            {/* Campo 3: Documento / OP / NF-e */}
            <div className="lg:col-span-6 flex flex-col gap-1.5">
              <label className="font-label-md text-xs font-semibold text-secondary flex items-center justify-between">
                <span>Ordem de Produção (OP) ou NF-e</span>
                <span className="text-secondary text-[10px]">Rastreabilidade</span>
              </label>
              <div className="relative flex items-center">
                <Tag className="absolute left-3 w-4 h-4 text-outline pointer-events-none" />
                <input
                  type="text"
                  value={documentoOp}
                  onChange={(e) => setDocumentoOp(e.target.value)}
                  placeholder="Ex: OP-2026-884 ou NF-10492"
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-surface-container-low text-on-surface text-xs font-medium border border-outline-variant/20 focus:bg-surface-container-lowest focus:border-primary/50 outline-none transition-colors shadow-2xs"
                />
              </div>
            </div>

            {/* Campo 4: Produto / Insumo com Saldo Atual em tempo real */}
            <div className="lg:col-span-7 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="font-label-md text-xs font-semibold text-secondary">
                  Material / Insumo (SKU)
                </label>
                {itemSelecionado && (
                  <span
                    className={`font-mono text-[11px] px-2 py-0.5 rounded-md font-medium flex items-center gap-1.5 border ${
                      itemSelecionado.estoqueAtual <= 0
                        ? 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20'
                        : itemSelecionado.estoqueAtual <= itemSelecionado.estoqueSeguranca
                        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                        : 'bg-surface-container/60 text-on-surface-variant border-outline-variant/30'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        itemSelecionado.estoqueAtual <= 0
                          ? 'bg-red-500'
                          : itemSelecionado.estoqueAtual <= itemSelecionado.estoqueSeguranca
                          ? 'bg-amber-500'
                          : 'bg-zinc-400'
                      }`}
                    />
                    Saldo Atual:{' '}
                    <strong>
                      {itemSelecionado.estoqueAtual.toLocaleString('pt-BR')}{' '}
                      {UNIDADE_LABELS[itemSelecionado.unidade] || itemSelecionado.unidade.toLowerCase()}
                    </strong>
                  </span>
                )}
              </div>
              <div className="relative flex items-center">
                <Package className="absolute left-3 w-4 h-4 text-outline pointer-events-none" />
                <select
                  name="p"
                  value={itemId}
                  onChange={(e) => setItemId(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 rounded-lg bg-surface-container-low text-on-surface text-xs font-semibold border border-outline-variant/20 focus:bg-surface-container-lowest focus:border-primary/50 outline-none transition-colors shadow-2xs truncate appearance-none cursor-pointer"
                >
                  {itensPorAba.mp.length > 0 && (
                    <optgroup label="Matéria-prima">
                      {itensPorAba.mp.map((it) => (
                        <option key={it.id} value={it.id}>
                          {it.codigo} • {it.descricao} (Saldo: {it.estoqueAtual.toLocaleString('pt-BR')}{' '}
                          {UNIDADE_LABELS[it.unidade] || it.unidade.toLowerCase()})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {itensPorAba.imp.length > 0 && (
                    <optgroup label="Materiais Improdutivos">
                      {itensPorAba.imp.map((it) => (
                        <option key={it.id} value={it.id}>
                          {it.codigo} • {it.descricao} (Saldo: {it.estoqueAtual.toLocaleString('pt-BR')}{' '}
                          {UNIDADE_LABELS[it.unidade] || it.unidade.toLowerCase()})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {itensPorAba.motos.length > 0 && (
                    <optgroup label="Peças & Componentes">
                      {itensPorAba.motos.map((it) => (
                        <option key={it.id} value={it.id}>
                          {it.codigo} • {it.descricao} (Saldo: {it.estoqueAtual.toLocaleString('pt-BR')}{' '}
                          {UNIDADE_LABELS[it.unidade] || it.unidade.toLowerCase()})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
            </div>

            {/* Campo 5: Quantidade */}
            <div className="lg:col-span-2 flex flex-col gap-1.5">
              <label className="font-label-md text-xs font-semibold text-secondary flex items-center justify-between">
                <span>Quantidade</span>
                <span className="text-secondary font-mono text-[10px]">
                  {itemSelecionado ? UNIDADE_LABELS[itemSelecionado.unidade] || itemSelecionado.unidade.toLowerCase() : 'un'}
                </span>
              </label>
              <div className="relative flex items-center">
                <input
                  type="number"
                  name="q"
                  min="0.1"
                  step="any"
                  value={quantidade}
                  onChange={(e) => setQuantidade(Math.max(0.1, parseFloat(e.target.value) || 1))}
                  className="w-full pl-3 pr-10 py-2 rounded-lg bg-surface-container-low text-on-surface text-xs font-bold font-data-tabular border border-outline-variant/20 focus:bg-surface-container-lowest focus:border-primary/50 outline-none transition-colors shadow-2xs"
                />
                <span className="absolute right-2 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-surface-container text-secondary pointer-events-none">
                  {itemSelecionado ? UNIDADE_LABELS[itemSelecionado.unidade] || itemSelecionado.unidade.toLowerCase() : 'un'}
                </span>
              </div>
            </div>

            {/* Campo 6: Retirado por / Colaborador (Saída) ou Fornecedor (Entrada) */}
            <div className="lg:col-span-3 flex flex-col justify-end">
              {tipoMov === 'Saída' ? (
                <ColaboradorSelect
                  value={colaboradorSelecionado?.id}
                  onChange={(colab) => setColaboradorSelecionado(colab)}
                  required
                  label="Colaborador Solicitante"
                  placeholder="Selecione o operador..."
                />
              ) : (
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-md text-xs font-semibold text-secondary">
                    Fornecedor / Procedência *
                  </label>
                  <input
                    type="text"
                    name="quem"
                    value={quem}
                    onChange={(e) => setQuem(e.target.value)}
                    placeholder="Ex: Fornecedor Gerdau, NF 4482"
                    required
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-on-surface text-xs font-medium border border-outline-variant/20 focus:bg-surface-container-lowest focus:border-primary/50 outline-none transition-colors shadow-2xs"
                  />
                </div>
              )}
            </div>

            {/* Campo 7: Observações Complementares */}
            <div className="lg:col-span-9 flex flex-col gap-1.5">
              <label className="font-label-md text-xs font-semibold text-secondary">
                Observações Complementares / Finalidade
              </label>
              <input
                type="text"
                name="obs"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Ex: Aplicação no gabarito da torre C"
                className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-on-surface text-xs font-medium border border-outline-variant/20 focus:bg-surface-container-lowest focus:border-primary/50 outline-none transition-colors shadow-2xs"
              />
            </div>

            {/* Campo 8: Botão de Ação */}
            <div className="lg:col-span-3 flex flex-col justify-end">
              <button
                type="submit"
                disabled={isRegistrando}
                className="h-9 w-full rounded-lg bg-primary text-on-primary font-headline-sm font-semibold text-xs flex items-center justify-center gap-2 shadow-xs hover:bg-primary/90 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
              >
                {isRegistrando ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Confirmando...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Confirmar Movimentação</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Mensagem de Erro Inline com Alerta */}
          {erroForm && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-error-container text-on-error-container text-xs font-semibold flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-error" />
              <span>{erroForm}</span>
            </div>
          )}
        </form>
      </section>

      {/* 4. Live Ledger & Histórico de Movimentações (Stitch Screen 1) */}
      <section className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-xs overflow-hidden flex flex-col">
        {/* Toolbar Header do Ledger */}
        <div className="p-4 bg-surface-container-low/50 border-b border-outline-variant/20 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-headline-sm text-sm font-bold text-on-surface">
                Relatório de Entradas e Saídas do Turno
              </h3>
              <p className="font-body-sm text-xs text-secondary">
                Registro cronológico de baixas, entradas e transferências físicas.
              </p>
            </div>
          </div>

          {/* Controles de Filtro e Busca */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Pílulas de Período */}
            <div className="inline-flex p-0.5 bg-surface-container rounded-lg border border-outline-variant/20" role="group" aria-label="Filtro de período">
              {PERIODOS.map((p) => {
                const isAtivo = periodo === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriodo(p)}
                    aria-pressed={isAtivo}
                    className={`px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer whitespace-nowrap font-medium ${
                      isAtivo
                        ? 'bg-surface-container-lowest text-on-surface font-bold shadow-xs'
                        : 'text-secondary hover:text-on-surface'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>

            {/* Campo de Busca Rápida */}
            <div className="relative flex items-center min-w-[200px] flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 absolute left-2.5 text-outline pointer-events-none" />
              <input
                type="search"
                placeholder="Filtrar operador, OP, item..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-surface-container text-xs text-on-surface placeholder:text-outline border border-transparent focus:bg-surface-container-lowest focus:border-primary/40 outline-none transition-colors"
              />
              {busca && (
                <button
                  type="button"
                  onClick={() => setBusca('')}
                  className="absolute right-2 text-outline hover:text-on-surface p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Dropdown de Filtro de Tipo */}
            <div className="relative flex items-center">
              <select
                value={filtroTipoLedger}
                onChange={(e) => setFiltroTipoLedger(e.target.value as 'todos' | 'Saída' | 'Entrada')}
                className="px-3 py-1.5 rounded-lg bg-surface-container text-on-surface text-xs font-semibold outline-none border border-transparent focus:bg-surface-container-lowest focus:border-primary/40 cursor-pointer"
              >
                <option value="todos">Todos os Tipos</option>
                <option value="Saída">Apenas Saídas (-)</option>
                <option value="Entrada">Apenas Entradas (+)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabela do Histórico de Movimentações */}
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr className="bg-surface-container-low text-secondary text-xs font-medium border-b border-outline-variant/20 select-none">
                <th className="py-2.5 px-4 font-semibold">Horário &amp; Operador</th>
                <th className="py-2.5 px-4 font-semibold">Item &amp; Código SKU</th>
                <th className="py-2.5 px-4 font-semibold">Tipo &amp; Setor</th>
                <th className="py-2.5 px-4 font-semibold text-center">Variação</th>
                <th className="py-2.5 px-4 font-semibold text-right">Saldo Atual</th>
                <th className="py-2.5 px-4 text-right font-semibold">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/15 text-xs text-on-surface">
              {movimentacoesFiltradas.length > 0 ? (
                movimentacoesFiltradas.map((m) => {
                  const unidadeFmt = m.item
                    ? UNIDADE_LABELS[m.item.unidade] || m.item.unidade.toLowerCase()
                    : 'un';
                  const isEntrada = m.tipo === 'Entrada';
                  const iniciaisOperador = (m.quem || 'OP')
                    .split(' ')
                    .slice(0, 2)
                    .map((w) => w[0]?.toUpperCase() || '')
                    .join('');

                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-surface-container-low/60 transition-colors group"
                    >
                      {/* Horário & Operador */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-data-tabular font-bold text-on-surface">
                            {m.hora || '—'}
                          </span>
                          <span className="text-outline text-xs">•</span>
                          <div className="flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center text-[10px] font-bold">
                              {iniciaisOperador}
                            </span>
                            <span className="font-medium text-on-surface">
                              {m.quem}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Item & Código SKU */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          {m.item ? (
                            <button
                              type="button"
                              onClick={() => onSelectItem?.(m.item!)}
                              className="font-headline-sm font-semibold text-xs text-left text-on-surface hover:text-primary transition-colors block truncate cursor-pointer leading-tight"
                            >
                              {m.item.descricao}
                            </button>
                          ) : (
                            <span className="font-semibold text-on-surface block truncate">
                              Material não identificado
                            </span>
                          )}
                          <div className="flex items-center gap-2 mt-0.5 font-mono text-[11px] text-secondary">
                            <span>SKU: {m.item?.codigo || m.rotulo || '—'}</span>
                            {m.obs && <span>• {m.obs}</span>}
                          </div>
                        </div>
                      </td>

                      {/* Tipo & Setor */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <div
                            className={`flex items-center gap-1 font-semibold ${
                              isEntrada ? 'text-tertiary' : 'text-error'
                            }`}
                          >
                            {isEntrada ? (
                              <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                            ) : (
                              <ArrowDownRight className="w-3.5 h-3.5 shrink-0" />
                            )}
                            <span>{m.tipo === 'Entrada' ? 'Entrada - Reposição' : 'Saída - Produção'}</span>
                          </div>
                          <span className="text-[11px] text-secondary">
                            {m.quem}
                          </span>
                        </div>
                      </td>

                      {/* Variação */}
                      <td className="py-3 px-4 text-center whitespace-nowrap font-data-tabular">
                        <span
                          className={`font-bold px-2 py-0.5 rounded-full text-xs ${
                            isEntrada
                              ? 'bg-tertiary/10 text-tertiary'
                              : 'bg-error-container text-on-error-container'
                          }`}
                        >
                          {isEntrada ? '+' : '−'}
                          {m.quantidade.toLocaleString('pt-BR')} {unidadeFmt}
                        </span>
                      </td>

                      {/* Saldo Resultante / Atual */}
                      <td className="py-3 px-4 text-right whitespace-nowrap font-data-tabular">
                        <span className="font-medium text-on-surface">
                          {m.item ? `${m.item.estoqueAtual.toLocaleString('pt-BR')} ${unidadeFmt}` : '—'}
                        </span>
                      </td>

                      {/* Ação */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {m.item && (
                          <button
                            type="button"
                            onClick={() => onSelectItem?.(m.item!)}
                            className="px-2 py-1 rounded-md text-xs font-medium text-secondary hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                            title="Visualizar detalhes do item"
                          >
                            Ver item →
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-secondary text-xs">
                    Nenhuma movimentação registrada para o filtro aplicado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 5. Tabela Consolidada de Balanço de Itens no Período */}
      <section className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-xs overflow-hidden flex flex-col">
        <div className="p-3.5 bg-surface-container-low/50 border-b border-outline-variant/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-secondary" />
            <h3 className="font-headline-sm text-xs font-bold text-on-surface">
              Balanço Sintético de Materiais no Período
            </h3>
          </div>
          <span className="font-data-tabular text-xs text-secondary font-medium">
            {resumoItens.length} itens movimentados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[640px]">
            <thead>
              <tr className="bg-surface-container-low text-secondary font-label-sm text-[11px] uppercase tracking-wider border-b border-outline-variant/20">
                <th className="py-2.5 px-4 font-semibold">Material / SKU</th>
                <th className="py-2.5 px-4 font-semibold text-tertiary">Entrou (+)</th>
                <th className="py-2.5 px-4 font-semibold text-error">Saiu (−)</th>
                <th className="py-2.5 px-4 font-semibold text-right">Saldo Físico Atual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/15 font-data-tabular">
              {resumoItens.length > 0 ? (
                resumoItens.map((r) => {
                  const unidadeFmt =
                    UNIDADE_LABELS[r.item.unidade] || r.item.unidade.toLowerCase();
                  const abaTitulo = METADADOS_ABAS[r.item.aba]?.titulo || 'Estoque';

                  return (
                    <tr
                      key={r.itemId}
                      className="hover:bg-surface-container-low/50 transition-colors"
                    >
                      <td className="py-2.5 px-4">
                        <button
                          type="button"
                          onClick={() => onSelectItem?.(r.item)}
                          className="text-left group cursor-pointer"
                        >
                          <span className="block text-on-surface font-semibold group-hover:text-primary transition-colors">
                            {r.item.descricao}
                          </span>
                          <span className="block text-secondary text-[11px] font-mono mt-0.5">
                            {r.item.codigo} · {abaTitulo}
                          </span>
                        </button>
                      </td>

                      {/* Entrou */}
                      <td className="py-2.5 px-4 font-semibold text-tertiary">
                        {r.totalEntrou > 0 ? (
                          `+${r.totalEntrou.toLocaleString('pt-BR')} ${unidadeFmt}`
                        ) : (
                          <span className="text-outline font-normal">—</span>
                        )}
                      </td>

                      {/* Saiu */}
                      <td className="py-2.5 px-4 font-semibold text-error">
                        {r.totalSaiu > 0 ? (
                          `−${r.totalSaiu.toLocaleString('pt-BR')} ${unidadeFmt}`
                        ) : (
                          <span className="text-outline font-normal">—</span>
                        )}
                      </td>

                      {/* Saldo Atual */}
                      <td className="py-2.5 px-4 text-right font-bold text-on-surface">
                        {r.estoqueAtual.toLocaleString('pt-BR')} {unidadeFmt}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-secondary text-xs">
                    Sem movimentações consolidadas para o período selecionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
