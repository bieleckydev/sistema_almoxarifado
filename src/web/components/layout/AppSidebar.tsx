'use client';

import React, { useEffect } from 'react';
import {
  Package,
  Layers,
  Wrench,
  Bike,
  Sun,
  Moon,
} from 'lucide-react';
import { useAppStore } from '@/core/store/useAppStore';
import { type AbaEstoque, METADADOS_ABAS } from '@/web/data/mock-almoxarifado';

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
  const { themeMode, setThemeMode } = useAppStore();

  // Sincroniza a classe dark no HTML quando o tema muda
  useEffect(() => {
    const root = document.documentElement;
    const isDark =
      themeMode === 'dark' ||
      (themeMode === 'system' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    }
  }, [themeMode]);

  const toggleTheme = () => {
    const isCurrentlyDark = document.documentElement.classList.contains('dark');
    setThemeMode(isCurrentlyDark ? 'light' : 'dark');
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
                    title={`${critCount} itens em nível crítico`}
                  >
                    {critCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Rodapé com Alternância de Tema */}
      <div className="pt-6 border-t border-white/10 mt-6">
        <button
          type="button"
          onClick={toggleTheme}
          className="w-full flex items-center justify-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#d5e4ec]/80 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
        >
          <Sun className="w-3.5 h-3.5 block dark:hidden text-amber-300" />
          <Moon className="w-3.5 h-3.5 hidden dark:block text-cyan-300" />
          <span>Alternar tema</span>
        </button>
      </div>
    </aside>
  );
}
