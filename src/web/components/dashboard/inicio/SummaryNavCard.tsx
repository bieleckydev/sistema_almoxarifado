'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';

export interface SummaryBadge {
  label: string;
  variant: 'ok' | 'low' | 'crit' | 'info';
}

export interface SummaryNavCardProps {
  titulo: string;
  valor: number | string;
  legenda: string;
  badges?: SummaryBadge[];
  borderTopColor?: 'sky' | 'yellow' | 'red' | 'brand';
  icon?: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  isLoading?: boolean;
  className?: string;
}

const BORDER_TOP_STYLES = {
  sky: 'border-t-3 border-t-[#4fa8e0]',
  yellow: 'border-t-3 border-t-[#f2b705]',
  red: 'border-t-3 border-t-[#c8322b]',
  brand: 'border-t-3 border-t-[#1d4ea3] dark:border-t-[#5aa9ea]',
};

const BADGE_VARIANTS = {
  ok: 'bg-emerald-50 dark:bg-[#163323] text-emerald-700 dark:text-[#72d596] border border-emerald-200 dark:border-emerald-900/60',
  low: 'bg-amber-50 dark:bg-[#3d2e14] text-amber-700 dark:text-[#f3c462] border border-amber-200 dark:border-amber-900/60',
  crit: 'bg-rose-50 dark:bg-[#40201d] text-rose-700 dark:text-[#f0796b] border border-rose-200 dark:border-rose-900/60',
  info: 'bg-blue-50 dark:bg-[#192b45] text-blue-700 dark:text-[#7ab8f5] border border-blue-200 dark:border-blue-900/60',
};

export function SummaryNavCard({
  titulo,
  valor,
  legenda,
  badges = [],
  borderTopColor = 'sky',
  icon: Icon,
  onClick,
  isLoading = false,
  className = '',
}: SummaryNavCardProps) {
  const borderTop = BORDER_TOP_STYLES[borderTopColor] || BORDER_TOP_STYLES.sky;

  if (isLoading) {
    return (
      <div
        className={`bg-white dark:bg-[#2b2b2e] border border-slate-200 dark:border-[#3e3e42] rounded-lg p-5 animate-pulse flex flex-col gap-3 ${className}`}
      >
        <div className="h-4 w-28 bg-slate-200 dark:bg-[#343438] rounded-sm" />
        <div className="h-9 w-16 bg-slate-200 dark:bg-[#343438] rounded-sm mt-1" />
        <div className="h-3 w-36 bg-slate-100 dark:bg-[#343438]/60 rounded-sm" />
        <div className="h-5 w-24 bg-slate-100 dark:bg-[#343438]/60 rounded-md mt-2" />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full bg-white dark:bg-[#2b2b2e] border border-slate-200 dark:border-[#3e3e42] rounded-lg p-5 text-left flex flex-col justify-between transition-colors hover:border-slate-300 dark:hover:border-slate-500 cursor-pointer ${borderTop} ${className}`}
    >
      <div>
        {/* Cabeçalho do Card */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-slate-800 dark:text-[#ececee] group-hover:text-blue-600 dark:group-hover:text-[#5aa9ea] transition-colors flex items-center gap-1.5">
            {Icon && <Icon className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />}
            <span>{titulo}</span>
          </span>
          <ChevronRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
        </div>

        {/* Métrica / Quantidade */}
        <div className="mt-2 flex items-baseline gap-2">
          <b className="text-3xl font-extrabold text-slate-900 dark:text-[#ececee] tabular-nums tracking-tight">
            {typeof valor === 'number' ? valor.toLocaleString('pt-BR') : valor}
          </b>
        </div>

        {/* Legenda */}
        <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5 font-normal">
          {legenda}
        </span>
      </div>

      {/* Badges / Tags de Situação */}
      {badges.length > 0 && (
        <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-[#3e3e42] flex flex-wrap gap-1.5 items-center">
          {badges.map((b, idx) => (
            <span
              key={idx}
              className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                BADGE_VARIANTS[b.variant] || BADGE_VARIANTS.info
              }`}
            >
              {b.label}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
