'use client';

import React, { useState, useMemo } from 'react';
import {
  RefreshCw,
  Plus,
  Search,
  X,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  PackageCheck,
  Truck,
  Layers,
  MapPin,
  ShoppingBag,
  PackageX,
  Calendar,
  Clock,
  Receipt,
} from 'lucide-react';
import { usePedidos, useAtualizarStatusPedido } from '@/web/hooks/usePedidos';
import { OrderStatusBadge } from './OrderStatusBadge';
import { useToast } from '@/web/hooks/useToast';
import { UNIDADE_LABELS } from '@/web/data/mock-almoxarifado';
import type { PedidoEnriquecido } from '@/web/app/api/pedidos/route';

export interface VendasViewProps {
  onNovoPedido: () => void;
  onFaturarPedido?: (pedido: PedidoEnriquecido) => void;
}

type FiltroStatusVendas = 'todos' | 'pendente' | 'separado' | 'entregue' | 'atrasado' | 'deficit';

export function VendasView({ onNovoPedido, onFaturarPedido }: VendasViewProps) {
  const { toast } = useToast();
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatusVendas>('todos');
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

  // Contagens por status para os filtros rápidos
  const contagens = useMemo(() => {
    const pendentes = pedidos.filter((p) => p.status === 'PENDENTE').length;
    const separados = pedidos.filter((p) => p.status === 'SEPARADO').length;
    const entregues = pedidos.filter((p) => p.status === 'ENTREGUE').length;
    const atrasados = pedidos.filter((p) => p.atrasado && p.status !== 'ENTREGUE' && p.status !== 'CANCELADO').length;
    const deficit = pedidos.filter((p) => p.faltaEstoque && p.status !== 'ENTREGUE' && p.status !== 'CANCELADO').length;

    return {
      todos: pedidos.length,
      pendentes,
      separados,
      entregues,
      atrasados,
      deficit,
    };
  }, [pedidos]);

  // Pedidos filtrados pela pílula ativa
  const pedidosFiltrados = useMemo(() => {
    if (filtroStatus === 'todos') return pedidos;
    if (filtroStatus === 'pendente') return pedidos.filter((p) => p.status === 'PENDENTE');
    if (filtroStatus === 'separado') return pedidos.filter((p) => p.status === 'SEPARADO');
    if (filtroStatus === 'entregue') return pedidos.filter((p) => p.status === 'ENTREGUE');
    if (filtroStatus === 'atrasado') return pedidos.filter((p) => p.atrasado && p.status !== 'ENTREGUE' && p.status !== 'CANCELADO');
    if (filtroStatus === 'deficit') return pedidos.filter((p) => p.faltaEstoque && p.status !== 'ENTREGUE' && p.status !== 'CANCELADO');
    return pedidos;
  }, [pedidos, filtroStatus]);

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
      } catch (err: unknown) {
        toast((err as Error)?.message || 'Erro ao atualizar pedido.', { type: 'error' });
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
      } catch (err: unknown) {
        const msg = (err as Error)?.message || 'Falha ao entregar pedido.';
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
    <div className="flex-1 flex flex-col min-w-0 animate-fade-in gap-5">
      {/* 1. Cabeçalho da Tela de Vendas no padrão Stitch */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant/20">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-normal text-on-surface">
            Pedidos de Venda &amp; Clientes
          </h1>
          <p className="text-xs text-secondary mt-0.5 font-normal">
            Gestão de pedidos a entregar, verificação de matéria-prima e baixa automática de estoque.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <button
            type="button"
            onClick={onNovoPedido}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-on-primary bg-primary hover:bg-primary/90 transition-colors cursor-pointer shadow-xs"
            title="Criar novo pedido de venda"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Pedido</span>
          </button>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isLoading || isFetching}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-medium text-secondary hover:text-on-surface bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 transition-colors cursor-pointer disabled:opacity-50"
            title="Atualizar lista de pedidos"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </header>

      {/* 2. Grid de 4 Cards de KPIs de Vendas (Stitch Screen 2) */}
      <section
        aria-label="Indicadores operacionais de vendas"
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
      >
        {/* Card 1: Pedidos em Aberto */}
        <div className="relative overflow-hidden rounded-xl bg-surface-container-lowest p-4 border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
          <div className="flex items-start justify-between">
            <div>
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-semibold">
                Pedidos em Aberto
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-kpi-value text-3xl font-extrabold text-on-surface tabular-nums">
                  {isLoading ? '—' : pedidosAEntregar}
                </span>
                <span className="font-label-md text-label-md text-secondary">
                  a entregar
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-outline-variant/20 flex items-center justify-between text-xs text-secondary">
            <span>{contagens.pendentes} pendentes</span>
            <span className="text-tertiary font-semibold">{contagens.separados} prontos</span>
          </div>
        </div>

        {/* Card 2: Fora do Prazo / SLA */}
        <div className="relative overflow-hidden rounded-xl bg-surface-container-lowest p-4 border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-error" />
          <div className="flex items-start justify-between">
            <div>
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-error font-semibold">
                Fora do Prazo / SLA
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-kpi-value text-3xl font-extrabold text-error tabular-nums">
                  {isLoading ? '—' : pedidosAtrasados}
                </span>
                <span className="font-label-md text-label-md text-error/80">
                  {pedidosAtrasados === 1 ? 'atrasado' : 'atrasados'}
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-error-container flex items-center justify-center text-error shrink-0">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-outline-variant/20 flex items-center justify-between text-xs">
            <span className="text-error font-semibold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Urgência Alta
            </span>
            <span className="text-secondary">Prazo excedido</span>
          </div>
        </div>

        {/* Card 3: Bloqueio por Estoque / Déficit */}
        <div className="relative overflow-hidden rounded-xl bg-surface-container-lowest p-4 border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          <div className="flex items-start justify-between">
            <div>
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-semibold">
                Bloqueio p/ Estoque
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-kpi-value text-3xl font-extrabold text-amber-600 dark:text-amber-400 tabular-nums">
                  {isLoading ? '—' : pedidosSemEstoque}
                </span>
                <span className="font-label-md text-label-md text-secondary">
                  com déficit
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <PackageX className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-outline-variant/20 flex items-center justify-between text-xs text-secondary">
            <span>Falta matéria-prima</span>
            <span className="text-amber-700 dark:text-amber-300 font-medium">Aguardando compras</span>
          </div>
        </div>

        {/* Card 4: Faturados / Concluídos */}
        <div className="relative overflow-hidden rounded-xl bg-surface-container-lowest p-4 border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-tertiary" />
          <div className="flex items-start justify-between">
            <div>
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-semibold">
                Entregas Concluídas
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-kpi-value text-3xl font-extrabold text-tertiary tabular-nums">
                  {contagens.entregues.toLocaleString('pt-BR')}
                </span>
                <span className="font-label-md text-label-md text-secondary">
                  expedições
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-tertiary/10 flex items-center justify-center text-tertiary shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-outline-variant/20 flex items-center justify-between text-xs text-secondary">
            <span className="text-tertiary font-semibold flex items-center gap-1">
              Baixa almoxarifado OK
            </span>
            <span className="font-mono">100% integradas</span>
          </div>
        </div>
      </section>

      {/* Alerta de Estoque Insuficiente Inline */}
      {alertaEstoque && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-error-container text-on-error-container text-xs font-semibold flex items-center justify-between gap-3 shadow-xs animate-in fade-in"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-error" />
            <span>{alertaEstoque}</span>
          </div>
          <button
            type="button"
            onClick={() => setAlertaEstoque(null)}
            className="p-1 rounded-md hover:bg-black/10 cursor-pointer"
            aria-label="Fechar alerta"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. Barra de Busca e Pílulas Rápidas de Status (Stitch Screen 2) */}
      <section className="rounded-xl bg-surface-container-lowest p-3 border border-outline-variant/30 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Campo de Busca Rápida */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline pointer-events-none" />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setBusca('');
            }}
            placeholder="Buscar por #pedido, cliente, item ou SKU..."
            className="w-full pl-9 pr-10 py-2 text-xs rounded-lg border border-outline-variant/20 bg-surface-container-low text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest focus:border-primary/50 transition-colors shadow-2xs"
          />
          {busca && (
            <button
              type="button"
              onClick={() => setBusca('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-outline hover:text-on-surface hover:bg-surface-container cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Pílulas de Filtro de Situação */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0" role="group" aria-label="Filtro de pedidos">
          <button
            type="button"
            onClick={() => setFiltroStatus('todos')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              filtroStatus === 'todos'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'bg-surface-container-low hover:bg-surface-container text-secondary hover:text-on-surface'
            }`}
          >
            Todos ({contagens.todos})
          </button>

          <button
            type="button"
            onClick={() => setFiltroStatus('pendente')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              filtroStatus === 'pendente'
                ? 'bg-primary-container text-on-primary-container shadow-xs'
                : 'bg-surface-container-low hover:bg-surface-container text-secondary hover:text-on-surface'
            }`}
          >
            Pendente Separação ({contagens.pendentes})
          </button>

          <button
            type="button"
            onClick={() => setFiltroStatus('separado')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              filtroStatus === 'separado'
                ? 'bg-tertiary text-on-tertiary shadow-xs'
                : 'bg-surface-container-low hover:bg-surface-container text-secondary hover:text-on-surface'
            }`}
          >
            Pronto p/ Expedição ({contagens.separados})
          </button>

          <button
            type="button"
            onClick={() => setFiltroStatus('entregue')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              filtroStatus === 'entregue'
                ? 'bg-surface-container-high text-on-surface shadow-xs'
                : 'bg-surface-container-low hover:bg-surface-container text-secondary hover:text-on-surface'
            }`}
          >
            Entregues ({contagens.entregues})
          </button>

          {contagens.atrasados > 0 && (
            <button
              type="button"
              onClick={() => setFiltroStatus('atrasado')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                filtroStatus === 'atrasado'
                  ? 'bg-error text-on-primary shadow-xs'
                  : 'bg-error-container text-on-error-container'
              }`}
            >
              <span>Atrasados</span>
              <span className="font-mono">({contagens.atrasados})</span>
            </button>
          )}

          {contagens.deficit > 0 && (
            <button
              type="button"
              onClick={() => setFiltroStatus('deficit')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                filtroStatus === 'deficit'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
              }`}
            >
              <span>Com Déficit</span>
              <span className="font-mono">({contagens.deficit})</span>
            </button>
          )}
        </div>

        {/* Contador Tabular */}
        <div className="flex items-center gap-1 text-xs text-secondary shrink-0 font-medium self-end lg:self-center">
          <span>Exibindo:</span>
          <span className="font-data-tabular font-bold text-on-surface px-2 py-0.5 rounded-md bg-surface-container">
            {pedidosFiltrados.length} {pedidosFiltrados.length === 1 ? 'pedido' : 'pedidos'}
          </span>
        </div>
      </section>

      {/* 4. Tabela de Pedidos de Alta Densidade (Stitch Screen 2) */}
      <section className="w-full bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[840px] text-xs">
            <thead>
              <tr className="border-b border-outline-variant/20 bg-surface-container-low text-secondary font-label-sm uppercase tracking-wider select-none">
                <th className="py-3 px-4 whitespace-nowrap">Pedido &amp; Emissão</th>
                <th className="py-3 px-4">Cliente &amp; Destino</th>
                <th className="py-3 px-4">Itens Solicitados (Almoxarifado)</th>
                <th className="py-3 px-4 whitespace-nowrap">Situação do Estoque</th>
                <th className="py-3 px-4 whitespace-nowrap">Prazo SLA</th>
                <th className="py-3 px-4 whitespace-nowrap">Valor Total</th>
                <th className="py-3 px-4 whitespace-nowrap">Status Geral</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Ações Operacionais</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/15 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-secondary">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                    <span>Carregando pedidos de venda...</span>
                  </td>
                </tr>
              ) : pedidosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-secondary">
                    Nenhum pedido encontrado para o critério de busca ou filtro selecionado.
                  </td>
                </tr>
              ) : (
                pedidosFiltrados.map((pedido) => {
                  const isEntregue = pedido.status === 'ENTREGUE';
                  const isPendente = pedido.status === 'PENDENTE';
                  const isSeparado = pedido.status === 'SEPARADO';
                  const isMutating =
                    atualizarStatusMutation.isPending &&
                    atualizarStatusMutation.variables?.id === pedido.id;

                  return (
                    <tr
                      key={pedido.id}
                      className="hover:bg-surface-container-low/60 transition-colors group"
                    >
                      {/* Pedido #ID & Data */}
                      <td className="py-3.5 px-4 align-top whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-headline-sm font-bold text-primary font-mono text-xs">
                            #{pedido.numeroSequencial || pedido.id}
                          </span>
                          <span className="font-label-sm text-[11px] text-secondary mt-0.5">
                            {pedido.createdAt ? formatarDataBR(pedido.createdAt.slice(0, 10)) : 'Hoje'}
                          </span>
                          {pedido.atrasado && !isEntregue && (
                            <span className="mt-1 inline-flex items-center gap-1 font-label-sm text-[10px] text-error font-bold">
                              <AlertTriangle className="w-3 h-3" /> Prioridade Alta
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Cliente & Destino */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="flex flex-col max-w-xs">
                          <span className="font-headline-sm font-semibold text-xs text-on-surface group-hover:text-primary transition-colors truncate">
                            {pedido.clienteNome}
                          </span>
                          <div className="flex items-center gap-1 text-secondary text-[11px] mt-0.5">
                            <MapPin className="w-3 h-3 text-outline shrink-0" />
                            <span className="truncate">Expedição Geral / Doca 01</span>
                          </div>
                        </div>
                      </td>

                      {/* Lista de Itens Solicitados com Alerta de Déficit */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="flex flex-col gap-1 max-w-sm">
                          <span className="font-semibold text-on-surface text-xs font-data-tabular">
                            {pedido.itensDetalhes.length} {pedido.itensDetalhes.length === 1 ? 'item solicitado' : 'itens solicitados'}
                          </span>
                          <div className="space-y-1">
                            {pedido.itensDetalhes.map((it, idx) => {
                              const unidadeFmt =
                                UNIDADE_LABELS[it.unidade as keyof typeof UNIDADE_LABELS] ||
                                it.unidade.toLowerCase();
                              const semSaldoItem = it.estoqueAtual < it.quantidade;

                              return (
                                <div
                                  key={idx}
                                  className={`text-[11px] leading-snug flex items-baseline gap-1.5 ${
                                    semSaldoItem && !isEntregue
                                      ? 'text-error font-semibold'
                                      : 'text-secondary'
                                  }`}
                                >
                                  <span className="font-mono font-bold font-data-tabular">
                                    {it.quantidade.toLocaleString('pt-BR')} {unidadeFmt}
                                  </span>
                                  <span className="text-outline">·</span>
                                  <span className="truncate">{it.nome}</span>
                                  {semSaldoItem && !isEntregue && (
                                    <span className="text-[10px] text-error font-bold font-mono bg-error-container text-on-error-container px-1 rounded shrink-0">
                                      Falta: {(it.quantidade - it.estoqueAtual).toLocaleString('pt-BR')}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </td>

                      {/* Situação do Estoque */}
                      <td className="py-3.5 px-4 align-top whitespace-nowrap">
                        {pedido.faltaEstoque && !isEntregue ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-error-container text-on-error-container">
                              <span className="w-1.5 h-1.5 rounded-full bg-error" />
                              Falta Matéria-prima
                            </span>
                            <span className="text-[10px] text-secondary">
                              Requer compra / reposição
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-tertiary/15 text-tertiary">
                              <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
                              Estoque Disponível
                            </span>
                            <span className="text-[10px] text-secondary">
                              Disponível no almoxarifado
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Prazo SLA */}
                      <td className="py-3.5 px-4 align-top whitespace-nowrap">
                        <div className="flex flex-col">
                          <span
                            className={`font-mono text-xs font-semibold flex items-center gap-1 ${
                              pedido.atrasado && !isEntregue
                                ? 'text-error'
                                : 'text-on-surface'
                            }`}
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            {formatarDataBR(pedido.prazoEntrega)}
                          </span>
                          <span
                            className={`text-[10px] font-medium mt-0.5 ${
                              pedido.atrasado && !isEntregue
                                ? 'text-error font-bold'
                                : 'text-secondary'
                            }`}
                          >
                            {pedido.atrasado && !isEntregue
                              ? 'Prazo Excedido'
                              : 'No prazo programado'}
                          </span>
                        </div>
                      </td>

                      {/* Valor Total da Venda em R$ */}
                      <td className="py-3.5 px-4 align-top whitespace-nowrap font-mono font-bold text-on-surface text-xs">
                        {(pedido.valorTotal || 0).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </td>

                      {/* Status Geral com Badges e Informação de Faturamento */}
                      <td className="py-3.5 px-4 align-top whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <OrderStatusBadge
                            status={pedido.status}
                            atrasado={pedido.atrasado}
                            faltaEstoque={pedido.faltaEstoque}
                          />
                          {pedido.faturamento ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-tertiary/15 text-tertiary">
                              <Receipt className="w-3 h-3" />
                              Faturado · NF {pedido.faturamento.numeroNFe}
                            </span>
                          ) : (isSeparado || isEntregue) ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/15 text-primary">
                              A faturar
                            </span>
                          ) : null}
                        </div>
                      </td>

                      {/* Ações Operacionais de Linha */}
                      <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isEntregue && (
                            <button
                              type="button"
                              onClick={() => handleAvancarStatus(pedido)}
                              disabled={isMutating}
                              className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 shadow-2xs ${
                                isPendente
                                  ? 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
                                  : 'bg-primary text-on-primary hover:bg-primary/90'
                              }`}
                              title={
                                isPendente
                                  ? 'Avançar status para Separado'
                                  : 'Entregar pedido e realizar baixa automática de materiais'
                              }
                            >
                              {isMutating ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : isPendente ? (
                                <PackageCheck className="w-3.5 h-3.5 text-secondary" />
                              ) : (
                                <Truck className="w-3.5 h-3.5" />
                              )}
                              <span>{isPendente ? 'Marcar Separado' : 'Entregar & Baixar'}</span>
                            </button>
                          )}

                          {/* Ação de Faturamento quando apto */}
                          {(isSeparado || isEntregue) && !pedido.faturamento && onFaturarPedido && (
                            <button
                              type="button"
                              onClick={() => onFaturarPedido(pedido)}
                              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-800 dark:text-amber-300 hover:bg-amber-500/25 transition-colors cursor-pointer"
                              title="Emitir Nota Fiscal para este pedido"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              <span>Faturar</span>
                            </button>
                          )}

                          {isEntregue && pedido.faturamento && (
                            <span className="inline-flex items-center gap-1 text-xs text-tertiary font-semibold px-2 py-1 rounded-md bg-tertiary/10">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Concluído</span>
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
