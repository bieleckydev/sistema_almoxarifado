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
      className={`flex flex-col items-center justify-center p-8 text-center rounded-lg border border-slate-200 dark:border-[#3e3e42] bg-white dark:bg-[#2b2b2e] my-4 ${className}`}
    >
      <SearchX className="w-8 h-8 text-slate-400 dark:text-slate-500 mb-3" />
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
        {title}
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4">
        {description}
      </p>

      {onClearFilters && (
        <button
          type="button"
          onClick={onClearFilters}
          className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-[#232325] hover:bg-slate-50 dark:hover:bg-[#343438] border border-slate-300 dark:border-[#3e3e42] rounded-md transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Limpar filtros de busca</span>
        </button>
      )}
    </div>
  );
}
