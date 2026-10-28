'use client';

import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Package,
  Layers,
  Wrench,
  Bike,
  PackageCheck,
  ArrowLeftRight,
  ClipboardList,
  CheckSquare,
  ShoppingCart,
  Receipt,
  Users,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Radio,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  type AbaEstoque,
  type TelaOuAba,
  type ModuloCorporativo,
  obterModuloDeTela,
} from '../../data/mock-almoxarifado';
import { podeAcessarTela, podeExecutar, ROTULO_PAPEL } from '@/core/domain/permissions';
import { useAuthStore } from '@/core/store/useAuthStore';
import { useRouter } from 'next/navigation';

export interface AppSidebarProps {
  /**
   * Módulo corporativo atualmente selecionado na aplicação.
   */
  moduloAtivo?: ModuloCorporativo;
  /**
   * Identificador da tela ou aba atualmente ativa.
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
   * Contagem de pedidos aguardando faturamento / emissão de nota.
   */
  pedidosAFaturarCount?: number;
  /**
   * Contagem de requisições pendentes de aprovação (somente perfil que pode aprovar).
   */
  requisicoesPendentesCount?: number;
  /**
   * Estado colapsado / mini controlado externamente (opcional)
   */
  isMini?: boolean;
  onToggleMini?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  className?: string;
}

interface ItemNavegacao {
  tela: TelaOuAba;
  nome: string;
  icon: LucideIcon;
  moduloPai: ModuloCorporativo;
  getBadgeCount?: (ctx: {
    criticosTotais: number;
    contagemCriticos: Record<AbaEstoque, number>;
    pedidosAtrasadosCount: number;
    pedidosAFaturarCount: number;
    requisicoesPendentesCount: number;
    role?: import('@/core/domain/user.schema').UserRole;
  }) => number;
  getBadgeTitle?: (count: number) => string;
  badgeVariant?: 'error' | 'secondary' | 'primary' | 'neutral';
}

interface GrupoNavegacao {
  titulo: string;
  itens: ItemNavegacao[];
}

const GRUPOS_MENU: GrupoNavegacao[] = [
  {
    titulo: '',
    itens: [
      {
        tela: 'inicio',
        nome: 'Início',
        icon: LayoutDashboard,
        moduloPai: 'inicio',
      },
    ],
  },
  {
    titulo: 'Estoque',
    itens: [
      {
        tela: 'mp',
        nome: 'Matéria-prima',
        icon: Layers,
        moduloPai: 'estoque',
        getBadgeCount: ({ contagemCriticos }) => contagemCriticos.mp || 0,
        getBadgeTitle: (count) => `${count} item(ns) em atenção em MP`,
        badgeVariant: 'neutral',
      },
      {
        tela: 'imp',
        nome: 'Materiais improdutivos',
        icon: Wrench,
        moduloPai: 'estoque',
        getBadgeCount: ({ contagemCriticos }) => contagemCriticos.imp || 0,
        getBadgeTitle: (count) => `${count} item(ns) em atenção em Improdutivos`,
        badgeVariant: 'neutral',
      },
      {
        tela: 'motos',
        nome: 'Peças de motos',
        icon: Bike,
        moduloPai: 'estoque',
        getBadgeCount: ({ contagemCriticos }) => contagemCriticos.motos || 0,
        getBadgeTitle: (count) => `${count} item(ns) em atenção em Peças`,
        badgeVariant: 'neutral',
      },
      {
        tela: 'terc',
        nome: 'Material de terceiros',
        icon: PackageCheck,
        moduloPai: 'estoque',
      },
    ],
  },
  {
    titulo: 'Movimentações',
    itens: [
      {
        tela: 'saida',
        nome: 'Entradas e saídas',
        icon: ArrowLeftRight,
        moduloPai: 'compras',
      },
      {
        tela: 'req',
        nome: 'Requisições',
        icon: ClipboardList,
        moduloPai: 'estoque',
        getBadgeCount: ({ requisicoesPendentesCount, role }) => {
          if (!podeExecutar(role, 'aprovar')) return 0;
          return requisicoesPendentesCount || 0;
        },
        getBadgeTitle: (count) => `${count} requisição(ões) pendente(s)`,
        badgeVariant: 'error',
      },
      {
        tela: 'inv',
        nome: 'Inventário (contagem)',
        icon: CheckSquare,
        moduloPai: 'estoque',
      },
    ],
  },
  {
    titulo: 'Comercial',
    itens: [
      {
        tela: 'vendas',
        nome: 'Pedidos de venda',
        icon: ShoppingCart,
        moduloPai: 'vendas',
        getBadgeCount: ({ pedidosAtrasadosCount }) => pedidosAtrasadosCount,
        getBadgeTitle: (count) => `${count} pedido(s) atrasado(s)`,
        badgeVariant: 'error',
      },
      {
        tela: 'fat',
        nome: 'Faturamento',
        icon: Receipt,
        moduloPai: 'vendas',
        getBadgeCount: ({ pedidosAFaturarCount }) => pedidosAFaturarCount,
        getBadgeTitle: (count) => `${count} pedido(s) a faturar`,
        badgeVariant: 'primary',
      },
      {
        tela: 'clientes',
        nome: 'Clientes e fornecedores',
        icon: Users,
        moduloPai: 'vendas',
      },
    ],
  },
  {
    titulo: 'Controle',
    itens: [
      {
        tela: 'aud',
        nome: 'Auditoria',
        icon: ShieldCheck,
        moduloPai: 'inicio',
      },
    ],
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
  pedidosAFaturarCount = 0,
  requisicoesPendentesCount = 0,
  isMini: isMiniProp,
  onToggleMini: onToggleMiniProp,
  isMobileOpen = false,
  onCloseMobile,
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

  // Filtrar os grupos e itens com base no perfil de acesso do usuário (3.0 RBAC)
  const gruposVisiveis = GRUPOS_MENU.map((grupo) => ({
    ...grupo,
    itens: grupo.itens.filter((item) => podeAcessarTela(user?.role, item.tela)),
  })).filter((grupo) => grupo.itens.length > 0);

  return (
    <>
      {/* Backdrop overlay para mobile */}
      {isMobileOpen && (
        <div
          role="presentation"
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-xs transition-opacity"
          aria-hidden="true"
        />
      )}

      <aside
        className={`bg-inverse-surface text-inverse-on-surface flex flex-col justify-between shrink-0 transition-transform md:transition-all duration-200 border-r border-white/5 h-[100dvh] md:h-auto md:min-h-screen fixed md:sticky top-0 left-0 bottom-0 z-50 md:z-30 shadow-2xl md:shadow-[0_1px_8px_rgba(0,0,0,0.04)] ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${
          isMini ? 'w-72 md:w-[68px] p-3 md:p-2' : 'w-72 md:w-64 p-3.5'
        } ${className}`}
        aria-label="Menu Operacional WMS"
      >
        <div className="flex flex-col gap-4">
          {/* Cabeçalho da Marca estilo Stitch MD3 (AL Apex Log / WMS Enterprise) */}
          <div
            className={`flex items-center pb-3 border-b border-white/10 ${
              isMini ? 'justify-between md:justify-center' : 'justify-between px-1'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Logo Badge */}
              <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-zinc-100 font-headline-sm font-bold text-xs shrink-0 shadow-xs">
                R
              </div>

              <div className={`flex flex-col min-w-0 ${isMini ? 'flex md:hidden' : 'flex'}`}>
                <span className="font-headline-sm text-sm tracking-tight text-inverse-on-surface font-bold leading-none truncate">
                  Rhowert
                </span>
                <span className="font-label-sm text-[10px] uppercase tracking-wider text-outline-variant font-medium mt-1">
                  Almoxarifado
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Botão fechar drawer no mobile */}
              <button
                type="button"
                onClick={onCloseMobile}
                title="Fechar menu lateral"
                aria-label="Fechar menu lateral"
                className="flex md:hidden p-1.5 rounded-lg text-outline-variant hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Botão expandir/recolher no desktop */}
              <button
                type="button"
                id="modtog"
                onClick={handleToggleMini}
                title={isMini ? 'Expandir barra lateral' : 'Recolher barra lateral'}
                aria-label={isMini ? 'Expandir barra lateral' : 'Recolher barra lateral'}
                className="hidden md:flex p-1 rounded-lg text-outline-variant hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              >
                {isMini ? (
                  <ChevronRight className="w-4 h-4 text-primary-fixed" />
                ) : (
                  <ChevronLeft className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

        {/* Título de Seção */}
        {!isMini && (
          <div className="px-1.5 font-label-sm text-[10.5px] uppercase tracking-wider text-outline-variant font-semibold select-none">
            Menu Operacional
          </div>
        )}

        {/* Lista de Navegação Principal */}
        <nav className="flex flex-col gap-1 overflow-y-auto max-h-[calc(100vh-210px)] pr-0.5" aria-label="Menu WMS Operacional">
          {gruposVisiveis.map((grupo, gIndex) => (
            <div key={grupo.titulo || `g-${gIndex}`} className="flex flex-col gap-1">
              {!isMini && grupo.titulo && (
                <div className="px-2 pt-2.5 pb-0.5 font-label-sm text-[10px] uppercase tracking-wider text-outline-variant font-bold select-none">
                  {grupo.titulo}
                </div>
              )}
              {isMini && grupo.titulo && (
                <div className="my-1 border-t border-white/10" />
              )}
              {grupo.itens.map((item) => {
                const Icon = item.icon;
                const isCurrent = activeKey === item.tela;
                const badgeCount = item.getBadgeCount
                  ? item.getBadgeCount({
                    criticosTotais,
                    contagemCriticos,
                    pedidosAtrasadosCount,
                    pedidosAFaturarCount,
                    requisicoesPendentesCount: requisicoesPendentesCount || 0,
                    role: user?.role,
                  })
                  : 0;
                const badgeTitle = item.getBadgeTitle
                  ? item.getBadgeTitle(badgeCount)
                  : '';

                return (
                  <button
                    key={item.tela}
                    type="button"
                    data-tela={item.tela}
                    onClick={() => {
                      if (onCloseMobile) {
                        onCloseMobile();
                      }
                      if (onSelectModulo) {
                        onSelectModulo(item.moduloPai);
                      }
                      if (onSelectTela) {
                        onSelectTela(item.tela);
                      } else if (onSelectAba) {
                        (onSelectAba as (aba: TelaOuAba) => void)(item.tela);
                      }
                    }}
                    aria-current={isCurrent ? 'true' : undefined}
                    title={
                      isMini
                        ? `${item.nome}${badgeCount > 0 ? ` (${badgeTitle})` : ''}`
                        : undefined
                    }
                    className={`w-full flex items-center rounded-lg text-xs transition-all cursor-pointer text-left relative ${isMini
                      ? 'justify-center py-2 px-1'
                      : 'justify-between px-2.5 py-2'
                      } ${isCurrent
                        ? 'bg-zinc-800 text-white font-semibold shadow-xs'
                        : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200 font-medium'
                      }`}
                  >
                    <div
                      className={`flex items-center gap-2.5 min-w-0 ${isMini ? 'justify-center' : ''
                        }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-white' : 'text-zinc-500'
                          }`}
                      />
                      {!isMini && <span className="truncate text-xs">{item.nome}</span>}
                    </div>

                    {/* Badges de Notificação Operacional */}
                    {badgeCount > 0 && (
                      <>
                        {!isMini ? (
                          <span
                            className={`px-1.5 py-0.5 rounded font-mono text-[11px] tabular-nums shrink-0 ${
                              item.badgeVariant === 'error'
                                ? 'bg-red-500/15 text-red-300 border border-red-500/30 font-semibold'
                                : item.badgeVariant === 'primary'
                                ? 'bg-zinc-800 text-zinc-300 border border-zinc-700/50'
                                : 'text-zinc-400 font-normal'
                            }`}
                            title={badgeTitle}
                          >
                            {badgeCount}
                          </span>
                        ) : (
                          <span
                            className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
                              item.badgeVariant === 'error'
                                ? 'bg-red-500'
                                : 'bg-zinc-500'
                            } ring-2 ring-inverse-surface`}
                            title={badgeTitle}
                          />
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
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
                      {user.role ? (ROTULO_PAPEL[user.role] || user.role) : 'Almoxarife'}
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
    </>
  );
}
