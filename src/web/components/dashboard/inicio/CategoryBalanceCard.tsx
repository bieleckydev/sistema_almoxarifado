'use client';

import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { ProgressBarBiColor } from '@/web/components/ui/ProgressBarBiColor';

export interface CategoryBalanceCardProps {
  categoryNumber?: string;
  title: string;
  subtitle: string;
  totalItens: number;
  totalCriticos: number;
  totalAbaixoMinimo: number;
  footerLabel: string;
  footerValue: string;
  variant?: 'error' | 'warning' | 'primary';
  onClick?: () => void;
  className?: string;
}

export function CategoryBalanceCard({
  categoryNumber,
  title,
  subtitle,
  totalItens,
  totalCriticos,
  totalAbaixoMinimo,
  footerLabel,
  footerValue,
  variant = 'error',
  onClick,
  className = '',
}: CategoryBalanceCardProps) {
  const totalAtencao = totalCriticos + totalAbaixoMinimo;
  const percentRuptura =
    totalItens > 0 ? Math.round((totalAtencao / totalItens) * 100) : 0;
  const regulares = Math.max(0, totalItens - totalAtencao);
  const alertProgressColor =
    variant === 'error'
      ? 'bg-red-500'
      : variant === 'warning'
      ? 'bg-amber-500'
      : 'bg-zinc-600';

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={`bg-surface-container-lowest p-4 rounded-lg border border-outline-variant/40 flex flex-col justify-between transition-colors shadow-2xs ${
        onClick
          ? 'cursor-pointer hover:border-outline-variant hover:bg-surface-container-low/50'
          : ''
      } ${className}`}
    >
      <div>
        {/* Cabeçalho da Categoria com Chip e Status */}
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-mono text-[11px] text-on-surface-variant font-medium">
            {categoryNumber || 'Família fabril'}
          </span>

          {percentRuptura > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-on-surface-variant">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              {percentRuptura}% atenção
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-zinc-500">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
              100% regular
            </span>
          )}
        </div>

        {/* Nome da Categoria e Descrição */}
        <h3 className="font-headline-md text-base text-on-surface font-semibold tracking-tight">
          {title}
        </h3>
        <p className="font-body-sm text-xs text-on-surface-variant mb-3 line-clamp-1">
          {subtitle}
        </p>

        {/* Numeral Tabular Grande de Itens Cadastrados */}
        <div className="flex items-baseline gap-1.5 mb-2.5">
          <span className="font-kpi-value text-2xl text-on-surface font-bold tracking-tight">
            {totalItens}
          </span>
          <span className="font-body-sm text-xs text-on-surface-variant">
            itens cadastrados
          </span>
        </div>

        {/* Barra de Progresso Fina e Discreta (2px) */}
        <ProgressBarBiColor
          percentAlert={percentRuptura}
          alertColor={alertProgressColor}
          regularColor="bg-zinc-300 dark:bg-zinc-700"
          heightClass="h-1.5"
          className="mb-2"
        />

        {/* Submétricas de Ruptura vs Regular */}
        <div className="flex items-center justify-between font-mono text-[11px] text-on-surface-variant">
          {totalAtencao > 0 ? (
            <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-medium">
              <AlertCircle className="w-3 h-3" />
              {totalCriticos > 0
                ? `${totalCriticos} críticos`
                : `${totalAbaixoMinimo} abaixo do mín.`}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-zinc-500 font-normal">
              <CheckCircle2 className="w-3 h-3" />
              Sem rupturas
            </span>
          )}

          <span className="text-on-surface-variant font-normal">
            {regulares} regulares
          </span>
        </div>
      </div>

      {/* Métrica de Rodapé em Linha Limpa (sem caixa aninhada) */}
      <div className="mt-3.5 pt-2.5 border-t border-outline-variant/30 flex items-center justify-between text-xs">
        <span className="text-on-surface-variant font-medium">
          {footerLabel}
        </span>
        <span className="font-mono font-semibold text-on-surface">
          {footerValue}
        </span>
      </div>
    </div>
  );
}
