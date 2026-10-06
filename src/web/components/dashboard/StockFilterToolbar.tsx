'use client';

import React from 'react';
import { Search, X } from 'lucide-react';
import { type StatusCriticidade, STATUS_LABELS } from '@/web/data/mock-almoxarifado';

export interface StockFilterToolbarProps {
  busca: string;
  onBuscaChange: (valor: string) => void;
  filtroSituacao: 'todos' | StatusCriticidade;
  onFiltroSituacaoChange: (filtro: 'todos' | StatusCriticidade) => void;
  totalFiltrados?: number;
  placeholder?: string;
  className?: string;
}

const CHIP_OPTIONS: Array<{ chave: 'todos' | StatusCriticidade; rotulo: string }> = [
  { chave: 'todos', rotulo: 'Todos' },
  { chave: 'ok', rotulo: STATUS_LABELS.ok },
  { chave: 'low', rotulo: STATUS_LABELS.low },
  { chave: 'crit', rotulo: STATUS_LABELS.crit },
];

export function StockFilterToolbar({
  busca,
  onBuscaChange,
  filtroSituacao,
  onFiltroSituacaoChange,
  totalFiltrados,
  placeholder = 'Buscar por nome, código ou endereço',
  className = '',
}: StockFilterToolbarProps) {
  return (
    <div className={`flex flex-wrap items-center gap-3 mb-5 ${className}`}>
      {/* Campo de Busca Textual */}
      <div className="relative flex-1 min-w-[260px]">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="search"
          value={busca}
          onChange={(e) => onBuscaChange(e.target.value)}
          placeholder={placeholder}
          aria-label="Buscar material no almoxarifado"
          className="w-full pl-10 pr-9 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f5c7a] dark:focus:ring-[#4cb3d9] transition-all shadow-2xs"
        />
        {busca && (
          <button
            type="button"
            onClick={() => onBuscaChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            aria-label="Limpar termo de busca"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Chips de Filtro de Situação */}
      <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label="Filtro de situação do estoque">
        {CHIP_OPTIONS.map(({ chave, rotulo }) => {
          const isActive = filtroSituacao === chave;

          return (
            <button
              key={chave}
              type="button"
              onClick={() => onFiltroSituacaoChange(chave)}
              aria-pressed={isActive}
              className={`px-3.5 py-2 text-xs font-medium rounded-full border transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#0f5c7a] dark:bg-[#4cb3d9] text-white dark:text-[#06222d] border-[#0f5c7a] dark:border-[#4cb3d9] shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              {rotulo}
            </button>
          );
        })}
      </div>

      {totalFiltrados !== undefined && (
        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium ml-auto hidden sm:inline-block">
          {totalFiltrados} {totalFiltrados === 1 ? 'item' : 'itens'}
        </span>
      )}
    </div>
  );
}
