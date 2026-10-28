'use client';

import React, { useState, useMemo } from 'react';
import { ArrowUpRight, CheckCircle2 } from 'lucide-react';
import type { ItemAtencaoResumo } from '@/web/hooks/useDashboardResumo';
import type { AbaEstoque } from '@/web/data/mock-almoxarifado';

export interface CriticalStockTableProps {
  itens: ItemAtencaoResumo[];
  onSelectItem: (item: ItemAtencaoResumo) => void;
  onAdicionarEntrada: (item: ItemAtencaoResumo) => void;
  className?: string;
}

type FiltroCategoria = 'todas' | AbaEstoque;

export function CriticalStockTable({
  itens,
  onSelectItem,
  onAdicionarEntrada,
  className = '',
}: CriticalStockTableProps) {
  const [filtroAba, setFiltroAba] = useState<FiltroCategoria>('todas');

  const contagemPorAba = useMemo(() => {
    return {
      todas: itens.length,
      mp: itens.filter((i) => i.aba === 'mp').length,
      imp: itens.filter((i) => i.aba === 'imp').length,
      motos: itens.filter((i) => i.aba === 'motos').length,
    };
  }, [itens]);

  const itensFiltrados = useMemo(() => {
    if (filtroAba === 'todas') return itens;
    return itens.filter((i) => i.aba === filtroAba);
  }, [itens, filtroAba]);

  return (
    <div
      id="tabela-criticos"
      className={`bg-surface-container-lowest rounded-lg border border-outline-variant/40 overflow-hidden flex flex-col justify-between shadow-2xs ${className}`}
    >
      {/* Cabeçalho com Filtros de Categoria em Segmented Control */}
      <div className="p-4 bg-surface-container-low/50 border-b border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
            <h2 className="font-headline-sm text-sm text-on-surface font-semibold tracking-tight">
              Itens em Ruptura Imediata
            </h2>
          </div>
          <span className="font-body-sm text-xs text-on-surface-variant block mt-0.5">
            Materiais com saldo zerado ou abaixo do estoque de segurança
          </span>
        </div>

        {/* Segmented Control Limpo e Monocromático */}
        <div className="flex items-center p-0.5 rounded-lg bg-surface-container border border-outline-variant/30 text-xs">
          <button
            type="button"
            onClick={() => setFiltroAba('todas')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              filtroAba === 'todas'
                ? 'bg-surface-container-lowest text-on-surface shadow-2xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Todos ({contagemPorAba.todas})
          </button>
          <button
            type="button"
            onClick={() => setFiltroAba('mp')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              filtroAba === 'mp'
                ? 'bg-surface-container-lowest text-on-surface shadow-2xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Matéria-Prima ({contagemPorAba.mp})
          </button>
          <button
            type="button"
            onClick={() => setFiltroAba('imp')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              filtroAba === 'imp'
                ? 'bg-surface-container-lowest text-on-surface shadow-2xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Improdutivos ({contagemPorAba.imp})
          </button>
          <button
            type="button"
            onClick={() => setFiltroAba('motos')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              filtroAba === 'motos'
                ? 'bg-surface-container-lowest text-on-surface shadow-2xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Peças ({contagemPorAba.motos})
          </button>
        </div>
      </div>

      {/* Tabela de Alta Densidade Industrial */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-surface-container-low/30 font-mono text-[11px] uppercase tracking-wider text-on-surface-variant border-b border-outline-variant/30">
              <th className="py-2.5 px-4 font-medium">SKU / Material</th>
              <th className="py-2.5 px-3 font-medium">Família</th>
              <th className="py-2.5 px-3 font-medium text-right">Saldo Real</th>
              <th className="py-2.5 px-3 font-medium text-right">Est. Mín.</th>
              <th className="py-2.5 px-3 font-medium text-center">Status</th>
              <th className="py-2.5 px-4 text-right font-medium">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/20 text-on-surface text-xs">
            {itensFiltrados.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-on-surface-variant">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-5 h-5 text-zinc-400" />
                    <span className="font-medium text-on-surface text-xs">
                      Nenhum item em nível crítico nesta seleção.
                    </span>
                    <span className="text-[11px] text-on-surface-variant">
                      O estoque de segurança está regularizado.
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              itensFiltrados.map((item) => {
                const isZerado = item.estoqueAtual === 0;
                const isCritico = item.status === 'crit';

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-surface-container-low/50 transition-colors group"
                  >
                    {/* Descrição e SKU */}
                    <td className="py-2.5 px-4">
                      <button
                        type="button"
                        onClick={() => onSelectItem(item)}
                        className="text-left group-hover:text-primary transition-colors cursor-pointer"
                      >
                        <div className="font-medium text-xs text-on-surface">
                          {item.nome}
                        </div>
                        <div className="font-mono text-[10.5px] text-on-surface-variant mt-0.5">
                          {item.codigo || `ID: ${item.id.slice(0, 8)}`}
                        </div>
                      </button>
                    </td>

                    {/* Categoria */}
                    <td className="py-2.5 px-3">
                      <span className="font-mono text-[11px] text-on-surface-variant">
                        {item.aba === 'mp'
                          ? 'MP'
                          : item.aba === 'imp'
                          ? 'Improdutivos'
                          : 'Peças'}
                      </span>
                    </td>

                    {/* Saldo Real */}
                    <td className="py-2.5 px-3 text-right">
                      <span
                        className={`font-mono text-xs font-semibold tabular-nums ${
                          isZerado
                            ? 'text-red-600 dark:text-red-400'
                            : isCritico
                            ? 'text-red-500'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {item.estoqueAtual.toLocaleString('pt-BR')} {item.unidade}
                      </span>
                    </td>

                    {/* Mínimo Requerido */}
                    <td className="py-2.5 px-3 text-right">
                      <span className="font-mono text-xs text-on-surface-variant tabular-nums">
                        {item.estoqueSeguranca.toLocaleString('pt-BR')} {item.unidade}
                      </span>
                    </td>

                    {/* Status Indicador */}
                    <td className="py-2.5 px-3 text-center">
                      {isZerado ? (
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-red-600 dark:text-red-400 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0" />
                          Esgotado
                        </span>
                      ) : isCritico ? (
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-red-500 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                          Crítico
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                          Abaixo mín.
                        </span>
                      )}
                    </td>

                    {/* Ação Direta */}
                    <td className="py-2.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onAdicionarEntrada(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-surface-container-lowest hover:bg-surface-container text-on-surface border border-outline-variant/40 text-xs font-medium transition-colors cursor-pointer"
                        title={`Registrar entrada de ${item.nome}`}
                      >
                        <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500" />
                        <span>+ Entrada Rápida</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
