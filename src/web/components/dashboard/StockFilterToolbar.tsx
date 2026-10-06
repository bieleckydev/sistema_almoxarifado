'use client';

import React from 'react';
import { Search, X, Filter } from 'lucide-react';
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
  placeholder = 'Filtrar por nome, SKU ou endereço físico...',
  className = '',
}: StockFilterToolbarProps) {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 mb-4 ${className}`}>
      {/* Campo de Busca Rápida Operacional */}
      <div className="relative flex-1 min-w-[280px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="search"
          value={busca}
          onChange={(e) => onBuscaChange(e.target.value)}
          placeholder={placeholder}
          aria-label="Buscar material no almoxarifado"
          className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-600 transition-colors"
        />
        {busca && (
          <button
            type="button"
            onClick={() => onBuscaChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            aria-label="Limpar termo de busca"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Segmented Control / Filtros de Situação */}
      <div
        className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700/60"
        role="group"
        aria-label="Filtro de situação do estoque"
      >
        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 px-2 flex items-center gap-1 hidden md:flex">
          <Filter className="w-3 h-3" /> Situação:
        </span>
        {CHIP_OPTIONS.map(({ chave, rotulo }) => {
          const isActive = filtroSituacao === chave;

          return (
            <button
              key={chave}
              type="button"
              onClick={() => onFiltroSituacaoChange(chave)}
              aria-pressed={isActive}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                isActive
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {rotulo}
            </button>
          );
        })}
      </div>

      {totalFiltrados !== undefined && (
        <span className="text-xs font-mono text-slate-500 dark:text-slate-400 shrink-0">
          <strong>{totalFiltrados}</strong> itens exibidos
        </span>
      )}
    </div>
  );
}
