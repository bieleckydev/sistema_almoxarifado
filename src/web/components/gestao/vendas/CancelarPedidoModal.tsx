'use client';

import React, { useState } from 'react';
import { X, AlertTriangle, Ban } from 'lucide-react';
import type { PedidoEnriquecido } from '@/web/app/api/pedidos/route';
import { useSubmitLock } from '@/web/hooks/useSubmitLock';
import { formatarMoedaBrl } from '@/core/services/custo-medio';

export interface CancelarPedidoModalProps {
  pedido: PedidoEnriquecido | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmar: (pedidoId: string, motivo: string) => Promise<void>;
}

export function CancelarPedidoModal({
  pedido,
  isOpen,
  onClose,
  onConfirmar,
}: CancelarPedidoModalProps) {
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const { isSubmitting, runWithLock } = useSubmitLock(900);

  if (!isOpen || !pedido) return null;

  const handleConfirmar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    const motivoTrim = motivo.trim();
    if (!motivoTrim || motivoTrim.length < 5) {
      setErro('Informe um motivo com no mínimo 5 caracteres.');
      return;
    }

    await runWithLock(async () => {
      try {
        await onConfirmar(pedido.id, motivoTrim);
        setMotivo('');
        onClose();
      } catch (err: unknown) {
        setErro((err as Error)?.message || 'Erro ao cancelar o pedido.');
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
      <div className="w-full max-w-md rounded-2xl bg-surface-container-lowest border border-outline-variant/30 overflow-hidden animate-scale-up">
        {/* Header com Alerta */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-outline-variant/20 bg-error-container/20">
          <div className="flex items-center gap-2.5 text-error">
            <div className="p-2 rounded-xl bg-error/10 text-error">
              <Ban className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-headline-sm text-sm font-bold text-on-surface">
                Cancelar Pedido #{pedido.numeroSequencial || pedido.id}
              </h3>
              <p className="text-xs text-on-surface-variant">
                Esta ação é irreversível
              </p>
            </div>
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

        {/* Formulário */}
        <form onSubmit={handleConfirmar} className="p-4 sm:p-5 flex flex-col gap-4">
          {/* Resumo do Pedido */}
          <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20 text-xs flex flex-col gap-1">
            <div className="flex justify-between">
              <span className="text-outline">Cliente:</span>
              <span className="font-semibold text-on-surface truncate max-w-[220px]">
                {pedido.clienteNome}
              </span>
            </div>
            {pedido.valorTotal !== undefined && pedido.valorTotal > 0 && (
              <div className="flex justify-between">
                <span className="text-outline">Valor total:</span>
                <span className="font-semibold text-on-surface">
                  {formatarMoedaBrl(pedido.valorTotal)}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-outline">Itens:</span>
              <span className="text-on-surface">
                {pedido.itensDetalhes?.length || pedido.itens?.length || 0} produto(s)
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-200/50 dark:border-amber-800/40">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              O pedido será cancelado imediatamente e deixará de constar nas entregas pendentes.
            </span>
          </div>

          {/* Campo Motivo */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="motivo-cancelamento"
              className="text-xs font-semibold text-on-surface flex items-center justify-between"
            >
              <span>Motivo do Cancelamento <span className="text-error">*</span></span>
              <span className="text-[10px] text-outline">Mínimo 5 caracteres</span>
            </label>
            <textarea
              id="motivo-cancelamento"
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex: Cliente desistiu da compra / Erro de especificação de item..."
              required
              className="w-full text-xs p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/40 focus:border-error focus:ring-1 focus:ring-error text-on-surface placeholder:text-outline/60 resize-none"
            />
          </div>

          {erro && (
            <p className="text-xs text-error font-medium bg-error-container/20 p-2 rounded-lg">
              {erro}
            </p>
          )}

          {/* Ações */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/20">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-8 px-3 rounded-lg text-xs font-medium text-secondary hover:text-on-surface bg-surface-container-low hover:bg-surface-container transition-colors cursor-pointer"
            >
              Voltar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || motivo.trim().length < 5}
              className="h-8 px-3.5 rounded-lg text-xs font-semibold text-on-error bg-error hover:bg-error/90 disabled:opacity-50 transition-colors cursor-pointer shadow-xs"
            >
              {isSubmitting ? 'Cancelando...' : 'Confirmar Cancelamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
