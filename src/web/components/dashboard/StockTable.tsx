'use client';

import React, { useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowDownRight, ArrowUpRight, QrCode, Warehouse } from 'lucide-react';
import { type DashboardItem, UNIDADE_LABELS } from '@/web/data/mock-almoxarifado';
import { formatarTextoFalta } from '@/web/utils/pluralization';
import { StockStatusBadge } from './StockStatusBadge';
import { StockTableSkeleton } from './StockTableSkeleton';
import { EmptyState } from '../feedback/EmptyState';

export interface StockTableProps {
  itens: DashboardItem[];
  onSelectItem: (item: DashboardItem) => void;
  onRegistrarEntrada?: (item: DashboardItem) => void;
  onRegistrarSaida?: (item: DashboardItem) => void;
  onRegistrarBaixaRapida?: (item: DashboardItem) => void;
  selectedItemId?: string | null;
  isLoading?: boolean;
  onClearFilters?: () => void;
  className?: string;
}

export function StockTable({
  itens,
  onSelectItem,
  onRegistrarEntrada,
  onRegistrarSaida,
  onRegistrarBaixaRapida,
  selectedItemId,
  isLoading = false,
  onClearFilters,
  className = '',
}: StockTableProps) {
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: itens.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 64,
    overscan: 25,
    getItemKey: (index) => itens[index]?.id || index,
  });

  // Retorna suavemente ao topo da tabela sempre que a aba do almoxarifado for alternada
  useEffect(() => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTop = 0;
    }
  }, [itens[0]?.aba]);

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
    <div
      ref={tableContainerRef}
      className={`overflow-auto max-h-[calc(100vh-275px)] min-h-[360px] bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-xs transition-colors ${className}`}
    >
      <table className="w-full text-left border-collapse min-w-[780px]">
        <thead className="sticky top-0 z-10 bg-surface-container-low border-b border-outline-variant/20">
          <tr className="text-xs font-label-sm uppercase tracking-wider text-secondary select-none">
            <th className="py-3 px-4 w-32 bg-surface-container-low">Código / SKU</th>
            <th className="py-3 px-4 bg-surface-container-low">Descrição &amp; Categoria</th>
            <th className="py-3 px-4 w-44 bg-surface-container-low">Localização</th>
            <th className="py-3 px-4 w-56 bg-surface-container-low">Saldo &amp; Cobertura</th>
            <th className="py-3 px-4 w-36 text-center bg-surface-container-low">Situação</th>
            <th className="py-3 px-4 text-right w-44 bg-surface-container-low">Ações Imediatas</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/15 text-xs font-body-md text-on-surface">
          {paddingTop > 0 && (
            <tr aria-hidden="true">
              <td
                colSpan={6}
                style={{ height: `${paddingTop}px`, padding: 0, border: 0 }}
              />
            </tr>
          )}
          {virtualRows.map((virtualRow) => {
            const item = itens[virtualRow.index];
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

            // Cores semânticas da barra de progresso
            const barBgColor = deficit > 0 && item.estoqueAtual === 0
              ? 'bg-error'
              : deficit > 0
              ? 'bg-amber-500'
              : 'bg-tertiary';

            const barTrackColor = deficit > 0 && item.estoqueAtual === 0
              ? 'bg-error-container'
              : deficit > 0
              ? 'bg-amber-100 dark:bg-amber-950'
              : 'bg-surface-container';

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
                {/* Código SKU / Prefixo Técnico */}
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

                {/* Endereço Físico / Localização no Almoxarifado */}
                <td className="py-3 px-4 whitespace-nowrap">
                  <div className="flex items-center gap-1.5 font-mono text-xs text-secondary">
                    <Warehouse className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                    <span>{item.localizacaoFisica || '-'}</span>
                  </div>
                </td>

                {/* Saldo Unificado e Medidor de Cobertura */}
                <td className="py-3 px-4">
                  <div className="w-full max-w-[210px]">
                    {/* Linha 1: 48 / 20 un mín */}
                    <div className="flex justify-between items-baseline font-data-tabular text-xs mb-1 leading-none">
                      <span
                        className={`font-bold ${
                          deficit > 0 && item.estoqueAtual === 0
                            ? 'text-error'
                            : deficit > 0
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-on-surface'
                        }`}
                      >
                        {item.estoqueAtual.toLocaleString('pt-BR')} {unidadeFormatada}
                      </span>
                      <span className="text-secondary text-[11px]">
                        Mín: {item.estoqueSeguranca.toLocaleString('pt-BR')}
                      </span>
                    </div>

                    {/* Linha 2: Barra compacta + percentual ou falta */}
                    <div className="flex items-center gap-2">
                      <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${barTrackColor}`}>
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${barBgColor}`}
                          style={{ width: `${percentualCap}%` }}
                        />
                      </div>
                      <span
                        className={`text-[11px] tabular-nums font-semibold shrink-0 ${
                          deficit > 0
                            ? 'text-error'
                            : 'text-secondary'
                        }`}
                      >
                        {deficit > 0
                          ? formatarTextoFalta(deficit, item.unidade, { sufixo: '' })
                          : `${percentualCap}%`}
                      </span>
                    </div>
                  </div>
                </td>

                {/* Situação Discreta */}
                <td className="py-3 px-4 text-center whitespace-nowrap">
                  <StockStatusBadge
                    estoqueAtual={item.estoqueAtual}
                    estoqueSeguranca={item.estoqueSeguranca}
                  />
                </td>

                {/* Gatilhos Operacionais por Linha (+ Entrada / Retirar) */}
                <td className="py-3 px-4 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => (onRegistrarEntrada ? onRegistrarEntrada(item) : onSelectItem(item))}
                      title="Adicionar entrada de material"
                      className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-xs font-semibold text-on-primary-container bg-primary-container hover:bg-primary hover:text-on-primary transition-colors cursor-pointer shadow-2xs"
                    >
                      <ArrowUpRight className="w-3 h-3 shrink-0" />
                      <span>+ Entrada</span>
                    </button>

                    <button
                      type="button"
                      disabled={item.estoqueAtual <= 0}
                      onClick={() => (onRegistrarSaida ? onRegistrarSaida(item) : onSelectItem(item))}
                      title={item.estoqueAtual <= 0 ? 'Sem saldo disponível para baixa' : 'Retirar / Baixa para produção'}
                      className={`inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-xs font-medium transition-colors ${
                        item.estoqueAtual <= 0
                          ? 'bg-surface-container text-outline opacity-50 cursor-not-allowed'
                          : 'bg-surface-container hover:bg-surface-container-high text-on-surface cursor-pointer'
                      }`}
                    >
                      <ArrowDownRight className="w-3 h-3 shrink-0" />
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
                colSpan={6}
                style={{ height: `${paddingBottom}px`, padding: 0, border: 0 }}
              />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
