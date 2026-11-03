'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  ArrowDownRight,
  ArrowUpRight,
  QrCode,
  Warehouse,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Printer,
  DollarSign,
} from 'lucide-react';
import {
  type DashboardItem,
  UNIDADE_LABELS,
  calcularStatusCriticidade,
} from '@/web/data/mock-almoxarifado';
import { calcularRazaoEstoque } from '@/core/domain/quantidade';
import { calcularValorTotalItem, formatarMoedaBrl } from '@/core/services/custo-medio';
import { StockStatusBadge } from './StockStatusBadge';
import { StockTableSkeleton } from './StockTableSkeleton';
import { EmptyState } from '../feedback/EmptyState';

export type CampoOrdenacaoEstoque =
  | 'codigo'
  | 'descricao'
  | 'localizacao'
  | 'saldo'
  | 'razao'
  | 'valorTotal';

export interface StockTableProps {
  itens: DashboardItem[];
  onSelectItem: (item: DashboardItem) => void;
  onRegistrarEntrada?: (item: DashboardItem) => void;
  onRegistrarSaida?: (item: DashboardItem) => void;
  onImprimirEtiqueta?: (item: DashboardItem) => void;
  selectedItemId?: string | null;
  isLoading?: boolean;
  onClearFilters?: () => void;
  className?: string;
}

const ITENS_POR_PAGINA = 20;

export function StockTable({
  itens,
  onSelectItem,
  onRegistrarEntrada,
  onRegistrarSaida,
  onImprimirEtiqueta,
  selectedItemId,
  isLoading = false,
  onClearFilters,
  className = '',
}: StockTableProps) {
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Estado de ordenação interativa (3.0 ordTh)
  const [campoOrdenacao, setCampoOrdenacao] = useState<CampoOrdenacaoEstoque>('razao');
  const [ordemAsc, setOrdemAsc] = useState<boolean>(true);

  // Paginação 20 por página (Decisão 4)
  const [paginaAtual, setPaginaAtual] = useState<number>(1);

  // Reset de página ao alternar categoria ou lista
  useEffect(() => {
    setPaginaAtual(1);
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTop = 0;
    }
  }, [itens[0]?.aba, itens.length]);

  const handleOrdenar = (campo: CampoOrdenacaoEstoque) => {
    if (campoOrdenacao === campo) {
      setOrdemAsc((prev) => !prev);
    } else {
      setCampoOrdenacao(campo);
      // Padrão: 'razao' asc (críticos primeiro), valores numéricos desc
      setOrdemAsc(campo === 'razao' || campo === 'codigo' || campo === 'descricao');
    }
  };

  // Ordenação dos itens
  const itensOrdenados = useMemo(() => {
    const list = [...itens];
    list.sort((a, b) => {
      let comp = 0;
      switch (campoOrdenacao) {
        case 'codigo':
          comp = a.codigo.localeCompare(b.codigo, 'pt-BR');
          break;
        case 'descricao':
          comp = a.descricao.localeCompare(b.descricao, 'pt-BR');
          break;
        case 'localizacao':
          comp = (a.localizacaoFisica || '').localeCompare(b.localizacaoFisica || '', 'pt-BR');
          break;
        case 'saldo':
          comp = a.estoqueAtual - b.estoqueAtual;
          break;
        case 'valorTotal': {
          const valA = calcularValorTotalItem(a.estoqueAtual, a.custoUnitario);
          const valB = calcularValorTotalItem(b.estoqueAtual, b.custoUnitario);
          comp = valA - valB;
          break;
        }
        case 'razao':
        default: {
          const rA = calcularRazaoEstoque(a.estoqueAtual, a.estoqueSeguranca);
          const rB = calcularRazaoEstoque(b.estoqueAtual, b.estoqueSeguranca);
          comp = rA - rB;
          break;
        }
      }
      return ordemAsc ? comp : -comp;
    });
    return list;
  }, [itens, campoOrdenacao, ordemAsc]);

  // Paginação
  const totalPaginas = Math.max(1, Math.ceil(itensOrdenados.length / ITENS_POR_PAGINA));
  const inicioIndice = (paginaAtual - 1) * ITENS_POR_PAGINA;
  const fimIndice = Math.min(inicioIndice + ITENS_POR_PAGINA, itensOrdenados.length);
  const itensPaginados = useMemo(() => {
    return itensOrdenados.slice(inicioIndice, fimIndice);
  }, [itensOrdenados, inicioIndice, fimIndice]);

  const rowVirtualizer = useVirtualizer({
    count: itensPaginados.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 64,
    overscan: 10,
    getItemKey: (index) => itensPaginados[index]?.id || index,
  });

  const renderSortIndicator = (campo: CampoOrdenacaoEstoque) => {
    if (campoOrdenacao !== campo) {
      return <ArrowUpDown className="w-3 h-3 text-outline/50 opacity-0 group-hover/th:opacity-100 transition-opacity" />;
    }
    return ordemAsc ? (
      <ArrowUp className="w-3 h-3 text-primary shrink-0" />
    ) : (
      <ArrowDown className="w-3 h-3 text-primary shrink-0" />
    );
  };

  if (isLoading) {
    return <StockTableSkeleton className={className} />;
  }

  if (itens.length === 0) {
    return (
      <EmptyState
        title="Nenhum material encontrado"
        description="Não foram encontrados itens com os critérios de busca ou filtros de situação aplicados."
        onClearFilters={onClearFilters}
        className={className}
      />
    );
  }

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? totalSize - virtualRows[virtualRows.length - 1].end
      : 0;

  return (
    <div className={`flex flex-col bg-surface-container-lowest border border-outline-variant/30 rounded-xl transition-colors ${className}`}>
      <div
        ref={tableContainerRef}
        className="overflow-auto max-h-[calc(100vh-320px)] min-h-[360px]"
      >
        <table className="w-full text-left border-collapse min-w-[920px]">
          <thead className="sticky top-0 z-10 bg-surface-container-low border-b border-outline-variant/20">
            <tr className="text-xs font-medium text-secondary select-none">
              {/* Código SKU */}
              <th className="py-3 px-4 w-32 bg-surface-container-low">
                <button
                  type="button"
                  onClick={() => handleOrdenar('codigo')}
                  className="group/th inline-flex items-center gap-1.5 font-semibold text-secondary hover:text-on-surface transition-colors cursor-pointer"
                >
                  <span>Código / SKU</span>
                  {renderSortIndicator('codigo')}
                </button>
              </th>

              {/* Descrição & Categoria */}
              <th className="py-3 px-4 bg-surface-container-low">
                <button
                  type="button"
                  onClick={() => handleOrdenar('descricao')}
                  className="group/th inline-flex items-center gap-1.5 font-semibold text-secondary hover:text-on-surface transition-colors cursor-pointer"
                >
                  <span>Descrição &amp; Categoria</span>
                  {renderSortIndicator('descricao')}
                </button>
              </th>

              {/* Localização */}
              <th className="py-3 px-4 w-36 bg-surface-container-low">
                <button
                  type="button"
                  onClick={() => handleOrdenar('localizacao')}
                  className="group/th inline-flex items-center gap-1.5 font-semibold text-secondary hover:text-on-surface transition-colors cursor-pointer"
                >
                  <span>Localização</span>
                  {renderSortIndicator('localizacao')}
                </button>
              </th>

              {/* Saldo & Cobertura */}
              <th className="py-3 px-4 w-52 bg-surface-container-low">
                <button
                  type="button"
                  onClick={() => handleOrdenar('saldo')}
                  className="group/th inline-flex items-center gap-1.5 font-semibold text-secondary hover:text-on-surface transition-colors cursor-pointer"
                >
                  <span>Saldo &amp; Cobertura</span>
                  {renderSortIndicator('saldo')}
                </button>
              </th>

              {/* Valor Total em Estoque (3.0) */}
              <th className="py-3 px-4 w-40 text-right bg-surface-container-low">
                <button
                  type="button"
                  onClick={() => handleOrdenar('valorTotal')}
                  className="group/th inline-flex items-center justify-end gap-1.5 font-semibold text-secondary hover:text-on-surface transition-colors cursor-pointer w-full"
                >
                  <span>Valor Total</span>
                  {renderSortIndicator('valorTotal')}
                </button>
              </th>

              {/* Situação / Razão de Estoque */}
              <th className="py-3 px-4 w-36 text-center bg-surface-container-low">
                <button
                  type="button"
                  onClick={() => handleOrdenar('razao')}
                  className="group/th inline-flex items-center justify-center gap-1.5 font-semibold text-secondary hover:text-on-surface transition-colors cursor-pointer"
                >
                  <span>Situação</span>
                  {renderSortIndicator('razao')}
                </button>
              </th>

              {/* Ações */}
              <th className="py-3 px-4 text-right w-48 bg-surface-container-low">Ações Imediatas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/15 text-xs font-body-md text-on-surface">
            {paddingTop > 0 && (
              <tr aria-hidden="true">
                <td
                  colSpan={7}
                  style={{ height: `${paddingTop}px`, padding: 0, border: 0 }}
                />
              </tr>
            )}
            {virtualRows.map((virtualRow) => {
              const item = itensPaginados[virtualRow.index];
              if (!item) return null;
              const isSelected = selectedItemId === item.id;
              const unidadeFormatada = UNIDADE_LABELS[item.unidade] || item.unidade.toLowerCase();
              const deficit = item.estoqueSeguranca - item.estoqueAtual;
              const percentualCap = Math.min(
                100,
                Math.max(
                  0,
                  Math.round(
                    (item.estoqueAtual / Math.max(item.capacidadeMaxima, item.estoqueSeguranca, 1)) * 100
                  )
                )
              );
              const valorTotalItem = calcularValorTotalItem(item.estoqueAtual, item.custoUnitario);

              // Cores semânticas seguem a mesma regra do badge de situação
              const status = calcularStatusCriticidade(item.estoqueAtual, item.estoqueSeguranca);
              const barBgColor =
                status === 'crit' ? 'bg-error' : status === 'low' ? 'bg-amber-500' : 'bg-tertiary';
              const barTrackColor =
                status === 'crit'
                  ? 'bg-error-container'
                  : status === 'low'
                  ? 'bg-amber-100 dark:bg-amber-950'
                  : 'bg-surface-container';
              const saldoTextColor =
                status === 'crit'
                  ? 'text-error'
                  : status === 'low'
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-on-surface';

              return (
                <tr
                  key={item.id}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  tabIndex={0}
                  role="row"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      onSelectItem(item);
                    }
                  }}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (!target.closest('button')) {
                      onSelectItem(item);
                    }
                  }}
                  className={`transition-colors outline-none cursor-pointer group focus:ring-1 focus:ring-primary ${
                    isSelected
                      ? 'bg-primary-container/20 ring-1 ring-inset ring-primary/40'
                      : 'hover:bg-surface-container-low/70'
                  }`}
                >
                  {/* Código SKU */}
                  <td className="py-3 px-4 font-mono font-bold text-xs text-on-surface whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <QrCode className="w-3.5 h-3.5 text-outline shrink-0" />
                      <span>{item.codigo}</span>
                    </div>
                  </td>

                  {/* Descrição e Categoria */}
                  <td className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => onSelectItem(item)}
                      className="text-left font-headline-sm font-semibold text-xs text-on-surface group-hover:text-primary transition-colors cursor-pointer block leading-snug"
                    >
                      {item.descricao}
                    </button>
                    <span className="font-label-sm text-[11px] px-1.5 py-0.2 rounded-md bg-surface-container text-secondary inline-block mt-0.5">
                      {item.categoria}
                    </span>
                  </td>

                  {/* Endereço Físico */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 font-mono text-xs text-secondary">
                      <Warehouse className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                      <span>{item.localizacaoFisica || '-'}</span>
                    </div>
                  </td>

                  {/* Saldo Unificado e Medidor de Cobertura */}
                  <td className="py-3 px-4">
                    <div className="w-full max-w-[170px]">
                      <div className="flex justify-between items-baseline font-data-tabular text-xs mb-1 leading-none">
                        <span
                          className={`font-bold tabular-nums ${saldoTextColor}`}
                        >
                          {item.estoqueAtual.toLocaleString('pt-BR')} {unidadeFormatada}
                        </span>
                        <span className="text-secondary text-[11px] tabular-nums">
                          Mín: {item.estoqueSeguranca.toLocaleString('pt-BR')}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className={`flex-1 h-1 rounded-full overflow-hidden ${barTrackColor}`}>
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${barBgColor}`}
                            style={{ width: `${percentualCap}%` }}
                          />
                        </div>
                        <span
                          className={`text-[10.5px] tabular-nums font-semibold shrink-0 ${
                            deficit > 0 ? saldoTextColor : 'text-secondary'
                          }`}
                        >
                          {deficit > 0 ? `-${deficit}` : `${percentualCap}%`}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Valor Total em Estoque (3.0) */}
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="font-mono text-xs font-bold text-on-surface tabular-nums">
                      {formatarMoedaBrl(valorTotalItem)}
                    </div>
                    {item.custoUnitario !== undefined && item.custoUnitario > 0 && (
                      <div className="text-[10px] text-secondary tabular-nums">
                        {formatarMoedaBrl(item.custoUnitario)}/{unidadeFormatada}
                      </div>
                    )}
                  </td>

                  {/* Situação Discreta */}
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <StockStatusBadge
                      estoqueAtual={item.estoqueAtual}
                      estoqueSeguranca={item.estoqueSeguranca}
                    />
                  </td>

                  {/* Ações Imediatas */}
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      {onImprimirEtiqueta && (
                        <button
                          type="button"
                          onClick={() => onImprimirEtiqueta(item)}
                          title="Imprimir etiqueta térmica deste item"
                          className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-secondary hover:text-on-surface bg-surface-container hover:bg-surface-container-high transition-colors cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => (onRegistrarEntrada ? onRegistrarEntrada(item) : onSelectItem(item))}
                        title="Adicionar entrada de material"
                        className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-xs font-medium text-on-surface bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 transition-colors cursor-pointer"
                      >
                        <ArrowUpRight className="w-3 h-3 text-zinc-500 shrink-0" />
                        <span>+ Entrada</span>
                      </button>

                      <button
                        type="button"
                        disabled={item.estoqueAtual <= 0}
                        onClick={() => (onRegistrarSaida ? onRegistrarSaida(item) : onSelectItem(item))}
                        title={item.estoqueAtual <= 0 ? 'Sem saldo disponível para baixa' : 'Retirar / Baixa para produção'}
                        className={`inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-xs font-medium transition-colors border border-outline-variant/30 ${
                          item.estoqueAtual <= 0
                            ? 'bg-surface-container text-on-surface-variant/40 opacity-50 cursor-not-allowed'
                            : 'bg-surface-container hover:bg-surface-container-high text-on-surface cursor-pointer'
                        }`}
                      >
                        <ArrowDownRight className="w-3 h-3 text-zinc-500 shrink-0" />
                        <span>Retirar</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {paddingBottom > 0 && (
              <tr aria-hidden="true">
                <td
                  colSpan={7}
                  style={{ height: `${paddingBottom}px`, padding: 0, border: 0 }}
                />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Rodapé com Paginação 20 por página (Decisão 4) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-outline-variant/20 bg-surface-container-low text-xs text-secondary rounded-b-xl select-none">
        <div>
          <span>
            Exibindo <strong className="text-on-surface">{itensOrdenados.length === 0 ? 0 : inicioIndice + 1}</strong> a{' '}
            <strong className="text-on-surface">{fimIndice}</strong> de{' '}
            <strong className="text-on-surface">{itensOrdenados.length}</strong> materiais
          </span>
          {campoOrdenacao !== 'razao' && (
            <span className="ml-2 text-[11px] text-primary">
              (Ordenado por {campoOrdenacao} {ordemAsc ? '↑' : '↓'})
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium mr-1">
            Página <strong className="text-on-surface">{paginaAtual}</strong> de{' '}
            <strong className="text-on-surface">{totalPaginas}</strong>
          </span>
          <button
            type="button"
            disabled={paginaAtual <= 1}
            onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg border border-outline-variant/30 bg-surface-container-lowest hover:bg-surface-container text-on-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Anterior</span>
          </button>
          <button
            type="button"
            disabled={paginaAtual >= totalPaginas}
            onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))}
            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg border border-outline-variant/30 bg-surface-container-lowest hover:bg-surface-container text-on-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <span>Próxima</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
