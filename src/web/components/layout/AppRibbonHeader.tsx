'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  ArrowDownToLine,
  ArrowUpFromLine,
  Plus,
  BarChart3,
  Layers,
  Wrench,
  Bike,
  ShoppingCart,
  Users,
  ArrowLeftRight,
  Home,
  type LucideIcon,
} from 'lucide-react';
import {
  MODULOS_CONFIG,
  type ModuloCorporativo,
  type TelaOuAba,
  type RibbonIconName,
  type RibbonGroupDef,
} from '../../data/mock-almoxarifado';
import { usePeriodoGlobal } from '../../hooks/usePeriodoGlobal';
import { GlobalSearchInput } from './GlobalSearchInput';
import { ThemeToggle } from './ThemeToggle';
import type { GlobalSearchResult } from '../../hooks/useGlobalSearch';

export interface AppRibbonHeaderProps {
  moduloAtivo: ModuloCorporativo;
  telaAtiva: TelaOuAba;
  abaRibbonAtiva?: string;
  onSelectAbaRibbon?: (abaNome: string) => void;
  onRibbonAction: (action: string) => void;
  onSelectSearchResult: (result: GlobalSearchResult) => void;
  className?: string;
}

const ICONES_MAP: Record<RibbonIconName, LucideIcon> = {
  inicio: Home,
  mp: Layers,
  imp: Wrench,
  motos: Bike,
  vendas: ShoppingCart,
  clientes: Users,
  saida: ArrowLeftRight,
  entrada: ArrowDownToLine,
  retirada: ArrowUpFromLine,
  novo: Plus,
  rel: BarChart3,
  cal: Calendar,
};

export function AppRibbonHeader({
  moduloAtivo,
  telaAtiva,
  abaRibbonAtiva,
  onSelectAbaRibbon,
  onRibbonAction,
  onSelectSearchResult,
  className = '',
}: AppRibbonHeaderProps) {
  const { periodo, textoIntervalo, proximoPeriodo } = usePeriodoGlobal();

  // Configuração do módulo ativo
  const moduloConfig = moduloAtivo !== 'inicio' ? MODULOS_CONFIG[moduloAtivo] : null;

  // Lista de abas da Ribbon: 'Período de Análise', 'Favoritos' + abas do módulo
  const abasDisponiveis = useMemo<string[]>(() => {
    const abasModulo = moduloConfig ? moduloConfig.abas.map((a) => a.name) : [];
    return ['Período de Análise', 'Favoritos', ...abasModulo];
  }, [moduloConfig]);

  // Aba interna ativa (se não for controlada por prop)
  const [tabInterna, setTabInterna] = useState<string>('Período de Análise');
  const tabAtiva = abaRibbonAtiva || tabInterna;

  // Ajusta a aba selecionada quando mudar de módulo se a aba atual não existir no novo módulo
  useEffect(() => {
    if (!abasDisponiveis.includes(tabAtiva)) {
      const novaAba = moduloConfig ? moduloConfig.abas[0]?.name : 'Período de Análise';
      if (onSelectAbaRibbon) {
        onSelectAbaRibbon(novaAba);
      } else {
        setTabInterna(novaAba);
      }
    }
  }, [moduloAtivo, abasDisponiveis, tabAtiva, moduloConfig, onSelectAbaRibbon]);

  const handleSelectTab = (nomeTab: string) => {
    if (onSelectAbaRibbon) {
      onSelectAbaRibbon(nomeTab);
    } else {
      setTabInterna(nomeTab);
    }
  };

  const handleActionClick = (action: string) => {
    if (action === 'per') {
      proximoPeriodo();
    }
    onRibbonAction(action);
  };

  // Grupos a renderizar na Ribbon baseado na aba ativa
  const gruposRenderizados = useMemo<RibbonGroupDef[]>(() => {
    if (tabAtiva === 'Período de Análise') {
      return [
        {
          title: 'Seleção do Período',
          buttons: [
            {
              action: 'per',
              label: `Período: ${periodo}\n${textoIntervalo}`,
              icon: 'cal',
            },
          ],
        },
      ];
    }

    if (tabAtiva === 'Favoritos') {
      return [
        {
          title: 'Atalhos',
          buttons: [
            { action: 'pick:Entrada', label: 'Adicionar entrada', icon: 'entrada' },
            { action: 'pick:Saída', label: 'Retirar para produção', icon: 'retirada' },
            { action: 'novopedido', label: 'Novo pedido', icon: 'novo' },
            { action: 'v:vendas', label: 'Pedidos a entregar', icon: 'vendas' },
          ],
        },
      ];
    }

    if (moduloConfig) {
      const abaEncontrada = moduloConfig.abas.find((a) => a.name === tabAtiva);
      if (abaEncontrada) {
        return abaEncontrada.groups;
      }
    }

    return [];
  }, [tabAtiva, moduloConfig, periodo, textoIntervalo]);

  return (
    <header
      className={`sticky top-0 z-30 w-full bg-[#e8edf4] dark:bg-[#2f2f32] border-b border-slate-300/80 dark:border-[#3e3e42] select-none ${className}`}
    >
      {/* 1. Camada de Abas Superiores (.tabs) */}
      <div className="flex items-center gap-1 px-3 pt-2 pb-0 flex-wrap sm:flex-nowrap">
        {/* Logotipo A com atalho para tela inicial */}
        <button
          type="button"
          onClick={() => onRibbonAction('v:inicio')}
          title="Ir para o Início"
          className="w-7 h-7 rounded-md bg-[#1d4ea3] dark:bg-[#5aa9ea] text-white dark:text-[#06182e] font-bold text-xs flex items-center justify-center cursor-pointer hover:opacity-90 mr-2 shrink-0"
        >
          A
        </button>

        {/* Abas da Ribbon */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none flex-1">
          {abasDisponiveis.map((nomeTab) => {
            const isSelected = nomeTab === tabAtiva;
            return (
              <button
                key={nomeTab}
                type="button"
                onClick={() => handleSelectTab(nomeTab)}
                aria-selected={isSelected}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'border-[#4fa8e0] text-[#1d4ea3] dark:text-[#7cc3f2] font-semibold opacity-100 bg-white/50 dark:bg-[#2b2b2e] rounded-t-sm'
                    : 'border-transparent text-slate-700 dark:text-slate-300 opacity-75 hover:opacity-100'
                }`}
              >
                {nomeTab === 'Período de Análise' && (
                  <Calendar className="w-3.5 h-3.5 text-[#4fa8e0]" />
                )}
                <span>{nomeTab}</span>
              </button>
            );
          })}
        </div>

        {/* Busca Global Integrada no Topo */}
        <div className="w-full sm:w-64 md:w-80 ml-auto order-last sm:order-none mt-1 sm:mt-0">
          <GlobalSearchInput onSelectResult={onSelectSearchResult} />
        </div>

        {/* Alternador de Tema */}
        <div className="flex items-center ml-2 shrink-0">
          <ThemeToggle />
        </div>
      </div>

      {/* 2. Área da Ribbon propriamente dita (.ribbon - min-height 96px) */}
      <div className="flex items-stretch px-3 py-1.5 min-h-[96px] overflow-x-auto scrollbar-none">
        {gruposRenderizados.map((grupo, idx) => (
          <div
            key={grupo.title}
            className={`flex flex-col justify-between px-3 ${
              idx < gruposRenderizados.length - 1
                ? 'border-r border-slate-300 dark:border-[#3e3e42]'
                : ''
            }`}
          >
            {/* Botões do Grupo */}
            <div className="flex items-center gap-1 flex-1">
              {grupo.buttons.map((btn) => {
                const IconComponent = ICONES_MAP[btn.icon] || Home;
                const isPeriodButton = btn.action === 'per';

                return (
                  <button
                    key={btn.action + btn.label}
                    type="button"
                    onClick={() => handleActionClick(btn.action)}
                    title={btn.label.replace('\n', ' - ')}
                    className={`w-[88px] min-w-[88px] h-full py-1.5 px-1 flex flex-col items-center justify-center gap-1 rounded-md text-[11.5px] leading-tight text-center text-slate-800 dark:text-slate-100 hover:bg-[#4fa8e0]/15 dark:hover:bg-[#4fa8e0]/20 hover:border-slate-300 dark:hover:border-[#3e3e42] transition-colors border border-transparent cursor-pointer select-none ${
                      isPeriodButton ? 'font-medium' : ''
                    }`}
                  >
                    <IconComponent className="w-7 h-7 text-[#4fa8e0] shrink-0" />
                    <span className="whitespace-pre-line text-center line-clamp-2">
                      {btn.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Rótulo de Legenda do Grupo */}
            <div className="text-[11px] text-slate-500 dark:text-slate-400 text-center mt-1 select-none font-normal">
              {grupo.title}
            </div>
          </div>
        ))}
      </div>

      {/* 3. Faixa Decorativa Tricolor Contínua (.rib::after) */}
      <div
        className="h-[3px] w-full"
        style={{
          background:
            'linear-gradient(90deg, #4fa8e0 0%, #4fa8e0 55%, #d9372f 55%, #d9372f 78%, #f2b705 78%, #f2b705 100%)',
        }}
        aria-hidden="true"
      />
    </header>
  );
}
