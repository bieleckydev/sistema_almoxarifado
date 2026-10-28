'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Search,
  AlertTriangle,
  Check,
  Loader2,
  Package,
  Factory,
  ArrowRight,
} from 'lucide-react';
import { useBaixaRapidaStore } from '@/core/store/useBaixaRapidaStore';
import { ColaboradorSelect } from '@/web/components/common/ColaboradorSelect';
import {
  type SetorFabril,
  SETOR_FABRIL_LABELS,
  SetorFabrilSchema,
} from '@/core/domain/colaborador.schema';
import { UNIDADE_LABELS, type DashboardItem } from '@/web/data/mock-almoxarifado';
import { useToast } from '@/web/hooks/useToast';
import { db } from '@/core/services/firebase';
import { collection, getDocs } from 'firebase/firestore';

export interface BaixaRapidaDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function BaixaRapidaDrawer({
  isOpen,
  onClose,
  onSuccess,
}: BaixaRapidaDrawerProps) {
  const { toast } = useToast();

  // Zustand Store
  const {
    colaboradorSelecionado,
    setorDestino,
    observacaoGeral,
    itens,
    selecionarColaborador,
    desmarcarColaborador,
    definirSetorDestino,
    definirObservacaoGeral,
    adicionarItem,
    removerItem,
    incrementarItem,
    decrementarItem,
    atualizarQuantidade,
    definirObservacaoItem,
    limparCarrinho,
    reset,
    obterTotalItensDiferentes,
    obterTotalUnidadesFisicas,
    validarDisponibilidadeGeral,
    estaProntoParaConfirmar,
    obterPayloadBaixaLote,
  } = useBaixaRapidaStore();

  // Busca rápida de materiais para inserção no carrinho
  const [buscaMaterial, setBuscaMaterial] = useState('');
  const [catalogoMateriais, setCatalogoMateriais] = useState<DashboardItem[]>([]);
  const [carregandoCatalogo, setCarregandoCatalogo] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);

  const inputBuscaRef = useRef<HTMLInputElement>(null);

  // Carrega catálogo de materiais quando o drawer é aberto
  useEffect(() => {
    if (isOpen) {
      setErroEnvio(null);
      setCarregandoCatalogo(true);

      const carregar = async () => {
        try {
          const snap = await getDocs(collection(db, 'items'));
          const lista: DashboardItem[] = [];

          snap.forEach((doc) => {
            const d = doc.data();
            let aba: DashboardItem['aba'] = 'mp';
            if (d.tipo === 'IMPRODUTIVO_CONSUMIVEL') aba = 'imp';
            else if (d.tipo === 'ACABADO') aba = 'motos';

            lista.push({
              id: doc.id,
              descricao: String(d.descricao || d.nome || 'Material'),
              codigo: String(d.codigo || ''),
              categoria: String(d.categoria || 'Geral'),
              aba,
              tipo: d.tipo || 'PRODUTIVO_MATERIA_PRIMA',
              unidade: d.unidade || 'UNIDADE',
              estoqueAtual: Number(d.estoqueAtual) || 0,
              estoqueSeguranca: Number(d.estoqueSeguranca) || 0,
              capacidadeMaxima: Number(d.capacidadeMaxima) || 100,
              especificacoes: (d.especificacoes as Record<string, string>) || {},
              ativo: d.ativo ?? true,
            });
          });

          setCatalogoMateriais(lista);
        } catch (err) {
          console.warn('Erro ao carregar catálogo para baixa rápida:', err);
        } finally {
          setCarregandoCatalogo(false);
        }
      };

      carregar();
    }
  }, [isOpen]);

  // Tecla Escape para fechar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, isSubmitting]);

  if (!isOpen) return null;

  // Filtragem de materiais para o seletor do carrinho
  const termo = buscaMaterial.trim().toLowerCase();
  const materiaisFiltrados = termo
    ? catalogoMateriais
        .filter((it) => {
          const campos = [it.descricao, it.codigo, it.categoria];
          return campos.some((val) => val && val.toLowerCase().includes(termo));
        })
        .slice(0, 10)
    : [];

  const checagemDisponibilidade = validarDisponibilidadeGeral();
  const totalDiferentes = obterTotalItensDiferentes();
  const totalFisico = obterTotalUnidadesFisicas();
  const prontoParaConfirmar = estaProntoParaConfirmar();

  const handleSubmeterBaixaLote = async () => {
    setErroEnvio(null);
    const payload = obterPayloadBaixaLote();

    if (!payload) {
      setErroEnvio('Selecione um colaborador e adicione pelo menos um item ao carrinho.');
      return;
    }

    if (!checagemDisponibilidade.valido) {
      setErroEnvio('Um ou mais itens no carrinho excedem o saldo em estoque disponível.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/movimentacoes/baixa-lote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Falha ao processar baixa em lote.');
      }

      toast(
        `Baixa rápida de ${totalDiferentes} ${
          totalDiferentes === 1 ? 'item' : 'itens'
        } confirmada com sucesso!`,
        { type: 'success' }
      );

      reset();
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao processar baixa em lote.';
      setErroEnvio(msg);
      toast(msg, { type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop com blur suave */}
      <div
        className="fixed inset-0 bg-inverse-surface/60 backdrop-blur-xs transition-opacity animate-in fade-in cursor-pointer"
        onClick={() => {
          if (!isSubmitting) onClose();
        }}
        aria-hidden="true"
      />

      {/* Drawer Deslizante */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Carrinho de Retirada Rápida de Materiais"
        className="relative w-full max-w-xl bg-surface-container-lowest border-l border-outline-variant/30 flex flex-col h-full z-10 animate-in slide-in-from-right duration-200 shadow-2xl"
      >
        {/* Cabeçalho */}
        <div className="p-6 pb-4 border-b border-outline-variant/20 flex items-start justify-between gap-3 shrink-0">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                <ShoppingCart className="w-5 h-5" />
              </span>
              <div>
                <h2 className="font-headline text-base font-bold text-on-surface leading-tight">
                  Retirada em Lote (Chão de Fábrica)
                </h2>
                <p className="text-xs text-on-surface-variant mt-0.5 font-normal">
                  Baixa ágil de múltiplos materiais para produção com confirmação atômica.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {itens.length > 0 && (
              <button
                type="button"
                onClick={() => limparCarrinho()}
                disabled={isSubmitting}
                className="px-2.5 py-1 text-xs text-error hover:bg-error-container/30 rounded-lg transition-colors cursor-pointer"
                title="Limpar todos os itens do carrinho"
              >
                Limpar
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              aria-label="Fechar gaveta"
              className="p-1.5 rounded-xl text-outline hover:text-on-surface bg-surface-container hover:bg-surface-container-high transition-colors cursor-pointer disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Corpo com Scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Seção 1: Colaborador e Setor Destino */}
          <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-xs uppercase tracking-wider text-secondary font-semibold flex items-center gap-1.5">
                <Factory className="w-3.5 h-3.5 text-primary" />
                1. Responsável pela Retirada
              </span>
              {colaboradorSelecionado && (
                <button
                  type="button"
                  onClick={() => desmarcarColaborador()}
                  disabled={isSubmitting}
                  className="text-xs text-secondary hover:text-error transition-colors cursor-pointer"
                >
                  Trocar operador
                </button>
              )}
            </div>

            <ColaboradorSelect
              value={colaboradorSelecionado?.id}
              onChange={(c) => {
                if (c) {
                  selecionarColaborador(c);
                } else {
                  desmarcarColaborador();
                }
              }}
              disabled={isSubmitting}
            />

            {/* Setor de Destino */}
            {colaboradorSelecionado && (
              <div className="pt-2 border-t border-outline-variant/20 flex items-center justify-between gap-3 text-xs">
                <span className="text-secondary font-medium">Setor de Aplicação:</span>
                <select
                  value={setorDestino || colaboradorSelecionado.setor}
                  onChange={(e) => definirSetorDestino(e.target.value as SetorFabril)}
                  disabled={isSubmitting}
                  aria-label="Setor fabril de destino"
                  className="px-2.5 py-1 rounded-lg border border-outline-variant/30 bg-surface-container-lowest text-on-surface font-semibold text-xs focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer"
                >
                  {SetorFabrilSchema.options.map((s) => (
                    <option key={s} value={s}>
                      {SETOR_FABRIL_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Seção 2: Adicionar Materiais ao Carrinho */}
          <div className="space-y-2">
            <span className="font-label-sm text-xs uppercase tracking-wider text-secondary font-semibold flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-primary" />
              2. Adicionar Materiais ao Carrinho
            </span>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline pointer-events-none" />
              <input
                ref={inputBuscaRef}
                type="search"
                value={buscaMaterial}
                onChange={(e) => setBuscaMaterial(e.target.value)}
                placeholder="Digitar nome, código ou bipar leitor..."
                disabled={isSubmitting}
                className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />

              {carregandoCatalogo && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-outline">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              )}
            </div>

            {/* Sugestões de Materiais em Dropdown Rápido */}
            {materiaisFiltrados.length > 0 && (
              <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest shadow-lg overflow-hidden divide-y divide-outline-variant/10 max-h-56 overflow-y-auto">
                {materiaisFiltrados.map((item) => {
                  const unidadeFmt = UNIDADE_LABELS[item.unidade] || item.unidade.toLowerCase();
                  const noCarrinho = itens.find((i) => i.itemId === item.id);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        adicionarItem(item, 1);
                        setBuscaMaterial('');
                        inputBuscaRef.current?.focus();
                      }}
                      className="w-full p-2.5 flex items-center justify-between text-left hover:bg-surface-container-low transition-colors cursor-pointer group"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-semibold text-on-surface group-hover:text-primary truncate">
                          {item.descricao}
                        </div>
                        <div className="text-[11px] text-secondary truncate mt-0.5">
                          {item.codigo} · Saldo: {item.estoqueAtual} {unidadeFmt}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {noCarrinho && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            {noCarrinho.quantidade} no carrinho
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container text-xs font-semibold text-on-surface group-hover:bg-primary group-hover:text-on-primary transition-colors">
                          <Plus className="w-3 h-3" />
                          Adicionar
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Seção 3: Lista de Materiais do Carrinho */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-xs uppercase tracking-wider text-secondary font-semibold">
                3. Materiais Selecionados ({totalDiferentes} {totalDiferentes === 1 ? 'item' : 'itens'})
              </span>
              <span className="text-xs font-medium text-secondary">
                Total Físico: <strong className="text-on-surface">{totalFisico} un</strong>
              </span>
            </div>

            {itens.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-dashed border-outline-variant/40 bg-surface-container-low/40">
                <ShoppingCart className="w-8 h-8 text-outline mx-auto mb-2 opacity-60" />
                <p className="text-xs font-semibold text-on-surface">O carrinho de retirada está vazio</p>
                <p className="text-[11px] text-secondary mt-1 max-w-xs mx-auto">
                  Utilize o campo de busca acima para pesquisar e bipar materiais para baixa rápida.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {itens.map((i) => {
                  const unidadeFmt = UNIDADE_LABELS[i.unidade] || i.unidade.toLowerCase();
                  const estoqueInsuficiente = i.quantidade > i.estoqueAtual;

                  return (
                    <div
                      key={i.itemId}
                      className={`p-3.5 rounded-xl border transition-all ${
                        estoqueInsuficiente
                          ? 'border-error/50 bg-error-container/20'
                          : 'border-outline-variant/30 bg-surface-container-lowest shadow-2xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-on-surface leading-snug">
                            {i.descricao}
                          </div>
                          <div className="text-[11px] text-secondary mt-0.5 flex items-center gap-2">
                            <span>Cód: {i.codigo}</span>
                            <span>•</span>
                            <span
                              className={`font-semibold ${
                                estoqueInsuficiente ? 'text-error font-bold' : 'text-secondary'
                              }`}
                            >
                              Saldo atual: {i.estoqueAtual} {unidadeFmt}
                            </span>
                          </div>
                        </div>

                        {/* Botão de Remover Item */}
                        <button
                          type="button"
                          onClick={() => removerItem(i.itemId)}
                          disabled={isSubmitting}
                          title="Remover material do carrinho"
                          className="p-1 rounded-lg text-outline hover:text-error hover:bg-error-container/30 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Controles de Quantidade e Observação */}
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-outline-variant/15">
                        <div className="flex items-center gap-1 bg-surface-container rounded-lg p-0.5 border border-outline-variant/20">
                          <button
                            type="button"
                            onClick={() => decrementarItem(i.itemId, 1)}
                            disabled={isSubmitting}
                            className="p-1 rounded-md text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
                            title="Diminuir quantidade"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={i.quantidade}
                            onChange={(e) =>
                              atualizarQuantidade(i.itemId, Number(e.target.value) || 1)
                            }
                            disabled={isSubmitting}
                            className="w-12 text-center text-xs font-bold text-on-surface bg-transparent focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => incrementarItem(i.itemId, 1)}
                            disabled={isSubmitting}
                            className="p-1 rounded-md text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
                            title="Aumentar quantidade"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Input de Observação Específica do Item */}
                        <input
                          type="text"
                          value={i.observacao || ''}
                          onChange={(e) => definirObservacaoItem(i.itemId, e.target.value)}
                          placeholder="Obs (ex: máquina 02, teste)"
                          disabled={isSubmitting}
                          className="text-[11px] px-2.5 py-1 rounded-lg border border-outline-variant/20 bg-surface-container-low text-on-surface placeholder:text-outline/70 focus:outline-none focus:ring-1 focus:ring-primary/30 flex-1 min-w-[140px]"
                        />
                      </div>

                      {/* Alerta de Saldo Insuficiente */}
                      {estoqueInsuficiente && (
                        <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-error font-medium">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            Quantidade desejada ({i.quantidade}) excede o saldo físico em estoque ({i.estoqueAtual}).
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Seção 4: Observação Geral da Ordem / Requisição */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-secondary">
              Observações Gerais (OP, Turno, Projeto)
            </label>
            <textarea
              rows={2}
              value={observacaoGeral}
              onChange={(e) => definirObservacaoGeral(e.target.value)}
              placeholder="Ex: Baixa para montagem da Ordem de Produção #402..."
              disabled={isSubmitting}
              className="w-full p-2.5 text-xs rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
            />
          </div>

          {/* Erro de Envio se houver */}
          {erroEnvio && (
            <div className="p-3 rounded-xl bg-error-container/40 border border-error/30 text-error text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{erroEnvio}</span>
            </div>
          )}
        </div>

        {/* Rodapé Fixo de Ação */}
        <div className="p-4 sm:p-6 border-t border-outline-variant/20 bg-surface-container-low shrink-0 space-y-3">
          <div className="flex items-center justify-between text-xs text-secondary">
            <span>Operação Atômica:</span>
            <span className="font-semibold text-on-surface">
              {totalDiferentes} {totalDiferentes === 1 ? 'material' : 'materiais'} • {totalFisico} un
            </span>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-secondary hover:text-on-surface bg-surface-container hover:bg-surface-container-high transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSubmeterBaixaLote}
              disabled={!prontoParaConfirmar || isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl text-on-primary bg-primary hover:bg-primary/90 transition-all cursor-pointer shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processando Baixa em Lote...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Confirmar Baixa em Lote</span>
                </>
              )}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
