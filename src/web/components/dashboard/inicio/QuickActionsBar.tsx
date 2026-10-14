'use client';

import React from 'react';
import { ArrowUpRight, ArrowDownRight, ShoppingCart, UserPlus } from 'lucide-react';

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
      aria-label="Ações rápidas operacionais"
      className={`flex items-center gap-2.5 flex-wrap mb-6 ${className}`}
    >
      {/* 1. Registrar Entrada (Botão Principal com destaque) */}
      <button
        type="button"
        onClick={onRegistrarEntrada}
        className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md text-xs font-semibold bg-[#1d4ea3] dark:bg-[#5aa9ea] text-white dark:text-[#06182e] hover:bg-[#163c7e] dark:hover:bg-[#4898d5] transition-colors cursor-pointer"
      >
        <ArrowUpRight className="w-4 h-4" />
        <span>Registrar entrada</span>
      </button>

      {/* 2. Registrar Saída (Ação Secundária) */}
      <button
        type="button"
        onClick={onRegistrarSaida}
        className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md text-xs font-medium border border-slate-300 dark:border-[#3e3e42] bg-white dark:bg-[#2b2b2e] text-slate-800 dark:text-[#ececee] hover:bg-slate-50 dark:hover:bg-[#343438] transition-colors cursor-pointer"
      >
        <ArrowDownRight className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        <span>Registrar saída</span>
      </button>

      {/* 3. Novo Pedido (Ação Secundária) */}
      <button
        type="button"
        onClick={onNovoPedido}
        className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md text-xs font-medium border border-slate-300 dark:border-[#3e3e42] bg-white dark:bg-[#2b2b2e] text-slate-800 dark:text-[#ececee] hover:bg-slate-50 dark:hover:bg-[#343438] transition-colors cursor-pointer"
      >
        <ShoppingCart className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        <span>Novo pedido</span>
      </button>

      {/* 4. Novo Cadastro (Ação Secundária) */}
      <button
        type="button"
        onClick={onNovoCadastro}
        className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md text-xs font-medium border border-slate-300 dark:border-[#3e3e42] bg-white dark:bg-[#2b2b2e] text-slate-800 dark:text-[#ececee] hover:bg-slate-50 dark:hover:bg-[#343438] transition-colors cursor-pointer"
      >
        <UserPlus className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        <span>Novo cadastro</span>
      </button>
    </div>
  );
}
