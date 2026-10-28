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
      className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5 ${className}`}
    >
      {/* Card 1: Total em Catálogo */}
      <button
        type="button"
        onClick={() => handleCardClick('todos')}
        aria-pressed={filtroAtivo === 'todos'}
        title={filtroAtivo === 'todos' ? 'Exibindo todos os itens do catálogo' : 'Clique para exibir todos os itens'}
        className={`relative overflow-hidden rounded-xl p-4 text-left transition-all cursor-pointer flex flex-col justify-between border ${
          filtroAtivo === 'todos'
            ? 'bg-surface-container-lowest ring-2 ring-primary border-primary shadow-md'
            : 'bg-surface-container-lowest border-outline-variant/30 hover:border-primary/50 shadow-xs'
        }`}
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
        <div className="flex items-start justify-between">
          <div>
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-semibold">
              Total em Catálogo
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-kpi-value text-3xl font-extrabold text-on-surface tabular-nums">
                {totalItens.toLocaleString('pt-BR')}
              </span>
              <span className="font-label-md text-label-md text-secondary">
                SKUs ativos
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Package className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-outline-variant/20 flex items-center justify-between font-body-sm text-body-sm">
          <span className="flex items-center gap-1 text-tertiary font-semibold">
            <CheckCircle2 className="w-4 h-4" /> 100% catalogado
          </span>
          <span className="text-secondary text-xs">
            {filtroAtivo === 'todos' ? 'Filtro ativo' : 'Ver todos'}
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
        className={`relative overflow-hidden rounded-xl p-4 text-left transition-all cursor-pointer flex flex-col justify-between border ${
          filtroAtivo === 'low'
            ? 'bg-surface-container-lowest ring-2 ring-amber-500 border-amber-500 shadow-md'
            : 'bg-surface-container-lowest border-outline-variant/30 hover:border-amber-400/60 shadow-xs'
        }`}
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
        <div className="flex items-start justify-between">
          <div>
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-semibold">
              Abaixo do Mínimo
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-kpi-value text-3xl font-extrabold text-amber-600 dark:text-amber-400 tabular-nums">
                {totalAbaixoMinimo.toLocaleString('pt-BR')}
              </span>
              <span className="font-label-md text-label-md text-secondary">
                em atenção
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-outline-variant/20 flex items-center justify-between font-body-sm text-body-sm">
          <span className="text-secondary font-medium text-xs">
            {totalAbaixoMinimo > 0 ? `${percentualAbaixo}% requer atenção` : 'Estoque equilibrado'}
          </span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
            filtroAtivo === 'low'
              ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
              : 'bg-surface-container text-secondary'
          }`}>
            {filtroAtivo === 'low' ? 'Filtro ativo' : `${percentualAbaixo}%`}
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
        className={`relative overflow-hidden rounded-xl p-4 text-left transition-all cursor-pointer flex flex-col justify-between border ${
          filtroAtivo === 'crit'
            ? 'bg-surface-container-lowest ring-2 ring-error border-error shadow-md'
            : 'bg-surface-container-lowest border-outline-variant/30 hover:border-error/60 shadow-xs'
        }`}
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-error" />
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-error font-bold">
                Ruptura Imediata
              </span>
              {totalCriticos > 0 && (
                <span className="w-2 h-2 rounded-full bg-error" />
              )}
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-kpi-value text-3xl font-extrabold text-error tabular-nums">
                {totalCriticos.toLocaleString('pt-BR')}
              </span>
              <span className="font-label-md text-label-md text-error/80 font-medium">
                {totalCriticos === 1 ? 'item zerado' : 'itens zerados'}
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-error-container flex items-center justify-center text-on-error-container shrink-0">
            <AlertCircle className="w-5 h-5 text-error" />
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-outline-variant/20 flex items-center justify-between font-body-sm text-body-sm">
          <span className="text-error font-semibold flex items-center gap-1 text-xs">
            {percentualCritico}% requer reposição
          </span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
            filtroAtivo === 'crit'
              ? 'bg-error text-on-primary'
              : 'text-primary hover:underline'
          }`}>
            {filtroAtivo === 'crit' ? 'Filtro ativo' : 'Filtrar'}
          </span>
        </div>
      </button>

      {/* Card 4: Valor Total em Estoque (R$) & Cobertura (3.0) */}
      <div
        className="relative overflow-hidden rounded-xl bg-surface-container-lowest p-4 border border-outline-variant/30 shadow-xs flex flex-col justify-between"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-tertiary" />
        <div className="flex items-start justify-between">
          <div>
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-semibold">
              Valor em Estoque
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-kpi-value text-2xl sm:text-3xl font-extrabold text-on-surface tabular-nums">
                {valorTotalEstoque !== undefined
                  ? formatarMoedaBrl(valorTotalEstoque)
                  : itensComSaldoCalculado.toLocaleString('pt-BR')}
              </span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-tertiary/10 flex items-center justify-center text-tertiary shrink-0">
            {valorTotalEstoque !== undefined ? (
              <DollarSign className="w-5 h-5" />
            ) : (
              <TrendingUp className="w-5 h-5" />
            )}
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-outline-variant/20 flex items-center justify-between font-body-sm text-body-sm">
          <span className="text-tertiary font-semibold flex items-center gap-1 text-xs">
            <CheckCircle2 className="w-3.5 h-3.5" /> {itensComSaldoCalculado} com saldo ({percentualComSaldo}%)
          </span>
          <span className="text-secondary text-xs">
            {totalItens - itensComSaldoCalculado} zerados
          </span>
        </div>
      </div>
    </section>
  );
}
