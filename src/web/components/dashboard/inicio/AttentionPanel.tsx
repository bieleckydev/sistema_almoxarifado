'use client';

import React from 'react';
import { AlertTriangle, Clock, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { METADADOS_ABAS } from '@/web/data/mock-almoxarifado';
import type { ItemAtencaoResumo } from '@/web/hooks/useDashboardResumo';

export interface AttentionPanelProps {
  pedidosAtrasados: number;
  itensAtencao: ItemAtencaoResumo[];
  onVerPedidos: () => void;
  onSelectItem: (item: ItemAtencaoResumo) => void;
  onAdicionarEntrada: (item: ItemAtencaoResumo) => void;
  isLoading?: boolean;
  className?: string;
}

export function AttentionPanel({
  pedidosAtrasados,
  itensAtencao,
  onVerPedidos,
  onSelectItem,
  onAdicionarEntrada,
  isLoading = false,
  className = '',
}: AttentionPanelProps) {
  if (isLoading) {
    return (
      <section className={`bg-white dark:bg-[#2b2b2e] border border-slate-200 dark:border-[#3e3e42] rounded-lg p-5 mb-7 animate-pulse ${className}`}>
        <div className="h-5 w-40 bg-slate-200 dark:bg-[#343438] rounded mb-4" />
        <div className="space-y-3">
          <div className="h-10 bg-slate-100 dark:bg-[#343438]/60 rounded-md" />
          <div className="h-10 bg-slate-100 dark:bg-[#343438]/60 rounded-md" />
          <div className="h-10 bg-slate-100 dark:bg-[#343438]/60 rounded-md" />
        </div>
      </section>
    );
  }

  const temPendencias = pedidosAtrasados > 0 || itensAtencao.length > 0;

  return (
    <section
      aria-label="Itens e pedidos que precisam de atenção"
      className={`bg-white dark:bg-[#2b2b2e] border border-slate-200 dark:border-[#3e3e42] rounded-lg p-5 mb-7 ${className}`}
    >
      <div className="flex items-center justify-between mb-3.5">
        <h2 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-[#ececee] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-[#f3c462]" />
          <span>Precisa de atenção</span>
        </h2>
        {temPendencias && (
          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
            {itensAtencao.length + (pedidosAtrasados > 0 ? 1 : 0)} alerta(s)
          </span>
        )}
      </div>

      <div className="divide-y divide-slate-100 dark:divide-[#3e3e42]">
        {/* 1. Alerta de Pedidos Atrasados */}
        {pedidosAtrasados > 0 && (
          <div className="py-2.5 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-rose-600 dark:text-[#f0796b]">
              <Clock className="w-4 h-4 shrink-0" />
              <b className="font-semibold text-rose-700 dark:text-[#f0796b]">
                {pedidosAtrasados} {pedidosAtrasados === 1 ? 'pedido atrasado' : 'pedidos atrasados'}
              </b>
            </div>

            <button
              type="button"
              onClick={onVerPedidos}
              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-xs font-medium text-slate-700 dark:text-[#ececee] bg-white dark:bg-[#232325] hover:bg-slate-50 dark:hover:bg-[#343438] border border-slate-300 dark:border-[#3e3e42] transition-colors cursor-pointer"
            >
              <span>Ver pedidos</span>
            </button>
          </div>
        )}

        {/* 2. Lista dos Itens Críticos e Abaixo do Mínimo mais urgentes */}
        {itensAtencao.map((p) => {
          const isCritico = p.status === 'crit';
          const abaNome = METADADOS_ABAS[p.aba]?.titulo || 'Estoque';

          return (
            <div
              key={p.id}
              className="py-2.5 flex items-center justify-between gap-3 text-xs"
            >
              {/* Informações do Item */}
              <button
                type="button"
                onClick={() => onSelectItem(p)}
                className="text-left group cursor-pointer min-w-0 pr-2"
              >
                <b className="block text-slate-900 dark:text-[#ececee] font-semibold truncate group-hover:text-blue-600 dark:group-hover:text-[#5aa9ea] transition-colors">
                  {p.nome}
                </b>
                <small className="block text-slate-500 dark:text-slate-400 mt-0.5 truncate font-normal">
                  {abaNome} · <span className="tabular-nums font-medium text-slate-700 dark:text-slate-300">{p.estoqueAtual.toLocaleString('pt-BR')}</span> de{' '}
                  <span className="tabular-nums font-medium text-slate-700 dark:text-slate-300">{p.estoqueSeguranca.toLocaleString('pt-BR')} {p.unidade}</span> mínimos
                </small>
              </button>

              {/* Tag de Situação e Botão de Entrada Rápida */}
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`px-2 py-0.5 rounded-md text-xs font-semibold whitespace-nowrap ${
                    isCritico
                      ? 'bg-rose-50 dark:bg-[#40201d] text-rose-700 dark:text-[#f0796b] border border-rose-200 dark:border-rose-900/60'
                      : 'bg-amber-50 dark:bg-[#3d2e14] text-amber-700 dark:text-[#f3c462] border border-amber-200 dark:border-amber-900/60'
                  }`}
                >
                  {isCritico ? 'Crítico' : 'Abaixo do mínimo'}
                </span>

                <button
                  type="button"
                  onClick={() => onAdicionarEntrada(p)}
                  title={`Registrar entrada rápida para ${p.nome}`}
                  className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-xs font-medium text-slate-700 dark:text-[#ececee] bg-white dark:bg-[#232325] hover:bg-slate-50 dark:hover:bg-[#343438] border border-slate-300 dark:border-[#3e3e42] transition-colors cursor-pointer"
                >
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>+ Entrada</span>
                </button>
              </div>
            </div>
          );
        })}

        {/* 3. Empty State quando tudo estiver em dia */}
        {!temPendencias && (
          <div className="py-6 flex flex-col items-center justify-center text-center text-slate-400 text-xs">
            <CheckCircle2 className="w-6 h-6 text-emerald-500 mb-1.5" />
            <p className="font-medium text-slate-600 dark:text-slate-300">Tudo em dia por aqui.</p>
            <span className="text-[11px] text-slate-400 mt-0.5">Nenhum pedido em atraso nem itens em ruptura de estoque.</span>
          </div>
        )}
      </div>
    </section>
  );
}
