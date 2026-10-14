'use client';

import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User as UserIcon,
  Shield,
  Radio,
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
  badgeVariant?: 'error' | 'secondary';
}

const ITENS_MODULOS: ItemModuloMenu[] = [
  {
    id: 'inicio',
    nome: 'Início / Visão Geral',
    viewPadrao: 'inicio',
    icon: LayoutDashboard,
  },
  {
    id: 'estoque',
    nome: 'Estoque & Almoxarifado',
    viewPadrao: 'mp',
    icon: Package,
    getBadgeCount: ({ critCount }) => critCount,
    getBadgeTitle: (count) =>
      `${count} ${count === 1 ? 'item crítico' : 'itens críticos'}`,
    badgeVariant: 'error',
  },
  {
    id: 'compras',
    nome: 'Movimentações & Saídas',
    viewPadrao: 'saida',
    icon: ArrowLeftRight,
  },
  {
    id: 'vendas',
    nome: 'Pedidos & Vendas',
    viewPadrao: 'vendas',
    icon: ShoppingCart,
    getBadgeCount: ({ atrCount }) => atrCount,
    getBadgeTitle: (count) =>
      `${count} ${count === 1 ? 'pedido atrasado' : 'pedidos atrasados'}`,
    badgeVariant: 'secondary',
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
      className={`bg-inverse-surface text-inverse-on-surface flex flex-col justify-between shrink-0 transition-all duration-200 border-r border-white/5 md:min-h-screen z-30 shadow-[0_1px_8px_rgba(0,0,0,0.04)] ${isMini ? 'w-full md:w-[68px] p-2' : 'w-full md:w-64 p-3.5'
        } ${className}`}
      aria-label="Menu Operacional WMS"
    >
      <div className="flex flex-col gap-4">
        {/* Cabeçalho da Marca estilo Stitch MD3 (AL Apex Log / WMS Enterprise) */}
        <div
          className={`flex items-center pb-3 border-b border-white/10 ${isMini ? 'justify-center' : 'justify-between px-1'
            }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Logo Badge */}
            <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center text-on-primary font-headline-sm font-bold text-xs shrink-0 shadow-sm">
              R
            </div>

            {!isMini && (
              <div className="flex flex-col min-w-0">
                <span className="font-headline-sm text-sm tracking-tight text-inverse-on-surface font-bold leading-none truncate">
                  Rhowert
                </span>
                <span className="font-label-sm text-[10px] uppercase tracking-wider text-outline-variant font-medium mt-1">
                  Almoxarifado
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            id="modtog"
            onClick={handleToggleMini}
            title={isMini ? 'Expandir barra lateral' : 'Recolher barra lateral'}
            aria-label={isMini ? 'Expandir barra lateral' : 'Recolher barra lateral'}
            className="p-1 rounded-lg text-outline-variant hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            {isMini ? (
              <ChevronRight className="w-4 h-4 text-primary-fixed" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Título de Seção */}
        {!isMini && (
          <div className="px-1.5 font-label-sm text-[10.5px] uppercase tracking-wider text-outline-variant font-semibold select-none">
            Menu Operacional
          </div>
        )}

        {/* Lista de Navegação Principal */}
        <nav className="flex flex-col gap-1.5" aria-label="Módulos corporativos">
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
                className={`w-full flex items-center rounded-lg text-xs transition-all cursor-pointer text-left relative ${isMini
                  ? 'justify-center py-2.5 px-1'
                  : 'justify-between px-3 py-2.5'
                  } ${isCurrent
                    ? 'bg-primary-container text-on-primary font-semibold shadow-sm'
                    : 'text-inverse-on-surface/80 hover:bg-white/10 hover:text-white font-medium'
                  }`}
              >
                <div
                  className={`flex items-center gap-2.5 min-w-0 ${isMini ? 'justify-center' : ''
                    }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-on-primary' : 'text-outline-variant'
                      }`}
                  />
                  {!isMini && <span className="truncate">{item.nome}</span>}
                </div>

                {/* Badges de Notificação Operacional */}
                {badgeCount > 0 && (
                  <>
                    {!isMini ? (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold shrink-0 ${item.badgeVariant === 'secondary'
                          ? 'bg-secondary-container text-on-secondary-fixed'
                          : 'bg-error text-on-error'
                          }`}
                        title={badgeTitle}
                      >
                        {item.badgeVariant === 'error' && badgeCount > 1
                          ? `${badgeCount} críticos`
                          : badgeCount}
                      </span>
                    ) : (
                      <span
                        className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${item.badgeVariant === 'secondary'
                          ? 'bg-secondary-container'
                          : 'bg-error'
                          } ring-2 ring-inverse-surface`}
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

      {/* Seção Inferior: Status do Terminal & Perfil de Usuário */}
      <div className="flex flex-col gap-3 pt-3 border-t border-white/10">
        {/* Status do Terminal (RF / Firestore) */}
        {!isMini ? (
          <div className="p-2.5 rounded-lg bg-surface-container/10 border border-white/5 flex items-center justify-between">
            <div className="flex flex-col min-w-0">
              <span className="font-label-sm text-[10px] text-outline-variant font-medium">
                Status do Terminal
              </span>
              <span className="font-body-sm text-xs text-inverse-on-surface font-semibold flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-tertiary-fixed shrink-0 animate-pulse" />
                <span className="truncate">Coletor RF Online</span>
              </span>
            </div>
            <Radio className="w-4 h-4 text-tertiary-fixed shrink-0" />
          </div>
        ) : (
          <div
            className="flex justify-center p-2 rounded-lg bg-surface-container/10 text-tertiary-fixed"
            title="Terminal Coletor RF Online"
          >
            <Radio className="w-4 h-4" />
          </div>
        )}

        {/* Perfil e Logout */}
        {user && (
          <div className="flex items-center justify-between pt-1">
            {!isMini ? (
              <>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-primary-container/20 text-inverse-on-surface flex items-center justify-center text-xs font-bold shrink-0">
                    {user.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-inverse-on-surface truncate leading-tight">
                      {user.name}
                    </p>
                    <span className="text-[10px] text-outline-variant uppercase font-medium">
                      {user.role === 'mestre' ? 'Gestor de Estoque' : 'Almoxarife'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  title="Encerrar sessão"
                  aria-label="Encerrar sessão"
                  className="p-1.5 rounded-lg text-outline-variant hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 w-full">
                <div
                  className="w-7 h-7 rounded-lg bg-primary-container/20 text-inverse-on-surface flex items-center justify-center text-xs font-bold"
                  title={`${user.name} (${user.role})`}
                >
                  {user.name.slice(0, 2).toUpperCase()}
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Encerrar sessão"
                  aria-label="Encerrar sessão"
                  className="p-1.5 rounded-lg text-outline-variant hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
