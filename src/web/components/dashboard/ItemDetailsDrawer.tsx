'use client';

import React, { useEffect, useRef } from 'react';
import { X, ArrowDownRight, ArrowUpRight, Clock, MapPin, ShieldAlert, Cpu } from 'lucide-react';
import { type DashboardItem, UNIDADE_LABELS } from '@/web/data/mock-almoxarifado';
import { formatarTextoFalta } from '@/web/utils/pluralization';
import { useExtratoItem } from '@/web/hooks/useExtratoItem';
import { StockGauge } from './StockGauge';
import { StockStatusBadge } from './StockStatusBadge';

export interface ItemDetailsDrawerProps {
  item: DashboardItem | null;
  isOpen: boolean;
  onClose: () => void;
  onRegistrarEntrada?: (item: DashboardItem) => void;
  onRegistrarSaida?: (item: DashboardItem) => void;
}

export function ItemDetailsDrawer({
  item,
  isOpen,
  onClose,
  onRegistrarEntrada,
  onRegistrarSaida,
}: ItemDetailsDrawerProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Hook de extrato de movimentações (executado sob demanda quando o Drawer estiver aberto)
  const { movimentacoes, isLoading: isLoadingExtrato } = useExtratoItem({
    itemId: item?.id,
    enabled: isOpen && Boolean(item),
  });

  // Fechamento com tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      // Foca no botão fechar para acessibilidade
      setTimeout(() => closeButtonRef.current?.focus(), 50);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !item) {
    return null;
  }

  const unidadeFormatada = UNIDADE_LABELS[item.unidade] || item.unidade.toLowerCase();
  const faltaParaMinimo = Math.max(0, item.estoqueSeguranca - item.estoqueAtual);
  const especificacoes = Object.entries(item.especificacoes || {});

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Scrim / Backdrop escurecido */}
      <div
        className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 transition-opacity duration-200 animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Painel Lateral Deslizante */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Detalhes do produto ${item.descricao}`}
        className="relative w-full max-w-md bg-white dark:bg-[#2b2b2e] border-l border-slate-200 dark:border-[#3e3e42] flex flex-col h-full z-10 overflow-y-auto animate-in slide-in-from-right duration-250"
      >
        {/* Cabeçalho do Drawer */}
        <div className="sticky top-0 bg-white dark:bg-[#2b2b2e] z-20 px-6 py-4 border-b border-slate-200 dark:border-[#3e3e42] flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <StockStatusBadge
              estoqueAtual={item.estoqueAtual}
              estoqueSeguranca={item.estoqueSeguranca}
              size="sm"
            />
            <h2 className="text-xl font-bold text-slate-900 dark:text-[#ececee] leading-tight">
              {item.descricao}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              {item.codigo} · {item.categoria}
            </p>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar painel de detalhes"
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-[#343438] dark:hover:bg-[#3e3e42] transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo do Drawer */}
        <div className="p-6 flex flex-col gap-5 flex-1">
          {/* Destaque de Quantidade Atual */}
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-[#232325] border border-slate-200 dark:border-[#3e3e42] flex flex-col gap-2.5">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Saldo Físico Atual
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-slate-900 dark:text-[#ececee] tracking-tight tabular-nums">
                {item.estoqueAtual.toLocaleString('pt-BR')}
              </span>
              <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                {unidadeFormatada}
              </span>
            </div>

            <div className="mt-1">
              <StockGauge
                estoqueAtual={item.estoqueAtual}
                estoqueSeguranca={item.estoqueSeguranca}
                capacidadeMaxima={item.capacidadeMaxima}
                unidade={unidadeFormatada}
                size="md"
                showLabels
              />
            </div>
          </div>

          {/* Ações Operacionais Imediatas (Entrada / Retirada) */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => onRegistrarEntrada?.(item)}
              className="flex-1 h-9 px-3.5 rounded-md text-xs font-semibold bg-[#1d4ea3] dark:bg-[#5aa9ea] text-white dark:text-[#06182e] hover:bg-[#163c7e] dark:hover:bg-[#4898d5] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Adicionar entrada</span>
            </button>

            <button
              type="button"
              onClick={() => onRegistrarSaida?.(item)}
              className="flex-1 h-9 px-3.5 rounded-md text-xs font-medium border border-slate-300 dark:border-[#3e3e42] bg-white dark:bg-[#232325] text-slate-800 dark:text-[#ececee] hover:bg-slate-50 dark:hover:bg-[#343438] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowDownRight className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span>Retirar para produção</span>
            </button>
          </div>

          {/* Grid de Informações de Armazenamento */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">
              Parâmetros de Estoque
            </h3>
            <dl className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-md bg-slate-50 dark:bg-[#232325] border border-slate-200 dark:border-[#3e3e42]">
                <dt className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Estoque Mínimo</dt>
                <dd className="text-sm font-semibold text-slate-900 dark:text-[#ececee] tabular-nums">
                  {item.estoqueSeguranca.toLocaleString('pt-BR')} {unidadeFormatada}
                </dd>
              </div>

              <div className="p-3 rounded-md bg-slate-50 dark:bg-[#232325] border border-slate-200 dark:border-[#3e3e42]">
                <dt className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Capacidade Máxima</dt>
                <dd className="text-sm font-semibold text-slate-900 dark:text-[#ececee] tabular-nums">
                  {item.capacidadeMaxima.toLocaleString('pt-BR')} {unidadeFormatada}
                </dd>
              </div>

              <div className="p-3 rounded-md bg-slate-50 dark:bg-[#232325] border border-slate-200 dark:border-[#3e3e42]">
                <dt className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Endereço Físico</dt>
                <dd className="text-sm font-mono font-semibold text-slate-900 dark:text-[#ececee]">
                  {item.localizacaoFisica || 'Não alocado'}
                </dd>
              </div>

              {faltaParaMinimo > 0 ? (
                <div className="p-3 rounded-md bg-rose-50 dark:bg-[#40201d] border border-rose-200 dark:border-rose-900/60">
                  <dt className="text-xs text-rose-700 dark:text-[#f0796b] font-medium mb-0.5">
                    Reposição Necessária
                  </dt>
                  <dd className="text-sm font-bold text-rose-700 dark:text-[#f0796b] tabular-nums">
                    {formatarTextoFalta(faltaParaMinimo, item.unidade, { sufixo: '' })}
                  </dd>
                </div>
              ) : (
                <div className="p-3 rounded-md bg-emerald-50 dark:bg-[#163323] border border-emerald-200 dark:border-emerald-900/60">
                  <dt className="text-xs text-emerald-700 dark:text-[#72d596] font-medium mb-0.5">
                    Margem de Segurança
                  </dt>
                  <dd className="text-sm font-bold text-emerald-700 dark:text-[#72d596] tabular-nums">
                    +{(item.estoqueAtual - item.estoqueSeguranca).toLocaleString('pt-BR')} {unidadeFormatada}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Especificações Técnicas (Atributos Livres) */}
          {especificacoes.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">
                Especificações do Material
              </h3>
              <div className="rounded-md border border-slate-200 dark:border-[#3e3e42] overflow-hidden divide-y divide-slate-200 dark:divide-[#3e3e42] text-xs">
                {especificacoes.map(([chave, valor]) => (
                  <div key={chave} className="flex justify-between py-2 px-3 bg-white dark:bg-[#232325]">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">{chave}</span>
                    <span className="text-slate-900 dark:text-[#ececee] font-semibold text-right max-w-[65%]">
                      {valor}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Histórico Recente de Movimentações */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Movimentações Recentes
            </h3>

            {isLoadingExtrato ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-slate-100 dark:bg-[#343438]/50 rounded-md animate-pulse" />
                ))}
              </div>
            ) : movimentacoes.length === 0 ? (
              <div className="p-4 text-center rounded-md border border-slate-200 dark:border-[#3e3e42] bg-slate-50 dark:bg-[#232325] text-slate-500 dark:text-slate-400 text-xs">
                Sem movimentações recentes registradas para este item.
              </div>
            ) : (
              <div className="space-y-2">
                {movimentacoes.map((mov) => {
                  const isEntrada = mov.tipo === 'Entrada';

                  return (
                    <div
                      key={mov.id}
                      className="p-2.5 rounded-md bg-slate-50 dark:bg-[#232325] border border-slate-200 dark:border-[#3e3e42] flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                            isEntrada
                              ? 'bg-emerald-100 dark:bg-[#163323] text-emerald-600 dark:text-[#72d596]'
                              : 'bg-rose-100 dark:bg-[#40201d] text-rose-600 dark:text-[#f0796b]'
                          }`}
                        >
                          {isEntrada ? (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDownRight className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div>
                          <b className="block text-slate-900 dark:text-[#ececee] font-semibold">
                            {mov.tipo} · {mov.responsavel}
                          </b>
                          <span className="text-slate-500 dark:text-slate-400 text-xs">
                            {mov.dataHora}
                          </span>
                        </div>
                      </div>

                      <b
                        className={`text-sm tabular-nums ${
                          isEntrada
                            ? 'text-emerald-600 dark:text-[#72d596]'
                            : 'text-rose-600 dark:text-[#f0796b]'
                        }`}
                      >
                        {isEntrada ? '+' : '−'}
                        {mov.quantidade.toLocaleString('pt-BR')} {unidadeFormatada}
                      </b>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
