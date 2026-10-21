'use client';

import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configureApiClient } from '@/core/api/client';
import { webStorageAdapter } from '@/web/adapters/storage.adapter';

import { useToastStore } from '@/web/hooks/useToast';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  useEffect(() => {
    // Injeta o storage adapter web no cliente da API do core
    configureApiClient(webStorageAdapter);

    // Listener global para capturar erros e exibir toast amigável (requisito 3.0)
    const handleError = (event: ErrorEvent) => {
      console.error('Erro global capturado:', event.error || event.message);
      useToastStore.getState().showToast(
        event.message || 'Ocorreu um erro inesperado na operação.',
        { type: 'error' }
      );
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Promise rejection não tratada:', event.reason);
      const msg =
        event.reason instanceof Error
          ? event.reason.message
          : typeof event.reason === 'string'
          ? event.reason
          : 'Falha na comunicação com o servidor.';
      useToastStore.getState().showToast(msg, { type: 'error' });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
