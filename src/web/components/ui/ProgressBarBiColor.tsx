'use client';

import React from 'react';

export interface ProgressBarBiColorProps {
  /**
   * Porcentagem da primeira fatia (geralmente crítica ou de atenção, 0 a 100)
   */
  percentAlert: number;
  /**
   * Cor da fatia de alerta (Tailwind class, default: bg-error)
   */
  alertColor?: string;
  /**
   * Cor da fatia regular/segura (Tailwind class, default: bg-tertiary)
   */
  regularColor?: string;
  /**
   * Altura da barra (default: h-2)
   */
  heightClass?: string;
  className?: string;
}

export function ProgressBarBiColor({
  percentAlert,
  alertColor = 'bg-error',
  regularColor = 'bg-tertiary',
  heightClass = 'h-2',
  className = '',
}: ProgressBarBiColorProps) {
  const safeAlert = Math.max(0, Math.min(100, percentAlert));
  const safeRegular = Math.max(0, 100 - safeAlert);

  return (
    <div
      className={`w-full bg-surface-container dark:bg-surface-container-high rounded-full overflow-hidden flex ${heightClass} ${className}`}
      role="progressbar"
      aria-valuenow={safeAlert}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {safeAlert > 0 && (
        <div
          className={`${alertColor} ${heightClass} rounded-l-full transition-all duration-300`}
          style={{ width: `${safeAlert}%` }}
        />
      )}
      {safeRegular > 0 && (
        <div
          className={`${regularColor} ${heightClass} ${
            safeAlert === 0 ? 'rounded-full' : 'rounded-r-full'
          } transition-all duration-300`}
          style={{ width: `${safeRegular}%` }}
        />
      )}
    </div>
  );
}
