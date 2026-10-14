'use client';

import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/core/store/useAuthStore';
import { useRouter } from 'next/navigation';

export interface LoginFormProps {
  onSuccess?: () => void;
  redirectTo?: string;
}

export function LoginForm({ onSuccess, redirectTo = '/' }: LoginFormProps) {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localValidation, setLocalValidation] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalValidation(null);
    clearError();

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setLocalValidation('Informe seu e-mail corporativo.');
      return;
    }

    if (!password) {
      setLocalValidation('Informe sua senha de acesso.');
      return;
    }

    try {
      await login(trimmedEmail, password);
      if (onSuccess) {
        onSuccess();
      } else {
        router.push(redirectTo);
      }
    } catch {
      // O erro já é tratado e disponibilizado pelo useAuthStore
    }
  };

  const activeError = localValidation || error;

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* Banner de Feedback de Erro Semântico */}
      {activeError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 p-3 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs leading-relaxed"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
          <div className="flex-1 font-medium">{activeError}</div>
        </div>
      )}

      {/* Campo: E-mail Corporativo */}
      <div className="space-y-1">
        <label
          htmlFor="email"
          className="block text-xs font-medium text-slate-700 dark:text-slate-300"
        >
          E-mail corporativo
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
            <Mail className="w-4 h-4" />
          </div>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={isLoading}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (localValidation) setLocalValidation(null);
              if (error) clearError();
            }}
            placeholder="colaborador@empresa.com.br"
            className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-white dark:bg-[#232325] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-md border border-slate-300 dark:border-[#3e3e42] focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      {/* Campo: Senha de Acesso */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label
            htmlFor="password"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300"
          >
            Senha
          </label>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-normal">
            Acesso Restrito
          </span>
        </div>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
            <Lock className="w-4 h-4" />
          </div>
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            disabled={isLoading}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (localValidation) setLocalValidation(null);
              if (error) clearError();
            }}
            placeholder="••••••••"
            className="w-full pl-9 pr-10 py-1.5 text-xs bg-white dark:bg-[#232325] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-md border border-slate-300 dark:border-[#3e3e42] focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword(!showPassword)}
            disabled={isLoading}
            title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
            aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors focus:outline-none cursor-pointer"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Botão de Submissão Principal */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full mt-2 inline-flex items-center justify-center gap-2 h-9 px-4 rounded-md bg-[#1d4ea3] dark:bg-[#3273dc] hover:bg-blue-800 dark:hover:bg-blue-600 active:bg-blue-900 text-white font-semibold text-xs transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Autenticando...</span>
          </>
        ) : (
          <span>Entrar no sistema</span>
        )}
      </button>
    </form>
  );
}
