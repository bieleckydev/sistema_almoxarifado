'use client';

import React from 'react';
import {
  type StatusCriticidade,
  STATUS_LABELS,
  calcularStatusCriticidade,
} from '@/web/data/mock-almoxarifado';

export interface StockStatusBadgeProps {
  status?: StatusCriticidade;
  estoqueAtual?: number;
  estoqueSeguranca?: number;
  className?: string;
  size?: 'sm' | 'md';
}

export function StockStatusBadge({
  status,
  estoqueAtual,
  estoqueSeguranca,
  className = '',
  size = 'md',
}: StockStatusBadgeProps) {
  const resolvedStatus: StatusCriticidade =
    status ??
    (estoqueAtual !== undefined && estoqueSeguranca !== undefined
      ? calcularStatusCriticidade(estoqueAtual, estoqueSeguranca)
      : 'ok');

  const label = STATUS_LABELS[resolvedStatus];

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  }[size];

  const styleClasses = {
    ok: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60',
    low: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60',
    crit: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/60 font-semibold',
  }[resolvedStatus];

  const dotClasses = {
    ok: 'bg-emerald-500',
    low: 'bg-amber-500',
    crit: 'bg-rose-500 animate-pulse',
  }[resolvedStatus];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border font-medium whitespace-nowrap transition-colors ${sizeClasses} ${styleClasses} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotClasses}`} aria-hidden="true" />
      {label}
    </span>
  );
}
