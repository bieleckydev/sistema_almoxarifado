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
          className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs leading-relaxed animate-in fade-in duration-150"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
          <div className="flex-1 font-medium">{activeError}</div>
        </div>
      )}

      {/* Campo: E-mail Corporativo */}
      <div className="space-y-1.5">
        <label
          htmlFor="email"
          className="block text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-wide uppercase"
        >
          E-mail Corporativo
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
            className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-900/60 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0f5c7a]/30 focus:border-[#0f5c7a] dark:focus:border-[#4cb3d9] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      {/* Campo: Senha de Acesso */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="password"
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-wide uppercase"
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
            className="w-full pl-9 pr-10 py-2 text-sm bg-slate-50 dark:bg-slate-900/60 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0f5c7a]/30 focus:border-[#0f5c7a] dark:focus:border-[#4cb3d9] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword(!showPassword)}
            disabled={isLoading}
            title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
            aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors focus:outline-none"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Botão de Submissão Principal */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#0f5c7a] hover:bg-[#0c4b64] active:bg-[#093a4e] text-white font-medium text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#0f5c7a]/40 focus:ring-offset-2 dark:focus:ring-offset-[#17212a] disabled:opacity-60 disabled:cursor-not-allowed shadow-xs"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Autenticando...</span>
          </>
        ) : (
          <span>Entrar no Sistema</span>
        )}
      </button>
    </form>
  );
}
