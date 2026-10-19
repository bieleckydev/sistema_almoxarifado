'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  FileText,
  AlertCircle,
  Loader2,
  Calendar,
  CheckCircle2,
  DollarSign,
  Building2,
} from 'lucide-react';
import type { PedidoAFaturarItem } from '@/web/app/api/faturamento/route';
import { useToast } from '@/web/hooks/useToast';

export interface FaturarPedidoDrawerProps {
  isOpen: boolean;
  pedido: PedidoAFaturarItem | null;
  onClose: () => void;
  onFaturar: (dados: {
    pedidoId: string;
    numeroNF: string;
    serie: string;
    dataEmissao: string;
    dataVencimento?: string;
    observacoes?: string;
  }) => Promise<void>;
}

export function FaturarPedidoDrawer({
  isOpen,
  pedido,
  onClose,
  onFaturar,
}: FaturarPedidoDrawerProps) {
  const { toast } = useToast();
  const [numeroNF, setNumeroNF] = useState('');
  const [serie, setSerie] = useState('1');
  const [dataEmissao, setDataEmissao] = useState('');
  const [dataVencimento, setDataVencimento] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const numeroNFInputRef = useRef<HTMLInputElement>(null);

  // Inicializa datas e campos quando abre
  useEffect(() => {
    if (isOpen && pedido) {
      setNumeroNF('');
      setSerie('1');
      setObservacoes('');
      setErro(null);

      // Data de hoje para emissão
      const hoje = new Date();
      const offset = hoje.getTimezoneOffset() * 60000;
      const dataHojeStr = new Date(hoje.getTime() - offset).toISOString().slice(0, 10);
      setDataEmissao(dataHojeStr);

      // Vencimento em 30 dias
      const venc = new Date(hoje);
      venc.setDate(venc.getDate() + 30);
      const dataVencStr = new Date(venc.getTime() - offset).toISOString().slice(0, 10);
      setDataVencimento(dataVencStr);

      setTimeout(() => numeroNFInputRef.current?.focus(), 80);
    }
  }, [isOpen, pedido]);

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

  if (!isOpen || !pedido) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    const nfLimpa = numeroNF.trim();
    if (!nfLimpa) {
      setErro('Informe o número da NF-e.');
      return;
    }

    if (!dataEmissao) {
      setErro('Informe a data de emissão da nota fiscal.');
      return;
    }

    if (pedido.valorTotal <= 0) {
      setErro('O pedido está sem valor total calculado. Verifique os preços dos itens.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onFaturar({
        pedidoId: pedido.id,
        numeroNF: nfLimpa,
        serie: serie.trim() || '1',
        dataEmissao,
        dataVencimento: dataVencimento || undefined,
        observacoes: observacoes.trim() || undefined,
      });
      toast(`Pedido #${pedido.numeroSequencial || pedido.id} faturado com sucesso (NF-e ${nfLimpa})!`, {
        type: 'success',
      });
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { message?: string })?.message ||
        'Erro ao registrar faturamento. Tente novamente.';
      setErro(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const valorFormatado = (pedido.valorTotal || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-inverse-surface/60 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Faturar Pedido #${pedido.numeroSequencial}`}
        className="relative w-full max-w-lg bg-surface-container-lowest border-l border-outline-variant/30 flex flex-col h-full z-10 overflow-y-auto animate-in slide-in-from-right duration-250 shadow-2xl"
      >
        {/* Cabeçalho */}
        <div className="sticky top-0 bg-surface-container-lowest/95 backdrop-blur-md z-20 px-6 py-4 border-b border-outline-variant/20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-sm shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-headline text-lg font-bold text-on-surface leading-tight">
                Faturar Pedido #{pedido.numeroSequencial || pedido.id}
              </h2>
              <span className="text-xs text-secondary truncate max-w-xs block">
                {pedido.clienteNome} · Prazo entrega: {pedido.prazoEntrega.split('-').reverse().join('/')}
              </span>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
            aria-label="Fechar painel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="flex-1 p-6 flex flex-col gap-5">
          {erro && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-error-container text-on-error-container text-xs flex items-center gap-2.5 font-medium border border-error/20"
            >
              <AlertCircle className="w-4 h-4 text-error shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          {/* Resumo do Pedido & Valor Total */}
          <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/25 flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-secondary font-medium">Cliente:</span>
              <strong className="text-on-surface">{pedido.clienteNome}</strong>
            </div>

            {pedido.itensResumo && (
              <div className="flex items-start justify-between text-xs gap-2 pt-2 border-t border-outline-variant/15">
                <span className="text-secondary font-medium shrink-0">Itens:</span>
                <span className="text-on-surface text-right font-mono text-[11px] truncate max-w-[280px]">
                  {pedido.itensResumo}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-xs pt-2 border-t border-outline-variant/15">
              <span className="text-secondary font-medium">Total da Nota Fiscal:</span>
              <strong className="text-primary font-mono text-base font-extrabold">
                {valorFormatado}
              </strong>
            </div>
          </div>

          {/* Campos Fiscais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-on-surface">
                Número da NF-e *
              </label>
              <input
                ref={numeroNFInputRef}
                type="text"
                required
                placeholder="Ex: 1520"
                value={numeroNF}
                onChange={(e) => setNumeroNF(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono font-bold"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-on-surface">
                Série da NF-e
              </label>
              <input
                type="text"
                value={serie}
                onChange={(e) => setSerie(e.target.value)}
                placeholder="1"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-on-surface">
                Data de Emissão *
              </label>
              <input
                type="date"
                required
                value={dataEmissao}
                onChange={(e) => setDataEmissao(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-on-surface">
                Vencimento do Boleto / Duplicata
              </label>
              <input
                type="date"
                value={dataVencimento}
                onChange={(e) => setDataVencimento(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-on-surface">
              Observações Fiscais (opcional)
            </label>
            <textarea
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: Pagamento a 30 dias via boleto bancário"
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
            />
          </div>

          {/* Botões do Rodapé */}
          <div className="mt-auto pt-6 border-t border-outline-variant/20 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-10 px-4 rounded-xl text-xs font-medium text-secondary hover:text-on-surface hover:bg-surface-container border border-outline-variant/30 transition-all cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="h-10 px-5 rounded-xl text-xs font-semibold bg-primary hover:bg-primary/90 text-on-primary transition-all flex items-center gap-2 cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Emitindo NF-e...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Registrar Faturamento</span>
                </>
              )}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
