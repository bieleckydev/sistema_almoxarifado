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
  FileSpreadsheet,
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

export interface SaidaManualViewProps {
  onSelectItem?: (item: DashboardItem) => void;
  triggerExportCsv?: boolean;
  onExportCsvDone?: () => void;
}

const PERIODOS: PeriodoFiltro[] = ['Hoje', 'Ontem', '7 dias', 'Tudo'];

export function SaidaManualView({
  onSelectItem,
  triggerExportCsv,
  onExportCsvDone,
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
  const [observacao, setObservacao] = useState('');
  const [erroForm, setErroForm] = useState<string | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroForm(null);

    if (!dataMov) {
      setErroForm('Informe a data da movimentação.');
      return;
    }

    if (!itemSelecionado) {
      setErroForm('Selecione um produto para movimentar.');
      return;
    }

    if (quantidade <= 0) {
      setErroForm('Informe uma quantidade maior que zero.');
      return;
    }

    if (!quem.trim()) {
      setErroForm('Informe quem retirou ou recebeu o material.');
      return;
    }

    const unidadeFmt =
      UNIDADE_LABELS[itemSelecionado.unidade] || itemSelecionado.unidade.toLowerCase();

    if (tipoMov === 'Saída' && quantidade > itemSelecionado.estoqueAtual) {
      setErroForm(
        `Estoque insuficiente: há ${itemSelecionado.estoqueAtual.toLocaleString('pt-BR')} ${unidadeFmt} de ${itemSelecionado.descricao}.`
      );
      return;
    }

    try {
      await registrarMovimentacao({
        itemId: itemSelecionado.id,
        tipo: tipoMov,
        quantidade,
        quem: quem.trim(),
        observacao: observacao.trim() || undefined,
        data: dataMov,
      });

      toast('Movimentação registrada.', { type: 'success' });
      setObservacao('');
      setQuantidade(1);
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
        lote: m.info?.['Lote'] || '',
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
    <div className="flex-1 flex flex-col min-w-0 animate-fade-in">
      {/* 1. Cabeçalho Principal */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200 dark:border-[#3e3e42]">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-normal text-slate-900 dark:text-white">
            Saída manual
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-normal">
            Registre o que sai (ou entra) no estoque e acompanhe quanto entrou e quanto saiu.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <button
            type="button"
            onClick={handleExportarCSV}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-semibold text-white bg-[#1d4ea3] dark:bg-[#3273dc] hover:bg-blue-800 dark:hover:bg-blue-600 transition-colors cursor-pointer"
            title="Exportar dados do relatório para arquivo CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Baixar relatório (CSV)</span>
          </button>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isLoading || isFetching}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-[#2b2b2e] border border-slate-300 dark:border-[#3e3e42] hover:bg-slate-50 dark:hover:bg-[#343438] transition-colors cursor-pointer disabled:opacity-50"
            title="Recarregar movimentações"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </header>

      {/* 2. Painel Embutido: Registrar movimentação */}
      <section
        aria-label="Registrar movimentação avulsa"
        className="bg-white dark:bg-[#2b2b2e] border border-slate-200 dark:border-[#3e3e42] rounded-lg p-4 mb-6"
      >
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
          Registrar movimentação
        </h2>

        <form id="fsai" onSubmit={handleSubmit} noValidate className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {/* Campo Data */}
            <label className="flex flex-col gap-1 font-medium text-slate-700 dark:text-slate-300">
              <span>Data</span>
              <input
                type="date"
                name="data"
                value={dataMov}
                max={hoje()}
                onChange={(e) => setDataMov(e.target.value)}
                className="h-8 px-2.5 rounded-md border border-slate-300 dark:border-[#3e3e42] bg-white dark:bg-[#232325] text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </label>

            {/* Campo Movimento */}
            <label className="flex flex-col gap-1 font-medium text-slate-700 dark:text-slate-300">
              <span>Movimento</span>
              <select
                name="tipo"
                value={tipoMov}
                onChange={(e) => setTipoMov(e.target.value as 'Saída' | 'Entrada')}
                className="h-8 px-2.5 rounded-md border border-slate-300 dark:border-[#3e3e42] bg-white dark:bg-[#232325] text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              >
                <option value="Saída">Saída</option>
                <option value="Entrada">Entrada</option>
              </select>
            </label>

            {/* Campo Produto (Agrupado com saldo atual) */}
            <label className="flex flex-col gap-1 font-medium text-slate-700 dark:text-slate-300">
              <span>Produto</span>
              <select
                name="p"
                value={itemId}
                onChange={(e) => setItemId(e.target.value)}
                className="h-8 px-2.5 rounded-md border border-slate-300 dark:border-[#3e3e42] bg-white dark:bg-[#232325] text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none truncate"
              >
                {itensPorAba.mp.length > 0 && (
                  <optgroup label="Matéria-prima">
                    {itensPorAba.mp.map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.descricao} ({it.estoqueAtual.toLocaleString('pt-BR')}{' '}
                        {UNIDADE_LABELS[it.unidade] || it.unidade.toLowerCase()})
                      </option>
                    ))}
                  </optgroup>
                )}
                {itensPorAba.imp.length > 0 && (
                  <optgroup label="Materiais improdutivos">
                    {itensPorAba.imp.map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.descricao} ({it.estoqueAtual.toLocaleString('pt-BR')}{' '}
                        {UNIDADE_LABELS[it.unidade] || it.unidade.toLowerCase()})
                      </option>
                    ))}
                  </optgroup>
                )}
                {itensPorAba.motos.length > 0 && (
                  <optgroup label="Peças de motos">
                    {itensPorAba.motos.map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.descricao} ({it.estoqueAtual.toLocaleString('pt-BR')}{' '}
                        {UNIDADE_LABELS[it.unidade] || it.unidade.toLowerCase()})
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </label>

            {/* Campo Quantidade */}
            <label className="flex flex-col gap-1 font-medium text-slate-700 dark:text-slate-300">
              <span>Quantidade</span>
              <input
                type="number"
                name="q"
                min="1"
                value={quantidade}
                onChange={(e) => setQuantidade(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="h-8 px-2.5 rounded-md border border-slate-300 dark:border-[#3e3e42] bg-white dark:bg-[#232325] text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </label>

            {/* Campo Retirado por / setor */}
            <label className="flex flex-col gap-1 font-medium text-slate-700 dark:text-slate-300">
              <span>Retirado por / setor</span>
              <input
                type="text"
                name="quem"
                value={quem}
                onChange={(e) => setQuem(e.target.value)}
                placeholder="Ex: Produção, Oficina, Fornecedor"
                required
                className="h-8 px-2.5 rounded-md border border-slate-300 dark:border-[#3e3e42] bg-white dark:bg-[#232325] text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </label>

            {/* Campo Observação */}
            <label className="flex flex-col gap-1 font-medium text-slate-700 dark:text-slate-300">
              <span>Observação</span>
              <input
                type="text"
                name="obs"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Opcional"
                className="h-8 px-2.5 rounded-md border border-slate-300 dark:border-[#3e3e42] bg-white dark:bg-[#232325] text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </label>
          </div>

          {/* Mensagem de Erro Inline */}
          {erroForm && (
            <div
              id="err"
              role="alert"
              className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{erroForm}</span>
            </div>
          )}

          {/* Botão de Gravação */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={isRegistrando}
              className="inline-flex items-center justify-center gap-1.5 h-8 px-4 rounded-md text-xs font-semibold text-white bg-[#1d4ea3] dark:bg-[#3273dc] hover:bg-blue-800 dark:hover:bg-blue-600 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isRegistrando ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Registrando...</span>
                </>
              ) : (
                <span>Registrar</span>
              )}
            </button>
          </div>
        </form>
      </section>

      {/* 3. Seção: Relatório de entradas e saídas */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-2.5">
          Relatório de entradas e saídas
        </h2>

        {/* Toolbar de Busca e Chips de Período */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-3">
          {/* Campo de Busca */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="search"
              id="buscam"
              placeholder="Buscar por NF-e, lote, item ou responsável"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              aria-label="Buscar movimentações"
              className="w-full h-8 pl-8 pr-7 rounded-md border border-slate-300 dark:border-[#3e3e42] bg-white dark:bg-[#232325] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                title="Limpar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Segmented Chips de Período */}
          <div
            className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-[#232325] rounded-md border border-slate-200 dark:border-[#3e3e42] overflow-x-auto shrink-0"
            role="group"
            aria-label="Filtro de período"
          >
            {PERIODOS.map((p) => {
              const isAtivo = periodo === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriodo(p)}
                  aria-pressed={isAtivo}
                  className={`inline-flex items-center h-7 px-2.5 rounded-sm text-xs transition-colors cursor-pointer whitespace-nowrap ${
                    isAtivo
                      ? 'bg-white dark:bg-[#2b2b2e] text-slate-900 dark:text-white border border-slate-200 dark:border-[#3e3e42] font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium'
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tabela Sintética Consolidada */}
        <div className="border border-slate-200 dark:border-[#3e3e42] rounded-lg overflow-hidden bg-white dark:bg-[#2b2b2e]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#232325] border-b border-slate-200 dark:border-[#3e3e42] text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  <th scope="col" className="py-2 px-3 font-semibold">
                    Item
                  </th>
                  <th scope="col" className="py-2 px-3 font-semibold">
                    Entrou
                  </th>
                  <th scope="col" className="py-2 px-3 font-semibold">
                    Saiu
                  </th>
                  <th scope="col" className="py-2 px-3 font-semibold">
                    Estoque atual
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#3e3e42]">
                {resumoItens.length > 0 ? (
                  resumoItens.map((r) => {
                    const unidadeFmt =
                      UNIDADE_LABELS[r.item.unidade] || r.item.unidade.toLowerCase();
                    const abaTitulo = METADADOS_ABAS[r.item.aba]?.titulo || 'Estoque';

                    return (
                      <tr
                        key={r.itemId}
                        className="hover:bg-slate-50 dark:hover:bg-[#343438] transition-colors"
                      >
                        <td className="py-2 px-3">
                          <button
                            type="button"
                            onClick={() => onSelectItem?.(r.item)}
                            className="text-left group cursor-pointer"
                          >
                            <b className="block text-slate-900 dark:text-white font-semibold group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {r.item.descricao}
                            </b>
                            <small className="block text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                              {r.item.codigo} · {abaTitulo}
                            </small>
                          </button>
                        </td>

                        {/* Entrou */}
                        <td className="py-2 px-3">
                          {r.totalEntrou > 0 ? (
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                              +{r.totalEntrou.toLocaleString('pt-BR')} {unidadeFmt}
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500 font-mono">
                              —
                            </span>
                          )}
                        </td>

                        {/* Saiu */}
                        <td className="py-2 px-3">
                          {r.totalSaiu > 0 ? (
                            <span className="font-semibold text-rose-600 dark:text-rose-400 tabular-nums">
                              −{r.totalSaiu.toLocaleString('pt-BR')} {unidadeFmt}
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500 font-mono">
                              —
                            </span>
                          )}
                        </td>

                        {/* Estoque Atual */}
                        <td className="py-2 px-3 font-medium text-slate-900 dark:text-white tabular-nums">
                          {r.estoqueAtual.toLocaleString('pt-BR')} {unidadeFmt}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-6 px-4 text-center text-xs text-slate-500 dark:text-slate-400"
                    >
                      Sem movimentações neste período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 4. Seção: Movimentações do período */}
      <section>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-2.5">
          Movimentações do período
        </h2>

        <div className="bg-white dark:bg-[#2b2b2e] border border-slate-200 dark:border-[#3e3e42] rounded-lg divide-y divide-slate-100 dark:divide-[#3e3e42] overflow-hidden">
          {movimentacoes.length > 0 ? (
            movimentacoes.map((m) => {
              const unidadeFmt = m.item
                ? UNIDADE_LABELS[m.item.unidade] || m.item.unidade.toLowerCase()
                : 'un';
              const isEntrada = m.tipo === 'Entrada';

              const infoEntries = m.info ? Object.entries(m.info) : [];

              return (
                <div
                  key={m.id}
                  className="p-3 flex items-center justify-between gap-4 text-xs hover:bg-slate-50 dark:hover:bg-[#343438] transition-colors"
                >
                  {/* Detalhes da Movimentação */}
                  <div className="min-w-0 flex-1">
                    {m.item ? (
                      <button
                        type="button"
                        onClick={() => onSelectItem?.(m.item!)}
                        className="font-semibold text-slate-900 dark:text-white text-left hover:text-blue-600 dark:hover:text-blue-400 transition-colors block truncate cursor-pointer"
                      >
                        {m.item.descricao}
                      </button>
                    ) : (
                      <b className="text-slate-900 dark:text-white block truncate">
                        Material não identificado
                      </b>
                    )}

                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      <span>{m.rotulo}</span>
                      <span> · </span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {m.quem}
                      </span>
                      {m.obs && <span> · {m.obs}</span>}
                    </div>

                    {infoEntries.length > 0 && (
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                        {infoEntries.map(([k, v]) => `${k} ${v}`).join(' · ')}
                      </div>
                    )}
                  </div>

                  {/* Quantidade com Sinal e Cor */}
                  <div className="shrink-0 text-right">
                    <b
                      className={`text-xs tabular-nums font-semibold flex items-center justify-end gap-0.5 ${
                        isEntrada
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {isEntrada ? '+' : '−'}
                      {m.quantidade.toLocaleString('pt-BR')} {unidadeFmt}
                    </b>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
              Sem movimentações neste período.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
