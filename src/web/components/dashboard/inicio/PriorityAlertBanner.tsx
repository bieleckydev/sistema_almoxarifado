'use client';

import React from 'react';
import { AlertCircle, ArrowRight } from 'lucide-react';

export interface PriorityAlertBannerProps {
  totalAlertas: number;
  itensZerados: number;
  pedidosAtrasados: number;
  onResolverCriticos: () => void;
  onVerPedidosAtrasados: () => void;
  className?: string;
}

export function PriorityAlertBanner({
  totalAlertas,
  itensZerados,
  pedidosAtrasados,
  onResolverCriticos,
  onVerPedidosAtrasados,
  className = '',
}: PriorityAlertBannerProps) {
  if (totalAlertas === 0 && pedidosAtrasados === 0) {
    return null;
  }

  return (
    <div
      className={`bg-surface-container-lowest border border-outline-variant/40 border-l-4 border-l-red-600 px-4 py-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 shadow-2xs ${className}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="font-semibold text-on-surface">
            Atenção operacional:
          </span>
          <span className="text-on-surface-variant">
            {itensZerados > 0 ? (
              <>
                <strong className="font-semibold text-on-surface font-mono">{itensZerados}</strong> {itensZerados === 1 ? 'item crítico' : 'itens críticos'} em risco de ruptura
              </>
            ) : null}
            {itensZerados > 0 && pedidosAtrasados > 0 && ' • '}
            {pedidosAtrasados > 0 ? (
              <>
                <strong className="font-semibold text-red-600 dark:text-red-400 font-mono">{pedidosAtrasados}</strong> {pedidosAtrasados === 1 ? 'pedido atrasado' : 'pedidos atrasados'}
              </>
            ) : null}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onResolverCriticos}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 text-xs font-semibold transition-colors cursor-pointer"
        >
          <span>Resolver Críticos</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
        {pedidosAtrasados > 0 && (
          <button
            type="button"
            onClick={onVerPedidosAtrasados}
            className="px-2.5 py-1.5 rounded-md text-xs font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
          >
            Ver {pedidosAtrasados} Atrasado{pedidosAtrasados > 1 ? 's' : ''}
          </button>
        )}
      </div>
    </div>
  );
}
