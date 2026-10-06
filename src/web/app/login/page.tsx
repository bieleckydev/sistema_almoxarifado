'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Boxes, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/core/store/useAuthStore';
import { ThemeToggle } from '@/web/components/layout/ThemeToggle';
import { LoginForm } from '@/web/components/auth/LoginForm';

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isInitialized } = useAuthStore();

  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      router.replace('/');
    }
  }, [isInitialized, isAuthenticated, router]);

  return (
    <div className="relative min-h-screen flex flex-col justify-center items-center px-4 py-8 bg-[#f1f4f8] dark:bg-[#0c1218] text-[#17212b] dark:text-[#e6edf3] selection:bg-[#0f5c7a] selection:text-white">
      {/* Botão de Alternância de Tema no Topo Direito */}
      <header className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeToggle />
      </header>

      {/* Card Central de Login Minimalista & Corporativo */}
      <main className="w-full max-w-sm sm:max-w-md bg-white dark:bg-[#17212a] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs p-6 sm:p-8">
        {/* Cabeçalho Institucional do Sistema */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-lg bg-[#0f5c7a]/10 dark:bg-[#4cb3d9]/10 text-[#0f5c7a] dark:text-[#4cb3d9] flex items-center justify-center mb-3">
            <Boxes className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Sistema de Almoxarifado
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Gestão Operacional de Estoque e Materiais
          </p>
        </div>

        {/* Formulário Operacional */}
        <LoginForm redirectTo="/" />

        {/* Rodapé Institucional e Diretiva de Acesso */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80 text-center space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Ambiente Seguro • Acesso Restrito</span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
            A criação de novos usuários e a atribuição de permissões são realizadas exclusivamente pelo Administrador Mestre.
          </p>
        </div>
      </main>

      {/* Identificação de Versão / Sistema */}
      <footer className="mt-6 text-center text-[11px] text-slate-400 dark:text-slate-600">
        Plataforma Integrada de Almoxarifado v1.0
      </footer>
    </div>
  );
}
