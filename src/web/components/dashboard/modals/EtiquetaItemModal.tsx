'use client';

import React, { useRef, useEffect } from 'react';
import { X, Printer, QrCode, Tag, Warehouse, Calendar, Check } from 'lucide-react';
import { type DashboardItem, UNIDADE_LABELS } from '@/web/data/mock-almoxarifado';
import { useAuthStore } from '@/core/store/useAuthStore';

export interface EtiquetaItemModalProps {
  item: DashboardItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EtiquetaItemModal({
  item,
  isOpen,
  onClose,
}: EtiquetaItemModalProps) {
  const { user } = useAuthStore();
  const printContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !item) return null;

  const dataAtualFormatada = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const handlePrint = () => {
    window.print();
  };

  // Simulação de padrão de código de barras 128 com larguras estilizadas
  const barras = [2, 1, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 3, 1, 2, 4, 1, 2, 1, 3, 2, 4, 1, 2, 3, 1, 4, 1, 2];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-inverse-surface/60 transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Etiqueta de identificação ${item.codigo}`}
        className="relative w-full max-w-lg bg-surface-container-lowest border border-outline-variant/30 rounded-2xl z-10 overflow-hidden flex flex-col"
      >
        {/* Cabeçalho */}
        <div className="px-6 py-4 border-b border-outline-variant/20 flex items-center justify-between bg-surface-container-low">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-on-surface">Etiqueta Térmica de Identificação</h3>
              <p className="text-xs text-secondary">Padrão Almoxarife 3.0 para prateleiras e caixas</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Visualizador da Etiqueta (Estilo Térmico 80x50mm) */}
        <div className="p-6 bg-surface-container flex flex-col items-center justify-center">
          <div
            ref={printContainerRef}
            id="etiqueta-para-impressao"
            className="w-full max-w-[360px] bg-white text-black p-4 rounded-lg shadow-md border-2 border-dashed border-gray-400 select-none print:border-none print:shadow-none print:m-0 print:p-2"
          >
            {/* Topo da Etiqueta: Header & SKU */}
            <div className="flex items-start justify-between border-b-2 border-black pb-2 mb-2">
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest block text-gray-700">
                  ALMOXARIFADO CENTRAL
                </span>
                <span className="text-lg font-black font-mono tracking-tight text-black leading-none">
                  {item.codigo}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-gray-600 block">
                  {item.categoria}
                </span>
                <span className="text-xs font-bold text-black font-mono">
                  {item.estoqueAtual} {UNIDADE_LABELS[item.unidade] || item.unidade}
                </span>
              </div>
            </div>

            {/* Descrição do Produto */}
            <div className="mb-3">
              <h4 className="text-sm font-bold uppercase leading-snug line-clamp-2 text-black">
                {item.descricao}
              </h4>
              <div className="mt-1 flex items-center gap-1 text-[11px] font-mono text-gray-800">
                <Warehouse className="w-3 h-3 shrink-0" />
                <span>Local: <strong>{item.localizacaoFisica || 'NÃO DEFINIDO'}</strong></span>
              </div>
            </div>

            {/* Código de Barras Vetorial */}
            <div className="flex flex-col items-center justify-center bg-gray-50 p-2 rounded border border-gray-200 mb-2">
              <div className="flex items-center gap-[2px] h-10 w-full justify-center">
                {barras.map((b, i) => (
                  <div
                    key={i}
                    style={{ width: `${b * 2}px` }}
                    className="h-full bg-black shrink-0"
                  />
                ))}
              </div>
              <span className="font-mono text-[10px] font-bold tracking-widest text-black mt-1">
                *{item.codigo}*
              </span>
            </div>

            {/* Rodapé da Etiqueta */}
            <div className="flex items-center justify-between text-[9px] text-gray-600 pt-1 border-t border-gray-300">
              <span>Emissão: {dataAtualFormatada}</span>
              <span>Op: {user?.name || 'Sistema'}</span>
            </div>
          </div>
        </div>

        {/* Rodapé com Ações */}
        <div className="px-6 py-4 border-t border-outline-variant/20 flex items-center justify-between bg-surface-container-low">
          <span className="text-xs text-secondary">
            Compatível com impressoras térmicas (Zebra, Elgin, Argox)
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-secondary hover:text-on-surface rounded-lg hover:bg-surface-container transition-colors cursor-pointer"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-on-primary bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Etiqueta</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
