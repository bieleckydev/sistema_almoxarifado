'use client';

import React from 'react';
import { LayoutDashboard, Layers, ArrowLeftRight, Menu } from 'lucide-react';
import type { TelaOuAba } from '@/web/data/mock-almoxarifado';

export interface MobileBottomNavProps {
  telaAtiva: TelaOuAba;
  onSelectTela: (tela: TelaOuAba) => void;
  onOpenMobileMenu: () => void;
  className?: string;
}

export function MobileBottomNav({
  telaAtiva,
  onSelectTela,
  onOpenMobileMenu,
  className = '',
}: MobileBottomNavProps) {
  const isEstoque =
    telaAtiva === 'mp' ||
    telaAtiva === 'imp' ||
    telaAtiva === 'motos' ||
    telaAtiva === 'terc';

  const isMovimentacoes =
    telaAtiva === 'saida' || telaAtiva === 'req' || telaAtiva === 'inv';

  return (
    <nav
      aria-label="Navegação móvel de chão de fábrica"
      className={`fixed bottom-0 left-0 right-0 z-30 md:hidden bg-surface-container-lowest/95 backdrop-blur-md border-t border-outline-variant/30 flex items-center justify-around px-2 pt-1.5 safe-area-bottom shadow-lg ${className}`}
    >
      {/* 1. Início */}
      <button
        type="button"
        onClick={() => onSelectTela('inicio')}
        className={`flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors cursor-pointer ${
          telaAtiva === 'inicio'
            ? 'text-on-surface font-semibold'
            : 'text-on-surface-variant/70 hover:text-on-surface'
        }`}
      >
        <LayoutDashboard className="w-5 h-5 mb-0.5" />
        <span className="text-[10px] leading-tight">Início</span>
        {telaAtiva === 'inicio' && (
          <span className="w-1 h-1 rounded-full bg-primary mt-0.5" />
        )}
      </button>

      {/* 2. Catálogo de Estoque */}
      <button
        type="button"
        onClick={() => onSelectTela('mp')}
        className={`flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors cursor-pointer ${
          isEstoque
            ? 'text-on-surface font-semibold'
            : 'text-on-surface-variant/70 hover:text-on-surface'
        }`}
      >
        <Layers className="w-5 h-5 mb-0.5" />
        <span className="text-[10px] leading-tight">Estoque</span>
        {isEstoque && (
          <span className="w-1 h-1 rounded-full bg-primary mt-0.5" />
        )}
      </button>

      {/* 3. Movimentações / Saídas */}
      <button
        type="button"
        onClick={() => onSelectTela('saida')}
        className={`flex flex-col items-center justify-center flex-1 py-1 text-center transition-colors cursor-pointer ${
          isMovimentacoes
            ? 'text-on-surface font-semibold'
            : 'text-on-surface-variant/70 hover:text-on-surface'
        }`}
      >
        <ArrowLeftRight className="w-5 h-5 mb-0.5" />
        <span className="text-[10px] leading-tight">Movimento</span>
        {isMovimentacoes && (
          <span className="w-1 h-1 rounded-full bg-primary mt-0.5" />
        )}
      </button>

      {/* 4. Menu Completo (Abre o Drawer da Sidebar) */}
      <button
        type="button"
        onClick={onOpenMobileMenu}
        className="flex flex-col items-center justify-center flex-1 py-1 text-center text-on-surface-variant/70 hover:text-on-surface transition-colors cursor-pointer"
        aria-label="Abrir menu completo com módulos corporativos"
      >
        <Menu className="w-5 h-5 mb-0.5" />
        <span className="text-[10px] leading-tight">Menu</span>
      </button>
    </nav>
  );
}
