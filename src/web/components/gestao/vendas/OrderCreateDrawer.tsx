'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, AlertTriangle, Loader2, Package, ShoppingCart, Trash2, X } from 'lucide-react';
import { CATEGORIA_ESTOQUE_LABELS } from '@/core/domain/categoria-estoque';
import {
  SETOR_DESTINO_PADRAO,
  SetorDestinoSchema,
  calcularTotalPedido,
} from '@/core/domain/pedido.schema';
import { avaliarSaldoLinha } from '@/core/services/busca-itens-pedido';
import { CATALOGO_SETORES_DESTINO } from '@/web/data/setores-destino';
import { useClientes } from '@/web/hooks/useClientes';
import type { ItemCatalogoPedido } from '@/web/hooks/useBuscaItensPedido';
import { useCriarPedido } from '@/web/hooks/usePedidos';
import { useToast } from '@/web/hooks/useToast';
import { AdicionarMaterialPanel, formatarQuantidade, unidadeCurta } from './AdicionarMaterialPanel';
import { QuantidadeStepper, aceitaFracao } from './QuantidadeStepper';

export interface OrderCreateDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated?: () => void;
}

interface LinhaPedido {
  item: ItemCatalogoPedido;
  quantidade: number;
  precoUnitario: number;
}

/** Valor do select que libera a digitação de um destino fora do catálogo. */
const SETOR_OUTRO = '__OUTRO__';

const CAMPO =
  'w-full h-9 px-3 text-xs rounded-md border border-outline-variant/40 bg-surface-container-lowest text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary';

function dataAmanhaISO(): string {
  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);
  const offset = amanha.getTimezoneOffset() * 60000;
  return new Date(amanha.getTime() - offset).toISOString().slice(0, 10);
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function OrderCreateDrawer({ isOpen, onClose, onOrderCreated }: OrderCreateDrawerProps) {
  const { toast } = useToast();
  const { clientes, isLoading: isLoadingClientes } = useClientes({ apenasAtivos: true });
  const criarPedidoMutation = useCriarPedido();

  const [clienteId, setClienteId] = useState('');
  const [prazoEntrega, setPrazoEntrega] = useState('');
  const [setorSelecionado, setSetorSelecionado] = useState<string>(SETOR_DESTINO_PADRAO);
  const [setorOutro, setSetorOutro] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [linhas, setLinhas] = useState<LinhaPedido[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Cada abertura começa um pedido limpo.
  useEffect(() => {
    if (!isOpen) return;
    setPrazoEntrega(dataAmanhaISO());
    setSetorSelecionado(SETOR_DESTINO_PADRAO);
    setSetorOutro('');
    setObservacoes('');
    setLinhas([]);
    setErro(null);
  }, [isOpen]);

  // Pré-seleciona o primeiro cliente quando a lista carrega.
  useEffect(() => {
    if (clientes.length > 0 && !clienteId) {
      const primeiroCliente = clientes.find((c) => c.tipo === 'CLIENTE') || clientes[0];
      setClienteId(primeiroCliente.id);
    }
  }, [clientes, clienteId]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    const foco = setTimeout(() => closeButtonRef.current?.focus(), 50);
    return () => {
      clearTimeout(foco);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const slaInfo = useMemo(() => {
    if (!prazoEntrega) return null;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const data = new Date(prazoEntrega + 'T00:00:00');
    const diffDias = Math.ceil((data.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDias < 0) return { texto: `${Math.abs(diffDias)}d em atraso`, classe: 'text-error' };
    if (diffDias === 0) return { texto: 'Entrega hoje', classe: 'text-amber-700 dark:text-amber-400' };
    if (diffDias === 1) return { texto: 'Em 24h', classe: 'text-on-surface-variant' };
    return { texto: `Em ${diffDias} dias`, classe: 'text-on-surface-variant' };
  }, [prazoEntrega]);

  const quantidadeNoPedido = useMemo(
    () => new Map(linhas.map((l) => [l.item.id, l.quantidade])),
    [linhas]
  );

  const totalizadores = useMemo(() => {
    const linhasComDeficit = linhas.filter(
      (l) => avaliarSaldoLinha(l.quantidade, l.item.estoqueAtual).excede
    ).length;
    return {
      valorTotal: calcularTotalPedido(linhas),
      linhasComDeficit,
    };
  }, [linhas]);

  const handleAdicionar = (item: ItemCatalogoPedido) => {
    setLinhas((prev) => {
      const existente = prev.find((l) => l.item.id === item.id);
      if (existente) {
        return prev.map((l) => (l.item.id === item.id ? { ...l, quantidade: l.quantidade + 1 } : l));
      }
      return [...prev, { item, quantidade: 1, precoUnitario: 0 }];
    });
    setErro(null);
  };

  const atualizarLinha = (itemId: string, patch: Partial<Omit<LinhaPedido, 'item'>>) => {
    setLinhas((prev) => prev.map((l) => (l.item.id === itemId ? { ...l, ...patch } : l)));
  };

  const removerLinha = (itemId: string) => {
    setLinhas((prev) => prev.filter((l) => l.item.id !== itemId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (!clienteId) {
      setErro('Cadastre ou selecione um cliente antes de criar o pedido.');
      return;
    }
    if (!prazoEntrega) {
      setErro('Informe uma data de entrega válida.');
      return;
    }

    const setor = SetorDestinoSchema.safeParse(
      setorSelecionado === SETOR_OUTRO ? setorOutro : setorSelecionado
    );
    if (!setor.success) {
      setErro('Informe o setor de destino do pedido.');
      return;
    }

    if (linhas.length === 0) {
      setErro('Adicione pelo menos um material ao pedido.');
      return;
    }

    try {
      await criarPedidoMutation.mutateAsync({
        clienteId,
        prazoEntrega,
        setorDestino: setor.data,
        status: 'PENDENTE',
        itens: linhas.map((l) => ({
          itemId: l.item.id,
          quantidade: l.quantidade,
          precoUnitario: l.precoUnitario || 0,
        })),
        observacoes: observacoes.trim() || undefined,
      });

      toast('Pedido de venda criado.', { type: 'success' });
      onOrderCreated?.();
      onClose();
    } catch (err: unknown) {
      setErro((err as { message?: string })?.message || 'Falha ao salvar pedido. Tente novamente.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="fixed inset-0 bg-inverse-surface/60 transition-opacity duration-200 animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="pedido-novo-titulo"
        className="relative w-full max-w-2xl bg-surface-container-lowest border-l border-outline-variant/30 flex flex-col h-full z-10 animate-in slide-in-from-right duration-250"
      >
        {/* Cabeçalho */}
        <div className="px-6 py-4 border-b border-outline-variant/20 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-primary text-on-primary flex items-center justify-center shrink-0">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <div>
              <h2 id="pedido-novo-titulo" className="font-headline text-base font-bold text-on-surface leading-tight">
                Novo pedido de venda
              </h2>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Escolha os materiais com saldo e o destino da entrega.
              </p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar painel"
            className="p-1.5 rounded-md text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
            {erro && (
              <div
                role="alert"
                className="p-3 rounded-md bg-error-container/40 border border-error/20 text-error text-xs flex items-center gap-2.5"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{erro}</span>
              </div>
            )}

            {/* 1. Cliente e destino */}
            <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
              <legend className="text-xs font-semibold text-on-surface mb-2">Cliente e destino</legend>

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label htmlFor="pedido-cliente" className="text-xs font-medium text-on-surface-variant">
                  Cliente <span className="text-error">*</span>
                </label>
                <select
                  id="pedido-cliente"
                  value={clienteId}
                  onChange={(e) => setClienteId(e.target.value)}
                  disabled={isLoadingClientes}
                  required
                  className={`${CAMPO} cursor-pointer`}
                >
                  {isLoadingClientes ? (
                    <option value="">Carregando clientes…</option>
                  ) : clientes.length === 0 ? (
                    <option value="">Nenhum cliente cadastrado</option>
                  ) : (
                    clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                        {c.cidade ? ` (${c.cidade})` : ''}
                        {c.documento ? ` · ${c.documento}` : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="pedido-setor" className="text-xs font-medium text-on-surface-variant">
                  Setor de destino <span className="text-error">*</span>
                </label>
                <select
                  id="pedido-setor"
                  value={setorSelecionado}
                  onChange={(e) => setSetorSelecionado(e.target.value)}
                  className={`${CAMPO} cursor-pointer`}
                >
                  {CATALOGO_SETORES_DESTINO.map((s) => (
                    <option key={s.codigo} value={s.codigo}>
                      {s.rotulo}
                    </option>
                  ))}
                  <option value={SETOR_OUTRO}>Outro destino…</option>
                </select>
                {setorSelecionado === SETOR_OUTRO && (
                  <input
                    type="text"
                    aria-label="Nome do outro destino"
                    value={setorOutro}
                    onChange={(e) => setSetorOutro(e.target.value)}
                    placeholder="Ex.: Pintura, Filial Sul"
                    maxLength={40}
                    autoFocus
                    className={CAMPO}
                  />
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="pedido-prazo" className="text-xs font-medium text-on-surface-variant">
                    Entrega desejada <span className="text-error">*</span>
                  </label>
                  {slaInfo && <span className={`text-[11px] font-medium ${slaInfo.classe}`}>{slaInfo.texto}</span>}
                </div>
                <input
                  id="pedido-prazo"
                  type="date"
                  value={prazoEntrega}
                  onChange={(e) => setPrazoEntrega(e.target.value)}
                  required
                  className={`${CAMPO} tabular-nums`}
                />
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label htmlFor="pedido-obs" className="text-xs font-medium text-on-surface-variant">
                  Instruções de expedição (opcional)
                </label>
                <input
                  id="pedido-obs"
                  type="text"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Ex.: despacho prioritário, aguardar caminhão"
                  className={CAMPO}
                />
              </div>
            </fieldset>

            {/* 2. Busca de materiais */}
            <AdicionarMaterialPanel
              quantidadeNoPedido={quantidadeNoPedido}
              onAdicionar={handleAdicionar}
              enabled={isOpen}
            />

            {/* 3. Itens do pedido */}
            <section aria-labelledby="pedido-itens-titulo" className="flex flex-col gap-2">
              <h3 id="pedido-itens-titulo" className="text-xs font-semibold text-on-surface">
                Itens do pedido{' '}
                <span className="text-on-surface-variant font-normal tabular-nums">({linhas.length})</span>
              </h3>

              {linhas.length === 0 ? (
                <div className="px-4 py-6 rounded-md border border-dashed border-outline-variant/40 text-center text-xs text-on-surface-variant flex flex-col items-center gap-1.5">
                  <Package className="w-5 h-5 text-outline" />
                  Busque um material acima e clique nele (ou pressione Enter) para adicionar.
                </div>
              ) : (
                <ul className="rounded-md border border-outline-variant/30 divide-y divide-outline-variant/20">
                  {linhas.map((linha) => {
                    const { item } = linha;
                    const unidade = unidadeCurta(item.unidade);
                    const saldo = avaliarSaldoLinha(linha.quantidade, item.estoqueAtual);

                    return (
                      <li
                        key={item.id}
                        className={`px-3 py-2.5 flex flex-col gap-2 ${saldo.excede ? 'bg-amber-50/60 dark:bg-amber-950/20' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono text-[11px] text-on-surface-variant shrink-0">
                                {item.codigo || '—'}
                              </span>
                              <span className="text-xs font-medium text-on-surface truncate">{item.descricao}</span>
                            </div>
                            <span className="text-[11px] text-on-surface-variant">
                              {CATEGORIA_ESTOQUE_LABELS[item.categoria]} · Saldo{' '}
                              <span className="tabular-nums">
                                {formatarQuantidade(item.estoqueAtual)} {unidade}
                              </span>
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removerLinha(item.id)}
                            aria-label={`Remover ${item.descricao} do pedido`}
                            className="p-1.5 rounded-md text-outline hover:text-error hover:bg-surface-container transition-colors cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                          <div className="flex items-center gap-1.5">
                            <QuantidadeStepper
                              valor={linha.quantidade}
                              unidade={item.unidade}
                              rotulo={`Quantidade de ${item.descricao}`}
                              invalido={saldo.excede}
                              onChange={(quantidade) => atualizarLinha(item.id, { quantidade })}
                            />
                            <span className="text-xs text-on-surface-variant">{unidade}</span>
                          </div>

                          <label className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                            Preço un.
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              inputMode="decimal"
                              value={linha.precoUnitario || ''}
                              placeholder="0,00"
                              onChange={(e) =>
                                atualizarLinha(item.id, {
                                  precoUnitario: Math.max(0, parseFloat(e.target.value) || 0),
                                })
                              }
                              className="w-24 h-8 px-2 text-xs rounded-md border border-outline-variant/40 bg-surface-container-lowest text-on-surface tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            />
                          </label>

                          <span className="ml-auto text-xs font-semibold text-on-surface tabular-nums">
                            {formatarMoeda(linha.quantidade * (linha.precoUnitario || 0))}
                          </span>
                        </div>

                        {saldo.excede && (
                          <div
                            role="status"
                            className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-amber-800 dark:text-amber-300"
                          >
                            <span className="inline-flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              Excede o saldo em{' '}
                              <strong className="tabular-nums">
                                {formatarQuantidade(saldo.deficit)} {unidade}
                              </strong>
                            </span>
                            {item.estoqueAtual > 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  atualizarLinha(item.id, {
                                    quantidade: aceitaFracao(item.unidade)
                                      ? item.estoqueAtual
                                      : Math.max(1, Math.floor(item.estoqueAtual)),
                                  })
                                }
                                className="font-semibold underline underline-offset-2 hover:no-underline cursor-pointer"
                              >
                                Ajustar para {formatarQuantidade(item.estoqueAtual)} {unidade}
                              </button>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>

          {/* Rodapé */}
          <div className="px-6 py-4 border-t border-outline-variant/20 bg-surface-container-lowest flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-on-surface">
                <span className="tabular-nums">{linhas.length}</span> {linhas.length === 1 ? 'item' : 'itens'} ·{' '}
                <strong className="tabular-nums">{formatarMoeda(totalizadores.valorTotal)}</strong>
              </span>
              {totalizadores.linhasComDeficit > 0 && (
                <span className="text-[11px] text-amber-800 dark:text-amber-300 inline-flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {totalizadores.linhasComDeficit === 1
                    ? '1 item acima do saldo: o pedido ficará com falta de estoque.'
                    : `${totalizadores.linhasComDeficit} itens acima do saldo: o pedido ficará com falta de estoque.`}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={onClose}
                disabled={criarPedidoMutation.isPending}
                className="h-9 px-4 rounded-md text-xs font-medium text-on-surface hover:bg-surface-container border border-outline-variant/40 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={criarPedidoMutation.isPending || linhas.length === 0}
                className="h-9 px-4 rounded-md text-xs font-semibold bg-primary hover:bg-primary/90 text-on-primary transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {criarPedidoMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Salvando…
                  </>
                ) : (
                  'Salvar pedido'
                )}
              </button>
            </div>
          </div>
        </form>
      </aside>
    </div>
  );
}
