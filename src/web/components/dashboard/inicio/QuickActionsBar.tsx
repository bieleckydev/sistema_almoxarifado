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
      aria-label="Faixa de Ações Rápidas de Chão de Fábrica"
      className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6 ${className}`}
    >
      {/* 1. Registrar Entrada (Card Primário Azul Destaque) */}
      <button
        type="button"
        onClick={onRegistrarEntrada}
        className="group flex items-center justify-between p-3.5 rounded-xl bg-primary text-on-primary shadow-sm hover:shadow-md hover:bg-primary-container transition-all cursor-pointer text-left active:scale-[0.99]"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-surface-container-lowest/15 flex items-center justify-center text-on-primary group-hover:scale-105 transition-transform shrink-0">
            <PlusCircle className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <div className="font-headline-sm text-xs sm:text-sm font-bold leading-tight truncate">
              + Registrar Entrada
            </div>
            <div className="font-label-sm text-[10.5px] text-on-primary-container/85 mt-0.5 truncate">
              NF & Compra de Fornecedor
            </div>
          </div>
        </div>
        <ArrowRight className="w-3.5 h-3.5 opacity-60 group-hover:translate-x-1 group-hover:opacity-100 transition-all shrink-0" />
      </button>

      {/* 2. Registrar Saída / Baixa */}
      <button
        type="button"
        onClick={onRegistrarSaida}
        className="group flex items-center justify-between p-3.5 rounded-xl bg-surface-container-lowest text-on-surface border border-outline-variant/30 shadow-sm hover:shadow-md hover:border-error/40 transition-all cursor-pointer text-left active:scale-[0.99]"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-error-container text-on-error-container flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
            <MinusCircle className="w-4.5 h-4.5 text-error" />
          </div>
          <div className="min-w-0">
            <div className="font-headline-sm text-xs sm:text-sm font-bold leading-tight text-error truncate">
              - Registrar Saída
            </div>
            <div className="font-label-sm text-[10.5px] text-on-surface-variant mt-0.5 truncate">
              Apontamento / Consumo
            </div>
          </div>
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-outline-variant group-hover:translate-x-1 group-hover:text-on-surface transition-all shrink-0" />
      </button>

      {/* 3. Receber Material de Terceiros */}
      {onReceberTerceiro && (
        <button
          type="button"
          onClick={onReceberTerceiro}
          className="group flex items-center justify-between p-3.5 rounded-xl bg-surface-container-lowest text-on-surface border border-outline-variant/30 shadow-sm hover:shadow-md hover:border-primary/40 transition-all cursor-pointer text-left active:scale-[0.99]"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-primary-fixed/30 text-primary-fixed flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
              <PackageCheck className="w-4.5 h-4.5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="font-headline-sm text-xs sm:text-sm font-bold leading-tight text-on-surface truncate">
                + Receber de Terceiro
              </div>
              <div className="font-label-sm text-[10.5px] text-on-surface-variant mt-0.5 truncate">
                Remessa para Industrializar
              </div>
            </div>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-outline-variant group-hover:translate-x-1 group-hover:text-on-surface transition-all shrink-0" />
        </button>
      )}

      {/* 4. Novo Pedido Venda */}
      <button
        type="button"
        onClick={onNovoPedido}
        className="group flex items-center justify-between p-3.5 rounded-xl bg-surface-container-lowest text-on-surface border border-outline-variant/30 shadow-sm hover:shadow-md hover:border-primary/40 transition-all cursor-pointer text-left active:scale-[0.99]"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-secondary-container text-on-secondary-fixed flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
            <ShoppingBag className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <div className="font-headline-sm text-xs sm:text-sm font-bold leading-tight text-on-surface truncate">
              + Novo Pedido Venda
            </div>
            <div className="font-label-sm text-[10.5px] text-on-surface-variant mt-0.5 truncate">
              Faturamento & Separação
            </div>
          </div>
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-outline-variant group-hover:translate-x-1 group-hover:text-on-surface transition-all shrink-0" />
      </button>

      {/* 5. Cadastro de Item */}
      <button
        type="button"
        onClick={onNovoCadastro}
        className="group flex items-center justify-between p-3.5 rounded-xl bg-surface-container-lowest text-on-surface border border-outline-variant/30 shadow-sm hover:shadow-md hover:border-primary/40 transition-all cursor-pointer text-left active:scale-[0.99]"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-surface-container-high text-primary flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
            <PackagePlus className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <div className="font-headline-sm text-xs sm:text-sm font-bold leading-tight text-on-surface truncate">
              + Cadastro de Item
            </div>
            <div className="font-label-sm text-[10.5px] text-on-surface-variant mt-0.5 truncate">
              SKU, Localização & Nível
            </div>
          </div>
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-outline-variant group-hover:translate-x-1 group-hover:text-on-surface transition-all shrink-0" />
      </button>
    </div>
  );
}
