'use client';

import { create } from 'zustand';

export interface ToastItem {
  id: string;
  message: string;
  type?: 'info' | 'success' | 'error';
  duration?: number;
}

interface ToastStore {
  toasts: ToastItem[];
  showToast: (message: string, options?: { type?: 'info' | 'success' | 'error'; duration?: number }) => void;
  removeToast: (id: string) => void;
}

let toastIdCounter = 0;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  showToast: (message, options) => {
    const id = `toast-${++toastIdCounter}-${Date.now()}`;
    const duration = options?.duration ?? 3200; // Padrão de 3,2s do protótipo almoxarifado4.html
    const type = options?.type ?? 'info';

    set((state) => {
      // Mantém no máximo 3 toasts simultâneos para não poluir a interface
      const novosToasts = [...state.toasts, { id, message, type, duration }].slice(-3);
      return { toasts: novosToasts };
    });

    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, duration);
    }
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

/**
 * Hook para disparo simplificado de toasts operacionais.
 */
export function useToast() {
  const showToast = useToastStore((s) => s.showToast);
  const removeToast = useToastStore((s) => s.removeToast);
  const toasts = useToastStore((s) => s.toasts);

  return {
    toasts,
    toast: (message: string, options?: { type?: 'info' | 'success' | 'error'; duration?: number }) =>
      showToast(message, options),
    showToast,
    removeToast,
  };
}
