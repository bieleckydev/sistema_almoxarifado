'use client';

import React from 'react';
import { SearchX, RotateCcw } from 'lucide-react';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  onClearFilters?: () => void;
  className?: string;
}

export function EmptyState({
  title = 'Nenhum item encontrado',
  description = 'Tente ajustar os termos de pesquisa ou remover os filtros de situação aplicados.',
  onClearFilters,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 my-6 ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-4">
        <SearchX className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1">
        {title}
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-5">
        {description}
      </p>

      {onClearFilters && (
        <button
          type="button"
          onClick={onClearFilters}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Limpar filtros de busca
        </button>
      )}
    </div>
  );
}
