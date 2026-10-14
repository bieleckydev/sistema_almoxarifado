'use client';

import React from 'react';
import {
  type StatusCriticidade,
  calcularStatusCriticidade,
} from '@/web/data/mock-almoxarifado';

export interface StockStatusBadgeProps {
  status?: StatusCriticidade;
  estoqueAtual?: number;
  estoqueSeguranca?: number;
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<
  StatusCriticidade,
  {
    rotulo: string;
    dotColor: string;
    badgeStyle: string;
  }
> = {
  ok: {
    rotulo: 'Normal',
    dotColor: 'bg-emerald-500',
    badgeStyle: 'text-slate-700 dark:text-[#ececee] bg-slate-50 dark:bg-[#343438] border-slate-200 dark:border-[#3e3e42]',
  },
  low: {
    rotulo: 'Abaixo do Mínimo',
    dotColor: 'bg-amber-500 dark:bg-[#f3c462]',
    badgeStyle: 'text-amber-800 dark:text-[#f3c462] bg-amber-50 dark:bg-[#3d2e14] border-amber-200 dark:border-amber-900/60',
  },
  crit: {
    rotulo: 'Crítico / Ruptura',
    dotColor: 'bg-rose-500 dark:bg-[#f0796b]',
    badgeStyle: 'text-rose-800 dark:text-[#f0796b] bg-rose-50 dark:bg-[#40201d] border-rose-200 dark:border-rose-900/60 font-semibold',
  },
};

export function StockStatusBadge({
  status,
  estoqueAtual,
  estoqueSeguranca,
  className = '',
  showText = true,
}: StockStatusBadgeProps) {
  const resolvedStatus: StatusCriticidade =
    status ??
    (estoqueAtual !== undefined && estoqueSeguranca !== undefined
      ? calcularStatusCriticidade(estoqueAtual, estoqueSeguranca)
      : 'ok');

  const config = STATUS_CONFIG[resolvedStatus];

  if (!showText) {
    return (
      <span
        className={`inline-block w-2 h-2 rounded-full ${config.dotColor} ${className}`}
        title={`Situação: ${config.rotulo}`}
      />
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-xs leading-tight font-medium transition-colors ${config.badgeStyle} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor} shrink-0`} aria-hidden="true" />
      <span>{config.rotulo}</span>
    </span>
  );
}
