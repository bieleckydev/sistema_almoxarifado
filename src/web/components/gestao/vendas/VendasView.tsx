'use client';

import React, { useState } from 'react';
import {
  RefreshCw,
  Plus,
  Search,
  X,
  AlertCircle,
  CheckCircle2,
  PackageCheck,
  Truck,
  Layers,
} from 'lucide-react';
import { usePedidos, useAtualizarStatusPedido } from '@/web/hooks/usePedidos';
import { OrderStatusBadge } from './OrderStatusBadge';
import { useToast } from '@/web/hooks/useToast';
import { UNIDADE_LABELS } from '@/web/data/mock-almoxarifado';
import type { PedidoEnriquecido } from '@/web/app/api/pedidos/route';

export interface VendasViewProps {
  onNovoPedido: () => void;
}

export function VendasView({ onNovoPedido }: VendasViewProps) {
  const { toast } = useToast();
  const [busca, setBusca] = useState('');
  const [alertaEstoque, setAlertaEstoque] = useState<string | null>(null);

  const {
    pedidos,
    total,
    pedidosAEntregar,
    pedidosAtrasados,
    pedidosSemEstoque,
    isLoading,
    isFetching,
    refetch,
  } = usePedidos({ busca });

  const atualizarStatusMutation = useAtualizarStatusPedido();

  const handleAvancarStatus = async (pedido: PedidoEnriquecido) => {
    setAlertaEstoque(null);

    if (pedido.status === 'PENDENTE') {
      try {
        await atualizarStatusMutation.mutateAsync({
          id: pedido.id,
          status: 'SEPARADO',
        });
        toast(`Pedido #${pedido.numeroSequencial || pedido.id} marcado como Separado.`, {
          type: 'info',
        });
      } catch (err: any) {
        toast(err?.message || 'Erro ao atualizar pedido.', { type: 'error' });
      }
    } else if (pedido.status === 'SEPARADO') {
      // Se tiver falta de estoque, bloqueia e avisa
      if (pedido.faltaEstoque) {
        const itemFaltante = pedido.itensDetalhes.find((i) => i.estoqueAtual < i.quantidade);
        const msg = itemFaltante
          ? `Estoque insuficiente de ${itemFaltante.nome} (Disponível: ${itemFaltante.estoqueAtual}, Requisitado: ${itemFaltante.quantidade}) para o pedido #${pedido.numeroSequencial || pedido.id}.`
          : `Estoque insuficiente para entregar o pedido #${pedido.numeroSequencial || pedido.id}.`;

        setAlertaEstoque(msg);
        toast(msg, { type: 'error', duration: 4500 });
        return;
      }

      try {
        await atualizarStatusMutation.mutateAsync({
          id: pedido.id,
          status: 'ENTREGUE',
        });
        toast(
          `Pedido #${pedido.numeroSequencial || pedido.id} entregue e baixa no estoque realizada com sucesso!`,
          { type: 'success' }
        );
      } catch (err: any) {
        const msg = err?.message || 'Falha ao entregar pedido.';
        setAlertaEstoque(msg);
        toast(msg, { type: 'error', duration: 4500 });
      }
    }
  };

  const formatarDataBR = (dataIso: string) => {
    if (!dataIso) return '—';
    const partes = dataIso.split('-');
    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return dataIso;
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 animate-fade-in">
      {/* Cabeçalho da Tela de Vendas */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-normal text-slate-900 dark:text-white">
            Vendas
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-normal">
            Pedidos a entregar, por cliente e prazo. Ao entregar, o estoque recebe a baixa automaticamente.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <button
            type="button"
            onClick={onNovoPedido}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-semibold text-white bg-[#1d4ea3] dark:bg-[#3273dc] hover:bg-blue-800 dark:hover:bg-blue-600 transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo pedido</span>
          </button>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isLoading || isFetching}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
            title="Atualizar lista de pedidos"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </header>

      {/* 3 Cards de KPIs do Topo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="p-3.5 rounded-lg bg-white dark:bg-[#2b2b2e] border border-slate-200 dark:border-[#3e3e42] border-t-3 border-t-[#4fa8e0] flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Pedidos a entregar
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-[#ececee] tabular-nums">
              {isLoading ? '—' : pedidosAEntregar}
            </span>
            <span className="text-xs text-slate-400">em aberto</span>
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-white dark:bg-[#2b2b2e] border border-slate-200 dark:border-[#3e3e42] border-t-3 border-t-[#d9372f] flex flex-col justify-between">
          <span className="text-xs font-semibold text-rose-600 dark:text-[#f0796b]">
            Atrasados
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold tracking-tight text-rose-600 dark:text-[#f0796b] tabular-nums">
              {isLoading ? '—' : pedidosAtrasados}
            </span>
            <span className="text-xs text-slate-400">fora do prazo</span>
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-white dark:bg-[#2b2b2e] border border-slate-200 dark:border-[#3e3e42] border-t-3 border-t-[#f2b705] flex flex-col justify-between">
          <span className="text-xs font-semibold text-amber-700 dark:text-[#f3c462]">
            Sem estoque suficiente
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold tracking-tight text-amber-700 dark:text-[#f3c462] tabular-nums">
              {isLoading ? '—' : pedidosSemEstoque}
            </span>
            <span className="text-xs text-slate-400">com déficit</span>
          </div>
        </div>
      </div>

      {/* Alerta de Estoque Insuficiente Inline */}
      {alertaEstoque && (
        <div
          role="alert"
          className="mb-4 p-3 rounded-md bg-rose-50 dark:bg-[#40201d] border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-[#f0796b] text-xs flex items-center justify-between gap-3 animate-in fade-in"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-[#f0796b]" />
            <span>{alertaEstoque}</span>
          </div>
          <button
            type="button"
            onClick={() => setAlertaEstoque(null)}
            className="p-1 rounded text-rose-600 hover:text-rose-800 dark:text-[#f0796b] cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Barra de Filtros e Busca Rápida */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Filtrar por número do pedido, cliente ou item..."
            className="w-full pl-9 pr-8 py-2 text-xs rounded-md border border-slate-300 dark:border-[#3e3e42] bg-white dark:bg-[#2b2b2e] text-slate-900 dark:text-[#ececee] placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500"
          />
          {busca && (
            <button
              type="button"
              onClick={() => setBusca('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <span className="text-xs font-mono text-slate-500 dark:text-slate-400 shrink-0">
          <strong>{pedidos.length}</strong> {pedidos.length === 1 ? 'pedido exibido' : 'pedidos exibidos'}
        </span>
      </div>

      {/* Tabela de Pedidos de Alta Densidade */}
      <div className="w-full bg-white dark:bg-[#2b2b2e] rounded-lg border border-slate-200 dark:border-[#3e3e42] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-[#3e3e42] bg-slate-50 dark:bg-[#232325] text-slate-600 dark:text-[#a3a3a9] font-semibold select-none">
                <th className="py-2.5 px-3 whitespace-nowrap">Pedido</th>
                <th className="py-2.5 px-3">Cliente</th>
                <th className="py-2.5 px-3">Itens</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Entrega</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Situação</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#3e3e42] text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
                    <span>Carregando pedidos de venda...</span>
                  </td>
                </tr>
              ) : pedidos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Nenhum pedido encontrado com os critérios de busca aplicados.
                  </td>
                </tr>
              ) : (
                pedidos.map((pedido) => {
                  const isEntregue = pedido.status === 'ENTREGUE';
                  const isPendente = pedido.status === 'PENDENTE';
                  const isSeparado = pedido.status === 'SEPARADO';
                  const isMutating =
                    atualizarStatusMutation.isPending &&
                    atualizarStatusMutation.variables?.id === pedido.id;

                  return (
                    <tr
                      key={pedido.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-[#232325] transition-colors"
                    >
                      {/* Pedido #ID */}
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-[#ececee] whitespace-nowrap font-mono">
                        #{pedido.numeroSequencial || pedido.id}
                      </td>

                      {/* Cliente */}
                      <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-[#ececee]">
                        {pedido.clienteNome}
                      </td>

                      {/* Lista de Itens */}
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                        <div className="flex flex-col gap-1">
                          {pedido.itensDetalhes.map((it, idx) => {
                            const unidadeFmt =
                              UNIDADE_LABELS[it.unidade as keyof typeof UNIDADE_LABELS] ||
                              it.unidade.toLowerCase();
                            const semSaldoItem = it.estoqueAtual < it.quantidade;

                            return (
                              <div
                                key={idx}
                                className={`text-[11px] leading-tight flex items-baseline gap-1.5 ${
                                  semSaldoItem && !isEntregue
                                    ? 'text-amber-800 dark:text-[#f3c462] font-medium'
                                    : ''
                                }`}
                              >
                                <span className="font-mono font-semibold">
                                  {it.quantidade.toLocaleString('pt-BR')} {unidadeFmt}
                                </span>
                                <span className="text-slate-400">·</span>
                                <span>{it.nome}</span>
                                {semSaldoItem && !isEntregue && (
                                  <span className="text-[10px] text-amber-600 dark:text-[#f3c462] font-mono">
                                    (saldo: {it.estoqueAtual})
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </td>

                      {/* Prazo de Entrega */}
                      <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {formatarDataBR(pedido.prazoEntrega)}
                      </td>

                      {/* Situação com Badges */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <OrderStatusBadge
                          status={pedido.status}
                          atrasado={pedido.atrasado}
                          faltaEstoque={pedido.faltaEstoque}
                        />
                      </td>

                      {/* Botão de Ação / Workflow */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        {!isEntregue ? (
                          <button
                            type="button"
                            onClick={() => handleAvancarStatus(pedido)}
                            disabled={isMutating}
                            className={`inline-flex items-center gap-1.5 h-6 px-2 rounded-md text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 ${
                              isPendente
                                ? 'bg-white dark:bg-[#232325] text-slate-700 dark:text-[#ececee] hover:bg-slate-50 dark:hover:bg-[#343438] border border-slate-300 dark:border-[#3e3e42]'
                                : 'bg-[#1d4ea3] dark:bg-[#5aa9ea] hover:bg-[#163c7e] dark:hover:bg-[#4898d5] text-white dark:text-[#06182e]'
                            }`}
                          >
                            {isMutating ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : isPendente ? (
                              <PackageCheck className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                            ) : (
                              <Truck className="w-3.5 h-3.5 text-white dark:text-[#06182e]" />
                            )}
                            <span>{isPendente ? 'Marcar separado' : 'Entregar'}</span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-[#72d596] font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Entregue</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
