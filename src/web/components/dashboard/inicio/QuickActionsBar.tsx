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
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#1d4ea3] dark:bg-[#5aa9ea] text-white dark:text-[#06182e] hover:bg-blue-800 dark:hover:bg-blue-400 shadow-xs hover:shadow-md transition-all cursor-pointer"
      >
        <ArrowUpRight className="w-4 h-4" />
        <span>Registrar entrada</span>
      </button>

      {/* 2. Registrar Saída (Chip Secundário) */}
      <button
        type="button"
        onClick={onRegistrarSaida}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-2xs"
      >
        <ArrowDownRight className="w-4 h-4 text-rose-500" />
        <span>Registrar saída</span>
      </button>

      {/* 3. Novo Pedido (Chip Secundário) */}
      <button
        type="button"
        onClick={onNovoPedido}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-2xs"
      >
        <ShoppingCart className="w-4 h-4 text-blue-500" />
        <span>Novo pedido</span>
      </button>

      {/* 4. Novo Cadastro (Chip Secundário) */}
      <button
        type="button"
        onClick={onNovoCadastro}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-2xs"
      >
        <UserPlus className="w-4 h-4 text-emerald-500" />
        <span>Novo cadastro</span>
      </button>
    </div>
  );
}
