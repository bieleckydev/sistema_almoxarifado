'use client';

import React from 'react';
import {
  PlusCircle,
  MinusCircle,
  PackageCheck,
  ShoppingBag,
  PackagePlus,
  ArrowRight,
} from 'lucide-react';

export interface QuickActionsBarProps {
  onRegistrarEntrada: () => void;
  onRegistrarSaida: () => void;
  onReceberTerceiro?: () => void;
  onNovoPedido: () => void;
  onNovoCadastro: () => void;
  className?: string;
}

export function QuickActionsBar({
  onRegistrarEntrada,
  onRegistrarSaida,
  onReceberTerceiro,
  onNovoPedido,
  onNovoCadastro,
  className = '',
}: QuickActionsBarProps) {
  return (
    <div
      aria-label="Ações rápidas de chão de fábrica"
      className={`p-2 rounded-lg bg-surface-container-low border border-outline-variant/25 flex flex-wrap items-center gap-2 mb-6 ${className}`}
    >
      <button
        type="button"
        onClick={onRegistrarEntrada}
        className="inline-flex items-center gap-2 h-9 px-3.5 rounded-md bg-primary text-on-primary text-xs font-semibold hover:bg-primary/90 transition-colors cursor-pointer"
        title="Registrar nova entrada por nota fiscal ou compra"
      >
        <PlusCircle className="w-4 h-4" />
        <span>Registrar Entrada</span>
      </button>

      <button
        type="button"
        onClick={onRegistrarSaida}
        className="inline-flex items-center gap-2 h-9 px-3.5 rounded-md bg-surface-container-lowest text-on-surface hover:bg-surface-container text-xs font-semibold border border-outline-variant/30 hover:border-error/40 transition-colors cursor-pointer"
        title="Registrar saída manual ou consumo interno"
      >
        <MinusCircle className="w-4 h-4 text-error" />
        <span>Registrar Saída</span>
      </button>

      {onReceberTerceiro && (
        <button
          type="button"
          onClick={onReceberTerceiro}
          className="inline-flex items-center gap-2 h-9 px-3.5 rounded-md bg-surface-container-lowest text-on-surface hover:bg-surface-container text-xs font-medium border border-outline-variant/30 transition-colors cursor-pointer"
          title="Receber remessa de material de terceiro para industrialização"
        >
          <PackageCheck className="w-4 h-4 text-primary" />
          <span>Receber de Terceiro</span>
        </button>
      )}

      <button
        type="button"
        onClick={onNovoPedido}
        className="inline-flex items-center gap-2 h-9 px-3.5 rounded-md bg-surface-container-lowest text-on-surface hover:bg-surface-container text-xs font-medium border border-outline-variant/30 transition-colors cursor-pointer"
        title="Criar novo pedido de venda para cliente"
      >
        <ShoppingBag className="w-4 h-4 text-secondary" />
        <span>Novo Pedido</span>
      </button>

      <button
        type="button"
        onClick={onNovoCadastro}
        className="inline-flex items-center gap-2 h-9 px-3.5 rounded-md bg-surface-container-lowest text-on-surface hover:bg-surface-container text-xs font-medium border border-outline-variant/30 transition-colors cursor-pointer"
        title="Cadastrar novo SKU no catálogo"
      >
        <PackagePlus className="w-4 h-4 text-secondary" />
        <span>Cadastrar Material</span>
      </button>
    </div>
  );
}
