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
      className={`rounded-lg bg-surface-container-lowest p-3.5 border border-outline-variant/25 flex flex-col justify-between transition-colors ${
        onClick
          ? 'cursor-pointer hover:bg-surface-container-low/70 hover:border-outline-variant/50'
          : ''
      } ${className}`}
    >
      {/* Cabeçalho do Card */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            {Icon && <Icon className="w-4 h-4 text-secondary shrink-0" />}
            <span className="text-xs font-medium text-secondary truncate">
              {title}
            </span>
          </div>
          {badge}
        </div>

        <div className="flex items-baseline gap-1.5 my-1">
          <span
            className={`font-kpi-value text-2xl sm:text-[28px] font-bold tracking-tight tabular-nums ${
              config.valueColor || 'text-on-surface'
            }`}
          >
            {value}
          </span>
          {unit && (
            <span className="text-xs text-secondary font-medium">
              {unit}
            </span>
          )}
        </div>

        {subtitle && (
          <div className="text-[11px] text-secondary mt-0.5">
            {subtitle}
          </div>
        )}
      </div>

      {/* Rodapé opcional com métrica complementar */}
      {footer && (
        <div className="mt-2.5 pt-2 border-t border-outline-variant/15 flex items-center justify-between text-[11px] text-secondary">
          {footer}
        </div>
      )}
    </div>
  );
}
