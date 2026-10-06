'use client';

import React from 'react';
import { calcularStatusCriticidade, type StatusCriticidade } from '@/web/data/mock-almoxarifado';

export interface StockGaugeProps {
  estoqueAtual: number;
  estoqueSeguranca: number;
  capacidadeMaxima: number;
  unidade?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  className?: string;
}

export function StockGauge({
  estoqueAtual,
  estoqueSeguranca,
  capacidadeMaxima,
  unidade = 'un',
  size = 'md',
  showLabels = false,
  className = '',
}: StockGaugeProps) {
  const capMax = Math.max(capacidadeMaxima, estoqueSeguranca, estoqueAtual, 1);
  const status: StatusCriticidade = calcularStatusCriticidade(estoqueAtual, estoqueSeguranca);

  const fillPercentage = Math.min(100, Math.max(0, (estoqueAtual / capMax) * 100));
  const minPercentage = Math.min(100, Math.max(0, (estoqueSeguranca / capMax) * 100));

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  }[size];

  const colorClasses = {
    ok: 'bg-emerald-600 dark:bg-emerald-500',
    low: 'bg-amber-600 dark:bg-amber-500',
    crit: 'bg-rose-600 dark:bg-rose-500',
  }[status];

  return (
    <div className={`flex flex-col gap-1 w-full min-w-[120px] ${className}`}>
      {showLabels && (
        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
          <span>{estoqueAtual.toLocaleString('pt-BR')} {unidade}</span>
          <span>Máx: {capMax.toLocaleString('pt-BR')} {unidade}</span>
        </div>
      )}

      <div
        className={`relative w-full ${heightClasses} bg-slate-200 dark:bg-slate-700/60 rounded-full overflow-visible`}
        role="progressbar"
        aria-valuenow={estoqueAtual}
        aria-valuemin={0}
        aria-valuemax={capMax}
        aria-label={`${estoqueAtual.toLocaleString('pt-BR')} de ${capMax.toLocaleString('pt-BR')} ${unidade}; mínimo de segurança: ${estoqueSeguranca.toLocaleString('pt-BR')}`}
      >
        {/* Barra preenchida de estoque atual */}
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${colorClasses}`}
          style={{ width: `${fillPercentage}%` }}
        />

        {/* Marcador vertical da linha de estoque mínimo de segurança */}
        <div
          className="absolute -top-1 -bottom-1 w-0.5 bg-slate-900 dark:bg-white/80 rounded-full shadow-sm z-10"
          style={{ left: `${minPercentage}%` }}
          title={`Estoque mínimo: ${estoqueSeguranca.toLocaleString('pt-BR')} ${unidade}`}
        />
      </div>
    </div>
  );
}
