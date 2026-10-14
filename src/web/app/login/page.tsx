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
    <div className="relative min-h-screen flex flex-col justify-center items-center px-4 py-8 bg-slate-100 dark:bg-[#232325] text-slate-900 dark:text-slate-100">
      {/* Botão de Alternância de Tema no Topo Direito */}
      <header className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeToggle />
      </header>

      {/* Card Central de Login Minimalista & Corporativo */}
      <main className="w-full max-w-sm sm:max-w-md bg-white dark:bg-[#2b2b2e] border border-slate-200 dark:border-[#3e3e42] rounded-lg p-6 sm:p-8">
        {/* Cabeçalho Institucional do Sistema */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-10 h-10 rounded-md bg-slate-100 dark:bg-[#232325] border border-slate-200 dark:border-[#3e3e42] text-slate-700 dark:text-slate-200 flex items-center justify-center mb-3">
            <Boxes className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-semibold tracking-normal text-slate-900 dark:text-white">
            Sistema de Almoxarifado
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Gestão Operacional de Estoque e Materiais
          </p>
        </div>

        {/* Formulário Operacional */}
        <LoginForm redirectTo="/" />

        {/* Rodapé Institucional e Diretiva de Acesso */}
        <div className="mt-6 pt-5 border-t border-slate-200 dark:border-[#3e3e42] text-center space-y-2">
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
