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
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-[#163323] dark:text-[#72d596] dark:border-emerald-900/60';
      case 'SEPARADO':
        return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-[#192b45] dark:text-[#7ab8f5] dark:border-blue-900/60';
      case 'CANCELADO':
        return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-[#232325] dark:text-[#a3a3a9] dark:border-[#3e3e42]';
      case 'PENDENTE':
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-[#192b45] dark:text-[#7ab8f5] dark:border-blue-900/60';
    }
  };

  return (
    <div className={`inline-flex flex-wrap items-center gap-1.5 ${className}`}>
      {/* Badge de Status Primário */}
      <span
        className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${getStatusStyle()}`}
      >
        {STATUS_PEDIDO_LABELS[status] || status}
      </span>

      {/* Badge de Atraso (se aplicável) */}
      {atrasado && status !== 'ENTREGUE' && status !== 'CANCELADO' && (
        <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-[#40201d] dark:text-[#f0796b] dark:border-rose-900/60">
          Atrasado
        </span>
      )}

      {/* Badge de Falta de Estoque (se aplicável) */}
      {faltaEstoque && status !== 'ENTREGUE' && status !== 'CANCELADO' && (
        <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-[#3d2e14] dark:text-[#f3c462] dark:border-amber-900/60">
          Falta estoque
        </span>
      )}
    </div>
  );
}
