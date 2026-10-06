'use client';

import React from 'react';
import {
  Package,
  Layers,
  Wrench,
  Bike,
  LogOut,
  User as UserIcon,
  Shield,
} from 'lucide-react';
import { type AbaEstoque, METADADOS_ABAS } from '@/web/data/mock-almoxarifado';
import { useAuthStore } from '@/core/store/useAuthStore';
import { useRouter } from 'next/navigation';

export interface AppSidebarProps {
  abaAtiva: AbaEstoque;
  onSelectAba: (aba: AbaEstoque) => void;
  contagemCriticos?: Record<AbaEstoque, number>;
  className?: string;
}

const ABA_ICONS: Record<AbaEstoque, React.ComponentType<{ className?: string }>> = {
  mp: Layers,
  imp: Wrench,
  motos: Bike,
};

export function AppSidebar({
  abaAtiva,
  onSelectAba,
  contagemCriticos = { mp: 0, imp: 0, motos: 0 },
  className = '',
}: AppSidebarProps) {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <aside
      className={`w-full md:w-64 bg-[#12303f] dark:bg-[#0a1217] text-[#d5e4ec] p-5 flex flex-col justify-between shrink-0 transition-colors md:min-h-screen ${className}`}
    >
      <div className="flex flex-col gap-6">
        {/* Logotipo e Identidade */}
        <div className="flex items-center gap-3 px-2 pt-1 pb-3 border-b border-white/10">
          <div className="p-2 bg-[#0f5c7a] text-white rounded-xl shadow-inner">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight text-white leading-tight">
              Almoxarifado
            </h1>
            <p className="text-xs text-[#d5e4ec]/70 font-normal">
              Monitoração de estoque
            </p>
          </div>
        </div>

        {/* Navegação de Abas */}
        <nav className="flex flex-col gap-1.5" aria-label="Abas do almoxarifado">
          {(Object.keys(METADADOS_ABAS) as AbaEstoque[]).map((chave) => {
            const info = METADADOS_ABAS[chave];
            const Icon = ABA_ICONS[chave];
            const isActive = abaAtiva === chave;
            const critCount = contagemCriticos[chave] || 0;

            return (
              <button
                key={chave}
                type="button"
                onClick={() => onSelectAba(chave)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer text-left ${
                  isActive
                    ? 'bg-white/15 text-white font-semibold shadow-sm'
                    : 'text-[#d5e4ec]/85 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-300' : 'text-[#d5e4ec]/70'}`} />
                  <span>{info.titulo}</span>
                </div>

                {critCount > 0 && (
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#bf3427] text-white shadow-xs"
                    title={`${critCount} ${critCount === 1 ? 'item em nível crítico' : 'itens em nível crítico'}`}
                  >
                    {critCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Perfil do Usuário Autenticado e Ação de Sair */}
      {user && (
        <div className="pt-4 border-t border-white/10 flex flex-col gap-3">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-cyan-300 shrink-0">
                {user.role === 'mestre' ? (
                  <Shield className="w-4 h-4 text-amber-400" />
                ) : (
                  <UserIcon className="w-4 h-4" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-white truncate leading-tight">
                  {user.name}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] text-cyan-200/70 uppercase tracking-wider font-semibold">
                    {user.role}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              title="Encerrar sessão"
              aria-label="Encerrar sessão"
              className="p-1.5 rounded-lg text-[#d5e4ec]/70 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-1 focus:ring-white/20"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
