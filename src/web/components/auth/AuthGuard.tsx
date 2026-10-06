'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/core/store/useAuthStore';
import { Loader2 } from 'lucide-react';

export interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated, isInitialized, initializeAuth } = useAuthStore();

  useEffect(() => {
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f1f4f8] dark:bg-[#0c1218] text-slate-600 dark:text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-[#0f5c7a] dark:text-[#4cb3d9]" />
          <span className="text-xs font-medium tracking-wide uppercase">
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
