'use client';

import React, { useState } from 'react';
import {
  FileText,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Building2,
  Calendar,
  Receipt,
  ArrowRight,
  Ban,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { useFaturamento } from '@/web/hooks/useFaturamento';
import { FaturarPedidoDrawer } from './FaturarPedidoDrawer';
import type { PedidoAFaturarItem, NotaFiscalEmitidaEnriquecida } from '@/web/app/api/faturamento/route';
import { api } from '@/core/api/client';
import { useToast } from '@/web/hooks/useToast';

export interface FaturamentoViewProps {
  onNavegarPedidos?: () => void;
}

export function FaturamentoView({ onNavegarPedidos }: FaturamentoViewProps) {
  const { toast } = useToast();
  const {
    pedidosAFaturar,
    notasEmitidas,
    kpis,
    isLoading,
    isFetching,
    refetch,
    faturarPedido,
  } = useFaturamento();

  const [pedidoSelecionadoParaFaturar, setPedidoSelecionadoParaFaturar] =
    useState<PedidoAFaturarItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [buscaNota, setBuscaNota] = useState('');

  const formatarDataBR = (dataIso?: string) => {
    if (!dataIso) return '—';
    const partes = dataIso.split('T')[0].split('-');
    if (partes.length !== 3) return dataIso;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  };

  const formatarBRL = (valor: number) => {
    return (valor || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const handleAbrirFaturamento = (pedido: PedidoAFaturarItem) => {
    setPedidoSelecionadoParaFaturar(pedido);
    setIsDrawerOpen(true);
  };

  const handleConfirmarFaturamento = async (dados: {
    pedidoId: string;
    numeroNF: string;
    serie: string;
    dataEmissao: string;
    dataVencimento?: string;
    observacoes?: string;
  }) => {
    await faturarPedido(dados);
  };

  const [notaParaCancelar, setNotaParaCancelar] =
    useState<NotaFiscalEmitidaEnriquecida | null>(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  const [isCancelandoNota, setIsCancelandoNota] = useState(false);

  const handleConfirmarCancelamento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notaParaCancelar) return;

    if (!motivoCancelamento.trim()) {
      toast('Informe o motivo do cancelamento da nota fiscal.', { type: 'error' });
      return;
    }

    try {
      setIsCancelandoNota(true);
      await api.post(`/faturamento/notas/${notaParaCancelar.id}/cancelar`, {
        motivo: motivoCancelamento.trim(),
      });
      toast(`NF-e nº ${notaParaCancelar.numeroNF} cancelada com sucesso! Pedido liberado.`, { type: 'success' });
      setNotaParaCancelar(null);
      setMotivoCancelamento('');
      refetch();
    } catch (err: unknown) {
      const responseData = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data;
      const msg =
        responseData?.error ||
        responseData?.message ||
        (err as Error)?.message ||
        'Erro ao cancelar nota fiscal.';
      toast(msg, { type: 'error' });
    } finally {
      setIsCancelandoNota(false);
    }
  };

  // Filtragem de notas fiscais emitidas
  const notasFiltradas = notasEmitidas.filter((n) => {
    if (!buscaNota.trim()) return true;
    const t = buscaNota.toLowerCase();
    return (
      n.numeroNF.toLowerCase().includes(t) ||
      n.clienteNome.toLowerCase().includes(t) ||
      n.referencia.toLowerCase().includes(t) ||
      n.tipo.toLowerCase().includes(t)
    );
  });

  return (
    <div className="flex-1 flex flex-col gap-6 w-full animate-fade-in">
      {/* 1. Cabeçalho Executivo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/20 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-headline text-2xl font-bold text-on-surface tracking-tight">
              Faturamento &amp; Notas Fiscais
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              Fiscal &amp; Comercial
            </span>
          </div>
          <p className="text-xs text-secondary mt-1">
            Emita a nota de venda dos pedidos separados ou entregues e acompanhe tudo o que já foi faturado.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isLoading || isFetching}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium text-secondary hover:text-on-surface bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 transition-colors cursor-pointer disabled:opacity-50"
            title="Atualizar dados de faturamento"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* 2. Cards de Métricas Operacionais (KPIs) */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4" aria-label="Métricas de faturamento">
        {/* Card 1: Pedidos a Faturar */}
        <div className="relative overflow-hidden rounded-xl bg-surface-container-lowest p-4 border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          <div className="flex items-start justify-between">
            <div>
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-semibold">
                Pedidos a Faturar
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-kpi-value text-3xl font-extrabold text-amber-600 dark:text-amber-400 tabular-nums">
                  {isLoading ? '—' : kpis.totalPedidosAFaturar}
                </span>
                <span className="font-label-md text-label-md text-secondary">
                  pedidos prontos
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-outline-variant/20 flex items-center justify-between text-xs text-secondary">
            <span>Montante a faturar:</span>
            <strong className="text-on-surface font-mono font-semibold">
              {formatarBRL(kpis.valorPedidosAFaturar)}
            </strong>
          </div>
        </div>

        {/* Card 2: Notas Emitidas */}
        <div className="relative overflow-hidden rounded-xl bg-surface-container-lowest p-4 border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
          <div className="flex items-start justify-between">
            <div>
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-semibold">
                Notas Emitidas
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-kpi-value text-3xl font-extrabold text-primary tabular-nums">
                  {isLoading ? '—' : kpis.totalNotasEmitidas}
                </span>
                <span className="font-label-md text-label-md text-secondary">
                  NF-e emitidas
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-outline-variant/20 flex items-center justify-between text-xs text-secondary">
            <span>Vendas &amp; Retornos</span>
          </div>
        </div>

        {/* Card 3: Total Faturado */}
        <div className="relative overflow-hidden rounded-xl bg-surface-container-lowest p-4 border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-tertiary" />
          <div className="flex items-start justify-between">
            <div>
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-semibold">
                Total Faturado
              </span>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-kpi-value text-2xl font-extrabold text-tertiary tabular-nums">
                  {isLoading ? '—' : formatarBRL(kpis.valorTotalFaturado)}
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-tertiary/10 flex items-center justify-center text-tertiary shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-outline-variant/20 flex items-center justify-between text-xs text-secondary">
            <span>Receita mercantil</span>
            <span className="font-medium text-tertiary">Realizada</span>
          </div>
        </div>
      </section>

      {/* 3. Tabela de Pedidos a Faturar */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-headline text-base font-bold text-on-surface">
              Pedidos Aguardando Nota Fiscal
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 text-[11px] font-semibold">
              {pedidosAFaturar.length}
            </span>
          </div>
          {onNavegarPedidos && (
            <button
              type="button"
              onClick={onNavegarPedidos}
              className="text-xs text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>Ver todos os pedidos de venda</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px] text-xs">
              <thead>
                <tr className="border-b border-outline-variant/20 bg-surface-container-low text-secondary font-label-sm uppercase tracking-wider select-none">
                  <th className="py-3 px-4">Pedido</th>
                  <th className="py-3 px-4">Cliente &amp; Destinatário</th>
                  <th className="py-3 px-4">Itens do Pedido</th>
                  <th className="py-3 px-4 whitespace-nowrap">Prazo de Entrega</th>
                  <th className="py-3 px-4 whitespace-nowrap">Valor da Nota</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Ação Fiscal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/15 text-xs">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-secondary">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                      <span>Carregando pedidos a faturar...</span>
                    </td>
                  </tr>
                ) : pedidosAFaturar.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-secondary">
                      Nenhum pedido separado ou entregue aguardando nota fiscal no momento.
                    </td>
                  </tr>
                ) : (
                  pedidosAFaturar.map((pedido) => (
                    <tr
                      key={pedido.id}
                      className="hover:bg-surface-container-low/60 transition-colors group"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-primary">
                        #{pedido.numeroSequencial || pedido.id}
                      </td>
                      <td className="py-3 px-4 font-medium text-on-surface">
                        {pedido.clienteNome}
                      </td>
                      <td className="py-3 px-4 text-secondary text-[11px] truncate max-w-xs font-mono">
                        {pedido.itensResumo || '—'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-on-surface">
                        {formatarDataBR(pedido.prazoEntrega)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-on-surface">
                        {formatarBRL(pedido.valorTotal)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleAbrirFaturamento(pedido)}
                          className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg text-xs font-semibold bg-primary text-on-primary hover:bg-primary/90 transition-all cursor-pointer shadow-2xs active:scale-95"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>Faturar</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 4. Tabela de Notas Fiscais Emitidas */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="font-headline text-base font-bold text-on-surface">
              Notas Fiscais Emitidas
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-[11px] font-semibold">
              {notasEmitidas.length}
            </span>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
            <input
              type="search"
              placeholder="Buscar por NF, cliente ou pedido..."
              value={buscaNota}
              onChange={(e) => setBuscaNota(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-on-surface placeholder:text-outline focus:outline-none focus:ring-1.5 focus:ring-primary transition-all"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[750px] text-xs">
              <thead>
                <tr className="border-b border-outline-variant/20 bg-surface-container-low text-secondary font-label-sm uppercase tracking-wider select-none">
                  <th className="py-3 px-4">NF-e / Série</th>
                  <th className="py-3 px-4 whitespace-nowrap">Emissão</th>
                  <th className="py-3 px-4 whitespace-nowrap">Tipo da Nota</th>
                  <th className="py-3 px-4">Cliente / Destinatário</th>
                  <th className="py-3 px-4">Referência</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Valor Faturado</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/15 text-xs">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-secondary">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                      <span>Carregando notas fiscais...</span>
                    </td>
                  </tr>
                ) : notasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-secondary">
                      Nenhuma nota fiscal emitida encontrada.
                    </td>
                  </tr>
                ) : (
                  notasFiltradas.map((nota) => {
                    const isVenda = nota.tipo === 'VENDA';
                    const isCancelada = (nota as any).status === 'CANCELADA';

                    return (
                      <tr
                        key={nota.id}
                        className={`transition-colors group ${
                          isCancelada ? 'bg-surface-container-low/40 opacity-70' : 'hover:bg-surface-container-low/60'
                        }`}
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-on-surface">
                          NF {nota.numeroNF} / {nota.serie || '1'}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap font-mono text-secondary">
                          {formatarDataBR(nota.dataEmissao)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isCancelada ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-error-container text-on-error-container">
                              <Ban className="w-3 h-3" />
                              CANCELADA
                            </span>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                isVenda
                                  ? 'bg-tertiary/15 text-tertiary'
                                  : 'bg-primary/15 text-primary'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isVenda ? 'bg-tertiary' : 'bg-primary'
                                }`}
                              />
                              {isVenda ? 'Venda de Mercadoria' : 'Retorno de Industrialização'}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-on-surface">
                          {nota.clienteNome}
                        </td>
                        <td className="py-3.5 px-4 text-secondary font-mono text-[11px]">
                          {nota.referencia || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-on-surface whitespace-nowrap">
                          {formatarBRL(nota.valorTotal)}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {!isCancelada && (
                            <button
                              type="button"
                              onClick={() => setNotaParaCancelar(nota)}
                              title="Cancelar esta nota fiscal"
                              className="inline-flex items-center gap-1 h-6 px-2 rounded-md text-[11px] font-medium text-error hover:bg-error-container/40 transition-colors cursor-pointer"
                            >
                              <Ban className="w-3 h-3" />
                              <span>Cancelar</span>
                            </button>
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
      </section>

      {/* 5. Modal / Drawer de Faturamento */}
      <FaturarPedidoDrawer
        isOpen={isDrawerOpen}
        pedido={pedidoSelecionadoParaFaturar}
        onClose={() => {
          setIsDrawerOpen(false);
          setPedidoSelecionadoParaFaturar(null);
        }}
        onFaturar={handleConfirmarFaturamento}
      />

      {/* 6. Modal de Cancelamento de NF-e (3.0) */}
      {notaParaCancelar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-inverse-surface/60"
            onClick={() => setNotaParaCancelar(null)}
          />
          <div className="relative w-full max-w-sm bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-5 z-10 animate-fade-in">
            <div className="flex items-center gap-2.5 text-error mb-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h4 className="font-bold text-sm text-on-surface">Cancelar Nota Fiscal</h4>
            </div>
            <p className="text-xs text-secondary mb-4 leading-relaxed">
              Deseja cancelar a <strong>NF-e nº {notaParaCancelar.numeroNF}</strong> ({notaParaCancelar.clienteNome}) no valor de {formatarBRL(notaParaCancelar.valorTotal)}? O pedido retornará automaticamente para a fila de faturamento.
            </p>

            <form onSubmit={handleConfirmarCancelamento} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-secondary mb-1">
                  Justificativa do Cancelamento <span className="text-error">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={motivoCancelamento}
                  onChange={(e) => setMotivoCancelamento(e.target.value)}
                  placeholder="Ex: Erro nos dados cadastrais, pedido cancelado pelo cliente..."
                  className="w-full p-2.5 rounded-lg border border-outline-variant/40 bg-surface-container-lowest text-xs text-on-surface focus:border-error focus:ring-1 focus:ring-error"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNotaParaCancelar(null)}
                  disabled={isCancelandoNota}
                  className="px-3 py-1.5 text-xs font-semibold text-secondary hover:bg-surface-container rounded-lg cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={isCancelandoNota || !motivoCancelamento.trim()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-on-primary bg-error hover:bg-error/90 rounded-lg disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isCancelandoNota ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Cancelando...</span>
                    </>
                  ) : (
                    <>
                      <Ban className="w-3.5 h-3.5" />
                      <span>Confirmar Cancelamento</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
