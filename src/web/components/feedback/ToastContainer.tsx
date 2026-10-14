'use client';

import React from 'react';
import { useToastStore } from '@/web/hooks/useToast';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      role="status"
      className="fixed left-1/2 -translate-x-1/2 bottom-6 z-50 flex flex-col items-center gap-2 pointer-events-none max-w-[90vw] w-max"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-center gap-2.5 px-3.5 py-2 rounded-md text-xs font-medium shadow-lg bg-[#232325] text-white border border-[#3e3e42] animate-in fade-in slide-in-from-bottom-2 duration-150 transition-all"
        >
          {t.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          {t.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
          {t.type === 'info' && <Info className="w-4 h-4 text-blue-400 shrink-0" />}

          <span>{t.message}</span>

          <button
            type="button"
            onClick={() => removeToast(t.id)}
            aria-label="Fechar notificação"
            className="p-0.5 rounded-md text-slate-400 dark:text-slate-600 hover:text-white dark:hover:text-black cursor-pointer transition-colors ml-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
