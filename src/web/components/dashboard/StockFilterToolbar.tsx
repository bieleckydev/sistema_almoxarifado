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

export function StockFilterToolbar({
  busca,
  onBuscaChange,
  filtroSituacao,
  onFiltroSituacaoChange,
  contagemPorSituacao,
  totalFiltrados,
  placeholder = 'Buscar por código SKU, descrição, endereço ou categoria...',
  className = '',
}: StockFilterToolbarProps) {
  return (
    <div
      className={`rounded-lg bg-surface-container-lowest p-3 border border-outline-variant/40 flex flex-col gap-2.5 mb-4 shadow-2xs ${className}`}
    >
      {/* Linha Superior: Campo de Busca com Lupa e Atalho */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
          <input
            type="search"
            value={busca}
            onChange={(e) => onBuscaChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                onBuscaChange('');
              }
            }}
            placeholder={placeholder}
            aria-label="Buscar material no almoxarifado"
            className="w-full pl-8 pr-12 py-1.5 text-xs rounded-md border border-outline-variant/40 bg-surface-container-low/40 text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none focus:bg-surface-container-lowest focus:border-outline transition-colors"
          />
          {busca ? (
            <button
              type="button"
              onClick={() => onBuscaChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-zinc-500 hover:text-on-surface hover:bg-surface-container cursor-pointer transition-colors"
              aria-label="Limpar termo de busca"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="hidden md:inline absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-on-surface-variant/70 bg-surface-container px-1 py-0.5 rounded pointer-events-none">
              ESC
            </span>
          )}
        </div>

        {totalFiltrados !== undefined && (
          <div className="flex items-center gap-1.5 text-xs text-on-surface-variant shrink-0 font-mono self-end sm:self-center">
            <span>Exibindo:</span>
            <span className="font-semibold text-on-surface px-1.5 py-0.5 rounded bg-surface-container tabular-nums">
              {totalFiltrados.toLocaleString('pt-BR')} {totalFiltrados === 1 ? 'item' : 'itens'}
            </span>
          </div>
        )}
      </div>

      {/* Linha Inferior: Segmentação de Situação Operacional */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-outline-variant/20">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtro de situação do estoque">
          <span className="text-xs text-on-surface-variant font-medium mr-1 hidden sm:inline-flex items-center gap-1">
            <Filter className="w-3 h-3 text-zinc-500" /> Situação:
          </span>

          {/* Segment: Todos */}
          <button
            type="button"
            onClick={() => onFiltroSituacaoChange('todos')}
            aria-pressed={filtroSituacao === 'todos'}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              filtroSituacao === 'todos'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-2xs'
                : 'bg-surface-container-lowest hover:bg-surface-container text-on-surface-variant hover:text-on-surface border border-outline-variant/30'
            }`}
          >
            <span>Todos</span>
            {contagemPorSituacao?.todos !== undefined && (
              <span
                className={`text-[10.5px] px-1 py-0.2 rounded font-mono tabular-nums ${
                  filtroSituacao === 'todos'
                    ? 'bg-white/20 text-white dark:bg-zinc-800 dark:text-zinc-100'
                    : 'text-on-surface-variant'
                }`}
              >
                {contagemPorSituacao.todos}
              </span>
            )}
          </button>

          {/* Segment: Normal */}
          <button
            type="button"
            onClick={() => {
              if (filtroSituacao === 'ok') {
                onFiltroSituacaoChange('todos');
              } else {
                onFiltroSituacaoChange('ok');
              }
            }}
            aria-pressed={filtroSituacao === 'ok'}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              filtroSituacao === 'ok'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-2xs'
                : 'bg-surface-container-lowest hover:bg-surface-container text-on-surface-variant hover:text-on-surface border border-outline-variant/30'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" />
            <span>Normal</span>
            {contagemPorSituacao?.ok !== undefined && (
              <span
                className={`text-[10.5px] px-1 py-0.2 rounded font-mono tabular-nums ${
                  filtroSituacao === 'ok'
                    ? 'bg-white/20 text-white dark:bg-zinc-800 dark:text-zinc-100'
                    : 'text-on-surface-variant'
                }`}
              >
                {contagemPorSituacao.ok}
              </span>
            )}
          </button>

          {/* Segment: Abaixo do Mínimo */}
          <button
            type="button"
            onClick={() => {
              if (filtroSituacao === 'low') {
                onFiltroSituacaoChange('todos');
              } else {
                onFiltroSituacaoChange('low');
              }
            }}
            aria-pressed={filtroSituacao === 'low'}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              filtroSituacao === 'low'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-2xs'
                : 'bg-surface-container-lowest hover:bg-surface-container text-on-surface-variant hover:text-on-surface border border-outline-variant/30'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
            <span>Abaixo do Mínimo</span>
            {contagemPorSituacao?.low !== undefined && (
              <span
                className={`text-[10.5px] px-1 py-0.2 rounded font-mono tabular-nums ${
                  filtroSituacao === 'low'
                    ? 'bg-white/20 text-white dark:bg-zinc-800 dark:text-zinc-100'
                    : 'text-amber-600 dark:text-amber-400 font-semibold'
                }`}
              >
                {contagemPorSituacao.low}
              </span>
            )}
          </button>

          {/* Segment: Crítico / Ruptura */}
          <button
            type="button"
            onClick={() => {
              if (filtroSituacao === 'crit') {
                onFiltroSituacaoChange('todos');
              } else {
                onFiltroSituacaoChange('crit');
              }
            }}
            aria-pressed={filtroSituacao === 'crit'}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              filtroSituacao === 'crit'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-2xs'
                : 'bg-surface-container-lowest hover:bg-surface-container text-on-surface-variant hover:text-on-surface border border-outline-variant/30'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
            <span>Crítico / Ruptura</span>
            {contagemPorSituacao?.crit !== undefined && (
              <span
                className={`text-[10.5px] px-1 py-0.2 rounded font-mono tabular-nums ${
                  filtroSituacao === 'crit'
                    ? 'bg-white/20 text-white dark:bg-zinc-800 dark:text-zinc-100'
                    : 'text-red-600 dark:text-red-400 font-semibold'
                }`}
              >
                {contagemPorSituacao.crit}
              </span>
            )}
          </button>
        </div>

        {/* Limpar Filtros Rápido */}
        {(filtroSituacao !== 'todos' || busca) && (
          <button
            type="button"
            onClick={() => {
              onFiltroSituacaoChange('todos');
              onBuscaChange('');
            }}
            className="text-xs text-primary hover:underline font-semibold cursor-pointer py-1"
          >
            Limpar filtros
          </button>
        )}
      </div>
    </div>
  );
}
