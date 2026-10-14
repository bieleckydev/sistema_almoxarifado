'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';

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
      className={`relative overflow-hidden bg-gradient-to-r from-error-container/40 via-surface-container-lowest to-surface-container-low border border-error/30 p-4 sm:p-5 rounded-xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 ${className}`}
    >
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-xl bg-error text-on-error flex items-center justify-center shrink-0 shadow-sm">
          <AlertCircle className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-headline-sm text-sm sm:text-base text-on-error-container font-bold">
              Atenção Imediata Necessária
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full font-label-sm text-[11px] bg-error text-on-error font-bold">
              {totalAlertas + pedidosAtrasados}{' '}
              {totalAlertas + pedidosAtrasados === 1 ? 'alerta pendente' : 'alertas pendentes'}
            </span>
          </div>
          <p className="font-body-sm text-xs sm:text-sm text-on-surface-variant mt-0.5">
            Há <strong className="text-on-surface font-semibold">{itensZerados} {itensZerados === 1 ? 'item crítico' : 'itens críticos'}</strong> com risco de ruptura no chão de fábrica
            {pedidosAtrasados > 0 && (
              <>
                {' '}e <strong className="text-error font-semibold">{pedidosAtrasados} {pedidosAtrasados === 1 ? 'pedido em atraso' : 'pedidos em atraso'} com clientes</strong> aguardando matéria-prima.
              </>
            )}
            .
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 self-end md:self-auto shrink-0">
        <button
          type="button"
          onClick={onResolverCriticos}
          className="px-3.5 py-2 rounded-lg bg-error text-on-error font-label-md text-xs font-semibold hover:bg-on-error-container transition-colors shadow-sm cursor-pointer active:scale-95"
        >
          Resolver Críticos
        </button>
        {pedidosAtrasados > 0 && (
          <button
            type="button"
            onClick={onVerPedidosAtrasados}
            className="px-3.5 py-2 rounded-lg bg-surface-container-lowest text-on-surface font-label-md text-xs font-semibold border border-outline-variant/30 hover:bg-surface-container transition-colors cursor-pointer active:scale-95"
          >
            Ver {pedidosAtrasados} {pedidosAtrasados === 1 ? 'Pedido Atrasado' : 'Pedidos Atrasados'}
          </button>
        )}
      </div>
    </div>
  );
}
