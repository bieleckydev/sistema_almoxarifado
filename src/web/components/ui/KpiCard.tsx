'use client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';

export type KpiCardVariant = 'primary' | 'error' | 'tertiary' | 'secondary' | 'warning';

export interface KpiCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: React.ReactNode;
  footer?: React.ReactNode;
  icon?: LucideIcon;
  variant?: KpiCardVariant;
  onClick?: () => void;
  className?: string;
  badge?: React.ReactNode;
}

const VARIANT_CONFIG: Record<
  KpiCardVariant,
  {
    borderTop: string;
    iconBg: string;
    iconColor: string;
    valueColor?: string;
  }
> = {
  primary: {
    borderTop: 'bg-primary',
    iconBg: 'bg-primary/10 dark:bg-primary/20',
    iconColor: 'text-primary',
    valueColor: 'text-on-surface',
  },
  error: {
    borderTop: 'bg-error',
    iconBg: 'bg-error-container text-on-error-container',
    iconColor: 'text-error',
    valueColor: 'text-error',
  },
  tertiary: {
    borderTop: 'bg-tertiary',
    iconBg: 'bg-tertiary/10 dark:bg-tertiary/20',
    iconColor: 'text-tertiary',
    valueColor: 'text-tertiary',
  },
  secondary: {
    borderTop: 'bg-secondary',
    iconBg: 'bg-surface-container dark:bg-surface-container-high',
    iconColor: 'text-secondary',
    valueColor: 'text-on-surface',
  },
  warning: {
    borderTop: 'bg-amber-500',
    iconBg: 'bg-amber-500/10 dark:bg-amber-500/20',
    iconColor: 'text-amber-600 dark:text-amber-400',
    valueColor: 'text-on-surface',
  },
};

export function KpiCard({
  title,
  value,
  unit,
  subtitle,
  footer,
  icon: Icon,
  variant = 'primary',
  onClick,
  className = '',
  badge,
}: KpiCardProps) {
  const config = VARIANT_CONFIG[variant];

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
      className={`relative overflow-hidden rounded-xl bg-surface-container-lowest p-4 shadow-sm flex flex-col justify-between transition-all ${
        onClick
          ? 'cursor-pointer hover:bg-surface-container-low/70 active:scale-[0.99]'
          : ''
      } ${className}`}
    >
      {/* Barra de destaque superior estilo Stitch MD3 */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${config.borderTop}`} />

      {/* Cabeçalho do Card */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="font-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">
            {title}
          </span>
          {badge}
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-1.5">
            <span
              className={`font-kpi-value text-2xl sm:text-[28px] font-extrabold tracking-tight ${
                config.valueColor || 'text-on-surface'
              }`}
            >
              {value}
            </span>
            {unit && (
              <span className="font-label-md text-on-surface-variant font-medium">
                {unit}
              </span>
            )}
          </div>

          {Icon && (
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${config.iconBg}`}
            >
              <Icon className={`w-5 h-5 ${config.iconColor}`} />
            </div>
          )}
        </div>

        {subtitle && (
          <div className="font-body-sm text-on-surface-variant mt-1">
            {subtitle}
          </div>
        )}
      </div>

      {/* Rodapé opcional com métrica complementar */}
      {footer && (
        <div className="mt-3 pt-2.5 border-t border-outline-variant/30 flex items-center justify-between font-body-sm">
          {footer}
        </div>
      )}
    </div>
  );
}
