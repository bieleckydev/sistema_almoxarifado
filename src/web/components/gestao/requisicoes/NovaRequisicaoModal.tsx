'use client';

import React, { useState } from 'react';
import { X, Plus, Trash2, ClipboardList, AlertCircle } from 'lucide-react';
import { useCriarRequisicao } from '@/web/hooks/useRequisicoes';
import { useItensEstoque } from '@/web/hooks/useItensEstoque';
import { useToast } from '@/web/hooks/useToast';
import { useSubmitLock } from '@/web/hooks/useSubmitLock';
import type { ItemRequisicao } from '@/core/domain/requisicao.schema';

export interface NovaRequisicaoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NovaRequisicaoModal({ isOpen, onClose }: NovaRequisicaoModalProps) {
  const { toast } = useToast();
  const criarMutation = useCriarRequisicao();
  const { isSubmitting, runWithLock } = useSubmitLock(900);

  const [setor, setSetor] = useState('Montagem');
  const [prioridade, setPrioridade] = useState<'BAIXA' | 'NORMAL' | 'URGENTE'>('NORMAL');
  const [observacao, setObservacao] = useState('');
  const [itens, setItens] = useState<ItemRequisicao[]>([]);
  const [itemSelecionadoId, setItemSelecionadoId] = useState('');
  const [quantidadeInput, setQuantidadeInput] = useState<number>(1);
  const [erro, setErro] = useState<string | null>(null);

  // Carrega itens de matéria-prima e improdutivos
  const { itens: catalogoMp } = useItensEstoque({ aba: 'mp' });
  const { itens: catalogoImp } = useItensEstoque({ aba: 'imp' });
  const catalogoDisponivel = [...catalogoMp, ...catalogoImp];

  if (!isOpen) return null;

  const handleAddItem = () => {
    if (!itemSelecionadoId) return;
    const itemCatalogo = catalogoDisponivel.find((i) => i.id === itemSelecionadoId);
    if (!itemCatalogo) return;

    if (quantidadeInput <= 0) {
      setErro('Quantidade deve ser maior que zero.');
      return;
    }

    setItens((prev) => [
      ...prev,
      {
        itemId: itemCatalogo.id,
        codigo: itemCatalogo.codigo,
        descricao: itemCatalogo.descricao,
        unidade: itemCatalogo.unidade,
        quantidadeSolicitada: quantidadeInput,
      },
    ]);

    setItemSelecionadoId('');
    setQuantidadeInput(1);
    setErro(null);
  };

  const handleRemoveItem = (index: number) => {
    setItens((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (itens.length === 0) {
      setErro('Adicione pelo menos um item à requisição.');
      return;
    }

    await runWithLock(async () => {
      try {
        await criarMutation.mutateAsync({
          setor,
          prioridade,
          observacao: observacao.trim() || undefined,
          itens,
        });

        toast('Requisição de material criada com sucesso!', { type: 'success' });
        setItens([]);
        setObservacao('');
        onClose();
      } catch (err: unknown) {
        setErro((err as Error)?.message || 'Erro ao criar requisição.');
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
      <div className="w-full max-w-xl rounded-2xl bg-surface-container-lowest border border-outline-variant/30 overflow-hidden animate-scale-up">
        <div className="p-4 sm:p-5 border-b border-outline-variant/20 flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            <ClipboardList className="w-5 h-5" />
            <h3 className="font-headline-sm text-sm font-bold text-on-surface">
              Nova Requisição de Material
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="req-setor" className="text-xs font-semibold text-on-surface">
                Setor de Destino <span className="text-error">*</span>
              </label>
              <select
                id="req-setor"
                value={setor}
                onChange={(e) => setSetor(e.target.value)}
                className="text-xs h-8 px-2.5 rounded-lg bg-surface-container-low border border-outline-variant/30 text-on-surface"
              >
                <option value="Montagem">Linha de Montagem</option>
                <option value="Usinagem">Usinagem</option>
                <option value="Solda">Solda & Caldeiraria</option>
                <option value="Pintura">Pintura</option>
                <option value="Manutenção">Manutenção Geral</option>
                <option value="Expedição">Expedição</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="req-prio" className="text-xs font-semibold text-on-surface">
                Prioridade
              </label>
              <select
                id="req-prio"
                value={prioridade}
                onChange={(e) => setPrioridade(e.target.value as any)}
                className="text-xs h-8 px-2.5 rounded-lg bg-surface-container-low border border-outline-variant/30 text-on-surface"
              >
                <option value="NORMAL">Normal</option>
                <option value="URGENTE">Urgente (Linha Parada)</option>
                <option value="BAIXA">Baixa (Reposição Planejada)</option>
              </select>
            </div>
          </div>

          {/* Adição de Itens */}
          <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20 flex flex-col gap-2.5">
            <span className="text-xs font-semibold text-on-surface">
              Adicionar Material ao Pedido
            </span>

            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={itemSelecionadoId}
                onChange={(e) => setItemSelecionadoId(e.target.value)}
                className="flex-1 text-xs h-8 px-2 rounded-lg bg-surface-container border border-outline-variant/30 text-on-surface"
              >
                <option value="">Selecione um material do estoque...</option>
                {catalogoDisponivel.map((i) => (
                  <option key={i.id} value={i.id}>
                    [{i.codigo}] {i.descricao} (Disp: {i.estoqueAtual} {i.unidade})
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0.001"
                  step="any"
                  value={quantidadeInput}
                  onChange={(e) => setQuantidadeInput(parseFloat(e.target.value) || 0)}
                  placeholder="Qtd"
                  className="w-20 text-xs h-8 px-2 rounded-lg bg-surface-container border border-outline-variant/30 text-on-surface font-mono"
                />
                <button
                  type="button"
                  onClick={handleAddItem}
                  disabled={!itemSelecionadoId}
                  className="inline-flex items-center gap-1 h-8 px-3 rounded-lg text-xs font-semibold bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar</span>
                </button>
              </div>
            </div>

            {/* Lista de Itens Adicionados */}
            {itens.length > 0 ? (
              <div className="mt-2 divide-y divide-outline-variant/10 rounded-lg border border-outline-variant/20 bg-surface-container-lowest overflow-hidden">
                {itens.map((it, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-mono font-bold text-primary">{it.codigo}</span>
                      <span className="text-on-surface truncate">{it.descricao}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono font-semibold text-on-surface">
                        {it.quantidadeSolicitada} {it.unidade}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1 rounded text-outline hover:text-error hover:bg-error-container/20 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-outline text-center py-2">
                Nenhum item adicionado ainda.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="req-obs" className="text-xs font-semibold text-on-surface">
              Observações / Justificativa
            </label>
            <input
              id="req-obs"
              type="text"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex: Utilizado na ordem de fabricação #8841"
              className="w-full text-xs p-2 rounded-lg bg-surface-container-low border border-outline-variant/40 text-on-surface"
            />
          </div>

          {erro && (
            <div className="flex items-center gap-1.5 text-xs text-error bg-error-container/20 p-2 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/20">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-8 px-3 rounded-lg text-xs font-medium text-secondary hover:text-on-surface bg-surface-container-low hover:bg-surface-container transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || itens.length === 0}
              className="h-8 px-4 rounded-lg text-xs font-semibold text-on-primary bg-primary hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer shadow-xs"
            >
              {isSubmitting ? 'Enviando...' : 'Enviar Requisição'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
