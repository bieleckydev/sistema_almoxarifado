'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Edit3, AlertCircle, Loader2 } from 'lucide-react';
import {
  type DashboardItem,
  UNIDADE_LABELS,
} from '@/web/data/mock-almoxarifado';
import { api } from '@/core/api/client';
import { useToast } from '@/web/hooks/useToast';
import { useSubmitLock } from '@/web/hooks/useSubmitLock';

export interface ItemEditDrawerProps {
  item: DashboardItem | null;
  isOpen: boolean;
  onClose: () => void;
  onItemUpdated: (item: DashboardItem) => void;
}

export function ItemEditDrawer({
  item,
  isOpen,
  onClose,
  onItemUpdated,
}: ItemEditDrawerProps) {
  const { toast } = useToast();
  const { isSubmitting, runWithLock } = useSubmitLock(900);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState('');
  const [localizacaoFisica, setLocalizacaoFisica] = useState('');
  const [custoUnitario, setCustoUnitario] = useState<number>(0);
  const [estoqueSeguranca, setEstoqueSeguranca] = useState<number>(0);
  const [capacidadeMaxima, setCapacidadeMaxima] = useState<number>(100);
  const [especificacoes, setEspecificacoes] = useState<Record<string, string>>({});
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && item) {
      setDescricao(item.descricao || '');
      setCategoria(item.categoria || '');
      setLocalizacaoFisica(item.localizacaoFisica || '');
      setCustoUnitario(item.custoUnitario || 0);
      setEstoqueSeguranca(item.estoqueSeguranca || 0);
      setCapacidadeMaxima(item.capacidadeMaxima || 100);
      setEspecificacoes(item.especificacoes || {});
      setErro(null);

      setTimeout(() => closeButtonRef.current?.focus(), 50);
    }
  }, [isOpen, item]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
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
  }, [isOpen, onClose]);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!descricao.trim()) {
      setErro('A descrição do material é obrigatória.');
      return;
    }

    if (estoqueSeguranca < 0) {
      setErro('O estoque de segurança não pode ser negativo.');
      return;
    }

    if (capacidadeMaxima < estoqueSeguranca) {
      setErro('A capacidade máxima não pode ser menor que o estoque de segurança.');
      return;
    }

    await runWithLock(async () => {
      try {
        setErro(null);

        const payload = {
          descricao: descricao.trim(),
          categoria: categoria.trim(),
          localizacaoFisica: localizacaoFisica.trim(),
          custoUnitario: Number(custoUnitario) || 0,
          estoqueSeguranca: Number(estoqueSeguranca),
          capacidadeMaxima: Number(capacidadeMaxima),
          especificacoes,
        };

        const response = await api.patch<Partial<DashboardItem>>(`/itens/${item.id}`, payload);
        const itemAtualizado = {
          ...item,
          ...response.data,
        };

        toast('Cadastro do material atualizado com sucesso!', { type: 'success' });
        onItemUpdated(itemAtualizado);
        onClose();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Falha ao atualizar cadastro do material.';
        setErro(msg);
        toast(msg, { type: 'error' });
      }
    });
  };

  const handleSpecChange = (chave: string, valor: string) => {
    setEspecificacoes((prev) => ({
      ...prev,
      [chave]: valor,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-inverse-surface/60 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Editar item ${item.codigo}`}
        className="relative w-full max-w-lg bg-surface-container-lowest border-l border-outline-variant/30 flex flex-col h-full z-10 overflow-y-auto animate-in slide-in-from-right duration-250 shadow-2xl"
      >
        {/* Cabeçalho */}
        <div className="sticky top-0 bg-surface-container-lowest/95 backdrop-blur-md z-20 px-6 py-4 border-b border-outline-variant/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-headline text-lg font-bold text-on-surface">
                Editar Cadastro
              </h2>
              <p className="text-xs text-secondary font-mono">
                {item.codigo} · Saldo físico atual: {item.estoqueAtual} {UNIDADE_LABELS[item.unidade] || item.unidade}
              </p>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar painel de edição"
            className="p-1.5 rounded-xl text-outline hover:text-on-surface bg-surface-container hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between p-6">
          <div className="space-y-4">
            {erro && (
              <div
                role="alert"
                className="p-3 bg-error-container/40 border border-error/30 rounded-xl flex items-start gap-2 text-xs text-error font-medium"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{erro}</span>
              </div>
            )}

            {/* Código (Apenas Leitura no 3.0 para preservar integridade de lote e rastreio) */}
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1">
                Código SKU (Identificador Primário)
              </label>
              <input
                type="text"
                disabled
                value={item.codigo}
                className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant/30 rounded-lg text-sm font-mono text-outline cursor-not-allowed"
              />
              <span className="text-[11px] text-outline mt-1 block">
                O código de barras/SKU é imutável para assegurar a rastreabilidade histórica.
              </span>
            </div>

            {/* Descrição */}
            <div>
              <label htmlFor="edit-descricao" className="block text-xs font-semibold text-secondary mb-1">
                Descrição Completa <span className="text-error">*</span>
              </label>
              <input
                id="edit-descricao"
                type="text"
                required
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex: PARAFUSO SEXTAVADO M8 X 25MM"
                className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant/50 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg text-sm text-on-surface"
              />
            </div>

            {/* Categoria e Localização Física */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="edit-categoria" className="block text-xs font-semibold text-secondary mb-1">
                  Categoria
                </label>
                <input
                  id="edit-categoria"
                  type="text"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  placeholder="Ex: Fixação e Montagem"
                  className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant/50 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg text-sm text-on-surface"
                />
              </div>

              <div>
                <label htmlFor="edit-localizacao" className="block text-xs font-semibold text-secondary mb-1">
                  Endereço Físico / Almoxarifado
                </label>
                <input
                  id="edit-localizacao"
                  type="text"
                  value={localizacaoFisica}
                  onChange={(e) => setLocalizacaoFisica(e.target.value)}
                  placeholder="Ex: Rua A, Prateleira 03"
                  className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant/50 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg text-sm text-on-surface font-mono"
                />
              </div>
            </div>

            {/* Custo Médio Unitário (R$) */}
            <div>
              <label htmlFor="edit-custo" className="block text-xs font-semibold text-secondary mb-1">
                Custo Médio Unitário (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-sm text-secondary font-mono">R$</span>
                <input
                  id="edit-custo"
                  type="number"
                  step="0.01"
                  min="0"
                  value={custoUnitario}
                  onChange={(e) => setCustoUnitario(parseFloat(e.target.value) || 0)}
                  className="w-full pl-9 pr-3 py-2 bg-surface-container-lowest border border-outline-variant/50 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg text-sm text-on-surface font-mono"
                />
              </div>
              <span className="text-[11px] text-secondary mt-1 block">
                Atualiza a base de cálculo para valorização total do estoque e saídas.
              </span>
            </div>

            {/* Níveis de Controle de Estoque */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-outline-variant/20">
              <div>
                <label htmlFor="edit-seguranca" className="block text-xs font-semibold text-secondary mb-1">
                  Estoque de Segurança (Mínimo)
                </label>
                <input
                  id="edit-seguranca"
                  type="number"
                  min="0"
                  value={estoqueSeguranca}
                  onChange={(e) => setEstoqueSeguranca(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant/50 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg text-sm text-on-surface"
                />
                <span className="text-[11px] text-secondary mt-0.5 block">
                  Dispara alerta de reposição se atingido.
                </span>
              </div>

              <div>
                <label htmlFor="edit-maxima" className="block text-xs font-semibold text-secondary mb-1">
                  Capacidade Máxima
                </label>
                <input
                  id="edit-maxima"
                  type="number"
                  min="1"
                  value={capacidadeMaxima}
                  onChange={(e) => setCapacidadeMaxima(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant/50 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg text-sm text-on-surface"
                />
                <span className="text-[11px] text-secondary mt-0.5 block">
                  Limite de armazenagem física.
                </span>
              </div>
            </div>

            {/* Especificações Técnicas Adicionais */}
            <div className="pt-2 border-t border-outline-variant/20">
              <h3 className="text-xs font-semibold text-secondary mb-2">
                Especificações Técnicas
              </h3>
              <div className="space-y-2">
                {['Fornecedor', 'Marca', 'NF-e', 'Lote Padrão'].map((campo) => (
                  <div key={campo} className="flex items-center gap-2">
                    <span className="w-28 text-xs font-medium text-secondary truncate">{campo}:</span>
                    <input
                      type="text"
                      value={especificacoes[campo] || ''}
                      onChange={(e) => handleSpecChange(campo, e.target.value)}
                      placeholder={`Informar ${campo.toLowerCase()}...`}
                      className="flex-1 px-3 py-1.5 bg-surface-container-lowest border border-outline-variant/40 rounded-lg text-xs text-on-surface focus:border-primary"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Botões do Rodapé */}
          <div className="pt-6 border-t border-outline-variant/20 flex items-center justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-secondary hover:text-on-surface rounded-lg hover:bg-surface-container transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-on-primary bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Salvar Alterações</span>
                </>
              )}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
