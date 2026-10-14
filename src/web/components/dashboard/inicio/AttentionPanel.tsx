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
      <section className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 mb-7 animate-pulse ${className}`}>
        <div className="h-5 w-40 bg-slate-200 dark:bg-slate-800 rounded mb-4" />
        <div className="space-y-3">
          <div className="h-10 bg-slate-100 dark:bg-slate-800/60 rounded-lg" />
          <div className="h-10 bg-slate-100 dark:bg-slate-800/60 rounded-lg" />
          <div className="h-10 bg-slate-100 dark:bg-slate-800/60 rounded-lg" />
        </div>
      </section>
    );
  }

  const temPendencias = pedidosAtrasados > 0 || itensAtencao.length > 0;

  return (
    <section
      aria-label="Itens e pedidos que precisam de atenção"
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 mb-7 shadow-2xs ${className}`}
    >
      <div className="flex items-center justify-between mb-3.5">
        <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span>Precisa de atenção</span>
        </h2>
        {temPendencias && (
          <span className="text-[11px] font-mono text-slate-400">
            {itensAtencao.length + (pedidosAtrasados > 0 ? 1 : 0)} alerta(s)
          </span>
        )}
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
        {/* 1. Alerta de Pedidos Atrasados */}
        {pedidosAtrasados > 0 && (
          <div className="py-2.5 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <Clock className="w-4 h-4 shrink-0" />
              <b className="font-semibold text-rose-700 dark:text-rose-400">
                {pedidosAtrasados} {pedidosAtrasados === 1 ? 'pedido atrasado' : 'pedidos atrasados'}
              </b>
            </div>

            <button
              type="button"
              onClick={onVerPedidos}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
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
                <b className="block text-slate-900 dark:text-white font-semibold truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {p.nome}
                </b>
                <small className="block text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {abaNome} · <span className="tabular-nums font-medium text-slate-700 dark:text-slate-300">{p.estoqueAtual.toLocaleString('pt-BR')}</span> de{' '}
                  <span className="tabular-nums font-medium text-slate-700 dark:text-slate-300">{p.estoqueSeguranca.toLocaleString('pt-BR')} {p.unidade}</span> mínimos
                </small>
              </button>

              {/* Tag de Situação e Botão de Entrada Rápida */}
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${
                    isCritico
                      ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60'
                      : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
                  }`}
                >
                  {isCritico ? 'Crítico' : 'Abaixo do mínimo'}
                </span>

                <button
                  type="button"
                  onClick={() => onAdicionarEntrada(p)}
                  title={`Registrar entrada rápida para ${p.nome}`}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                >
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
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
