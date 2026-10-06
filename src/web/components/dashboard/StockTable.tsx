'use client';

import React from 'react';
import { type DashboardItem, UNIDADE_LABELS } from '@/web/data/mock-almoxarifado';
import { StockGauge } from './StockGauge';
import { StockStatusBadge } from './StockStatusBadge';
import { StockTableSkeleton } from './StockTableSkeleton';
import { EmptyState } from '../feedback/EmptyState';

export interface StockTableProps {
  itens: DashboardItem[];
  onSelectItem: (item: DashboardItem) => void;
  selectedItemId?: string | null;
  isLoading?: boolean;
  onClearFilters?: () => void;
  className?: string;
}

export function StockTable({
  itens,
  onSelectItem,
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
        description="Não encontramos nenhum item para a busca ou filtro de situação selecionados nesta aba."
        onClearFilters={onClearFilters}
        className={className}
      />
    );
  }

  return (
    <div
      className={`overflow-x-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs transition-colors ${className}`}
    >
      <table className="w-full text-left border-collapse min-w-[640px]">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60">
            <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Item
            </th>
            <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Endereço
            </th>
            <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Quantidade
            </th>
            <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-[24%]">
              Nível
            </th>
            <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">
              Situação
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {itens.map((item) => {
            const isSelected = selectedItemId === item.id;
            const unidadeFormatada = UNIDADE_LABELS[item.unidade] || item.unidade.toLowerCase();

            return (
              <tr
                key={item.id}
                tabIndex={0}
                role="button"
                onClick={() => onSelectItem(item)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectItem(item);
                  }
                }}
                className={`transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#0f5c7a] focus-visible:ring-inset ${
                  isSelected
                    ? 'bg-blue-50/70 dark:bg-blue-950/30'
                    : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                }`}
              >
                {/* Nome, Código e Categoria */}
                <td className="py-3.5 px-4">
                  <b className="block text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                    {item.descricao}
                  </b>
                  <small className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                    {item.codigo} · {item.categoria}
                  </small>
                </td>

                {/* Localização Física no Armazém */}
                <td className="py-3.5 px-4 text-sm font-mono text-slate-700 dark:text-slate-300">
                  {item.localizacaoFisica || '-'}
                </td>

                {/* Saldo Atual com Unidade */}
                <td className="py-3.5 px-4 text-sm font-medium text-slate-900 dark:text-white tabular-nums">
                  {item.estoqueAtual.toLocaleString('pt-BR')}{' '}
                  <span className="text-xs text-slate-500 font-normal">{unidadeFormatada}</span>
                </td>

                {/* Barra de Nível Visual */}
                <td className="py-3.5 px-4">
                  <StockGauge
                    estoqueAtual={item.estoqueAtual}
                    estoqueSeguranca={item.estoqueSeguranca}
                    capacidadeMaxima={item.capacidadeMaxima}
                    unidade={unidadeFormatada}
                    size="sm"
                  />
                </td>

                {/* Tag de Criticidade */}
                <td className="py-3.5 px-4 text-right">
                  <StockStatusBadge
                    estoqueAtual={item.estoqueAtual}
                    estoqueSeguranca={item.estoqueSeguranca}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
