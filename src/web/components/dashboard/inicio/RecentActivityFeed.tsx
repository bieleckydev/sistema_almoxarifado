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
      className={`bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 p-4 sm:p-5 flex flex-col justify-between ${className}`}
    >
      <div>
        {/* Cabeçalho do Feed */}
        <div className="flex items-center justify-between pb-3.5 border-b border-outline-variant/20 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary shrink-0">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-headline-sm text-sm sm:text-base text-on-surface font-bold leading-tight">
                Baixas & Apontamentos
              </h3>
              <span className="font-label-sm text-[11px] text-on-surface-variant">
                Linha do tempo ao vivo
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onVerHistoricoCompleto}
            className="font-label-sm text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Ver Todos</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Lista de Atividades Recentes */}
        {isLoading ? (
          <div className="space-y-3 py-2 animate-pulse">
            <div className="h-10 bg-surface-container rounded-lg" />
            <div className="h-10 bg-surface-container rounded-lg" />
            <div className="h-10 bg-surface-container rounded-lg" />
          </div>
        ) : ultimasMovimentacoes.length === 0 ? (
          <div className="py-8 text-center text-on-surface-variant text-xs">
            Nenhuma movimentação registrada no turno de hoje.
          </div>
        ) : (
          <div className="space-y-2.5">
            {ultimasMovimentacoes.map((mov) => {
              const isEntrada = mov.tipo === 'Entrada';
              const nomeMaterial = mov.item?.descricao || 'Material';
              const unidade = mov.item?.unidade || 'un';

              return (
                <div
                  key={mov.id}
                  className="p-2.5 rounded-lg bg-surface-container-low/60 border border-outline-variant/15 flex items-center justify-between gap-2.5 hover:bg-surface-container-low transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                        isEntrada
                          ? 'bg-tertiary-fixed/30 text-tertiary'
                          : 'bg-error-container/60 text-error'
                      }`}
                    >
                      {isEntrada ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-on-surface truncate leading-tight">
                        {nomeMaterial}
                      </p>
                      <span className="text-[10.5px] text-on-surface-variant truncate block mt-0.5">
                        {mov.quem || 'Chão de fábrica'}
                        {mov.obs ? ` • ${mov.obs}` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`font-data-tabular text-xs font-bold block ${
                        isEntrada ? 'text-tertiary' : 'text-error'
                      }`}
                    >
                      {isEntrada ? '+' : '-'}
                      {mov.quantidade} {unidade}
                    </span>
                    <span className="font-label-sm text-[10px] text-outline">
                      {mov.rotulo || mov.hora || 'Hoje'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rodapé com atalho */}
      <div className="mt-4 pt-3 border-t border-outline-variant/20 flex items-center justify-between text-xs text-on-surface-variant">
        <span className="font-label-sm text-[11px]">
          Sincronização contínua com Firestore
        </span>
        <button
          type="button"
          onClick={onVerHistoricoCompleto}
          className="font-label-md text-xs font-semibold text-primary hover:underline cursor-pointer"
        >
          Relatório de Turno
        </button>
      </div>
    </div>
  );
}
