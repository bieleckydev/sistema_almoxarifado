'use client';

import React, { useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowDown, ArrowUp, ArrowUpDown, Download, RefreshCw, Search, AlertTriangle } from 'lucide-react';
import {
  ordenarLevantamento,
  calcularStatusCriticidade,
  LIMITE_GIRO_ALTO_DIAS,
  LIMITE_GIRO_LENTO_DIAS,
  type ClassificacaoGiro,
  type CriterioOrdenacaoLevantamento,
} from '@/core/services/estoque-calculator';
import { formatarMoedaBrl } from '@/core/services/custo-medio';
import {
  CATEGORIAS_ESTOQUE,
  CATEGORIA_ESTOQUE_LABELS,
  type CategoriaEstoque,
} from '@/core/domain/categoria-estoque';
import type { DashboardItem } from '@/web/data/mock-almoxarifado';
import { useLevantamentoEstoque } from '@/web/hooks/useLevantamentoEstoque';
import { useToast } from '@/web/hooks/useToast';
import { FilterPill } from '@/web/components/ui/FilterPill';
import { StockTableSkeleton } from '../StockTableSkeleton';
import { EmptyState } from '../../feedback/EmptyState';
import { baixarCsv } from '../../gestao/saida/exportCsv';
import {
  JANELAS_LEVANTAMENTO_DIAS,
  GIRO_LABELS,
  filtrarLinhasLevantamento,
  formatarCobertura,
  gerarLevantamentoCSV,
  type JanelaLevantamentoDias,
  type LinhaLevantamento,
} from './levantamento';

const ORDENACOES: Array<{ id: CriterioOrdenacaoLevantamento; rotulo: string }> = [
  { id: 'saldo_desc', rotulo: 'Maior saldo (excedente)' },
  { id: 'saldo_asc', rotulo: 'Menor saldo (ruptura)' },
  { id: 'saidas_desc', rotulo: 'Mais vendidos / saídas' },
  { id: 'saidas_asc', rotulo: 'Giro baixo / estagnados' },
  { id: 'cobertura_desc', rotulo: 'Maior cobertura em dias' },
];

const GIROS: ClassificacaoGiro[] = ['parado', 'lento', 'regular', 'alto'];

const GIRO_DOT: Record<ClassificacaoGiro, string> = {
  parado: 'bg-error',
  lento: 'bg-amber-500',
  regular: 'bg-outline',
  alto: 'bg-tertiary',
};

const CATEGORIA_CURTA: Record<CategoriaEstoque, string> = {
  mp: 'MP',
  imp: 'Improdutivos',
  motos: 'Motos',
};

const fmtNum = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

export interface LevantamentoEstoqueViewProps {
  onSelectItem?: (item: DashboardItem) => void;
}

export function LevantamentoEstoqueView({ onSelectItem }: LevantamentoEstoqueViewProps) {
  const { toast } = useToast();
  const [janelaDias, setJanelaDias] = useState<JanelaLevantamentoDias>(90);
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState<'todas' | CategoriaEstoque>('todas');
  const [giro, setGiro] = useState<'todos' | ClassificacaoGiro>('todos');
  const [somenteComSaldo, setSomenteComSaldo] = useState(false);
  const [ordenacao, setOrdenacao] = useState<CriterioOrdenacaoLevantamento>('saldo_desc');

  const { linhas, totalMovimentacoes, truncado, isLoading, isFetching, isError, refetch } =
    useLevantamentoEstoque(janelaDias);

  // Contagens por categoria e por giro consideram os demais filtros (exceto o próprio)
  const contagemCategoria = useMemo(() => {
    const base = filtrarLinhasLevantamento(linhas, { busca, giro, somenteComSaldo });
    const contagem: Record<'todas' | CategoriaEstoque, number> = { todas: base.length, mp: 0, imp: 0, motos: 0 };
    base.forEach((l) => contagem[l.categoria]++);
    return contagem;
  }, [linhas, busca, giro, somenteComSaldo]);

  const contagemGiro = useMemo(() => {
    const base = filtrarLinhasLevantamento(linhas, { busca, categoria, somenteComSaldo });
    const contagem: Record<'todos' | ClassificacaoGiro, number> = {
      todos: base.length,
      parado: 0,
      lento: 0,
      regular: 0,
      alto: 0,
    };
    base.forEach((l) => contagem[l.giro]++);
    return contagem;
  }, [linhas, busca, categoria, somenteComSaldo]);

  const linhasVisiveis = useMemo(
    () => ordenarLevantamento(filtrarLinhasLevantamento(linhas, { busca, categoria, giro, somenteComSaldo }), ordenacao),
    [linhas, busca, categoria, giro, somenteComSaldo, ordenacao]
  );

  // Resumo do recorte exibido: quanto valor está parado ou girando devagar
  const resumo = useMemo(() => {
    let valorTotal = 0;
    let valorParado = 0;
    let itensParadosComSaldo = 0;
    let valorLento = 0;
    let itensLentos = 0;
    for (const l of linhasVisiveis) {
      valorTotal += l.valorEstoque;
      if (l.giro === 'parado' && l.estoqueAtual > 0) {
        itensParadosComSaldo++;
        valorParado += l.valorEstoque;
      } else if (l.giro === 'lento') {
        itensLentos++;
        valorLento += l.valorEstoque;
      }
    }
    return { valorTotal, valorParado, itensParadosComSaldo, valorLento, itensLentos };
  }, [linhasVisiveis]);

  const handleExportar = () => {
    if (linhasVisiveis.length === 0) {
      toast('Não há itens no recorte atual para exportar.', { type: 'error' });
      return;
    }
    const data = new Date().toISOString().slice(0, 10);
    baixarCsv(gerarLevantamentoCSV(linhasVisiveis, janelaDias), `levantamento-estoque-${janelaDias}d-${data}.csv`);
    toast(`${linhasVisiveis.length} itens exportados para CSV.`, { type: 'success' });
  };

  const handleLimparFiltros = () => {
    setBusca('');
    setCategoria('todas');
    setGiro('todos');
    setSomenteComSaldo(false);
  };

  // Cabeçalhos clicáveis alternam entre as duas direções do mesmo critério
  const alternarOrdenacao = (campo: 'saldo' | 'saidas') => {
    setOrdenacao((atual) =>
      atual === `${campo}_desc` ? (`${campo}_asc` as const) : (`${campo}_desc` as const)
    );
  };

  return (
    <div className="animate-tab-switch flex-1 flex flex-col min-w-0 gap-4">
      {/* Cabeçalho */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3 border-b border-outline-variant/20 pb-3">
        <div>
          <h1 className="text-base font-semibold text-on-surface">Levantamento e queima de estoque</h1>
          <p className="text-xs text-secondary mt-0.5">
            Saldo de todas as categorias cruzado com vendas e consumo dos últimos {janelaDias} dias.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            role="radiogroup"
            aria-label="Janela de análise das saídas"
            className="inline-flex rounded-md border border-outline-variant/40 overflow-hidden"
          >
            {JANELAS_LEVANTAMENTO_DIAS.map((dias) => (
              <button
                key={dias}
                type="button"
                role="radio"
                aria-checked={janelaDias === dias}
                onClick={() => setJanelaDias(dias)}
                className={`h-8 px-2.5 text-xs font-medium tabular-nums transition-colors cursor-pointer ${
                  janelaDias === dias
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : 'bg-surface-container-lowest text-secondary hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                {dias} dias
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-medium text-secondary hover:text-on-surface bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 transition-colors cursor-pointer disabled:opacity-50"
            title="Recarregar itens e movimentações"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>

          <button
            type="button"
            onClick={handleExportar}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-on-primary bg-primary hover:bg-primary/90 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            title="Exportar os itens filtrados, na ordem exibida, em CSV (Excel)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Resumo do recorte: cada bloco aplica o filtro correspondente */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px rounded-xl border border-outline-variant/30 bg-outline-variant/30 overflow-hidden">
        <ResumoCelula
          titulo="Itens no recorte"
          valor={fmtNum(linhasVisiveis.length)}
          detalhe={`de ${fmtNum(linhas.length)} cadastrados`}
        />
        <ResumoCelula
          titulo="Parados com saldo"
          valor={fmtNum(resumo.itensParadosComSaldo)}
          detalhe={`${formatarMoedaBrl(resumo.valorParado)} sem saída no período`}
          destaque="error"
          ativo={giro === 'parado' && somenteComSaldo}
          onClick={() => {
            setGiro('parado');
            setSomenteComSaldo(true);
            setOrdenacao('saldo_desc');
          }}
        />
        <ResumoCelula
          titulo="Giro lento"
          valor={fmtNum(resumo.itensLentos)}
          detalhe={`${formatarMoedaBrl(resumo.valorLento)} · cobertura > ${LIMITE_GIRO_LENTO_DIAS} dias`}
          destaque="warning"
          ativo={giro === 'lento'}
          onClick={() => {
            setGiro('lento');
            setOrdenacao('cobertura_desc');
          }}
        />
        <ResumoCelula
          titulo="Valor em estoque"
          valor={formatarMoedaBrl(resumo.valorTotal)}
          detalhe="custo médio × saldo do recorte"
        />
      </div>

      {/* Filtros e ordenação */}
      <div className="flex flex-col gap-2.5">
        <div className="flex flex-col md:flex-row md:items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setBusca('');
              }}
              placeholder="Buscar por código ou descrição..."
              aria-label="Buscar item no levantamento"
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-outline-variant/40 bg-surface-container-low/40 text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none focus:bg-surface-container-lowest focus:border-outline transition-colors"
            />
          </div>

          <label className="inline-flex items-center gap-2 text-xs text-secondary shrink-0">
            <span>Ordenar por</span>
            <select
              value={ordenacao}
              onChange={(e) => setOrdenacao(e.target.value as CriterioOrdenacaoLevantamento)}
              className="h-8 pl-2 pr-7 rounded-md bg-surface-container-lowest text-on-surface text-xs font-medium border border-outline-variant/40 focus:border-outline outline-none cursor-pointer"
            >
              {ORDENACOES.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.rotulo}
                </option>
              ))}
            </select>
          </label>

          <label className="inline-flex items-center gap-1.5 text-xs text-secondary shrink-0 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={somenteComSaldo}
              onChange={(e) => setSomenteComSaldo(e.target.checked)}
              className="accent-primary"
            />
            <span>Ocultar itens sem saldo</span>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex flex-wrap items-center gap-1.5" aria-label="Filtrar por categoria">
            <FilterPill
              label="Todas"
              size="sm"
              isActive={categoria === 'todas'}
              onClick={() => setCategoria('todas')}
              count={contagemCategoria.todas}
            />
            {CATEGORIAS_ESTOQUE.map((c) => (
              <FilterPill
                key={c}
                label={CATEGORIA_CURTA[c]}
                size="sm"
                isActive={categoria === c}
                onClick={() => setCategoria(c)}
                count={contagemCategoria[c]}
              />
            ))}
          </div>

          <span className="hidden md:block w-px h-4 bg-outline-variant/40" aria-hidden="true" />

          <div className="flex flex-wrap items-center gap-1.5" aria-label="Filtrar por giro">
            <FilterPill
              label="Qualquer giro"
              size="sm"
              isActive={giro === 'todos'}
              onClick={() => setGiro('todos')}
              count={contagemGiro.todos}
            />
            {GIROS.map((g) => (
              <FilterPill
                key={g}
                label={GIRO_LABELS[g]}
                size="sm"
                isActive={giro === g}
                onClick={() => setGiro(g)}
                count={contagemGiro[g]}
                countVariant={g === 'parado' ? 'error' : g === 'lento' ? 'warning' : 'default'}
              />
            ))}
          </div>
        </div>
      </div>

      {truncado && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            A janela tem {fmtNum(totalMovimentacoes)} movimentações e só as mais recentes foram lidas. Reduza a
            janela para métricas de saída completas.
          </span>
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-error/40 bg-error-container/40 px-3 py-2 text-xs text-on-error-container">
          Não foi possível carregar as movimentações. As saídas aparecem zeradas até a próxima atualização.
        </div>
      )}

      {/* Tabela */}
      {isLoading ? (
        <StockTableSkeleton />
      ) : linhasVisiveis.length === 0 ? (
        <EmptyState
          title="Nenhum item no recorte"
          description="Nenhum item atende aos filtros de categoria, giro ou busca aplicados."
          onClearFilters={handleLimparFiltros}
        />
      ) : (
        <TabelaLevantamento
          linhas={linhasVisiveis}
          janelaDias={janelaDias}
          ordenacao={ordenacao}
          onAlternarOrdenacao={alternarOrdenacao}
          onSelectItem={onSelectItem}
        />
      )}

      <p className="text-xs text-secondary tabular-nums">
        {fmtNum(totalMovimentacoes)} movimentações analisadas nos últimos {janelaDias} dias. Giro alto: cobertura até{' '}
        {LIMITE_GIRO_ALTO_DIAS} dias; lento: acima de {LIMITE_GIRO_LENTO_DIAS} dias. Ajustes de inventário e estornos não
        contam como saída.
      </p>
    </div>
  );
}

interface ResumoCelulaProps {
  titulo: string;
  valor: string;
  detalhe: string;
  destaque?: 'error' | 'warning';
  ativo?: boolean;
  onClick?: () => void;
}

function ResumoCelula({ titulo, valor, detalhe, destaque, ativo, onClick }: ResumoCelulaProps) {
  const corValor =
    destaque === 'error' ? 'text-error' : destaque === 'warning' ? 'text-amber-600 dark:text-amber-400' : 'text-on-surface';
  const conteudo = (
    <>
      <span className="text-xs font-medium text-secondary">{titulo}</span>
      <span className={`text-lg font-semibold tabular-nums leading-tight ${corValor}`}>{valor}</span>
      <span className="text-xs text-secondary tabular-nums truncate">{detalhe}</span>
    </>
  );
  const base = 'flex flex-col gap-0.5 px-4 py-3 text-left min-w-0';

  if (!onClick) {
    return <div className={`${base} bg-surface-container-lowest`}>{conteudo}</div>;
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={`${base} cursor-pointer transition-colors ${
        ativo ? 'bg-surface-container' : 'bg-surface-container-lowest hover:bg-surface-container-low'
      }`}
    >
      {conteudo}
    </button>
  );
}

interface TabelaLevantamentoProps {
  linhas: LinhaLevantamento[];
  janelaDias: number;
  ordenacao: CriterioOrdenacaoLevantamento;
  onAlternarOrdenacao: (campo: 'saldo' | 'saidas') => void;
  onSelectItem?: (item: DashboardItem) => void;
}

const TOTAL_COLUNAS = 10;

function TabelaLevantamento({
  linhas,
  janelaDias,
  ordenacao,
  onAlternarOrdenacao,
  onSelectItem,
}: TabelaLevantamentoProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: linhas.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 44,
    overscan: 12,
    getItemKey: (index) => linhas[index]?.id || index,
  });

  const virtualRows = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom = virtualRows.length > 0 ? totalSize - virtualRows[virtualRows.length - 1].end : 0;

  const indicador = (campo: 'saldo' | 'saidas') => {
    if (ordenacao === `${campo}_desc`) return <ArrowDown className="w-3 h-3 text-primary shrink-0" />;
    if (ordenacao === `${campo}_asc`) return <ArrowUp className="w-3 h-3 text-primary shrink-0" />;
    return <ArrowUpDown className="w-3 h-3 text-outline/50 opacity-0 group-hover/th:opacity-100 transition-opacity" />;
  };

  const thBotao =
    'group/th inline-flex items-center justify-end gap-1.5 w-full font-semibold text-secondary hover:text-on-surface transition-colors cursor-pointer';

  return (
    <div className="flex flex-col bg-surface-container-lowest border border-outline-variant/30 rounded-xl">
      <div ref={containerRef} className="overflow-auto max-h-[calc(100vh-380px)] min-h-[360px]">
        <table className="w-full text-left border-collapse min-w-[1080px]">
          <thead className="sticky top-0 z-10 bg-surface-container-low border-b border-outline-variant/20">
            <tr className="text-xs font-semibold text-secondary select-none">
              <th className="py-2.5 px-4 w-32">Código</th>
              <th className="py-2.5 px-4">Descrição</th>
              <th className="py-2.5 px-4 w-28 text-right" aria-sort={ordenacao.startsWith('saldo') ? (ordenacao.endsWith('desc') ? 'descending' : 'ascending') : 'none'}>
                <button type="button" onClick={() => onAlternarOrdenacao('saldo')} className={thBotao}>
                  <span>Saldo atual</span>
                  {indicador('saldo')}
                </button>
              </th>
              <th className="py-2.5 px-4 w-24 text-right">Mínimo</th>
              <th className="py-2.5 px-4 w-24 text-right">Vendido</th>
              <th className="py-2.5 px-4 w-24 text-right">Consumido</th>
              <th className="py-2.5 px-4 w-28 text-right" aria-sort={ordenacao.startsWith('saidas') ? (ordenacao.endsWith('desc') ? 'descending' : 'ascending') : 'none'}>
                <button type="button" onClick={() => onAlternarOrdenacao('saidas')} className={thBotao} title={`Vendido + consumido nos últimos ${janelaDias} dias`}>
                  <span>Saídas {janelaDias}d</span>
                  {indicador('saidas')}
                </button>
              </th>
              <th className="py-2.5 px-4 w-28 text-right">Cobertura</th>
              <th className="py-2.5 px-4 w-32">Giro</th>
              <th className="py-2.5 px-4 w-36 text-right">Valor em estoque</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/15 text-xs text-on-surface">
            {paddingTop > 0 && (
              <tr aria-hidden="true">
                <td colSpan={TOTAL_COLUNAS} style={{ height: `${paddingTop}px`, padding: 0, border: 0 }} />
              </tr>
            )}
            {virtualRows.map((virtualRow) => {
              const l = linhas[virtualRow.index];
              if (!l) return null;
              const status = calcularStatusCriticidade(l.estoqueAtual, l.estoqueSeguranca);
              const corSaldo =
                status === 'crit'
                  ? 'text-error'
                  : status === 'low'
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-on-surface';

              return (
                <tr
                  key={l.id}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  tabIndex={onSelectItem ? 0 : undefined}
                  onClick={() => onSelectItem?.(l.item)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && onSelectItem) {
                      e.preventDefault();
                      onSelectItem(l.item);
                    }
                  }}
                  title={onSelectItem ? 'Abrir detalhes e extrato do item' : undefined}
                  className={`transition-colors outline-none focus:ring-1 focus:ring-inset focus:ring-primary ${
                    onSelectItem ? 'cursor-pointer hover:bg-surface-container-low/70' : ''
                  }`}
                >
                  <td className="py-2.5 px-4 font-mono font-semibold whitespace-nowrap">{l.codigo}</td>
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold truncate">{l.descricao}</span>
                      <span className="shrink-0 text-[11px] px-1.5 rounded-md bg-surface-container text-secondary">
                        {CATEGORIA_ESTOQUE_LABELS[l.categoria]}
                      </span>
                    </div>
                  </td>
                  <td className={`py-2.5 px-4 text-right tabular-nums font-semibold whitespace-nowrap ${corSaldo}`}>
                    {fmtNum(l.estoqueAtual)} {l.unidade}
                  </td>
                  <td className="py-2.5 px-4 text-right tabular-nums text-secondary">{fmtNum(l.estoqueSeguranca)}</td>
                  <td className="py-2.5 px-4 text-right tabular-nums">{fmtNum(l.totalVendido)}</td>
                  <td className="py-2.5 px-4 text-right tabular-nums">{fmtNum(l.totalConsumido)}</td>
                  <td className="py-2.5 px-4 text-right tabular-nums font-semibold">{fmtNum(l.totalSaidas)}</td>
                  <td className="py-2.5 px-4 text-right tabular-nums whitespace-nowrap text-secondary">
                    {formatarCobertura(l.coberturaDias)}
                  </td>
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${GIRO_DOT[l.giro]}`} aria-hidden="true" />
                      <span>{GIRO_LABELS[l.giro]}</span>
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                    {formatarMoedaBrl(l.valorEstoque)}
                  </td>
                </tr>
              );
            })}
            {paddingBottom > 0 && (
              <tr aria-hidden="true">
                <td colSpan={TOTAL_COLUNAS} style={{ height: `${paddingBottom}px`, padding: 0, border: 0 }} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
