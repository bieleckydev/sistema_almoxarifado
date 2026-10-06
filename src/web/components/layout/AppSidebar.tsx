'use client';

import React from 'react';
import {
  Package,
  LayoutDashboard,
  Layers,
  Wrench,
  Bike,
  ShoppingCart,
  Users,
  ArrowLeftRight,
  LogOut,
  User as UserIcon,
  Shield,
} from 'lucide-react';
import {
  type AbaEstoque,
  type TelaOuAba,
  METADADOS_ABAS,
} from '@/web/data/mock-almoxarifado';
import { useAuthStore } from '@/core/store/useAuthStore';
import { useRouter } from 'next/navigation';

export interface AppSidebarProps {
  /**
   * Identificador da tela ou aba atualmente ativa.
   * Suporta retrocompatibilidade com 'abaAtiva'.
   */
  telaAtiva?: TelaOuAba;
  abaAtiva?: TelaOuAba;
  /**
   * Callback disparado ao selecionar uma tela ou aba.
   */
  onSelectTela?: (tela: TelaOuAba) => void;
  onSelectAba?: ((aba: TelaOuAba) => void) | ((aba: AbaEstoque) => void);
  /**
   * Contagem de itens críticos por aba de estoque.
   */
  contagemCriticos?: Record<AbaEstoque, number>;
  /**
   * Contagem de pedidos de venda em atraso para alertar na aba de Vendas.
   */
  pedidosAtrasadosCount?: number;
  className?: string;
}

const ABA_ICONS: Record<AbaEstoque, React.ComponentType<{ className?: string }>> = {
  mp: Layers,
  imp: Wrench,
  motos: Bike,
};

export function AppSidebar({
  telaAtiva,
  abaAtiva,
  onSelectTela,
  onSelectAba,
  contagemCriticos = { mp: 0, imp: 0, motos: 0 },
  pedidosAtrasadosCount = 0,
  className = '',
}: AppSidebarProps) {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  // Suporte transparente para ambos os nomes de prop
  const activeKey: TelaOuAba = telaAtiva || abaAtiva || 'mp';

  const handleSelect = (chave: TelaOuAba) => {
    if (onSelectTela) {
      onSelectTela(chave);
    } else if (onSelectAba) {
      (onSelectAba as (aba: TelaOuAba) => void)(chave);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <aside
      className={`w-full md:w-64 bg-[#0b0c0f] dark:bg-[#050607] text-[#d5e4ec] p-5 flex flex-col justify-between shrink-0 transition-colors md:min-h-screen ${className}`}
    >
      <div className="flex flex-col gap-5">
        {/* Logotipo e Identidade com faixa decorativa tricolor */}
        <div className="flex flex-col px-2 pt-1 pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#1d4ea3] text-white rounded-xl shadow-inner">
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
          {/* Barra de acento tricolor da versão 2 */}
          <div className="h-0.5 w-full mt-3 rounded-full bg-gradient-to-r from-[#4fa8e0] via-[#4fa8e0] via-55% via-[#d9372f] via-78% to-[#f2b705]" />
        </div>

        {/* Navegação Global */}
        <nav className="flex flex-col gap-1" aria-label="Navegação do almoxarifado">
          {/* 1. Hub Executivo: Início */}
          <button
            type="button"
            onClick={() => handleSelect('inicio')}
            aria-current={activeKey === 'inicio' ? 'page' : undefined}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer text-left ${
              activeKey === 'inicio'
                ? 'bg-white/15 text-white font-semibold shadow-xs border-l-3 border-[#f2b705]'
                : 'text-[#d5e4ec]/85 hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <LayoutDashboard
                className={`w-4 h-4 ${
                  activeKey === 'inicio' ? 'text-[#f2b705]' : 'text-[#d5e4ec]/70'
                }`}
              />
              <span>Início</span>
            </div>
          </button>

          {/* 2. Seção Estoque */}
          <div className="text-[11px] font-bold tracking-wider text-[#d5e4ec]/45 uppercase px-3 pt-3 pb-1 select-none">
            Estoque
          </div>

          {(Object.keys(METADADOS_ABAS) as AbaEstoque[]).map((chave) => {
            const info = METADADOS_ABAS[chave];
            const Icon = ABA_ICONS[chave];
            const isActive = activeKey === chave;
            const critCount = contagemCriticos[chave] || 0;

            return (
              <button
                key={chave}
                type="button"
                onClick={() => handleSelect(chave)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer text-left ${
                  isActive
                    ? 'bg-white/15 text-white font-semibold shadow-xs border-l-3 border-[#f2b705]'
                    : 'text-[#d5e4ec]/85 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-[#4fa8e0]' : 'text-[#d5e4ec]/70'
                    }`}
                  />
                  <span>{info.titulo}</span>
                </div>

                {critCount > 0 && (
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#c8322b] text-white shadow-xs"
                    title={`${critCount} ${
                      critCount === 1 ? 'item em nível crítico' : 'itens em nível crítico'
                    }`}
                  >
                    {critCount}
                  </span>
                )}
              </button>
            );
          })}

          {/* 3. Seção Gestão */}
          <div className="text-[11px] font-bold tracking-wider text-[#d5e4ec]/45 uppercase px-3 pt-3 pb-1 select-none">
            Gestão
          </div>

          {/* Vendas & Pedidos */}
          <button
            type="button"
            onClick={() => handleSelect('vendas')}
            aria-current={activeKey === 'vendas' ? 'page' : undefined}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer text-left ${
              activeKey === 'vendas'
                ? 'bg-white/15 text-white font-semibold shadow-xs border-l-3 border-[#f2b705]'
                : 'text-[#d5e4ec]/85 hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <ShoppingCart
                className={`w-4 h-4 ${
                  activeKey === 'vendas' ? 'text-[#4fa8e0]' : 'text-[#d5e4ec]/70'
                }`}
              />
              <span>Vendas</span>
            </div>

            {pedidosAtrasadosCount > 0 && (
              <span
                className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#c8322b] text-white shadow-xs"
                title={`${pedidosAtrasadosCount} pedido(s) atrasado(s)`}
              >
                {pedidosAtrasadosCount}
              </span>
            )}
          </button>

          {/* Clientes & Parceiros */}
          <button
            type="button"
            onClick={() => handleSelect('clientes')}
            aria-current={activeKey === 'clientes' ? 'page' : undefined}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer text-left ${
              activeKey === 'clientes'
                ? 'bg-white/15 text-white font-semibold shadow-xs border-l-3 border-[#f2b705]'
                : 'text-[#d5e4ec]/85 hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <Users
                className={`w-4 h-4 ${
                  activeKey === 'clientes' ? 'text-[#4fa8e0]' : 'text-[#d5e4ec]/70'
                }`}
              />
              <span>Clientes</span>
            </div>
          </button>

          {/* Saída Manual & Relatórios */}
          <button
            type="button"
            onClick={() => handleSelect('saida')}
            aria-current={activeKey === 'saida' ? 'page' : undefined}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer text-left ${
              activeKey === 'saida'
                ? 'bg-white/15 text-white font-semibold shadow-xs border-l-3 border-[#f2b705]'
                : 'text-[#d5e4ec]/85 hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <ArrowLeftRight
                className={`w-4 h-4 ${
                  activeKey === 'saida' ? 'text-[#4fa8e0]' : 'text-[#d5e4ec]/70'
                }`}
              />
              <span>Saída manual</span>
            </div>
          </button>
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
