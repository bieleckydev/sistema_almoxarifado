'use client';

import React, { useState, useMemo } from 'react';
import { ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { FilterPill } from '@/web/components/ui/FilterPill';
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
      className={`bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden flex flex-col justify-between ${className}`}
    >
      {/* Cabeçalho com Filtros de Categoria */}
      <div className="p-4 sm:p-5 bg-surface-container-low/60 border-b border-outline-variant/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-error" />
          </span>
          <div>
            <h2 className="font-headline-sm text-sm sm:text-base text-on-surface font-bold">
              Itens em Ruptura Imediata no Almoxarifado
            </h2>
            <span className="font-label-sm text-xs text-on-surface-variant">
              Itens com saldo zerado ou abaixo da reserva técnica de segurança
            </span>
          </div>
        </div>

        {/* Chips de Filtro por Categoria */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <FilterPill
            label="Todos"
            count={contagemPorAba.todas}
            countVariant="error"
            size="sm"
            isActive={filtroAba === 'todas'}
            onClick={() => setFiltroAba('todas')}
          />
          <FilterPill
            label="Matéria-Prima"
            count={contagemPorAba.mp}
            size="sm"
            isActive={filtroAba === 'mp'}
            onClick={() => setFiltroAba('mp')}
          />
          <FilterPill
            label="Improdutivos"
            count={contagemPorAba.imp}
            size="sm"
            isActive={filtroAba === 'imp'}
            onClick={() => setFiltroAba('imp')}
          />
          <FilterPill
            label="Peças"
            count={contagemPorAba.motos}
            size="sm"
            isActive={filtroAba === 'motos'}
            onClick={() => setFiltroAba('motos')}
          />
        </div>
      </div>

      {/* Tabela de Alta Densidade Industrial */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-surface-container-lowest font-label-sm text-[11px] uppercase tracking-wider text-outline border-b border-outline-variant/20">
              <th className="py-2.5 px-4 sm:px-5">SKU / Item de Produção</th>
              <th className="py-2.5 px-3">Categoria</th>
              <th className="py-2.5 px-3">Saldo Real</th>
              <th className="py-2.5 px-3">Mín. Req.</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-4 sm:px-5 text-right">Ação Direta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/15 text-on-surface text-xs font-body-md">
            {itensFiltrados.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-on-surface-variant">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-6 h-6 text-tertiary" />
                    <span className="font-semibold text-on-surface">
                      Nenhum item nesta categoria está em nível crítico!
                    </span>
                    <span className="text-xs text-on-surface-variant">
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
                    className="hover:bg-surface-container-low transition-colors group"
                  >
                    {/* Descrição e SKU */}
                    <td className="py-3 px-4 sm:px-5">
                      <button
                        type="button"
                        onClick={() => onSelectItem(item)}
                        className="text-left group-hover:text-primary transition-colors cursor-pointer"
                      >
                        <div className="font-headline-sm text-xs font-bold text-on-surface group-hover:text-primary">
                          {item.nome}
                        </div>
                        <div className="font-data-tabular text-[11px] text-outline mt-0.5 font-mono">
                          {item.codigo || `ID: ${item.id.slice(0, 8)}`}
                        </div>
                      </button>
                    </td>

                    {/* Categoria */}
                    <td className="py-3 px-3">
                      <span className="font-label-sm text-[11px] text-on-surface-variant uppercase font-medium">
                        {item.aba === 'mp'
                          ? 'Matéria-Prima'
                          : item.aba === 'imp'
                          ? 'Improdutivos'
                          : 'Peças'}
                      </span>
                    </td>

                    {/* Saldo Real */}
                    <td className="py-3 px-3">
                      <span
                        className={`font-data-tabular text-xs font-bold ${
                          isZerado
                            ? 'text-error font-extrabold'
                            : isCritico
                            ? 'text-error'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {item.estoqueAtual.toLocaleString('pt-BR')} {item.unidade}
                      </span>
                    </td>

                    {/* Mínimo Requerido */}
                    <td className="py-3 px-3">
                      <span className="font-data-tabular text-xs text-on-surface-variant">
                        {item.estoqueSeguranca.toLocaleString('pt-BR')} {item.unidade}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-3">
                      {isZerado ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-label-sm text-[10.5px] bg-error text-on-error font-bold">
                          Esgotado
                        </span>
                      ) : isCritico ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-label-sm text-[10.5px] bg-error-container text-on-error-container font-semibold">
                          Crítico
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-label-sm text-[10.5px] bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-medium">
                          Abaixo Mín.
                        </span>
                      )}
                    </td>

                    {/* Ação Direta */}
                    <td className="py-3 px-4 sm:px-5 text-right">
                      <button
                        type="button"
                        onClick={() => onAdicionarEntrada(item)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-primary hover:text-on-primary text-on-surface font-label-md text-xs font-semibold transition-all cursor-pointer active:scale-95 shadow-sm"
                        title={`Registrar entrada expressa de ${item.nome}`}
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
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
