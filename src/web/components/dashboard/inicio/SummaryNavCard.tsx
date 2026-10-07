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
  onClick?: () => void;
  isLoading?: boolean;
  className?: string;
}

const BORDER_TOP_STYLES = {
  sky: 'border-t-3 border-t-[#4fa8e0] hover:border-t-[#f2b705]',
  yellow: 'border-t-3 border-t-[#f2b705]',
  red: 'border-t-3 border-t-[#c8322b]',
  brand: 'border-t-3 border-t-[#1d4ea3] hover:border-t-[#f2b705]',
};

const BADGE_VARIANTS = {
  ok: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60',
  low: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60',
  crit: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60',
  info: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60',
};

export function SummaryNavCard({
  titulo,
  valor,
  legenda,
  badges = [],
  borderTopColor = 'sky',
  onClick,
  isLoading = false,
  className = '',
}: SummaryNavCardProps) {
  const borderTop = BORDER_TOP_STYLES[borderTopColor] || BORDER_TOP_STYLES.sky;

  if (isLoading) {
    return (
      <div
        className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs animate-pulse flex flex-col gap-3 ${className}`}
      >
        <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded-md" />
        <div className="h-9 w-16 bg-slate-200 dark:bg-slate-800 rounded-md mt-1" />
        <div className="h-3 w-36 bg-slate-100 dark:bg-slate-800/60 rounded-md" />
        <div className="h-5 w-24 bg-slate-100 dark:bg-slate-800/60 rounded-full mt-2" />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl p-5 text-left flex flex-col justify-between transition-all duration-150 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer ${borderTop} ${className}`}
    >
      <div>
        {/* Cabeçalho do Card */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-base font-semibold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {titulo}
          </span>
          <ChevronRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
        </div>

        {/* Métrica / Quantidade */}
        <div className="mt-1.5 flex items-baseline gap-2">
          <b className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
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
        <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap gap-1.5 items-center">
          {badges.map((b, idx) => (
            <span
              key={idx}
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
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
