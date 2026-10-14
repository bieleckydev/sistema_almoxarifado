'use client';

import React from 'react';
import {
  type StatusPedido,
  STATUS_PEDIDO_LABELS,
} from '@/core/domain/pedido.schema';

export interface OrderStatusBadgeProps {
  status: StatusPedido;
  atrasado?: boolean;
  faltaEstoque?: boolean;
  className?: string;
}

export function OrderStatusBadge({
  status,
  atrasado = false,
  faltaEstoque = false,
  className = '',
}: OrderStatusBadgeProps) {
  const getStatusStyle = () => {
    switch (status) {
      case 'ENTREGUE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60';
      case 'SEPARADO':
        return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800/60';
      case 'CANCELADO':
        return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
      case 'PENDENTE':
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/60';
    }
  };

  return (
    <div className={`inline-flex flex-wrap items-center gap-1.5 ${className}`}>
      {/* Badge de Status Primário */}
      <span
        className={`px-2 py-0.5 rounded text-[11px] font-medium border ${getStatusStyle()}`}
      >
        {STATUS_PEDIDO_LABELS[status] || status}
      </span>

      {/* Badge de Atraso (se aplicável) */}
      {atrasado && status !== 'ENTREGUE' && status !== 'CANCELADO' && (
        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60">
          Atrasado
        </span>
      )}

      {/* Badge de Falta de Estoque (se aplicável) */}
      {faltaEstoque && status !== 'ENTREGUE' && status !== 'CANCELADO' && (
        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60">
          Falta estoque
        </span>
      )}
    </div>
  );
}
