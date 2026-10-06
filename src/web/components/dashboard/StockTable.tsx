'use client';

import React from 'react';
import { FileText, ArrowDownRight, MoreHorizontal } from 'lucide-react';
import { type DashboardItem, UNIDADE_LABELS } from '@/web/data/mock-almoxarifado';
import { formatarTextoFalta } from '@/web/utils/pluralization';
import { StockGauge } from './StockGauge';
import { StockStatusBadge } from './StockStatusBadge';
import { StockTableSkeleton } from './StockTableSkeleton';
import { EmptyState } from '../feedback/EmptyState';

export interface StockTableProps {
  itens: DashboardItem[];
  onSelectItem: (item: DashboardItem) => void;
  onRegistrarBaixaRapida?: (item: DashboardItem) => void;
  selectedItemId?: string | null;
  isLoading?: boolean;
  onClearFilters?: () => void;
  className?: string;
}

export function StockTable({
  itens,
  onSelectItem,
  onRegistrarBaixaRapida,
  selectedItemId,
  isLoading = false,
  onClearFilters,
  className = '',
}: StockTableProps) {
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

  return (
    <div
      className={`overflow-x-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xs transition-colors ${className}`}
    >
      <table className="w-full text-left border-collapse min-w-[760px]">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <th className="py-2.5 px-3 w-28">Código</th>
            <th className="py-2.5 px-3">Descrição / Categoria</th>
            <th className="py-2.5 px-3 w-24">Endereço</th>
            <th className="py-2.5 px-3 min-w-[190px]">Saldo & Cobertura</th>
            <th className="py-2.5 px-3 w-32">Situação</th>
            <th className="py-2.5 px-3 text-right w-36">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
          {itens.map((item) => {
            const isSelected = selectedItemId === item.id;
            const unidadeFormatada = UNIDADE_LABELS[item.unidade] || item.unidade.toLowerCase();
            const deficit = item.estoqueSeguranca - item.estoqueAtual;

            return (
              <tr
                key={item.id}
                tabIndex={0}
                className={`transition-colors outline-none focus-within:bg-slate-50/80 dark:focus-within:bg-slate-800/40 ${
                  isSelected
                    ? 'bg-blue-50/60 dark:bg-blue-950/25'
                    : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/30'
                }`}
              >
                {/* Código SKU / Prefixo */}
                <td className="py-2 px-3 font-mono font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  {item.codigo}
                </td>

                {/* Descrição e Categoria */}
                <td className="py-2 px-3">
                  <button
                    type="button"
                    onClick={() => onSelectItem(item)}
                    className="text-left font-semibold text-slate-900 dark:text-white hover:text-cyan-700 dark:hover:text-cyan-400 transition-colors cursor-pointer block leading-tight"
                  >
                    {item.descricao}
                  </button>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                    {item.categoria}
                  </span>
                </td>

                {/* Endereço Físico no Almoxarifado */}
                <td className="py-2 px-3 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  {item.localizacaoFisica || '-'}
                </td>

                {/* Saldo Unificado e Medidor de Cobertura */}
                <td className="py-2 px-3">
                  <div className="flex items-baseline justify-between mb-1 max-w-[220px]">
                    <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                      {item.estoqueAtual.toLocaleString('pt-BR')}{' '}
                      <span className="text-[10px] font-normal text-slate-500">{unidadeFormatada}</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                      Mín: {item.estoqueSeguranca.toLocaleString('pt-BR')} {unidadeFormatada}
                    </span>
                  </div>
                  <StockGauge
                    estoqueAtual={item.estoqueAtual}
                    estoqueSeguranca={item.estoqueSeguranca}
                    capacidadeMaxima={item.capacidadeMaxima}
                    unidade={unidadeFormatada}
                  />
                  {deficit > 0 && (
                    <span className="text-[10px] text-rose-600 dark:text-rose-400 font-medium block mt-0.5">
                      {formatarTextoFalta(deficit, item.unidade)}
                    </span>
                  )}
                </td>

                {/* Situação Discreta */}
                <td className="py-2 px-3 whitespace-nowrap">
                  <StockStatusBadge
                    estoqueAtual={item.estoqueAtual}
                    estoqueSeguranca={item.estoqueSeguranca}
                  />
                </td>

                {/* Gatilhos Operacionais por Linha */}
                <td className="py-2 px-3 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => onSelectItem(item)}
                      title="Abrir detalhes técnicos e extrato"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      <FileText className="w-3 h-3 text-slate-500" />
                      <span>Detalhes</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => (onRegistrarBaixaRapida ? onRegistrarBaixaRapida(item) : onSelectItem(item))}
                      title="Registrar baixa / saída rápida"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      <ArrowDownRight className="w-3 h-3 text-rose-600" />
                      <span>Baixa</span>
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
