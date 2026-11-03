'use client';

import React from 'react';
import { Package, AlertTriangle, AlertCircle, CheckCircle2, TrendingUp, DollarSign } from 'lucide-react';
import type { StatusCriticidade } from '@/web/data/mock-almoxarifado';
import { formatarMoedaBrl } from '@/core/services/custo-medio';

export interface StockMetricsCardsProps {
  totalItens: number;
  totalAbaixoMinimo: number;
  totalCriticos: number;
  totalComSaldo?: number;
  valorTotalEstoque?: number;
  filtroAtivo?: 'todos' | StatusCriticidade;
  onFiltrarPorStatus?: (status: 'todos' | StatusCriticidade) => void;
  isLoading?: boolean;
  className?: string;
}

export function StockMetricsCards({
  totalItens,
  totalAbaixoMinimo,
  totalCriticos,
  totalComSaldo,
  valorTotalEstoque,
  filtroAtivo = 'todos',
  onFiltrarPorStatus,
  isLoading = false,
  className = '',
}: StockMetricsCardsProps) {
  const percentualAbaixo = totalItens > 0 ? ((totalAbaixoMinimo / totalItens) * 100).toFixed(0) : '0';
  const percentualCritico = totalItens > 0 ? ((totalCriticos / totalItens) * 100).toFixed(0) : '0';
  const itensComSaldoCalculado = totalComSaldo !== undefined
    ? totalComSaldo
    : Math.max(0, totalItens - totalCriticos);
  const percentualComSaldo = totalItens > 0 ? ((itensComSaldoCalculado / totalItens) * 100).toFixed(0) : '0';

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
      <div className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5 ${className}`}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-4 bg-surface-container-lowest border border-outline-variant/30 rounded-xl animate-pulse flex flex-col justify-between h-32"
          >
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="h-3 w-24 bg-surface-container-high rounded" />
                <div className="h-8 w-16 bg-surface-container-high rounded" />
              </div>
              <div className="w-10 h-10 rounded-xl bg-surface-container-high" />
            </div>
            <div className="h-3 w-32 bg-surface-container-high rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <section
      aria-label="Indicadores operacionais do catálogo de estoque"
      className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-4 ${className}`}
    >
      {/* Card 1: Total em Catálogo */}
      <button
        type="button"
        onClick={() => handleCardClick('todos')}
        aria-pressed={filtroAtivo === 'todos'}
        title={filtroAtivo === 'todos' ? 'Exibindo todos os itens do catálogo' : 'Clique para exibir todos os itens'}
        className={`rounded-lg p-3.5 text-left transition-colors cursor-pointer flex flex-col justify-between border ${
          filtroAtivo === 'todos'
            ? 'bg-surface-container-lowest ring-1 ring-primary border-primary'
            : 'bg-surface-container-lowest border-outline-variant/25 hover:border-outline-variant/60'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-secondary">
            Total em catálogo
          </span>
          <span className="text-[11px] font-medium text-secondary">
            {filtroAtivo === 'todos' ? 'Filtro ativo' : 'Ver todos'}
          </span>
        </div>
        <div className="my-2.5 flex items-baseline gap-2">
          <span className="font-kpi-value text-2xl sm:text-3xl font-bold text-on-surface tabular-nums tracking-tight">
            {totalItens.toLocaleString('pt-BR')}
          </span>
          <span className="text-xs text-secondary">
            SKUs ativos
          </span>
        </div>
      </button>

      {/* Card 2: Abaixo do Mínimo */}
      <button
        type="button"
        onClick={() => handleCardClick('low')}
        aria-pressed={filtroAtivo === 'low'}
        title={
          filtroAtivo === 'low'
            ? 'Filtro ativo. Clique novamente para limpar e ver todos'
            : 'Clique para filtrar itens abaixo do estoque de segurança'
        }
        className={`rounded-lg p-3.5 text-left transition-colors cursor-pointer flex flex-col justify-between border ${
          filtroAtivo === 'low'
            ? 'bg-surface-container-lowest ring-1 ring-amber-500 border-amber-500'
            : 'bg-surface-container-lowest border-outline-variant/25 hover:border-amber-400/60'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-secondary">
            Abaixo do mínimo
          </span>
          {totalAbaixoMinimo > 0 && (
            <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
              Requer atenção
            </span>
          )}
        </div>
        <div className="my-2.5 flex items-baseline gap-2">
          <span className="font-kpi-value text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400 tabular-nums tracking-tight">
            {totalAbaixoMinimo.toLocaleString('pt-BR')}
          </span>
          <span className="text-xs text-secondary">
            em atenção
          </span>
        </div>
        <div className="pt-2 border-t border-outline-variant/15 flex items-center justify-between text-[11px] text-secondary">
          <span>{totalAbaixoMinimo > 0 ? `${percentualAbaixo}% do catálogo` : 'Estoque equilibrado'}</span>
          <span className={filtroAtivo === 'low' ? 'font-semibold text-amber-600 dark:text-amber-400' : ''}>
            {filtroAtivo === 'low' ? 'Filtro ativo' : 'Filtrar'}
          </span>
        </div>
      </button>

      {/* Card 3: Nível Crítico / Ruptura Imediata */}
      <button
        type="button"
        onClick={() => handleCardClick('crit')}
        aria-pressed={filtroAtivo === 'crit'}
        title={
          filtroAtivo === 'crit'
            ? 'Filtro ativo. Clique novamente para limpar e ver todos'
            : 'Clique para filtrar itens em ruptura/zerados'
        }
        className={`rounded-lg p-3.5 text-left transition-colors cursor-pointer flex flex-col justify-between border ${
          filtroAtivo === 'crit'
            ? 'bg-surface-container-lowest ring-1 ring-error border-error'
            : 'bg-surface-container-lowest border-outline-variant/25 hover:border-error/60'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-error">
            Ruptura imediata
          </span>
          {totalCriticos > 0 && (
            <span className="text-[11px] font-semibold text-error">
              {totalCriticos === 1 ? '1 zerado' : `${totalCriticos} zerados`}
            </span>
          )}
        </div>
        <div className="my-2.5 flex items-baseline gap-2">
          <span className="font-kpi-value text-2xl sm:text-3xl font-bold text-error tabular-nums tracking-tight">
            {totalCriticos.toLocaleString('pt-BR')}
          </span>
          <span className="text-xs text-error/80">
            {totalCriticos === 1 ? 'item zerado' : 'itens zerados'}
          </span>
        </div>
        <div className="pt-2 border-t border-outline-variant/15 flex items-center justify-between text-[11px] text-secondary">
          <span className="text-error font-medium">{percentualCritico}% requer reposição</span>
          <span className={filtroAtivo === 'crit' ? 'font-semibold text-error' : 'text-primary'}>
            {filtroAtivo === 'crit' ? 'Filtro ativo' : 'Filtrar'}
          </span>
        </div>
      </button>

      {/* Card 4: Valor Total em Estoque (R$) & Cobertura (3.0) */}
      <div className="rounded-lg p-3.5 bg-surface-container-lowest border border-outline-variant/25 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-secondary">
            Valor em estoque
          </span>
          <span className="text-[11px] font-medium text-secondary">
            {itensComSaldoCalculado} com saldo
          </span>
        </div>
        <div className="my-2.5 flex items-baseline gap-2">
          <span className="font-kpi-value text-2xl sm:text-3xl font-bold text-on-surface tabular-nums tracking-tight">
            {valorTotalEstoque !== undefined
              ? formatarMoedaBrl(valorTotalEstoque)
              : itensComSaldoCalculado.toLocaleString('pt-BR')}
          </span>
        </div>
        <div className="pt-2 border-t border-outline-variant/15 flex items-center justify-between text-[11px] text-secondary">
          <span className="text-tertiary font-medium">{percentualComSaldo}% com saldo físico</span>
          <span>{totalItens - itensComSaldoCalculado} zerados</span>
        </div>
      </div>
    </section>
  );
}
