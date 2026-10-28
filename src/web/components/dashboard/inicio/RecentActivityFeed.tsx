'use client';

import React from 'react';
import { History, ArrowDownRight, ArrowUpRight, ArrowRight } from 'lucide-react';
import { useMovimentacoesPeriodo } from '@/web/hooks/useMovimentacoesPeriodo';

export interface RecentActivityFeedProps {
  onVerHistoricoCompleto: () => void;
  className?: string;
}

export function RecentActivityFeed({
  onVerHistoricoCompleto,
  className = '',
}: RecentActivityFeedProps) {
  const { movimentacoes, isLoading } = useMovimentacoesPeriodo();

  // Exibe as últimas 6 movimentações
  const ultimasMovimentacoes = movimentacoes.slice(0, 6);

  return (
    <div
      className={`bg-surface-container-lowest rounded-lg border border-outline-variant/40 p-4 flex flex-col justify-between shadow-2xs ${className}`}
    >
      <div>
        {/* Cabeçalho do Feed */}
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30 mb-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-zinc-500 shrink-0" />
            <h3 className="font-headline-sm text-sm text-on-surface font-semibold tracking-tight">
              Últimas Movimentações
            </h3>
          </div>

          <button
            type="button"
            onClick={onVerHistoricoCompleto}
            className="font-mono text-xs text-on-surface-variant hover:text-on-surface flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>Ver tudo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Lista de Atividades Recentes */}
        {isLoading ? (
          <div className="space-y-2 py-2 animate-pulse">
            <div className="h-9 bg-surface-container rounded-md" />
            <div className="h-9 bg-surface-container rounded-md" />
            <div className="h-9 bg-surface-container rounded-md" />
          </div>
        ) : ultimasMovimentacoes.length === 0 ? (
          <div className="py-8 text-center text-on-surface-variant text-xs">
            Nenhuma movimentação registrada no turno de hoje.
          </div>
        ) : (
          <div className="space-y-1.5">
            {ultimasMovimentacoes.map((mov) => {
              const isEntrada = mov.tipo === 'Entrada';
              const nomeMaterial = mov.item?.descricao || 'Material';
              const unidade = mov.item?.unidade || 'un';

              return (
                <div
                  key={mov.id}
                  className="py-2 px-2.5 rounded-md hover:bg-surface-container-low/60 flex items-center justify-between gap-2.5 transition-colors text-xs border border-transparent hover:border-outline-variant/20"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isEntrada ? (
                      <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    ) : (
                      <ArrowDownRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    )}

                    <div className="min-w-0">
                      <p className="text-xs font-medium text-on-surface truncate">
                        {nomeMaterial}
                      </p>
                      <span className="text-[10.5px] text-on-surface-variant truncate block font-mono">
                        {mov.quem || 'Operador'}
                        {mov.obs ? ` • ${mov.obs}` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`font-mono text-xs font-semibold tabular-nums block ${
                        isEntrada ? 'text-on-surface' : 'text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      {isEntrada ? '+' : '-'}
                      {mov.quantidade} {unidade}
                    </span>
                    <span className="font-mono text-[10px] text-on-surface-variant">
                      {mov.rotulo || mov.hora || 'Hoje'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rodapé limpo */}
      <div className="mt-3.5 pt-2.5 border-t border-outline-variant/30 flex items-center justify-between text-xs text-on-surface-variant">
        <span className="font-mono text-[10.5px]">
          Coletor RF sincronizado
        </span>
        <button
          type="button"
          onClick={onVerHistoricoCompleto}
          className="font-mono text-[11px] font-medium text-on-surface hover:underline cursor-pointer"
        >
          Relatório de Turno →
        </button>
      </div>
    </div>
  );
}
