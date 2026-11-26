'use client';

import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowDownToLine, Download, RefreshCw, Search, ShoppingCart } from 'lucide-react';
import {
  FATOR_BAIXO_GIRO_SOBRE_MINIMO,
  FATOR_EXCESSO_SOBRE_MINIMO,
  LIMITE_GIRO_ALTO_DIAS,
  LIMITE_GIRO_LENTO_DIAS,
  type RecomendacaoComercial,
} from '@/core/services/estoque-calculator';
import { formatarMoedaBrl } from '@/core/services/custo-medio';
import type { DashboardItem } from '@/web/data/mock-almoxarifado';
import { usePainelEcommerce } from '@/web/hooks/usePainelEcommerce';
import { PERIODOS_DISPONIVEIS } from '@/web/hooks/usePeriodoGlobal';
import { usePermissao } from '@/web/hooks/usePermissao';
import { useToast } from '@/web/hooks/useToast';
import { FilterPill } from '@/web/components/ui/FilterPill';
import { StockTableSkeleton } from '../../dashboard/StockTableSkeleton';
import { EmptyState } from '../../feedback/EmptyState';
import { baixarCsv } from '../saida/exportCsv';
import {
  RECOMENDACAO_LABELS,
  filtrarLinhasPainelEcommerce,
  gerarPainelEcommerceCSV,
  ordenarLinhasPainelEcommerce,
  resumirPainelEcommerce,
  type LinhaPainelEcommerce,
} from './painel-ecommerce';

const fmtNum = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

const RECOMENDACAO_ESTILO: Record<RecomendacaoComercial, { dot: string; badge: string }> = {
  produzir: {
    dot: 'bg-red-500',
    badge: 'text-red-700 dark:text-red-400 bg-red-500/10 border-red-500/20 font-medium',
  },
  vender: {
    dot: 'bg-primary',
    badge: 'text-primary bg-primary/10 border-primary/20 font-medium',
  },
  equilibrado: {
    dot: 'bg-zinc-400',
    badge: 'text-on-surface-variant bg-surface-container/50 border-outline-variant/30 font-normal',
  },
};

const ORDEM_FILTROS: RecomendacaoComercial[] = ['produzir', 'vender', 'equilibrado'];

function formatarCobertura(dias: number): string {
  if (dias === Number.POSITIVE_INFINITY) return 'Sem saída';
  return `${dias.toLocaleString('pt-BR')} dias`;
}

export interface PainelEcommerceViewProps {
  onSelectItem?: (item: DashboardItem) => void;
  onRegistrarEntrada?: (item: DashboardItem) => void;
  onNovoPedido?: () => void;
}

/**
 * Painel operacional do e-commerce (Mercado Livre / segundo CNPJ) para Peças de motos:
 * aponta o que precisa de ordem de fabricação e o excedente a impulsionar nos anúncios.
 */
export function PainelEcommerceView({ onSelectItem, onRegistrarEntrada, onNovoPedido }: PainelEcommerceViewProps) {
  const { toast } = useToast();
  const { pode } = usePermissao();
  const [busca, setBusca] = useState('');
  const [recomendacao, setRecomendacao] = useState<'todas' | RecomendacaoComercial>('todas');

  const {
    periodo,
    textoIntervalo,
    setPeriodo,
    janelaDias,
    linhas,
    totalMovimentacoes,
    truncado,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = usePainelEcommerce();

  // Os contadores dos cards e das pílulas respeitam a busca, mas não o próprio filtro de recomendação
  const resumo = useMemo(
    () => resumirPainelEcommerce(filtrarLinhasPainelEcommerce(linhas, { busca })),
    [linhas, busca]
  );

  const linhasVisiveis = useMemo(
    () => ordenarLinhasPainelEcommerce(filtrarLinhasPainelEcommerce(linhas, { busca, recomendacao })),
    [linhas, busca, recomendacao]
  );

  const alternarFiltro = (alvo: RecomendacaoComercial) =>
    setRecomendacao((atual) => (atual === alvo ? 'todas' : alvo));

  const handleExportar = () => {
    if (linhasVisiveis.length === 0) {
      toast('Não há peças no recorte atual para exportar.', { type: 'error' });
      return;
    }
    const data = new Date().toISOString().slice(0, 10);
    const sufixo = recomendacao === 'todas' ? 'todas' : recomendacao;
    baixarCsv(gerarPainelEcommerceCSV(linhasVisiveis, periodo), `painel-ecommerce-motos-${sufixo}-${data}.csv`);
    toast(`${linhasVisiveis.length} peças exportadas para CSV.`, { type: 'success' });
  };

  const podeMover = pode('mover');
  const podeVender = pode('vender');

  return (
    <div className="animate-tab-switch flex-1 flex flex-col min-w-0 gap-4">
      {/* Cabeçalho */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3 border-b border-outline-variant/20 pb-3">
        <div>
          <h1 className="text-base font-semibold text-on-surface">E-commerce · Peças de motos</h1>
          <p className="text-xs text-secondary mt-0.5">
            Demanda online (Mercado Livre) cruzada com o saldo: o que produzir e o que impulsionar nos anúncios.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex p-0.5 bg-surface-container rounded-lg border border-outline-variant/20"
            role="group"
            aria-label="Período de análise (global)"
          >
            {PERIODOS_DISPONIVEIS.map((p) => {
              const ativo = periodo === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriodo(p)}
                  aria-pressed={ativo}
                  className={`px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer whitespace-nowrap font-medium ${
                    ativo
                      ? 'bg-surface-container-lowest text-on-surface font-bold shadow-xs'
                      : 'text-secondary hover:text-on-surface'
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-medium text-secondary hover:text-on-surface bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 transition-colors cursor-pointer disabled:opacity-50"
            title="Recarregar peças e movimentações"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>

          <button
            type="button"
            onClick={handleExportar}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-on-primary bg-primary hover:bg-primary/90 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            title="Exportar as peças filtradas, na ordem exibida, em CSV (lista de produção ou de anúncios)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Cards de ação: cada um filtra a tabela pela recomendação correspondente */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px rounded-xl border border-outline-variant/30 bg-outline-variant/30 overflow-hidden">
        <ResumoCelula
          titulo="Necessitam de produção"
          valor={fmtNum(resumo.contagem.produzir)}
          detalhe={`${fmtNum(resumo.unidadesProduzir)} un sugeridas para OF`}
          destaque="error"
          ativo={recomendacao === 'produzir'}
          onClick={() => alternarFiltro('produzir')}
        />
        <ResumoCelula
          titulo="Prontos para venda / excedentes"
          valor={fmtNum(resumo.contagem.vender)}
          detalhe={`${fmtNum(resumo.unidadesExcedentes)} un · ${formatarMoedaBrl(resumo.valorExcedente)} parados`}
          destaque="primary"
          ativo={recomendacao === 'vender'}
          onClick={() => alternarFiltro('vender')}
        />
        <ResumoCelula
          titulo="Equilibrados"
          valor={fmtNum(resumo.contagem.equilibrado)}
          detalhe="sem ação imediata"
          ativo={recomendacao === 'equilibrado'}
          onClick={() => alternarFiltro('equilibrado')}
        />
        <ResumoCelula
          titulo="Peças no catálogo"
          valor={fmtNum(resumo.contagem.todas)}
          detalhe={`período: ${textoIntervalo}`}
        />
      </div>

      {/* Busca e filtro de recomendação */}
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
            placeholder="Buscar peça por código ou descrição..."
            aria-label="Buscar peça no painel e-commerce"
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-outline-variant/40 bg-surface-container-low/40 text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none focus:bg-surface-container-lowest focus:border-outline transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5" aria-label="Filtrar por recomendação">
          <FilterPill
            label="Todas"
            size="sm"
            isActive={recomendacao === 'todas'}
            onClick={() => setRecomendacao('todas')}
            count={resumo.contagem.todas}
          />
          {ORDEM_FILTROS.map((r) => (
            <FilterPill
              key={r}
              label={RECOMENDACAO_LABELS[r]}
              size="sm"
              isActive={recomendacao === r}
              onClick={() => setRecomendacao(r)}
              count={resumo.contagem[r]}
              countVariant={r === 'produzir' ? 'error' : 'default'}
            />
          ))}
        </div>
      </div>

      {truncado && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            O período tem {fmtNum(totalMovimentacoes)} movimentações e só as mais recentes foram lidas. Escolha um
            período menor para recomendações completas.
          </span>
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-error/40 bg-error-container/40 px-3 py-2 text-xs text-on-error-container">
          Não foi possível carregar as movimentações. As vendas aparecem zeradas até a próxima atualização.
        </div>
      )}

      {isLoading ? (
        <StockTableSkeleton />
      ) : linhasVisiveis.length === 0 ? (
        <EmptyState
          title="Nenhuma peça no recorte"
          description="Nenhuma peça de moto atende à busca ou à recomendação selecionada."
          onClearFilters={() => {
            setBusca('');
            setRecomendacao('todas');
          }}
        />
      ) : (
        <TabelaPainel
          linhas={linhasVisiveis}
          rotuloPeriodo={periodo}
          onSelectItem={onSelectItem}
          onRegistrarEntrada={podeMover ? onRegistrarEntrada : undefined}
          onNovoPedido={podeVender ? onNovoPedido : undefined}
        />
      )}

      <p className="text-xs text-secondary tabular-nums">
        {fmtNum(totalMovimentacoes)} movimentações em {fmtNum(janelaDias)} {janelaDias === 1 ? 'dia' : 'dias'}.
        Solicitar produção: saldo até o mínimo ou cobertura de até {LIMITE_GIRO_ALTO_DIAS} dias. Priorizar venda:
        saldo a partir de {FATOR_EXCESSO_SOBRE_MINIMO}x o mínimo, ou {FATOR_BAIXO_GIRO_SOBRE_MINIMO}x com giro parado
        ou acima de {LIMITE_GIRO_LENTO_DIAS} dias de cobertura. Ajustes de inventário e estornos não contam como
        demanda.
      </p>
    </div>
  );
}

interface ResumoCelulaProps {
  titulo: string;
  valor: string;
  detalhe: string;
  destaque?: 'error' | 'primary';
  ativo?: boolean;
  onClick?: () => void;
}

function ResumoCelula({ titulo, valor, detalhe, destaque, ativo, onClick }: ResumoCelulaProps) {
  const corValor = destaque === 'error' ? 'text-error' : destaque === 'primary' ? 'text-primary' : 'text-on-surface';
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

interface TabelaPainelProps {
  linhas: LinhaPainelEcommerce[];
  rotuloPeriodo: string;
  onSelectItem?: (item: DashboardItem) => void;
  onRegistrarEntrada?: (item: DashboardItem) => void;
  onNovoPedido?: () => void;
}

function TabelaPainel({ linhas, rotuloPeriodo, onSelectItem, onRegistrarEntrada, onNovoPedido }: TabelaPainelProps) {
  const botaoAcao =
    'inline-flex items-center gap-1 h-7 px-2 rounded-md text-xs font-medium text-secondary hover:text-on-surface bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 transition-colors cursor-pointer';

  return (
    <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl overflow-auto max-h-[calc(100vh-360px)] min-h-[320px]">
      <table className="w-full text-left border-collapse min-w-[980px]">
        <thead className="sticky top-0 z-10 bg-surface-container-low border-b border-outline-variant/20">
          <tr className="text-xs font-semibold text-secondary select-none">
            <th className="py-2.5 px-4 w-32">Código</th>
            <th className="py-2.5 px-4">Descrição</th>
            <th className="py-2.5 px-4 w-28 text-right">Saldo</th>
            <th className="py-2.5 px-4 w-24 text-right">Mínimo</th>
            <th className="py-2.5 px-4 w-28 text-right" title="Expedições (vendas) no período">
              Vendido · {rotuloPeriodo}
            </th>
            <th className="py-2.5 px-4 w-28 text-right">Cobertura</th>
            <th className="py-2.5 px-4 w-40">Recomendação</th>
            <th className="py-2.5 px-4 w-28 text-right">Quantidade</th>
            <th className="py-2.5 px-4 w-32 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/15 text-xs text-on-surface">
          {linhas.map((l) => {
            const estilo = RECOMENDACAO_ESTILO[l.recomendacao];
            const quantidade =
              l.recomendacao === 'produzir'
                ? { valor: `+${fmtNum(l.quantidadeProduzir)} ${l.unidade}`, titulo: `Produzir até o saldo-alvo de ${fmtNum(l.saldoAlvo)}` }
                : l.recomendacao === 'vender'
                ? { valor: `${fmtNum(l.quantidadeExcedente)} ${l.unidade}`, titulo: `Excedente acima do saldo-alvo de ${fmtNum(l.saldoAlvo)} · ${formatarMoedaBrl(l.valorExcedente)}` }
                : { valor: '—', titulo: undefined };

            return (
              <tr
                key={l.id}
                tabIndex={onSelectItem ? 0 : undefined}
                onClick={() => onSelectItem?.(l.item)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.target === e.currentTarget && onSelectItem) {
                    e.preventDefault();
                    onSelectItem(l.item);
                  }
                }}
                title={onSelectItem ? 'Abrir detalhes e extrato da peça' : undefined}
                className={`transition-colors outline-none focus:ring-1 focus:ring-inset focus:ring-primary ${
                  onSelectItem ? 'cursor-pointer hover:bg-surface-container-low/70' : ''
                }`}
              >
                <td className="py-2.5 px-4 font-mono font-semibold whitespace-nowrap">{l.codigo}</td>
                <td className="py-2.5 px-4 font-semibold truncate max-w-0">{l.descricao}</td>
                <td className="py-2.5 px-4 text-right tabular-nums font-semibold whitespace-nowrap">
                  {fmtNum(l.estoqueAtual)} {l.unidade}
                </td>
                <td className="py-2.5 px-4 text-right tabular-nums text-secondary">{fmtNum(l.estoqueSeguranca)}</td>
                <td className="py-2.5 px-4 text-right tabular-nums">{fmtNum(l.totalVendido)}</td>
                <td className="py-2.5 px-4 text-right tabular-nums whitespace-nowrap text-secondary">
                  {formatarCobertura(l.coberturaDias)}
                </td>
                <td className="py-2.5 px-4 whitespace-nowrap">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-xs leading-tight ${estilo.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${estilo.dot} shrink-0`} aria-hidden="true" />
                    <span>{RECOMENDACAO_LABELS[l.recomendacao]}</span>
                  </span>
                </td>
                <td className="py-2.5 px-4 text-right tabular-nums font-semibold whitespace-nowrap" title={quantidade.titulo}>
                  {quantidade.valor}
                </td>
                <td className="py-2 px-4 text-right whitespace-nowrap">
                  {l.recomendacao === 'produzir' && onRegistrarEntrada && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRegistrarEntrada(l.item);
                      }}
                      className={botaoAcao}
                      title="Registrar a entrada quando a produção entregar"
                    >
                      <ArrowDownToLine className="w-3.5 h-3.5" />
                      <span>Entrada</span>
                    </button>
                  )}
                  {l.recomendacao === 'vender' && onNovoPedido && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNovoPedido();
                      }}
                      className={botaoAcao}
                      title="Abrir um novo pedido de venda"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>Pedido</span>
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
