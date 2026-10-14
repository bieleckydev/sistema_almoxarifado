'use client';

import React from 'react';

export interface FilterPillProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  count?: number | string;
  countVariant?: 'default' | 'error' | 'warning' | 'success';
  size?: 'sm' | 'md';
  className?: string;
}

export function FilterPill({
  label,
  isActive,
  onClick,
  count,
  countVariant = 'default',
  size = 'md',
  className = '',
}: FilterPillProps) {
  const padding = size === 'sm' ? 'px-2 py-0.5 text-label-sm' : 'px-3 py-1 text-label-md';

  const countBadgeColors =
    countVariant === 'error'
      ? 'bg-error text-on-error'
      : countVariant === 'warning'
      ? 'bg-amber-500 text-white'
      : countVariant === 'success'
      ? 'bg-tertiary text-on-tertiary'
      : isActive
      ? 'bg-white/20 text-on-primary'
      : 'bg-surface-container-highest text-on-surface-variant';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg font-semibold transition-all cursor-pointer ${padding} ${
        isActive
          ? 'bg-primary text-on-primary shadow-sm'
          : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
      } ${className}`}
    >
      <span>{label}</span>
      {count !== undefined && (
        <span
          className={`px-1.5 py-0.2 rounded font-bold text-[11px] leading-tight ${countBadgeColors}`}
        >
          {count}
        </span>
      )}
    </button>
  );
}
