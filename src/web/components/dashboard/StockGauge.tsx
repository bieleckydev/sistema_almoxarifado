'use client';

import React from 'react';
import { calcularStatusCriticidade, type StatusCriticidade } from '@/web/data/mock-almoxarifado';

export interface StockGaugeProps {
  estoqueAtual: number;
  estoqueSeguranca: number;
  capacidadeMaxima: number;
  unidade?: string;
  showLimits?: boolean;
  showLabels?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function StockGauge({
  estoqueAtual,
  estoqueSeguranca,
  capacidadeMaxima,
  unidade = 'un',
  showLimits = false,
  size = 'md',
  className = '',
}: StockGaugeProps) {
  const capMax = Math.max(capacidadeMaxima, estoqueSeguranca, estoqueAtual, 1);
  const status: StatusCriticidade = calcularStatusCriticidade(estoqueAtual, estoqueSeguranca);

  const fillPercentage = Math.min(100, Math.max(0, (estoqueAtual / capMax) * 100));
  const minPercentage = Math.min(100, Math.max(0, (estoqueSeguranca / capMax) * 100));

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-2.5',
  }[size];

  const colorClasses = {
    ok: 'bg-emerald-600 dark:bg-emerald-500',
    low: 'bg-amber-600 dark:bg-amber-500',
    crit: 'bg-rose-600 dark:bg-rose-500',
  }[status];

  return (
    <div className={`w-full ${className}`}>
      {/* Barra de progresso limpa com marcador vertical */}
      <div
        className={`relative w-full ${heightClasses} bg-slate-200 dark:bg-slate-700/70 rounded-xs overflow-visible`}
        role="progressbar"
        aria-valuenow={estoqueAtual}
        aria-valuemin={0}
        aria-valuemax={capMax}
      >
        <div
          className={`h-full rounded-xs transition-all duration-200 ${colorClasses}`}
          style={{ width: `${fillPercentage}%` }}
        />
        {/* Marcador vertical da meta de segurança */}
        <div
          className="absolute -top-1 -bottom-1 w-[2px] bg-slate-900 dark:bg-slate-200 rounded-xs z-10"
          style={{ left: `${minPercentage}%` }}
          title={`Ponto de corte (Estoque Mínimo): ${estoqueSeguranca.toLocaleString('pt-BR')} ${unidade}`}
        />
      </div>

      {/* Legenda dos pontos de corte sem fontes microscópicas */}
      {showLimits && (
        <div className="flex justify-between text-xs font-mono text-slate-500 dark:text-slate-400 mt-1.5 leading-none">
          <span>0</span>
          <span className="text-slate-700 dark:text-slate-200 font-medium">
            Mín: {estoqueSeguranca.toLocaleString('pt-BR')} {unidade}
          </span>
          <span>Máx: {capMax.toLocaleString('pt-BR')} {unidade}</span>
        </div>
      )}
    </div>
  );
}
