'use client';

import React, { useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { type DashboardItem, UNIDADE_LABELS } from '@/web/data/mock-almoxarifado';
import { formatarTextoFalta } from '@/web/utils/pluralization';
import { StockGauge } from './StockGauge';
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
      className={`overflow-auto max-h-[calc(100vh-275px)] min-h-[360px] bg-white dark:bg-[#2b2b2e] border border-slate-200 dark:border-[#3e3e42] rounded-lg transition-colors ${className}`}
    >
      <table className="w-full text-left border-collapse min-w-[760px]">
        <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-[#232325] border-b border-slate-200 dark:border-[#3e3e42]">
          <tr className="text-xs font-semibold text-slate-600 dark:text-[#a3a3a9] uppercase tracking-wider">
            <th className="py-2.5 px-3 w-28 bg-slate-50 dark:bg-[#232325]">Código</th>
            <th className="py-2.5 px-3 bg-slate-50 dark:bg-[#232325]">Descrição / Categoria</th>
            <th className="py-2.5 px-3 w-24 bg-slate-50 dark:bg-[#232325]">Endereço</th>
            <th className="py-2.5 px-3 min-w-[200px] bg-slate-50 dark:bg-[#232325]">Saldo & Cobertura</th>
            <th className="py-2.5 px-3 w-32 bg-slate-50 dark:bg-[#232325]">Situação</th>
            <th className="py-2.5 px-3 text-right w-36 bg-slate-50 dark:bg-[#232325]">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-[#3e3e42] text-xs">
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
                className={`transition-colors outline-none cursor-pointer focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500 ${
                  isSelected
                    ? 'bg-blue-50/60 dark:bg-[#1a2b42]'
                    : 'hover:bg-slate-50/80 dark:hover:bg-[#232325]'
                }`}
              >
                {/* Código SKU / Prefixo Técnico */}
                <td className="py-2.5 px-3 font-mono text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  {item.codigo}
                </td>

                {/* Descrição e Categoria */}
                <td className="py-2.5 px-3">
                  <button
                    type="button"
                    onClick={() => onSelectItem(item)}
                    className="text-left font-medium text-xs text-slate-900 dark:text-white hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors cursor-pointer block leading-tight"
                  >
                    {item.descricao}
                  </button>
                  <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 block font-normal">
                    {item.categoria}
                  </span>
                </td>

                {/* Endereço Físico no Almoxarifado */}
                <td className="py-2.5 px-3 font-mono text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                  {item.localizacaoFisica || '-'}
                </td>

                {/* Saldo Unificado e Medidor de Cobertura */}
                <td className="py-2.5 px-3">
                  <div className="w-full max-w-[210px]">
                    {/* Linha 1: 48 / 20 un mín */}
                    <div className="text-xs font-medium tabular-nums text-slate-800 dark:text-slate-200 mb-1 leading-none">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {item.estoqueAtual.toLocaleString('pt-BR')}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 font-normal">
                        {' '}/ {item.estoqueSeguranca.toLocaleString('pt-BR')} {unidadeFormatada} mín
                      </span>
                    </div>

                    {/* Linha 2: Barra compacta + percentual ou falta */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <StockGauge
                          estoqueAtual={item.estoqueAtual}
                          estoqueSeguranca={item.estoqueSeguranca}
                          capacidadeMaxima={item.capacidadeMaxima}
                          unidade={unidadeFormatada}
                          size="sm"
                        />
                      </div>
                      <span
                        className={`text-xs tabular-nums font-medium shrink-0 ${
                          deficit > 0
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {deficit > 0
                          ? formatarTextoFalta(deficit, item.unidade, { sufixo: '' })
                          : `${Math.min(100, Math.round((item.estoqueAtual / Math.max(item.capacidadeMaxima, item.estoqueSeguranca, 1)) * 100))}%`}
                      </span>
                    </div>
                  </div>
                </td>

                {/* Situação Discreta */}
                <td className="py-2.5 px-3 whitespace-nowrap">
                  <StockStatusBadge
                    estoqueAtual={item.estoqueAtual}
                    estoqueSeguranca={item.estoqueSeguranca}
                  />
                </td>

                {/* Gatilhos Operacionais por Linha (+ Entrada / Retirar) */}
                <td className="py-2.5 px-3 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => (onRegistrarEntrada ? onRegistrarEntrada(item) : onSelectItem(item))}
                      title="Adicionar entrada de material"
                      className="inline-flex items-center gap-1 h-6 px-2 rounded-md text-xs font-medium text-slate-700 dark:text-[#ececee] bg-white hover:bg-slate-50 dark:bg-[#232325] dark:hover:bg-[#343438] border border-slate-300 dark:border-[#3e3e42] transition-colors cursor-pointer"
                    >
                      <ArrowUpRight className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                      <span>+ Entrada</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => (onRegistrarSaida ? onRegistrarSaida(item) : onSelectItem(item))}
                      title="Retirar para produção"
                      className="inline-flex items-center gap-1 h-6 px-2 rounded-md text-xs font-medium text-slate-700 dark:text-[#ececee] bg-white hover:bg-slate-50 dark:bg-[#232325] dark:hover:bg-[#343438] border border-slate-300 dark:border-[#3e3e42] transition-colors cursor-pointer"
                    >
                      <ArrowDownRight className="w-3 h-3 text-slate-500 dark:text-slate-400" />
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
