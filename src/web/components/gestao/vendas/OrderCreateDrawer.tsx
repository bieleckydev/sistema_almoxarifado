'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  ShoppingCart,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Calendar,
  Package,
  Layers,
  MapPin,
  Clock,
  ArrowRight,
  ShieldCheck,
  Building2,
  Search,
} from 'lucide-react';
import { useClientes } from '@/web/hooks/useClientes';
import { useCriarPedido } from '@/web/hooks/usePedidos';
import { db } from '@/core/services/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useToast } from '@/web/hooks/useToast';
import { UNIDADE_LABELS, type AbaEstoque, METADADOS_ABAS } from '@/web/data/mock-almoxarifado';

export interface OrderCreateDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated?: () => void;
}

interface ItemLinha {
  itemId: string;
  quantidade: number;
  precoUnitario: number;
}

interface CatalogoItemOption {
  id: string;
  codigo: string;
  nome: string;
  aba: AbaEstoque;
  estoqueAtual: number;
  estoqueMinimo: number;
  localizacao?: string;
  unidade: string;
}

export function OrderCreateDrawer({
  isOpen,
  onClose,
  onOrderCreated,
}: OrderCreateDrawerProps) {
  const { toast } = useToast();
  const { clientes, isLoading: isLoadingClientes } = useClientes({ apenasAtivos: true });
  const criarPedidoMutation = useCriarPedido();

  const [clienteId, setClienteId] = useState('');
  const [prazoEntrega, setPrazoEntrega] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [itens, setItens] = useState<ItemLinha[]>([]);
  const [catalogoItens, setCatalogoItens] = useState<CatalogoItemOption[]>([]);
  const [isLoadingCatalogo, setIsLoadingCatalogo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Estado do adicionador dinâmico de produto (Live Lookup)
  const [itemSelecionadoId, setItemSelecionadoId] = useState('');
  const [quantidadeAdicionar, setQuantidadeAdicionar] = useState<number>(1);
  const [precoUnitarioAdicionar, setPrecoUnitarioAdicionar] = useState<number>(0);

  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Carrega catálogo de produtos para seleção
  useEffect(() => {
    if (isOpen) {
      setIsLoadingCatalogo(true);
      getDocs(collection(db, 'items'))
        .then((snapshot) => {
          const list: CatalogoItemOption[] = [];
          snapshot.forEach((d) => {
            const data = d.data();
            let aba: AbaEstoque = 'mp';
            if (data.tipo === 'IMPRODUTIVO_CONSUMIVEL') aba = 'imp';
            else if (data.tipo === 'ACABADO') aba = 'motos';

            list.push({
              id: d.id,
              codigo: String(data.codigo || ''),
              nome: String(data.descricao || data.nome || 'Produto'),
              aba,
              estoqueAtual: Number(data.estoqueAtual) || 0,
              estoqueMinimo: Number(data.estoqueMinimo ?? data.estoqueSeguranca) || 0,
              localizacao: String(data.localizacaoFisica || data.localizacao || ''),
              unidade: String(data.unidade || 'UNIDADE'),
            });
          });
          list.sort((a, b) => a.nome.localeCompare(b.nome));
          setCatalogoItens(list);

          if (list.length > 0) {
            setItemSelecionadoId(list[0].id);
            // Se não houver itens ainda, inicializa com o primeiro
            setItens([{ itemId: list[0].id, quantidade: 1, precoUnitario: 0 }]);
          }
        })
        .catch((err) => console.warn('Erro ao carregar itens para pedido:', err))
        .finally(() => setIsLoadingCatalogo(false));

      // Define data padrão de amanhã
      const amanha = new Date();
      amanha.setDate(amanha.getDate() + 1);
      const offset = amanha.getTimezoneOffset() * 60000;
      setPrazoEntrega(new Date(amanha.getTime() - offset).toISOString().slice(0, 10));
    }
  }, [isOpen]);

  // Se o clienteId estiver vazio e clientes carregarem, seleciona o primeiro cliente
  useEffect(() => {
    if (clientes.length > 0 && !clienteId) {
      const primeiroCliente = clientes.find((c) => c.tipo === 'CLIENTE') || clientes[0];
      setClienteId(primeiroCliente.id);
    }
  }, [clientes, clienteId]);

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
      setTimeout(() => closeButtonRef.current?.focus(), 50);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Item ativo no painel de consulta rápida
  const itemConsulta = useMemo(() => {
    return catalogoItens.find((it) => it.id === itemSelecionadoId) || catalogoItens[0];
  }, [catalogoItens, itemSelecionadoId]);

  // Cálculo de SLA da data de entrega
  const slaInfo = useMemo(() => {
    if (!prazoEntrega) return null;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const data = new Date(prazoEntrega + 'T00:00:00');
    const diffDias = Math.ceil((data.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDias < 0) {
      return { texto: `${Math.abs(diffDias)}d em atraso`, badgeClass: 'bg-error-container text-on-error-container' };
    }
    if (diffDias === 0) {
      return { texto: 'SLA: Hoje (Urgente)', badgeClass: 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300' };
    }
    if (diffDias === 1) {
      return { texto: 'SLA: 24h', badgeClass: 'bg-primary-container/20 text-primary' };
    }
    if (diffDias === 2) {
      return { texto: 'SLA: 48h', badgeClass: 'bg-primary-container/20 text-primary' };
    }
    return { texto: `SLA: ${diffDias} dias`, badgeClass: 'bg-surface-container-high text-on-surface-variant' };
  }, [prazoEntrega]);

  // Cliente selecionado atualmente
  const clienteSelecionado = useMemo(() => {
    return clientes.find((c) => c.id === clienteId);
  }, [clientes, clienteId]);

  // Totalizadores do pedido
  const totalizadores = useMemo(() => {
    const totalLinhas = itens.length;
    let totalUnidades = 0;
    let valorTotal = 0;
    let temDeficit = false;

    for (const linha of itens) {
      totalUnidades += linha.quantidade;
      valorTotal += linha.quantidade * (linha.precoUnitario || 0);
      const it = catalogoItens.find((c) => c.id === linha.itemId);
      if (it && it.estoqueAtual < linha.quantidade) {
        temDeficit = true;
      }
    }

    return { totalLinhas, totalUnidades, valorTotal, temDeficit };
  }, [itens, catalogoItens]);

  // Adicionar item via painel rápido
  const handleAdicionarItemRapido = () => {
    if (!itemConsulta) return;

    const qtd = Math.max(1, quantidadeAdicionar || 1);
    const preco = Math.max(0, Number(precoUnitarioAdicionar) || 0);
    const indexExistente = itens.findIndex((i) => i.itemId === itemConsulta.id);

    if (indexExistente >= 0) {
      // Já existe na lista, incrementa a quantidade e atualiza preço se informado
      setItens((prev) =>
        prev.map((linha, idx) =>
          idx === indexExistente
            ? {
                ...linha,
                quantidade: linha.quantidade + qtd,
                precoUnitario: preco > 0 ? preco : linha.precoUnitario,
              }
            : linha
        )
      );
      toast(`Quantidade atualizada: +${qtd} de ${itemConsulta.nome}`, { type: 'success' });
    } else {
      // Adiciona novo item na lista
      setItens((prev) => [
        ...prev,
        { itemId: itemConsulta.id, quantidade: qtd, precoUnitario: preco },
      ]);
      toast(`Item adicionado ao pedido: ${itemConsulta.nome}`, { type: 'success' });
    }

    setQuantidadeAdicionar(1);
    setPrecoUnitarioAdicionar(0);
  };

  const handleRemoveItem = (index: number) => {
    setItens((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAtualizarQuantidade = (index: number, novaQtd: number) => {
    const qtdValida = Math.max(1, novaQtd);
    setItens((prev) =>
      prev.map((item, i) => (i === index ? { ...item, quantidade: qtdValida } : item))
    );
  };

  const handleAtualizarPreco = (index: number, novoPreco: number) => {
    const precoValido = Math.max(0, novoPreco);
    setItens((prev) =>
      prev.map((item, i) => (i === index ? { ...item, precoUnitario: precoValido } : item))
    );
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

    if (itens.length === 0 || itens.some((i) => !i.itemId)) {
      setErro('Adicione pelo menos um produto à lista do pedido.');
      return;
    }

    if (itens.some((i) => !(i.quantidade > 0))) {
      setErro('As quantidades requisitadas precisam ser maiores que zero.');
      return;
    }

    try {
      await criarPedidoMutation.mutateAsync({
        clienteId,
        prazoEntrega,
        status: 'PENDENTE',
        itens: itens.map((i) => ({
          itemId: i.itemId,
          quantidade: i.quantidade,
          precoUnitario: i.precoUnitario || 0,
          observacao: undefined,
        })),
        valorTotal: totalizadores.valorTotal,
        observacoes: observacoes.trim() || undefined,
      });

      toast('Pedido criado e reserva de insumos registrada!', { type: 'success' });
      onOrderCreated?.();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { message?: string })?.message ||
        'Falha ao salvar pedido. Tente novamente.';
      setErro(msg);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Scrim / Backdrop escurecido */}
      <div
        className="fixed inset-0 bg-inverse-surface/60 transition-opacity duration-200 animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Painel Deslizante Lateral Amplo (WMS Style: max-w-2xl) */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Novo pedido de venda"
        className="relative w-full max-w-2xl bg-surface-container-lowest border-l border-outline-variant/30 flex flex-col h-full z-10 overflow-y-auto animate-in slide-in-from-right duration-250"
      >
        {/* 1. Cabeçalho */}
        <div className="sticky top-0 bg-surface-container-lowest z-20 px-6 py-4 border-b border-outline-variant/20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center shrink-0">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-headline text-lg font-bold text-on-surface leading-tight">
                  Novo Pedido de Venda
                </h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-[11px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                  WMS Sincronizado
                </span>
              </div>
              <p className="text-xs text-on-surface-variant mt-0.5 font-normal">
                Conferência em tempo real de saldo físico, reserva de insumos e prazo de entrega.
              </p>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar painel"
            className="p-1.5 rounded-xl text-outline hover:text-on-surface bg-surface-container hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. Formulário Principal */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6 flex-1">
          {erro && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-error-container/40 border border-error/20 text-error text-xs flex items-center gap-2.5 animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-error" />
              <span>{erro}</span>
            </div>
          )}

          {/* SEÇÃO 1: Cliente & Parâmetros de Entrega */}
          <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-1 border-b border-outline-variant/15">
              <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-primary" />
                1. Cliente Destinatário &amp; Logística
              </span>
              {clienteSelecionado && (
                <span className="text-[11px] font-medium text-tertiary flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Homologado ({clienteSelecionado.tipo})
                </span>
              )}
            </div>

            {/* Dropdown de Cliente com dados visuais */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-on-surface-variant">
                Cliente / Razão Social <span className="text-error">*</span>
              </label>
              <select
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                disabled={isLoadingClientes}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer font-medium"
              >
                {isLoadingClientes ? (
                  <option value="">Carregando parceiros cadastrados...</option>
                ) : clientes.length === 0 ? (
                  <option value="">Nenhum cliente cadastrado no sistema</option>
                ) : (
                  clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} {c.cidade ? `(${c.cidade})` : ''} {c.documento ? `· ${c.documento}` : ''}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Linha de Data Desejada com Badge de SLA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-on-surface-variant">
                    Data de Entrega Desejada <span className="text-error">*</span>
                  </label>
                  {slaInfo && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${slaInfo.badgeClass}`}>
                      {slaInfo.texto}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="date"
                    value={prazoEntrega}
                    onChange={(e) => setPrazoEntrega(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-on-surface-variant">
                  Instruções de Expedição (Opcional)
                </label>
                <input
                  type="text"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Ex: Despacho prioritário filial, aguardar caminhão"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: Consulta Rápida de SKU & Saldo Instantâneo (Stitch Live Lookup) */}
          <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-primary" />
                2. Consulta Rápida de SKU / Saldo Instantâneo
              </span>
              {itemConsulta && itemConsulta.estoqueAtual <= itemConsulta.estoqueMinimo && (
                <span className="text-[11px] font-semibold text-error flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse"></span>
                  Alerta: Nível Crítico no Almoxarifado
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              {/* Seletor de Produto */}
              <div className="sm:col-span-5 flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-on-surface-variant">
                  Buscar Produto do Catálogo
                </label>
                <select
                  value={itemSelecionadoId}
                  onChange={(e) => setItemSelecionadoId(e.target.value)}
                  disabled={isLoadingCatalogo}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer font-medium"
                >
                  {isLoadingCatalogo ? (
                    <option value="">Carregando produtos do estoque...</option>
                  ) : (
                    ['mp', 'motos', 'imp'].map((aba) => {
                      const itensDaAba = catalogoItens.filter((c) => c.aba === aba);
                      if (itensDaAba.length === 0) return null;
                      return (
                        <optgroup key={aba} label={METADADOS_ABAS[aba as AbaEstoque]?.titulo || aba}>
                          {itensDaAba.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.codigo ? `[${p.codigo}] ` : ''}
                              {p.nome} (Saldo: {p.estoqueAtual} {UNIDADE_LABELS[p.unidade as keyof typeof UNIDADE_LABELS] || p.unidade})
                            </option>
                          ))}
                        </optgroup>
                      );
                    })
                  )}
                </select>
              </div>

              {/* Quantidade */}
              <div className="sm:col-span-2 flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-on-surface-variant">
                  Qtd ({itemConsulta ? UNIDADE_LABELS[itemConsulta.unidade as keyof typeof UNIDADE_LABELS] || itemConsulta.unidade : 'un'})
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={quantidadeAdicionar}
                  onChange={(e) => setQuantidadeAdicionar(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono font-bold"
                />
              </div>

              {/* Preço Unitário R$ */}
              <div className="sm:col-span-3 flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-on-surface-variant">
                  Preço Unitário (R$)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={precoUnitarioAdicionar}
                  onChange={(e) => setPrecoUnitarioAdicionar(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="0,00"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono"
                />
              </div>

              {/* Botão Adicionar */}
              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={handleAdicionarItemRapido}
                  className="w-full h-9 px-3 rounded-xl bg-primary hover:bg-primary/90 text-on-primary font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar</span>
                </button>
              </div>
            </div>

            {/* Telemetria de Estoque do Item em Foco */}
            {itemConsulta && (
              <div className="pt-2 border-t border-outline-variant/15 flex flex-wrap items-center justify-between text-xs text-on-surface-variant gap-2">
                <div className="flex items-center gap-3">
                  <span>
                    Saldo Físico:{' '}
                    <strong className="text-on-surface font-mono font-bold">
                      {itemConsulta.estoqueAtual.toLocaleString('pt-BR')}{' '}
                      {UNIDADE_LABELS[itemConsulta.unidade as keyof typeof UNIDADE_LABELS] || itemConsulta.unidade}
                    </strong>
                  </span>
                  <span>|</span>
                  <span>
                    Mínimo:{' '}
                    <strong className="text-on-surface font-mono">
                      {itemConsulta.estoqueMinimo.toLocaleString('pt-BR')}
                    </strong>
                  </span>
                </div>

                {itemConsulta.localizacao && (
                  <span className="flex items-center gap-1 text-[11px] text-outline font-medium">
                    <MapPin className="w-3 h-3" />
                    {itemConsulta.localizacao}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* SEÇÃO 3: Itens Selecionados & Reserva em Tempo Real */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-headline text-sm font-bold text-on-surface flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-primary" />
                  Itens Selecionados &amp; Reserva em Tempo Real
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-[11px] font-semibold">
                  {itens.length} {itens.length === 1 ? 'item' : 'itens'}
                </span>
              </div>
            </div>

            {itens.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-outline-variant/40 bg-surface-container-low text-on-surface-variant flex flex-col items-center justify-center gap-2">
                <Package className="w-8 h-8 text-outline/50" />
                <p className="font-medium text-xs text-on-surface">Nenhum item adicionado ao pedido</p>
                <p className="text-[11px] text-outline">
                  Consulte os materiais acima e clique em &quot;Adicionar&quot; para incluir no pedido.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {itens.map((linha, index) => {
                  const it = catalogoItens.find((c) => c.id === linha.itemId);
                  const unidadeFmt = it
                    ? UNIDADE_LABELS[it.unidade as keyof typeof UNIDADE_LABELS] || it.unidade
                    : 'un';
                  const temSaldoSuficiente = it ? it.estoqueAtual >= linha.quantidade : true;
                  const deficitQtd = it ? Math.max(0, linha.quantidade - it.estoqueAtual) : 0;
                  const numeroSequencial = String(index + 1).padStart(2, '0');

                  return (
                    <div
                      key={index}
                      className="p-3.5 rounded-2xl border border-outline-variant/25 bg-surface-container-lowest shadow-sm flex flex-col gap-2.5 hover:bg-surface-container-low/40 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-surface-container-high text-primary font-bold font-mono text-xs flex items-center justify-center shrink-0 border border-outline-variant/20">
                            {numeroSequencial}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-xs text-on-surface truncate">
                              {it?.nome || 'Item não identificado'}
                            </span>
                            <span className="text-[11px] text-outline font-mono">
                              SKU: {it?.codigo || '—'} · {it ? METADADOS_ABAS[it.aba]?.titulo : ''}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {temSaldoSuficiente ? (
                            <span className="px-2.5 py-1 rounded-full bg-tertiary-fixed/40 text-tertiary text-[11px] font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Saldo Disponível
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-error-container text-on-error-container text-[11px] font-semibold flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 text-error" />
                              Déficit de {deficitQtd} {unidadeFmt}
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="p-1.5 rounded-lg text-outline hover:text-error hover:bg-surface-container transition-colors cursor-pointer"
                            title="Remover item da lista"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Grade de Parâmetros e Quantidade da Linha */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-outline-variant/15 text-xs bg-surface-container-low/40 p-2.5 rounded-xl">
                        <div className="flex flex-col gap-1">
                          <span className="text-[11px] text-on-surface-variant font-medium">Qtd Solicitada</span>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={linha.quantidade}
                              onChange={(e) => handleAtualizarQuantidade(index, parseInt(e.target.value, 10) || 1)}
                              className="w-20 px-2 py-1 text-xs rounded-lg border border-outline-variant/30 bg-surface-container-lowest text-on-surface font-mono font-bold"
                            />
                            <span className="text-xs text-outline">{unidadeFmt}</span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1">
                          <span className="text-[11px] text-on-surface-variant font-medium">Preço Unit. (R$)</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={linha.precoUnitario || 0}
                            onChange={(e) => handleAtualizarPreco(index, parseFloat(e.target.value) || 0)}
                            className="w-24 px-2 py-1 text-xs rounded-lg border border-outline-variant/30 bg-surface-container-lowest text-on-surface font-mono"
                          />
                        </div>

                        <div className="flex flex-col gap-0.5">
                          <span className="text-[11px] text-on-surface-variant font-medium">Subtotal</span>
                          <span className="font-mono font-bold text-on-surface">
                            {((linha.quantidade || 0) * (linha.precoUnitario || 0)).toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            })}
                          </span>
                        </div>

                        <div className="flex flex-col gap-0.5">
                          <span className="text-[11px] text-on-surface-variant font-medium">Saldo no Galpão</span>
                          <span className="font-mono font-semibold text-on-surface">
                            {it?.estoqueAtual.toLocaleString('pt-BR') || 0} {unidadeFmt}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. Rodapé & Ações */}
          <div className="mt-auto pt-4 border-t border-outline-variant/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-on-surface">
                  Total: {totalizadores.totalLinhas} {totalizadores.totalLinhas === 1 ? 'item' : 'itens'} ({totalizadores.totalUnidades} un)
                </span>
                <span className="text-xs font-mono font-extrabold text-primary px-2 py-0.5 rounded-md bg-primary/10">
                  {totalizadores.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
              {totalizadores.temDeficit && (
                <span className="text-[11px] text-error font-medium flex items-center gap-1 mt-0.5">
                  <AlertTriangle className="w-3 h-3 text-error" />
                  Itens com déficit de estoque demandarão reposição imediata.
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5 self-end sm:self-center">
              <button
                type="button"
                onClick={onClose}
                disabled={criarPedidoMutation.isPending}
                className="h-10 px-4 rounded-xl text-xs font-medium text-on-surface hover:bg-surface-container border border-outline-variant/30 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={criarPedidoMutation.isPending || itens.length === 0}
                className="h-10 px-5 rounded-xl text-xs font-semibold bg-primary hover:bg-primary/90 text-on-primary transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {criarPedidoMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processando Pedido...</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4" />
                    <span>Salvar Pedido &amp; Reservar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </aside>
    </div>
  );
}

