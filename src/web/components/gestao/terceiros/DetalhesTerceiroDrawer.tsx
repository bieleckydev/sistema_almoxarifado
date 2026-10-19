'use client';

import React, { useEffect, useMemo } from 'react';
import {
  X,
  Layers,
  Building2,
  FileText,
  Calendar,
  ArrowDownToLine,
  ArrowUpFromLine,
  Factory,
  RotateCcw,
  Clock,
  User,
  PlusCircle,
  ExternalLink,
} from 'lucide-react';
import type { MaterialTerceiroEnriquecido } from '@/web/app/api/terceiros/route';
import type { MovimentacaoTerceiro } from '@/core/domain/material-terceiro.schema';
import { calcularTotaisTerceiro } from '@/core/domain/material-terceiro.schema';

export interface DetalhesTerceiroDrawerProps {
  isOpen: boolean;
  material: MaterialTerceiroEnriquecido | null;
  movimentacoes: MovimentacaoTerceiro[];
  onClose: () => void;
  onMovimentar: () => void;
}

export function DetalhesTerceiroDrawer({
  isOpen,
  material,
  movimentacoes,
  onClose,
  onMovimentar,
}: DetalhesTerceiroDrawerProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filtra as movimentações específicas deste material
  const movimentacoesDoMaterial = useMemo(() => {
    if (!material) return [];
    return movimentacoes
      .filter((m) => m.materialTerceiroId === material.id)
      .sort((a, b) => b.dataMovimentacao.localeCompare(a.dataMovimentacao) || (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [movimentacoes, material]);

  const totais = useMemo(() => {
    return calcularTotaisTerceiro(movimentacoesDoMaterial);
  }, [movimentacoesDoMaterial]);

  if (!isOpen || !material) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-fade-in">
      <div
        className="w-full max-w-2xl bg-surface-container-lowest dark:bg-slate-900 h-full shadow-2xl flex flex-col border-l border-outline-variant/30 animate-slide-left"
        role="dialog"
        aria-modal="true"
      >
        {/* Cabeçalho */}
        <div className="p-5 border-b border-outline-variant/30 flex items-center justify-between bg-surface-container-low dark:bg-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Ficha do Material sob Custódia
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                  Terceiros
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {material.descricao}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Card de Identificação e Proprietário */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[11px] text-slate-400 block mb-0.5">
                  Proprietário (Cliente):
                </span>
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-blue-500" />
                  {material.clienteNome}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block mb-0.5">
                  NF-e de Remessa Original:
                </span>
                <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-amber-500" />
                  {material.numeroNFRemessa || 'Não informada'}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block mb-0.5">
                  Código / SKU do Cliente:
                </span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {material.codigoSku || 'Sem código'}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block mb-0.5">
                  Unidade de Controle:
                </span>
                <span className="font-semibold text-slate-700 dark:text-slate-300 capitalize">
                  {material.unidade}
                </span>
              </div>
            </div>
          </div>

          {/* Cards de Métricas e Totais Acumulados */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
              Extrato Consolidado de Unidades ({material.unidade})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40">
                <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 block">
                  Total Recebido
                </span>
                <span className="text-lg font-extrabold text-emerald-800 dark:text-emerald-300">
                  +{totais.recebido}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40">
                <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-400 block">
                  Consumido O.P.
                </span>
                <span className="text-lg font-extrabold text-blue-800 dark:text-blue-300">
                  -{totais.consumido}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/40">
                <span className="text-[10px] font-semibold text-orange-700 dark:text-orange-400 block">
                  Devolvido ao Cliente
                </span>
                <span className="text-lg font-extrabold text-orange-800 dark:text-orange-300">
                  -{totais.devolvido}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white shadow-xs">
                <span className="text-[10px] font-semibold text-slate-300 block">
                  Saldo em Custódia
                </span>
                <span className="text-lg font-extrabold text-amber-400">
                  {material.saldoAtual}
                </span>
              </div>
            </div>
          </div>

          {/* Histórico Cronológico de Movimentações */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Extrato Histórico de Movimentações ({movimentacoesDoMaterial.length})
              </h3>
              <button
                type="button"
                onClick={onMovimentar}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Nova Movimentação</span>
              </button>
            </div>

            {movimentacoesDoMaterial.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                Nenhuma movimentação registrada para este material ainda.
              </div>
            ) : (
              <div className="space-y-2.5">
                {movimentacoesDoMaterial.map((mov) => {
                  const isEntrada = mov.tipo === 'ENTRADA_REMESSA';
                  const isConsumo = mov.tipo === 'CONSUMO_PRODUCAO';
                  const isDevolucao = mov.tipo === 'DEVOLUCAO_RETORNO';

                  return (
                    <div
                      key={mov.id}
                      className="p-3.5 rounded-xl bg-surface-container-low dark:bg-slate-800/50 border border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center font-bold mt-0.5 ${
                            isEntrada
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : isConsumo
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                              : 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
                          }`}
                        >
                          {isEntrada ? (
                            <ArrowDownToLine className="w-4 h-4" />
                          ) : isConsumo ? (
                            <Factory className="w-4 h-4" />
                          ) : (
                            <RotateCcw className="w-4 h-4" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {isEntrada
                                ? 'Entrada (Remessa)'
                                : isConsumo
                                ? 'Consumo na Produção'
                                : 'Devolução ao Cliente'}
                            </span>
                            <span className="px-2 py-0.2 rounded-md font-mono text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                              {mov.documento}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {mov.dataMovimentacao}
                            </span>
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {mov.responsavel}
                            </span>
                            {mov.valorServico ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                Serviço: R$ {mov.valorServico.toFixed(2)}
                              </span>
                            ) : null}
                          </div>

                          {mov.observacao && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 italic">
                              "{mov.observacao}"
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0 sm:pl-4 sm:border-l border-slate-200 dark:border-slate-700">
                        <span
                          className={`text-sm font-extrabold ${
                            isEntrada
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-500'
                          }`}
                        >
                          {isEntrada ? '+' : '-'}
                          {mov.quantidade} {material.unidade}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          Saldo: {mov.saldoResultante} {material.unidade}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Rodapé */}
        <div className="p-4 border-t border-outline-variant/30 bg-surface-container-low dark:bg-slate-800/60 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {movimentacoesDoMaterial.length} registros no histórico
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-xl transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
