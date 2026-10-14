'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { type TelaOuAba, METADADOS_ABAS } from '@/web/data/mock-almoxarifado';
import { GlobalSearchInput } from './GlobalSearchInput';
import { ThemeToggle } from './ThemeToggle';
import type { GlobalSearchResult } from '@/web/hooks/useGlobalSearch';

export interface AppTopHeaderProps {
  telaAtiva: TelaOuAba;
  onSelectTela: (tela: TelaOuAba) => void;
  onSelectSearchResult: (result: GlobalSearchResult) => void;
  className?: string;
}

const GESTAO_TITULOS: Record<'vendas' | 'clientes' | 'saida', string> = {
  vendas: 'Vendas',
  clientes: 'Clientes',
  saida: 'Saída manual',
};

export function AppTopHeader({
  telaAtiva,
  onSelectTela,
  onSelectSearchResult,
  className = '',
}: AppTopHeaderProps) {
  const isAbaEstoque = telaAtiva === 'mp' || telaAtiva === 'imp' || telaAtiva === 'motos';
  const isGestao = telaAtiva === 'vendas' || telaAtiva === 'clientes' || telaAtiva === 'saida';

  return (
    <header
      className={`sticky top-0 z-20 w-full px-4 py-3 md:px-7 bg-white/95 dark:bg-[#17212a]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 md:gap-6 flex-wrap md:flex-nowrap transition-colors ${className}`}
    >
      {/* 1. Breadcrumb Dinâmico de Navegação (ocultado em telas muito pequenas) */}
      <nav
        aria-label="Você está em"
        className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 select-none shrink-0"
      >
        {telaAtiva === 'inicio' ? (
          <b className="font-semibold text-slate-900 dark:text-white">Início</b>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onSelectTela('inicio')}
              className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors cursor-pointer"
            >
              Início
            </button>

            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />

            {isAbaEstoque && (
              <>
                <span>Estoque</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <b className="font-semibold text-slate-900 dark:text-white">
                  {METADADOS_ABAS[telaAtiva].titulo}
                </b>
              </>
            )}

            {isGestao && (
              <>
                <span>Gestão</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <b className="font-semibold text-slate-900 dark:text-white">
                  {GESTAO_TITULOS[telaAtiva]}
                </b>
              </>
            )}
          </>
        )}
      </nav>

      {/* 2. Campo de Busca Geral Unificada */}
      <div className="flex-1 max-w-full md:max-w-md w-full flex justify-center md:justify-end">
        <GlobalSearchInput onSelectResult={onSelectSearchResult} />
      </div>

      {/* 3. Ações Globais: Alternador de Tema */}
      <div className="hidden sm:flex items-center gap-2 shrink-0">
        <ThemeToggle />
      </div>
    </header>
  );
}
