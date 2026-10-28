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
  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  const countBadgeColors =
    countVariant === 'error'
      ? isActive
        ? 'bg-red-500 text-white px-1.5 py-0.2 rounded-full font-bold'
        : 'text-red-600 dark:text-red-400 font-semibold font-mono'
      : countVariant === 'warning'
      ? isActive
        ? 'bg-amber-500 text-white px-1.5 py-0.2 rounded-full font-bold'
        : 'text-amber-600 dark:text-amber-400 font-semibold font-mono'
      : countVariant === 'success'
      ? isActive
        ? 'bg-emerald-600 text-white px-1.5 py-0.2 rounded-full font-bold'
        : 'text-emerald-600 dark:text-emerald-400 font-semibold font-mono'
      : isActive
      ? 'text-zinc-300 font-mono'
      : 'text-zinc-500 font-mono';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md font-medium transition-colors cursor-pointer ${padding} ${
        isActive
          ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-2xs'
          : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container hover:text-on-surface border border-outline-variant/40'
      } ${className}`}
    >
      <span>{label}</span>
      {count !== undefined && (
        <span className={`text-[11px] leading-tight tabular-nums ${countBadgeColors}`}>
          {count}
        </span>
      )}
    </button>
  );
}
