'use client';

import React from 'react';
import { Package, AlertTriangle, AlertOctagon } from 'lucide-react';

export interface StockMetricsCardsProps {
  totalItens: number;
  totalAbaixoMinimo: number;
  totalCriticos: number;
  isLoading?: boolean;
  className?: string;
}

export function StockMetricsCards({
  totalItens,
  totalAbaixoMinimo,
  totalCriticos,
  isLoading = false,
  className = '',
}: StockMetricsCardsProps) {
  if (isLoading) {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6 ${className}`}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs animate-pulse"
          >
            <div className="h-8 w-16 bg-slate-200 dark:bg-slate-800 rounded-md mb-2" />
            <div className="h-3 w-28 bg-slate-100 dark:bg-slate-800/60 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <section
      aria-label="Indicadores de estoque da categoria"
      className={`grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6 ${className}`}
    >
      {/* Total de Itens */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs transition-shadow hover:shadow-sm flex items-center justify-between">
        <div>
          <b className="block text-2xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
            {totalItens.toLocaleString('pt-BR')}
          </b>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Itens nesta aba
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          <Package className="w-5 h-5" />
        </div>
      </div>

      {/* Abaixo do Mínimo */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs transition-shadow hover:shadow-sm flex items-center justify-between">
        <div>
          <b className="block text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 tabular-nums">
            {totalAbaixoMinimo.toLocaleString('pt-BR')}
          </b>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Abaixo do mínimo
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="w-5 h-5" />
        </div>
      </div>

      {/* Nível Crítico */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs transition-shadow hover:shadow-sm flex items-center justify-between">
        <div>
          <b className="block text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400 tabular-nums">
            {totalCriticos.toLocaleString('pt-BR')}
          </b>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Nível crítico
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
          <AlertOctagon className="w-5 h-5" />
        </div>
      </div>
    </section>
  );
}
