'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, ShoppingCart, AlertCircle, Loader2 } from 'lucide-react';
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
}

interface CatalogoItemOption {
  id: string;
  codigo: string;
  nome: string;
  aba: AbaEstoque;
  estoqueAtual: number;
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
  const [itens, setItens] = useState<ItemLinha[]>([{ itemId: '', quantidade: 1 }]);
  const [catalogoItens, setCatalogoItens] = useState<CatalogoItemOption[]>([]);
  const [isLoadingCatalogo, setIsLoadingCatalogo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

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
              unidade: String(data.unidade || 'UNIDADE'),
            });
          });
          list.sort((a, b) => a.nome.localeCompare(b.nome));
          setCatalogoItens(list);

          // Se a primeira linha estiver vazia e tivermos itens, preenche o primeiro
          if (list.length > 0 && itens.length === 1 && !itens[0].itemId) {
            setItens([{ itemId: list[0].id, quantidade: 1 }]);
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

  // Se o clienteId estiver vazio e clientes carregarem, seleciona o primeiro
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

  if (!isOpen) return null;

  const handleAddItem = () => {
    const defaultId = catalogoItens[0]?.id || '';
    setItens((prev) => [...prev, { itemId: defaultId, quantidade: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (itens.length <= 1) return;
    setItens((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, campo: keyof ItemLinha, valor: string | number) => {
    setItens((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        return {
          ...item,
          [campo]: campo === 'quantidade' ? Math.max(1, Number(valor) || 1) : valor,
        };
      })
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
      setErro('Selecione pelo menos um produto para o pedido.');
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
          observacao: undefined,
        })),
        observacoes: observacoes.trim() || undefined,
      });

      toast('Pedido criado com sucesso!', { type: 'success' });
      onOrderCreated?.();
      onClose();
    } catch (err: any) {
      setErro(err?.message || 'Falha ao salvar pedido. Tente novamente.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Scrim / Backdrop escurecido */}
      <div
        className="fixed inset-0 bg-inverse-surface/60 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Painel Deslizante Lateral */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Novo pedido de venda"
        className="relative w-full max-w-lg bg-surface-container-lowest border-l border-outline-variant/30 flex flex-col h-full z-10 overflow-y-auto animate-in slide-in-from-right duration-250 shadow-2xl"
      >
        {/* Cabeçalho */}
        <div className="sticky top-0 bg-surface-container-lowest/95 backdrop-blur-md z-20 px-6 py-4 border-b border-outline-variant/20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-container/10 text-primary flex items-center justify-center shrink-0">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-headline text-base font-bold text-on-surface leading-tight">
                Novo Pedido de Venda
              </h2>
              <p className="text-xs text-on-surface-variant mt-0.5 font-normal">
                Pedidos a entregar por cliente, prazos e faturamento.
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

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5 flex-1">
          {erro && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-error-container/40 border border-error/20 text-error text-xs flex items-center gap-2.5 animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-error" />
              <span>{erro}</span>
            </div>
          )}

          {/* Seleção do Cliente */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-on-surface-variant">
              Cliente <span className="text-error">*</span>
            </label>
            <select
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              disabled={isLoadingClientes}
              required
              className="w-full px-3 py-2 text-xs rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
            >
              {isLoadingClientes ? (
                <option value="">Carregando parceiros...</option>
              ) : clientes.length === 0 ? (
                <option value="">Nenhum cliente cadastrado</option>
              ) : (
                clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome} {c.cidade ? `(${c.cidade})` : ''} - {c.tipo}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Data de Entrega */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-on-surface-variant">
              Data de entrega <span className="text-error">*</span>
            </label>
            <input
              type="date"
              value={prazoEntrega}
              onChange={(e) => setPrazoEntrega(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          {/* Seção Itens do Pedido */}
          <div className="flex flex-col gap-3 pt-2 border-t border-outline-variant/20">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                Itens do pedido
              </h3>
              <span className="text-[11px] text-outline font-mono">
                {itens.length} {itens.length === 1 ? 'linha' : 'linhas'}
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {itens.map((linha, index) => {
                const itemInfo = catalogoItens.find((c) => c.id === linha.itemId);
                const unidadeFmt = itemInfo
                  ? UNIDADE_LABELS[itemInfo.unidade as keyof typeof UNIDADE_LABELS] || itemInfo.unidade
                  : 'un';

                return (
                  <div
                    key={index}
                    className="p-3.5 rounded-2xl border border-outline-variant/20 bg-surface-container-low flex flex-col gap-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-on-surface-variant">
                        Item #{index + 1}
                      </span>
                      {itens.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="p-1 rounded text-outline hover:text-error transition-colors"
                          title="Remover item da lista"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="sm:col-span-2 flex flex-col gap-1">
                        <label className="text-[11px] text-on-surface-variant">
                          Produto
                        </label>
                        <select
                          value={linha.itemId}
                          onChange={(e) => handleItemChange(index, 'itemId', e.target.value)}
                          disabled={isLoadingCatalogo}
                          className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
                        >
                          {isLoadingCatalogo ? (
                            <option value="">Carregando catálogo...</option>
                          ) : (
                            ['motos', 'mp', 'imp'].map((aba) => {
                              const itensDaAba = catalogoItens.filter((c) => c.aba === aba);
                              if (itensDaAba.length === 0) return null;
                              return (
                                <optgroup
                                  key={aba}
                                  label={METADADOS_ABAS[aba as AbaEstoque]?.titulo || aba}
                                >
                                  {itensDaAba.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.codigo ? `[${p.codigo}] ` : ''}
                                      {p.nome} (Saldo: {p.estoqueAtual})
                                    </option>
                                  ))}
                                </optgroup>
                              );
                            })
                          )}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] text-on-surface-variant">
                          Qtd ({unidadeFmt})
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={linha.quantidade}
                          onChange={(e) => handleItemChange(index, 'quantidade', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-xl text-xs font-semibold text-on-surface bg-surface-container-lowest hover:bg-surface-container transition-all cursor-pointer border border-outline-variant/30 self-start mt-1 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Adicionar item</span>
            </button>
          </div>

          {/* Observações */}
          <div className="flex flex-col gap-1.5 pt-2 border-t border-outline-variant/20">
            <label className="text-xs font-semibold text-on-surface-variant">
              Observações do pedido (opcional)
            </label>
            <textarea
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: Pedido para reposição de balcão ou instrução de entrega"
              className="w-full px-3 py-2 text-xs rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
            />
          </div>

          {/* Botões de Ação */}
          <div className="mt-auto pt-4 border-t border-outline-variant/20 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={criarPedidoMutation.isPending}
              className="h-10 px-4 rounded-xl text-xs font-medium text-on-surface hover:bg-surface-container border border-outline-variant/30 transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={criarPedidoMutation.isPending}
              className="h-10 px-4 rounded-xl text-xs font-semibold bg-primary hover:bg-primary/90 text-on-primary transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
            >
              {criarPedidoMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando pedido...</span>
                </>
              ) : (
                <span>Salvar pedido</span>
              )}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
