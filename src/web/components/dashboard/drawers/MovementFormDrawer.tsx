'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowUpRight, ArrowDownRight, AlertCircle, Loader2 } from 'lucide-react';
import { type DashboardItem, UNIDADE_LABELS } from '@/web/data/mock-almoxarifado';
import { api } from '@/core/api/client';
import { useToast } from '@/web/hooks/useToast';
import { useQueryClient } from '@tanstack/react-query';

export interface MovementFormDrawerProps {
  item: DashboardItem | null;
  tipo: 'Entrada' | 'Saída';
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function MovementFormDrawer({
  item,
  tipo,
  isOpen,
  onClose,
  onSuccess,
}: MovementFormDrawerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const hoje = new Date().toISOString().slice(0, 10);
  const [dataMov, setDataMov] = useState(hoje);
  const [quantidade, setQuantidade] = useState<number>(1);
  const [quem, setQuem] = useState('Produção');
  const [observacao, setObservacao] = useState('');
  const [camposInfo, setCamposInfo] = useState<Record<string, string>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEntrada = tipo === 'Entrada';

  useEffect(() => {
    if (isOpen && item) {
      setDataMov(new Date().toISOString().slice(0, 10));
      setQuantidade(1);
      setQuem('Produção');
      setObservacao('');
      setErro(null);
      setIsSubmitting(false);

      const fornecedorPrevio = item.especificacoes?.Fornecedor || '';
      setCamposInfo(fornecedorPrevio ? { Fornecedor: fornecedorPrevio } : {});

      setTimeout(() => closeButtonRef.current?.focus(), 50);
    }
  }, [isOpen, item, tipo]);

  // Tecla Escape para fechar
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

  const unidadeFmt = UNIDADE_LABELS[item.unidade] || item.unidade.toLowerCase();
  const camposEntrada: string[] =
    item.aba === 'motos'
      ? ['NF-e', 'Fornecedor']
      : item.aba === 'imp'
        ? ['NF-e', 'Fornecedor', 'Lote', 'Certificado de aprovação (CA)']
        : ['NF-e', 'Fornecedor', 'Lote', 'Certificado'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (!dataMov) {
      setErro('Informe a data da movimentação.');
      return;
    }

    if (quantidade <= 0) {
      setErro('A quantidade deve ser maior que zero.');
      return;
    }

    if (!isEntrada && quantidade > item.estoqueAtual) {
      setErro(
        `Estoque insuficiente: há apenas ${item.estoqueAtual.toLocaleString('pt-BR')} ${unidadeFmt} de ${item.descricao}.`
      );
      return;
    }

    if (!isEntrada && !quem.trim()) {
      setErro('Informe quem retirou ou o setor responsável.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEntrada) {
        const numeroNF = camposInfo['NF-e']?.trim() || undefined;
        const fornecedor = camposInfo['Fornecedor']?.trim() || undefined;

        await api.post('/movimentacoes/entrada', {
          itemId: item.id,
          tipo: 'ENTRADA_COMPRA',
          quantidade,
          numeroNF,
          fornecedor,
          observacoes: observacao.trim() || undefined,
          dataMovimentacao: new Date(dataMov + 'T12:00:00Z').toISOString(),
        });

        toast(
          `Entrada registrada: +${quantidade.toLocaleString('pt-BR')} ${unidadeFmt} de ${item.descricao}.`,
          { type: 'success' }
        );
      } else {
        // Saída / Retirada
        await api.post('/movimentacoes/baixa-interna', {
          itemId: item.id,
          quantidade,
          colaboradorId: quem.trim() || 'PRODUCAO',
          observacao: observacao.trim() || undefined,
          dataMovimentacao: new Date(dataMov + 'T12:00:00Z').toISOString(),
        });

        toast(
          `Retirada registrada: −${quantidade.toLocaleString('pt-BR')} ${unidadeFmt} de ${item.descricao}.`,
          { type: 'success' }
        );
      }

      // Invalida caches do React Query para atualização em tempo real
      queryClient.invalidateQueries({ queryKey: ['itens-estoque'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-resumo-geral'] });
      queryClient.invalidateQueries({ queryKey: ['extrato-item', item.id] });
      queryClient.invalidateQueries({ queryKey: ['global-search-index'] });

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as Error)?.message ||
        'Erro ao processar movimentação.';
      setErro(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Scrim / Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 transition-opacity animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Deslizante */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={isEntrada ? 'Registrar entrada de material' : 'Registrar retirada para produção'}
        className="relative w-full max-w-md bg-white dark:bg-[#2b2b2e] border-l border-slate-200 dark:border-[#3e3e42] flex flex-col h-full z-10 overflow-y-auto animate-in slide-in-from-right duration-200"
      >
        {/* Cabeçalho */}
        <div className="sticky top-0 bg-white dark:bg-[#2b2b2e] z-20 px-6 py-4 border-b border-slate-200 dark:border-[#3e3e42] flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isEntrada ? (
              <ArrowUpRight className="w-5 h-5 text-emerald-500 dark:text-[#72d596]" />
            ) : (
              <ArrowDownRight className="w-5 h-5 text-rose-500 dark:text-[#f0796b]" />
            )}
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-[#ececee] leading-tight">
                {isEntrada ? 'Entrada de material' : 'Retirada para produção'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                {item.descricao} · saldo atual{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                  {item.estoqueAtual.toLocaleString('pt-BR')} {unidadeFmt}
                </span>
              </p>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar formulário"
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100 dark:bg-[#343438] hover:bg-slate-200 dark:hover:bg-[#3e3e42] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 text-xs">
          {erro && (
            <div className="p-3 rounded-md bg-rose-50 dark:bg-[#40201d] border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-[#f0796b] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          {/* Data e Quantidade */}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 font-medium text-slate-700 dark:text-slate-300">
              <span>{isEntrada ? 'Data de chegada *' : 'Data da retirada *'}</span>
              <input
                type="date"
                required
                max={hoje}
                value={dataMov}
                onChange={(e) => setDataMov(e.target.value)}
                className="p-2.5 rounded-md border border-slate-300 dark:border-[#3e3e42] bg-white dark:bg-[#232325] text-slate-900 dark:text-[#ececee] focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500"
              />
            </label>

            <label className="flex flex-col gap-1 font-medium text-slate-700 dark:text-slate-300">
              <span>Quantidade ({unidadeFmt}) *</span>
              <input
                type="number"
                min={1}
                required
                value={quantidade}
                onChange={(e) => setQuantidade(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="p-2.5 rounded-md border border-slate-300 dark:border-[#3e3e42] bg-white dark:bg-[#232325] text-slate-900 dark:text-[#ececee] focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500 tabular-nums font-semibold"
              />
            </label>
          </div>

          {/* Campos específicos da Entrada */}
          {isEntrada && (
            <div className="space-y-3 pt-1">
              {camposEntrada.map((campo) => (
                <label key={campo} className="flex flex-col gap-1 font-medium text-slate-700 dark:text-slate-300">
                  <span>{campo}</span>
                  <input
                    type="text"
                    value={camposInfo[campo] || ''}
                    onChange={(e) =>
                      setCamposInfo((prev) => ({
                        ...prev,
                        [campo]: e.target.value,
                      }))
                    }
                    placeholder={`Informar ${campo.toLowerCase()}`}
                    className="p-2 rounded-md border border-slate-300 dark:border-[#3e3e42] bg-white dark:bg-[#232325] text-slate-900 dark:text-[#ececee] focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500"
                  />
                </label>
              ))}
            </div>
          )}

          {/* Campo de Retirada (Saída) */}
          {!isEntrada && (
            <label className="flex flex-col gap-1 font-medium text-slate-700 dark:text-slate-300">
              <span>Retirado por / setor *</span>
              <input
                type="text"
                required
                value={quem}
                onChange={(e) => setQuem(e.target.value)}
                placeholder="Ex: Produção, Serralheria, Oficina, Manutenção"
                className="p-2.5 rounded-md border border-slate-300 dark:border-[#3e3e42] bg-white dark:bg-[#232325] text-slate-900 dark:text-[#ececee] focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500"
              />
            </label>
          )}

          {/* Observações Gerais */}
          <label className="flex flex-col gap-1 font-medium text-slate-700 dark:text-slate-300">
            <span>Observação</span>
            <input
              type="text"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex: Ordem de produção #104, reposição preventiva, etc."
              className="p-2.5 rounded-md border border-slate-300 dark:border-[#3e3e42] bg-white dark:bg-[#232325] text-slate-900 dark:text-[#ececee] focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500"
            />
          </label>

          {/* Botão de Envio */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`mt-4 w-full h-9 px-4 rounded-md text-xs font-semibold text-white transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
              isEntrada
                ? 'bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500'
                : 'bg-rose-600 hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-500'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processando movimentação...</span>
              </>
            ) : (
              <>
                {isEntrada ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                <span>{isEntrada ? 'Registrar entrada' : 'Registrar retirada'}</span>
              </>
            )}
          </button>
        </form>
      </aside>
    </div>
  );
}
