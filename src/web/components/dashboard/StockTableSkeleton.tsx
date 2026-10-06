'use client';

import React from 'react';

export interface StockTableSkeletonProps {
  rows?: number;
  className?: string;
}

export function StockTableSkeleton({ rows = 6, className = '' }: StockTableSkeletonProps) {
  return (
    <div
      className={`overflow-x-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs ${className}`}
    >
      <table className="w-full text-left border-collapse min-w-[640px]">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
            <th className="py-3.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Item
            </th>
            <th className="py-3.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Endereço
            </th>
            <th className="py-3.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Quantidade
            </th>
            <th className="py-3.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[22%]">
              Nível
            </th>
            <th className="py-3.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Situação
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {Array.from({ length: rows }).map((_, index) => (
            <tr key={index} className="animate-pulse">
              <td className="py-4 px-4">
                <div className="h-4 w-40 bg-slate-200 dark:bg-slate-800 rounded-md mb-1.5" />
                <div className="h-3 w-24 bg-slate-100 dark:bg-slate-800/50 rounded" />
              </td>
              <td className="py-4 px-4">
                <div className="h-4 w-16 bg-slate-100 dark:bg-slate-800/60 rounded" />
              </td>
              <td className="py-4 px-4">
                <div className="h-4 w-14 bg-slate-200 dark:bg-slate-800 rounded" />
              </td>
              <td className="py-4 px-4">
                <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full" />
              </td>
              <td className="py-4 px-4">
                <div className="h-6 w-20 bg-slate-200 dark:bg-slate-800 rounded-md" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
