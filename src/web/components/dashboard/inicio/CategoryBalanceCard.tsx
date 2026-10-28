'use client';

import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
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
      ? 'bg-error'
      : variant === 'warning'
      ? 'bg-amber-500'
      : 'bg-primary';

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
      className={`bg-surface-container-lowest p-4 rounded-lg border border-outline-variant/25 flex flex-col justify-between transition-colors ${
        onClick
          ? 'cursor-pointer hover:border-outline-variant/50 hover:bg-surface-container-low/40'
          : ''
      } ${className}`}
    >
      <div>
        {/* Cabeçalho da Categoria com Chip e Status */}
        <div className="flex items-center justify-between mb-2">
          {categoryNumber ? (
            <span className="text-xs text-secondary font-medium">
              {categoryNumber}
            </span>
          ) : (
            <span className="text-xs text-secondary font-medium">
              Família fabril
            </span>
          )}

          {percentRuptura > 0 ? (
            <span
              className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-md font-medium ${
                variant === 'error'
                  ? 'text-error bg-error-container/40'
                  : variant === 'warning'
                  ? 'text-amber-800 bg-amber-100 dark:text-amber-300 dark:bg-amber-950/60'
                  : 'text-primary bg-secondary-container'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  variant === 'error'
                    ? 'bg-error'
                    : variant === 'warning'
                    ? 'bg-amber-500'
                    : 'bg-primary'
                }`}
              />
              {percentRuptura}% em atenção
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-tertiary bg-tertiary-fixed/20 px-2 py-0.5 rounded-md font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
              Regular
            </span>
          )}
        </div>

        {/* Nome da Categoria e Descrição */}
        <h3 className="font-headline-md text-base sm:text-lg text-on-surface font-bold tracking-tight">
          {title}
        </h3>
        <p className="font-body-sm text-xs text-on-surface-variant mb-3 line-clamp-1">
          {subtitle}
        </p>

        {/* Numeral Tabular Grande de Itens Cadastrados */}
        <div className="flex items-baseline gap-1.5 mb-2.5">
          <span className="font-kpi-value text-2xl sm:text-[28px] text-on-surface font-extrabold tracking-tight">
            {totalItens}
          </span>
          <span className="font-body-sm text-xs text-on-surface-variant">
            itens cadastrados
          </span>
        </div>

        {/* Barra de Progresso Bi-Tonal (Alerta vs Regular) */}
        <ProgressBarBiColor
          percentAlert={percentRuptura}
          alertColor={alertProgressColor}
          regularColor="bg-tertiary"
          heightClass="h-2"
          className="mb-2"
        />

        {/* Submétricas de Ruptura vs Regular */}
        <div className="flex items-center justify-between font-label-sm text-[11px] text-on-surface-variant">
          {totalAtencao > 0 ? (
            <span
              className={`flex items-center gap-1 font-bold ${
                variant === 'error'
                  ? 'text-error'
                  : variant === 'warning'
                  ? 'text-amber-700 dark:text-amber-400'
                  : 'text-primary'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              {totalCriticos > 0
                ? `${totalCriticos} em nível crítico`
                : `${totalAbaixoMinimo} abaixo do mínimo`}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-tertiary font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Sem rupturas
            </span>
          )}

          <span className="text-tertiary font-semibold">
            {regulares} regulares
          </span>
        </div>
      </div>

      {/* Caixa de Métrica de Rodapé */}
      <div className="mt-4 pt-2.5 bg-surface-container-low px-3 py-2 rounded-lg flex items-center justify-between border border-outline-variant/20">
        <span className="font-label-sm text-[11px] text-on-surface-variant">
          {footerLabel}
        </span>
        <span className="font-data-tabular text-xs font-bold text-on-surface">
          {footerValue}
        </span>
      </div>
    </div>
  );
}
