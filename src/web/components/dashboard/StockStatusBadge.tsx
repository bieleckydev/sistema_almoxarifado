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
    dotColor: 'bg-tertiary',
    badgeStyle: 'text-secondary bg-surface-container border-transparent font-medium',
  },
  low: {
    rotulo: 'Abaixo do Mínimo',
    dotColor: 'bg-amber-500',
    badgeStyle: 'text-amber-800 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/80 border-amber-300/40 font-semibold',
  },
  crit: {
    rotulo: 'Crítico / Ruptura',
    dotColor: 'bg-error',
    badgeStyle: 'text-on-error-container bg-error-container border-transparent font-bold',
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
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs leading-tight transition-colors ${config.badgeStyle} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor} shrink-0`} aria-hidden="true" />
      <span>{config.rotulo}</span>
    </span>
  );
}
