'use client';

import React from 'react';
import {
  type StatusPedido,
  STATUS_PEDIDO_LABELS,
} from '@/core/domain/pedido.schema';
import { AlertCircle, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

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
        return 'bg-tertiary/15 text-tertiary border-tertiary/30 font-bold';
      case 'SEPARADO':
        return 'bg-primary/10 text-primary border-primary/20 font-semibold';
      case 'CANCELADO':
        return 'bg-surface-container text-outline border-transparent font-medium';
      case 'PENDENTE':
      default:
        return 'bg-surface-container-high text-secondary border-transparent font-medium';
    }
  };

  return (
    <div className={`inline-flex flex-wrap items-center gap-1.5 ${className}`}>
      {/* Badge de Status Primário */}
      <span
        className={`px-2.5 py-0.5 rounded-full text-xs border ${getStatusStyle()}`}
      >
        {STATUS_PEDIDO_LABELS[status] || status}
      </span>

      {/* Badge de Atraso (se aplicável) */}
      {atrasado && status !== 'ENTREGUE' && status !== 'CANCELADO' && (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-error-container text-on-error-container">
          <AlertTriangle className="w-3 h-3 text-error" />
          <span>Atrasado</span>
        </span>
      )}

      {/* Badge de Falta de Estoque (se aplicável) */}
      {faltaEstoque && status !== 'ENTREGUE' && status !== 'CANCELADO' && (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300/40">
          <AlertCircle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
          <span>Falta Estoque</span>
        </span>
      )}
    </div>
  );
}
