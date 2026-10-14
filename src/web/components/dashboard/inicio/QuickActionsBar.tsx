'use client';

import React from 'react';
import {
  PlusCircle,
  MinusCircle,
  ShoppingBag,
  PackagePlus,
  ArrowRight,
} from 'lucide-react';

export interface QuickActionsBarProps {
  onRegistrarEntrada: () => void;
  onRegistrarSaida: () => void;
  onNovoPedido: () => void;
  onNovoCadastro: () => void;
  className?: string;
}

export function QuickActionsBar({
  onRegistrarEntrada,
  onRegistrarSaida,
  onNovoPedido,
  onNovoCadastro,
  className = '',
}: QuickActionsBarProps) {
  return (
    <div
      aria-label="Faixa de Ações Rápidas de Chão de Fábrica"
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6 ${className}`}
    >
      {/* 1. Registrar Entrada (Card Primário Azul Destaque) */}
      <button
        type="button"
        onClick={onRegistrarEntrada}
        className="group flex items-center justify-between p-4 rounded-xl bg-primary text-on-primary shadow-sm hover:shadow-md hover:bg-primary-container transition-all cursor-pointer text-left active:scale-[0.99]"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-surface-container-lowest/15 flex items-center justify-center text-on-primary group-hover:scale-105 transition-transform shrink-0">
            <PlusCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="font-headline-sm text-sm font-bold leading-tight">
              + Registrar Entrada
            </div>
            <div className="font-label-sm text-[11px] text-on-primary-container/85 mt-0.5">
              NF, Insumos e Lotes
            </div>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 opacity-60 group-hover:translate-x-1 group-hover:opacity-100 transition-all shrink-0" />
      </button>

      {/* 2. Registrar Saída / Baixa */}
      <button
        type="button"
        onClick={onRegistrarSaida}
        className="group flex items-center justify-between p-4 rounded-xl bg-surface-container-lowest text-on-surface border border-outline-variant/30 shadow-sm hover:shadow-md hover:border-error/40 transition-all cursor-pointer text-left active:scale-[0.99]"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-error-container text-on-error-container flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
            <MinusCircle className="w-5 h-5 text-error" />
          </div>
          <div>
            <div className="font-headline-sm text-sm font-bold leading-tight text-error">
              - Registrar Saída / Baixa
            </div>
            <div className="font-label-sm text-[11px] text-on-surface-variant mt-0.5">
              Apontamento de OS
            </div>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-outline-variant group-hover:translate-x-1 group-hover:text-on-surface transition-all shrink-0" />
      </button>

      {/* 3. Novo Pedido Venda */}
      <button
        type="button"
        onClick={onNovoPedido}
        className="group flex items-center justify-between p-4 rounded-xl bg-surface-container-lowest text-on-surface border border-outline-variant/30 shadow-sm hover:shadow-md hover:border-primary/40 transition-all cursor-pointer text-left active:scale-[0.99]"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-secondary-container text-on-secondary-fixed flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <div className="font-headline-sm text-sm font-bold leading-tight text-on-surface">
              + Novo Pedido Venda
            </div>
            <div className="font-label-sm text-[11px] text-on-surface-variant mt-0.5">
              Faturamento & Separação
            </div>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-outline-variant group-hover:translate-x-1 group-hover:text-on-surface transition-all shrink-0" />
      </button>

      {/* 4. Cadastro de Item */}
      <button
        type="button"
        onClick={onNovoCadastro}
        className="group flex items-center justify-between p-4 rounded-xl bg-surface-container-lowest text-on-surface border border-outline-variant/30 shadow-sm hover:shadow-md hover:border-primary/40 transition-all cursor-pointer text-left active:scale-[0.99]"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-surface-container-high text-primary flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
            <PackagePlus className="w-5 h-5" />
          </div>
          <div>
            <div className="font-headline-sm text-sm font-bold leading-tight text-on-surface">
              + Cadastro de Item
            </div>
            <div className="font-label-sm text-[11px] text-on-surface-variant mt-0.5">
              SKU, Localização & Nível
            </div>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-outline-variant group-hover:translate-x-1 group-hover:text-on-surface transition-all shrink-0" />
      </button>
    </div>
  );
}
