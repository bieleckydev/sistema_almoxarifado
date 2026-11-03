'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/core/store/useAuthStore';
import { configureApiClient } from '@/core/api/client';
import { Loader2 } from 'lucide-react';

export interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated, isInitialized, initializeAuth } = useAuthStore();

  useEffect(() => {
    configureApiClient({
      tokenProvider: () => useAuthStore.getState().getValidToken(),
      onUnauthorized: async () => {
        const refreshed = await useAuthStore.getState().getValidToken(true);
        if (!refreshed) {
          await useAuthStore.getState().logout();
        }
      },
    });

    const unsubscribe = initializeAuth();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [initializeAuth]);

  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isInitialized, isAuthenticated, router]);

  // Enquanto verifica o token inicial do Firebase, exibe estado sóbrio de carregamento
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 dark:bg-[#232325] text-slate-600 dark:text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-[#1d4ea3] dark:text-[#3273dc]" />
          <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
            Verificando credenciais...
          </span>
        </div>
      </div>
    );
  }

  // Se não estiver autenticado após a inicialização, bloqueia a renderização enquanto redireciona
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
