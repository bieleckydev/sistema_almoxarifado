'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/core/store/useAuthStore';
import { configureApiClient } from '@/core/api/client';
import { KeyRound, Loader2, LogOut, ShieldAlert } from 'lucide-react';

export interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const {
    user,
    isAuthenticated,
    isInitialized,
    initializeAuth,
    completeMandatoryPasswordChange,
    logout,
  } = useAuthStore();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

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

  // Se o usuário estiver com senha temporária pendente de troca, exige a redefinição antes de liberar o painel
  if (user?.mustChangePassword) {
    const handlePasswordSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setPasswordError(null);

      if (newPassword.length < 8) {
        setPasswordError('A nova senha deve conter no mínimo 8 caracteres.');
        return;
      }
      if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
        setPasswordError('A nova senha deve conter pelo menos uma letra e um número.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setPasswordError('A confirmação de senha não confere.');
        return;
      }

      setIsSubmittingPassword(true);
      try {
        await completeMandatoryPasswordChange(newPassword);
        setNewPassword('');
        setConfirmPassword('');
      } catch (err) {
        setPasswordError(
          err instanceof Error ? err.message : 'Não foi possível atualizar a senha. Tente novamente.'
        );
      } finally {
        setIsSubmittingPassword(false);
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-surface px-4 py-8 text-on-surface">
        <div className="w-full max-w-md rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold">Troca Obrigatória de Senha</h1>
              <p className="text-xs text-secondary">
                Olá, {user.name}. Por segurança, defina uma senha definitiva para continuar.
              </p>
            </div>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="nova-senha-obrigatoria"
                className="block text-xs font-semibold text-secondary mb-1"
              >
                Nova Senha Pessoal
              </label>
              <input
                id="nova-senha-obrigatoria"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo de 8 caracteres (letras e números)"
                autoComplete="new-password"
                required
                className="w-full h-9 px-3 rounded-lg text-xs bg-surface-container-low border border-outline-variant/40 focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label
                htmlFor="confirmar-senha-obrigatoria"
                className="block text-xs font-semibold text-secondary mb-1"
              >
                Confirmar Nova Senha
              </label>
              <input
                id="confirmar-senha-obrigatoria"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                autoComplete="new-password"
                required
                className="w-full h-9 px-3 rounded-lg text-xs bg-surface-container-low border border-outline-variant/40 focus:outline-none focus:border-primary"
              />
            </div>

            {passwordError && (
              <div className="p-2.5 rounded-lg bg-error-container/80 text-on-error-container text-xs font-medium">
                {passwordError}
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={() => logout()}
                disabled={isSubmittingPassword}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-medium text-secondary hover:text-on-surface border border-outline-variant/30 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair</span>
              </button>

              <button
                type="submit"
                disabled={isSubmittingPassword}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-xs font-semibold bg-primary text-on-primary hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSubmittingPassword ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <KeyRound className="w-3.5 h-3.5" />
                )}
                <span>Salvar e Acessar Sistema</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
