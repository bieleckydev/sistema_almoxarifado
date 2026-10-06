'use client';

import React from 'react';

export interface StockTableSkeletonProps {
  rows?: number;
  className?: string;
}

export function StockTableSkeleton({ rows = 8, className = '' }: StockTableSkeletonProps) {
  return (
    <div
      className={`overflow-x-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xs ${className}`}
    >
      <table className="w-full text-left border-collapse min-w-[760px]">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <th className="py-2.5 px-3">Código</th>
            <th className="py-2.5 px-3">Descrição / Categoria</th>
            <th className="py-2.5 px-3">Endereço</th>
            <th className="py-2.5 px-3">Saldo / Nível</th>
            <th className="py-2.5 px-3">Situação</th>
            <th className="py-2.5 px-3 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {Array.from({ length: rows }).map((_, index) => (
            <tr key={index} className="animate-pulse">
              <td className="py-2.5 px-3">
                <div className="h-3.5 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
              </td>
              <td className="py-2.5 px-3">
                <div className="h-4 w-44 bg-slate-200 dark:bg-slate-800 rounded mb-1" />
                <div className="h-2.5 w-20 bg-slate-100 dark:bg-slate-800/60 rounded" />
              </td>
              <td className="py-2.5 px-3">
                <div className="h-3.5 w-12 bg-slate-100 dark:bg-slate-800/60 rounded" />
              </td>
              <td className="py-2.5 px-3">
                <div className="h-3.5 w-24 bg-slate-200 dark:bg-slate-800 rounded mb-1" />
                <div className="h-1.5 w-32 bg-slate-100 dark:bg-slate-800/60 rounded" />
              </td>
              <td className="py-2.5 px-3">
                <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
              </td>
              <td className="py-2.5 px-3 text-right">
                <div className="h-6 w-14 bg-slate-200 dark:bg-slate-800 rounded ml-auto" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
