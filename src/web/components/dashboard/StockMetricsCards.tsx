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

  const handleCardClick = (status: 'todos' | StatusCriticidade) => {
    if (!onFiltrarPorStatus) return;
    if (status === 'todos') {
      onFiltrarPorStatus('todos');
    } else if (filtroAtivo === status) {
      // Toggle: se clicar no card que já está filtrando, remove o filtro
      onFiltrarPorStatus('todos');
    } else {
      onFiltrarPorStatus(status);
    }
  };

  if (isLoading) {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5 ${className}`}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-3.5 bg-white dark:bg-[#2b2b2e] border border-slate-200 dark:border-[#3e3e42] rounded-lg animate-pulse"
          >
            <div className="h-6 w-16 bg-slate-200 dark:bg-[#343438] rounded-sm mb-1.5" />
            <div className="h-3 w-32 bg-slate-100 dark:bg-[#343438]/60 rounded-sm" />
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
        onClick={() => handleCardClick('todos')}
        aria-pressed={filtroAtivo === 'todos'}
        title={filtroAtivo === 'todos' ? 'Exibindo todos os itens do catálogo' : 'Clique para exibir todos os itens'}
        className={`p-3.5 rounded-lg border text-left transition-colors cursor-pointer relative border-t-3 border-t-[#4fa8e0] ${
          filtroAtivo === 'todos'
            ? 'bg-slate-100 dark:bg-[#343438] border-slate-400 dark:border-slate-500'
            : 'bg-white dark:bg-[#2b2b2e] border-slate-200 dark:border-[#3e3e42] hover:border-slate-300 dark:hover:border-slate-600'
        }`}
      >
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-2xl font-bold text-slate-900 dark:text-[#ececee] tabular-nums tracking-tight">
            {totalItens.toLocaleString('pt-BR')}
          </span>
          <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
            100% catálogo
          </span>
        </div>
        <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-400">
          <span>{totalItens === 1 ? 'Item cadastrado nesta categoria' : 'Itens cadastrados nesta categoria'}</span>
        </div>
      </button>

      {/* Abaixo do Mínimo */}
      <button
        type="button"
        onClick={() => handleCardClick('low')}
        aria-pressed={filtroAtivo === 'low'}
        title={
          filtroAtivo === 'low'
            ? 'Filtro ativo. Clique novamente para limpar e ver todos'
            : 'Clique para filtrar itens em atenção (abaixo do estoque de segurança)'
        }
        className={`p-3.5 rounded-lg border text-left transition-colors cursor-pointer relative border-t-3 border-t-[#f2b705] ${
          filtroAtivo === 'low'
            ? 'bg-amber-50/70 dark:bg-[#3d2e14] border-amber-500 dark:border-amber-600'
            : 'bg-white dark:bg-[#2b2b2e] border-slate-200 dark:border-[#3e3e42] hover:border-amber-300 dark:hover:border-amber-700/60'
        }`}
      >
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-2xl font-bold text-amber-700 dark:text-[#f3c462] tabular-nums tracking-tight">
            {totalAbaixoMinimo.toLocaleString('pt-BR')}
          </span>
          <span className="text-xs font-semibold text-amber-700 dark:text-[#f3c462] bg-amber-50 dark:bg-[#3d2e14] px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-900/60">
            {percentualAbaixo}% em atenção
          </span>
        </div>
        <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-400">
          <span>Abaixo do estoque de segurança</span>
          {filtroAtivo === 'low' && (
            <span className="text-[10px] font-semibold text-amber-700 dark:text-[#f3c462] bg-amber-100 dark:bg-amber-900/50 px-1.5 py-0.5 rounded-md">
              Filtro ativo ✕
            </span>
          )}
        </div>
      </button>

      {/* Nível Crítico */}
      <button
        type="button"
        onClick={() => handleCardClick('crit')}
        aria-pressed={filtroAtivo === 'crit'}
        title={
          filtroAtivo === 'crit'
            ? 'Filtro ativo. Clique novamente para limpar e ver todos'
            : 'Clique para filtrar itens em nível crítico/zerado'
        }
        className={`p-3.5 rounded-lg border text-left transition-colors cursor-pointer relative border-t-3 border-t-[#d9372f] ${
          filtroAtivo === 'crit'
            ? 'bg-rose-50/70 dark:bg-[#40201d] border-rose-500 dark:border-rose-600'
            : 'bg-white dark:bg-[#2b2b2e] border-slate-200 dark:border-[#3e3e42] hover:border-rose-300 dark:hover:border-rose-700/60'
        }`}
      >
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-2xl font-bold text-rose-700 dark:text-[#f0796b] tabular-nums tracking-tight">
            {totalCriticos.toLocaleString('pt-BR')}
          </span>
          <span className="text-xs font-semibold text-rose-700 dark:text-[#f0796b] bg-rose-50 dark:bg-[#40201d] px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-900/60">
            {percentualCritico}% em ruptura
          </span>
        </div>
        <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-400">
          <span>Nível crítico (requer reposição)</span>
          {filtroAtivo === 'crit' && (
            <span className="text-[10px] font-semibold text-rose-700 dark:text-[#f0796b] bg-rose-100 dark:bg-rose-900/50 px-1.5 py-0.5 rounded-md">
              Filtro ativo ✕
            </span>
          )}
        </div>
      </button>
    </section>
  );
}
