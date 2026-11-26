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
    dotColor: 'bg-zinc-400',
    badgeStyle: 'text-on-surface-variant bg-surface-container/50 border-outline-variant/30 font-normal',
  },
  low: {
    rotulo: 'Abaixo do Mínimo',
    dotColor: 'bg-amber-500',
    badgeStyle: 'text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/20 font-medium',
  },
  crit: {
    rotulo: 'Crítico / Ruptura',
    dotColor: 'bg-red-500',
    badgeStyle: 'text-red-700 dark:text-red-400 bg-red-500/10 border-red-500/20 font-medium',
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

  // Zerado sem mínimo não é alerta, mas "Normal" seria enganoso: mantém o visual neutro com rótulo próprio.
  const semEstoque = resolvedStatus === 'ok' && estoqueAtual !== undefined && estoqueAtual <= 0;
  const config = semEstoque
    ? { ...STATUS_CONFIG.ok, rotulo: 'Sem estoque' }
    : STATUS_CONFIG[resolvedStatus];

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
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-xs leading-tight transition-colors ${config.badgeStyle} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor} shrink-0`} aria-hidden="true" />
      <span>{config.rotulo}</span>
    </span>
  );
}
