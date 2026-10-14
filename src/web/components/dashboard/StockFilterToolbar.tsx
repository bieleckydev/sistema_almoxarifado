'use client';

import React from 'react';
import { Search, X, Filter } from 'lucide-react';
import { type StatusCriticidade, STATUS_LABELS } from '@/web/data/mock-almoxarifado';

export interface StockFilterToolbarProps {
  busca: string;
  onBuscaChange: (valor: string) => void;
  filtroSituacao: 'todos' | StatusCriticidade;
  onFiltroSituacaoChange: (filtro: 'todos' | StatusCriticidade) => void;
  contagemPorSituacao?: Record<'todos' | StatusCriticidade, number>;
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
  contagemPorSituacao,
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
          className="w-full pl-9 pr-8 py-2 text-xs rounded-md border border-slate-200 dark:border-[#3e3e42] bg-white dark:bg-[#2b2b2e] text-slate-900 dark:text-[#ececee] placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500 transition-colors"
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
        className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-[#1a1a1c] rounded-md border border-slate-200 dark:border-[#3e3e42]"
        role="group"
        aria-label="Filtro de situação do estoque"
      >
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 px-2 flex items-center gap-1 hidden md:flex">
          <Filter className="w-3 h-3" /> Situação:
        </span>
        {CHIP_OPTIONS.map(({ chave, rotulo }) => {
          const isActive = filtroSituacao === chave;
          const count = contagemPorSituacao ? contagemPorSituacao[chave] : undefined;

          return (
            <button
              key={chave}
              type="button"
              onClick={() => {
                if (chave !== 'todos' && filtroSituacao === chave) {
                  onFiltroSituacaoChange('todos');
                } else {
                  onFiltroSituacaoChange(chave);
                }
              }}
              aria-pressed={isActive}
              title={
                isActive && chave !== 'todos'
                  ? 'Filtro ativo. Clique novamente para desmarcar'
                  : undefined
              }
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                isActive
                  ? 'bg-white dark:bg-[#2b2b2e] text-slate-900 dark:text-[#ececee] font-semibold border border-slate-200 dark:border-[#3e3e42]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-[#ececee]'
              }`}
            >
              <span>{rotulo}</span>
              {count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-sm font-mono ${
                    isActive
                      ? 'bg-slate-100 dark:bg-[#343438] text-slate-700 dark:text-[#ececee]'
                      : 'bg-slate-200/60 dark:bg-[#2b2b2e] text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {totalFiltrados !== undefined && (
        <span className="text-xs font-mono text-slate-500 dark:text-slate-400 shrink-0">
          <strong>{totalFiltrados}</strong> {totalFiltrados === 1 ? 'item exibido' : 'itens exibidos'}
        </span>
      )}
    </div>
  );
}
