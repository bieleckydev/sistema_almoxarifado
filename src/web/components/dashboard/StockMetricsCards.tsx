'use client';

import React from 'react';
import type { StatusCriticidade } from '@/web/data/mock-almoxarifado';

export interface StockMetricsCardsProps {
  totalItens: number;
  totalAbaixoMinimo: number;
  totalCriticos: number;
  filtroAtivo?: 'todos' | StatusCriticidade;
  onFiltrarPorStatus?: (status: 'todos' | StatusCriticidade) => void;
  isLoading?: boolean;
  className?: string;
}

export function StockMetricsCards({
  totalItens,
  totalAbaixoMinimo,
  totalCriticos,
  filtroAtivo = 'todos',
  onFiltrarPorStatus,
  isLoading = false,
  className = '',
}: StockMetricsCardsProps) {
  const percentualAbaixo = totalItens > 0 ? ((totalAbaixoMinimo / totalItens) * 100).toFixed(0) : '0';
  const percentualCritico = totalItens > 0 ? ((totalCriticos / totalItens) * 100).toFixed(0) : '0';

  if (isLoading) {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5 ${className}`}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg animate-pulse"
          >
            <div className="h-6 w-16 bg-slate-200 dark:bg-slate-800 rounded mb-1.5" />
            <div className="h-3 w-32 bg-slate-100 dark:bg-slate-800/60 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <section
      aria-label="Indicadores operacionais de estoque"
      className={`grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5 ${className}`}
    >
      {/* Total de Itens */}
      <button
        type="button"
        onClick={() => onFiltrarPorStatus?.('todos')}
        aria-pressed={filtroAtivo === 'todos'}
        className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer ${
          filtroAtivo === 'todos'
            ? 'bg-slate-50 dark:bg-slate-800/80 border-slate-400 dark:border-slate-600 ring-1 ring-slate-400 dark:ring-slate-600'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
        }`}
      >
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
            {totalItens.toLocaleString('pt-BR')}
          </span>
          <span className="text-[11px] font-mono font-medium text-slate-500 dark:text-slate-400">
            100% catálogo
          </span>
        </div>
        <div className="text-xs font-medium text-slate-600 dark:text-slate-400">
          {totalItens === 1 ? 'Item cadastrado nesta categoria' : 'Itens cadastrados nesta categoria'}
        </div>
      </button>

      {/* Abaixo do Mínimo */}
      <button
        type="button"
        onClick={() => onFiltrarPorStatus?.('low')}
        aria-pressed={filtroAtivo === 'low'}
        className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer ${
          filtroAtivo === 'low'
            ? 'bg-amber-50/60 dark:bg-amber-950/40 border-amber-500 dark:border-amber-500 ring-1 ring-amber-500'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-700'
        }`}
      >
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-2xl font-bold tracking-tight text-amber-700 dark:text-amber-400 tabular-nums">
            {totalAbaixoMinimo.toLocaleString('pt-BR')}
          </span>
          <span className="text-[11px] font-mono font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800/60">
            {percentualAbaixo}% em atenção
          </span>
        </div>
        <div className="text-xs font-medium text-slate-600 dark:text-slate-400">
          Abaixo do estoque de segurança
        </div>
      </button>

      {/* Nível Crítico */}
      <button
        type="button"
        onClick={() => onFiltrarPorStatus?.('crit')}
        aria-pressed={filtroAtivo === 'crit'}
        className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer ${
          filtroAtivo === 'crit'
            ? 'bg-rose-50/60 dark:bg-rose-950/40 border-rose-500 dark:border-rose-500 ring-1 ring-rose-500'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-700'
        }`}
      >
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-2xl font-bold tracking-tight text-rose-700 dark:text-rose-400 tabular-nums">
            {totalCriticos.toLocaleString('pt-BR')}
          </span>
          <span className="text-[11px] font-mono font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/80 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-800/60">
            {percentualCritico}% em ruptura
          </span>
        </div>
        <div className="text-xs font-medium text-slate-600 dark:text-slate-400">
          Nível crítico (requer reposição imediata)
        </div>
      </button>
    </section>
  );
}
