'use client';

import React from 'react';
import {
  Warehouse,
  ChevronDown,
  Calendar,
  Bell,
  ChevronRight,
  ShoppingCart,
  Menu,
} from 'lucide-react';
import { type TelaOuAba, METADADOS_ABAS } from '@/web/data/mock-almoxarifado';
import { GlobalSearchInput } from './GlobalSearchInput';
import { ThemeToggle } from './ThemeToggle';
import type { GlobalSearchResult } from '@/web/hooks/useGlobalSearch';
import { useAuthStore } from '@/core/store/useAuthStore';
import { usePeriodoGlobal } from '@/web/hooks/usePeriodoGlobal';
import { podeExecutar, ROTULO_PAPEL } from '@/core/domain/permissions';
import { useBaixaRapidaStore } from '@/core/store/useBaixaRapidaStore';

export interface AppTopHeaderProps {
  telaAtiva: TelaOuAba;
  onSelectTela: (tela: TelaOuAba) => void;
  onSelectSearchResult: (result: GlobalSearchResult) => void;
  onRegistrarEntrada?: () => void;
  onRegistrarSaida?: () => void;
  onAbrirBaixaRapida?: () => void;
  onToggleMobileMenu?: () => void;
  totalAlertas?: number;
  className?: string;
}

const GESTAO_TITULOS: Record<'vendas' | 'clientes' | 'saida', string> = {
  vendas: 'Pedidos & Vendas',
  clientes: 'Clientes & Parceiros',
  saida: 'Movimentações & Saídas',
};

export function AppTopHeader({
  telaAtiva,
  onSelectTela,
  onSelectSearchResult,
  onRegistrarEntrada,
  onRegistrarSaida,
  onAbrirBaixaRapida,
  onToggleMobileMenu,
  totalAlertas = 0,
  className = '',
}: AppTopHeaderProps) {
  const { user } = useAuthStore();
  const { periodo, textoIntervalo } = usePeriodoGlobal();
  const totalItensCarrinho = useBaixaRapidaStore((s) => s.itens.length);

  const podeMover = podeExecutar(user?.role, 'mover');
  const isAbaEstoque = telaAtiva === 'mp' || telaAtiva === 'imp' || telaAtiva === 'motos';
  const isGestao = telaAtiva === 'vendas' || telaAtiva === 'clientes' || telaAtiva === 'saida';

  // Iniciais do usuário logado
  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'AL';

  return (
    <header
      className={`sticky top-0 z-20 w-full h-16 bg-surface-container-lowest border-b border-outline-variant/30 flex items-center justify-between px-3 sm:px-6 gap-2 sm:gap-3 transition-colors shadow-[0_1px_8px_rgba(0,0,0,0.03)] ${className}`}
    >
      {/* 1. Lado Esquerdo: Botão Menu Mobile, Seletor de Galpão & Campo de Busca Unificada */}
      <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
        {/* Botão de Menu para Mobile / Tablets */}
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="flex md:hidden p-2 rounded-lg text-on-surface hover:bg-surface-container transition-colors cursor-pointer shrink-0"
          aria-label="Abrir menu de navegação"
        >
          <Menu className="w-5 h-5 text-on-surface" />
        </button>

        {/* Seletor de Galpão / Unidade Operacional */}
        <div
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container-low text-on-surface select-none shrink-0 border border-outline-variant/20 hover:bg-surface-container transition-colors cursor-pointer"
          title="Almoxarifado Ativo"
        >
          <Warehouse className="w-4 h-4 text-primary shrink-0" />
          <span className="font-headline-sm text-xs font-semibold text-on-surface truncate">
            Unidade Matriz - Galpão 01
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-outline shrink-0" />
        </div>

        {/* Breadcrumb sutil para telas menores */}
        <div className="flex md:hidden items-center gap-1.5 text-xs text-on-surface-variant shrink-0">
          <button
            type="button"
            onClick={() => onSelectTela('inicio')}
            className="hover:text-primary transition-colors font-medium cursor-pointer"
          >
            Início
          </button>
          {telaAtiva !== 'inicio' && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-outline" />
              <b className="font-semibold text-on-surface">
                {isAbaEstoque
                  ? METADADOS_ABAS[telaAtiva].titulo
                  : isGestao
                  ? GESTAO_TITULOS[telaAtiva]
                  : telaAtiva}
              </b>
            </>
          )}
        </div>

        {/* Campo de Busca Rápida Estilo Stitch com atalho ⌘K */}
        <div className="flex-1 max-w-sm sm:max-w-md">
          <GlobalSearchInput onSelectResult={onSelectSearchResult} />
        </div>
      </div>

      {/* 2. Lado Direito: Ações Rápidas (3.0), Data Operacional, Alertas, Tema e Perfil */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Carrinho de Baixa em Lote Discreto (se houver itens pendentes) */}
        {podeMover && onAbrirBaixaRapida && totalItensCarrinho > 0 && (
          <button
            type="button"
            onClick={onAbrirBaixaRapida}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-semibold text-on-surface bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 transition-colors cursor-pointer"
            title="Abrir carrinho de retirada em lote"
          >
            <ShoppingCart className="w-3.5 h-3.5 text-secondary" />
            <span className="hidden md:inline">Lote</span>
            <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary text-on-primary leading-none">
              {totalItensCarrinho}
            </span>
          </button>
        )}

        {/* Data Operacional */}
        <div className="hidden xl:flex items-center gap-2 text-on-surface-variant font-body-sm text-xs">
          <Calendar className="w-4 h-4 text-secondary" />
          <span className="font-medium text-outline">Data:</span>
          <span className="font-data-tabular font-semibold text-on-surface">
            {periodo === 'Hoje' ? 'Hoje' : textoIntervalo || '14/10/2026'}
          </span>
        </div>

        <div className="hidden sm:block h-5 w-px bg-outline-variant/30" />

        {/* Notificações com badge */}
        <button
          type="button"
          aria-label="Notificações operacionais"
          title={
            totalAlertas > 0
              ? `${totalAlertas} alertas de estoque pendentes`
              : 'Nenhum alerta crítico'
          }
          className="relative p-2 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
        >
          <Bell className="w-4 h-4" />
          {totalAlertas > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-error ring-2 ring-surface-container-lowest" />
          )}
        </button>

        {/* Alternador de Tema Claro / Escuro */}
        <ThemeToggle />

        <div className="hidden sm:block h-5 w-px bg-outline-variant/30" />

        {/* Perfil do Usuário com Indicador de Presença e Papel (3.0) */}
        {user ? (
          <div className="flex items-center gap-2.5 pl-1">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-bold text-xs shadow-sm">
                {userInitials}
              </div>
              <span
                className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-tertiary ring-2 ring-surface-container-lowest"
                title="Online"
              />
            </div>
            <div className="hidden md:flex flex-col text-left leading-tight">
              <span className="font-headline-sm text-xs font-bold text-on-surface truncate max-w-[130px]">
                {user.name}
              </span>
              <span className="font-label-sm text-[10px] text-primary dark:text-primary-fixed uppercase font-semibold tracking-wider truncate max-w-[130px] mt-0.5">
                {user.role ? (ROTULO_PAPEL[user.role] || user.role) : 'Almoxarife'}
              </span>
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant text-xs font-bold">
            AL
          </div>
        )}
      </div>
    </header>
  );
}
