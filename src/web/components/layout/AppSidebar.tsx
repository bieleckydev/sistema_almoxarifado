'use client';

import React, { useState, useEffect } from 'react';
import {
  Home,
  Layers,
  ArrowDownToLine,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User as UserIcon,
  Shield,
  type LucideIcon,
} from 'lucide-react';
import {
  type AbaEstoque,
  type TelaOuAba,
  type ModuloCorporativo,
  obterModuloDeTela,
} from '../../data/mock-almoxarifado';
import { useAuthStore } from '@/core/store/useAuthStore';
import { useRouter } from 'next/navigation';

export interface AppSidebarProps {
  /**
   * Módulo corporativo atualmente selecionado na aplicação.
   */
  moduloAtivo?: ModuloCorporativo;
  /**
   * Identificador da tela ou aba atualmente ativa (para compatibilidade).
   */
  telaAtiva?: TelaOuAba;
  abaAtiva?: TelaOuAba;
  /**
   * Callback disparado ao selecionar um módulo corporativo.
   */
  onSelectModulo?: (modulo: ModuloCorporativo) => void;
  /**
   * Callback disparado ao selecionar uma tela ou aba.
   */
  onSelectTela?: (tela: TelaOuAba) => void;
  onSelectAba?: ((aba: TelaOuAba) => void) | ((aba: AbaEstoque) => void);
  /**
   * Total de itens críticos no estoque para exibição da badge no módulo de Estoque.
   */
  totalCriticos?: number;
  contagemCriticos?: Record<AbaEstoque, number>;
  /**
   * Contagem de pedidos de venda em atraso para alertar no módulo de Vendas.
   */
  pedidosAtrasadosCount?: number;
  /**
   * Estado colapsado / mini controlado externamente (opcional)
   */
  isMini?: boolean;
  onToggleMini?: () => void;
  className?: string;
}

interface ItemModuloMenu {
  id: ModuloCorporativo;
  nome: string;
  viewPadrao: TelaOuAba;
  icon: LucideIcon;
  getBadgeCount?: (props: { critCount: number; atrCount: number }) => number;
  getBadgeTitle?: (count: number) => string;
}

const ITENS_MODULOS: ItemModuloMenu[] = [
  {
    id: 'inicio',
    nome: 'Início',
    viewPadrao: 'inicio',
    icon: Home,
  },
  {
    id: 'estoque',
    nome: 'Estoque',
    viewPadrao: 'mp',
    icon: Layers,
    getBadgeCount: ({ critCount }) => critCount,
    getBadgeTitle: (count) =>
      `${count} ${count === 1 ? 'item crítico' : 'itens críticos'}`,
  },
  {
    id: 'compras',
    nome: 'Compras',
    viewPadrao: 'saida',
    icon: ArrowDownToLine,
  },
  {
    id: 'vendas',
    nome: 'Vendas',
    viewPadrao: 'vendas',
    icon: ShoppingCart,
    getBadgeCount: ({ atrCount }) => atrCount,
    getBadgeTitle: (count) =>
      `${count} ${count === 1 ? 'pedido atrasado' : 'pedidos atrasados'}`,
  },
];

export function AppSidebar({
  moduloAtivo,
  telaAtiva,
  abaAtiva,
  onSelectModulo,
  onSelectTela,
  onSelectAba,
  totalCriticos,
  contagemCriticos = { mp: 0, imp: 0, motos: 0 },
  pedidosAtrasadosCount = 0,
  isMini: isMiniProp,
  onToggleMini: onToggleMiniProp,
  className = '',
}: AppSidebarProps) {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  // Estado local persistido no localStorage para o modo mini
  const [isMiniLocal, setIsMiniLocal] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const salvo = localStorage.getItem('sidebar_mini');
      if (salvo !== null) {
        setIsMiniLocal(salvo === 'true');
      }
    }
  }, []);

  const isMini = isMiniProp !== undefined ? isMiniProp : isMiniLocal;

  const handleToggleMini = () => {
    if (onToggleMiniProp) {
      onToggleMiniProp();
    } else {
      setIsMiniLocal((prev) => {
        const next = !prev;
        if (typeof window !== 'undefined') {
          localStorage.setItem('sidebar_mini', String(next));
        }
        return next;
      });
    }
  };

  // Resolução da tela ativa e do módulo ativo correspondente
  const activeKey: TelaOuAba = telaAtiva || abaAtiva || 'inicio';
  const moduloAtual: ModuloCorporativo =
    moduloAtivo || obterModuloDeTela(activeKey);

  // Total de itens críticos
  const criticosTotais =
    totalCriticos !== undefined
      ? totalCriticos
      : Object.values(contagemCriticos).reduce((acc, curr) => acc + curr, 0);

  const handleSelectModulo = (modulo: ModuloCorporativo, viewPadrao: TelaOuAba) => {
    if (onSelectModulo) {
      onSelectModulo(modulo);
    }
    if (onSelectTela) {
      onSelectTela(viewPadrao);
    } else if (onSelectAba) {
      (onSelectAba as (aba: TelaOuAba) => void)(viewPadrao);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <aside
      className={`bg-[#0b0c0f] dark:bg-[#1a1a1c] text-[#d5e4ec] flex flex-col justify-between shrink-0 transition-all duration-200 border-r border-slate-200/10 dark:border-[#3e3e42] md:min-h-screen z-20 ${
        isMini ? 'w-full md:w-[54px] p-2' : 'w-full md:w-[178px] p-3'
      } ${className}`}
      aria-label="Barra de módulos corporativos"
    >
      <div className="flex flex-col gap-3">
        {/* Cabeçalho da Sidebar (.mh com título Módulos e botão #modtog) */}
        <div
          className={`flex items-center pb-2 border-b border-white/10 ${
            isMini ? 'justify-center' : 'justify-between px-1'
          }`}
        >
          {!isMini && (
            <span className="font-semibold text-xs tracking-wider uppercase text-[#d5e4ec]/70 select-none">
              Módulos
            </span>
          )}

          <button
            type="button"
            id="modtog"
            onClick={handleToggleMini}
            title={isMini ? 'Expandir barra lateral' : 'Recolher barra lateral'}
            aria-label={isMini ? 'Expandir barra lateral' : 'Recolher barra lateral'}
            className="p-1 rounded-md text-[#d5e4ec]/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            {isMini ? (
              <ChevronRight className="w-4 h-4 text-[#4fa8e0]" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Lista dos 4 Módulos Corporativos (.mods) */}
        <nav className="flex flex-col gap-1" aria-label="Módulos corporativos">
          {ITENS_MODULOS.map((item) => {
            const Icon = item.icon;
            const isCurrent = moduloAtual === item.id;
            const badgeCount = item.getBadgeCount
              ? item.getBadgeCount({
                  critCount: criticosTotais,
                  atrCount: pedidosAtrasadosCount,
                })
              : 0;
            const badgeTitle = item.getBadgeTitle
              ? item.getBadgeTitle(badgeCount)
              : '';

            return (
              <button
                key={item.id}
                type="button"
                data-mod={item.id}
                onClick={() => handleSelectModulo(item.id, item.viewPadrao)}
                aria-current={isCurrent ? 'true' : undefined}
                title={isMini ? `${item.nome}${badgeCount > 0 ? ` (${badgeTitle})` : ''}` : undefined}
                className={`w-full flex items-center rounded-md text-xs font-medium transition-all cursor-pointer text-left relative ${
                  isMini
                    ? 'justify-center py-2 px-1'
                    : 'justify-between px-3 py-2'
                } ${
                  isCurrent
                    ? 'bg-white/15 text-white font-semibold border-l-3 border-[#f2b705]'
                    : 'text-[#d5e4ec]/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div
                  className={`flex items-center gap-2.5 min-w-0 ${
                    isMini ? 'justify-center' : ''
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isCurrent ? 'text-[#4fa8e0]' : 'text-[#4fa8e0]/75'
                    }`}
                  />
                  {!isMini && <span className="truncate">{item.nome}</span>}
                </div>

                {/* Badges de Notificação Operacional */}
                {badgeCount > 0 && (
                  <>
                    {!isMini ? (
                      <span
                        className="px-1.5 py-0.2 rounded-sm text-[10px] font-bold bg-[#c8322b] text-white shrink-0"
                        title={badgeTitle}
                      >
                        {badgeCount}
                      </span>
                    ) : (
                      <span
                        className="absolute top-1 right-1 w-2 h-2 rounded-xs bg-[#c8322b] ring-1 ring-[#0b0c0f]"
                        title={badgeTitle}
                      />
                    )}
                  </>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Perfil e Logout */}
      {user && (
        <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
          {!isMini ? (
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-md bg-white/10 flex items-center justify-center text-slate-200 shrink-0">
                  {user.role === 'mestre' ? (
                    <Shield className="w-3.5 h-3.5 text-[#f2b705]" />
                  ) : (
                    <UserIcon className="w-3.5 h-3.5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11.5px] font-medium text-white truncate leading-tight">
                    {user.name}
                  </p>
                  <span className="text-[9.5px] text-[#7cc3f2] uppercase tracking-wider font-semibold">
                    {user.role}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                title="Encerrar sessão"
                aria-label="Encerrar sessão"
                className="p-1 rounded-md text-[#d5e4ec]/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div
                className="w-7 h-7 rounded-md bg-white/10 flex items-center justify-center text-slate-200 shrink-0"
                title={`${user.name} (${user.role})`}
              >
                {user.role === 'mestre' ? (
                  <Shield className="w-3.5 h-3.5 text-[#f2b705]" />
                ) : (
                  <UserIcon className="w-3.5 h-3.5" />
                )}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                title="Encerrar sessão"
                aria-label="Encerrar sessão"
                className="p-1 rounded-md text-[#d5e4ec]/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
