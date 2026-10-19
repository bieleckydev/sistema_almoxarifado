'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  PackagePlus,
  Building2,
  FileText,
  Calendar,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { useClientes } from '@/web/hooks/useClientes';
import type { ReceberMaterialTerceiroInput } from '@/core/domain/material-terceiro.schema';
import { useToast } from '@/web/hooks/useToast';

export interface ReceberTerceiroDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSalvar: (dados: ReceberMaterialTerceiroInput) => Promise<void>;
  isSalvando?: boolean;
}

export function ReceberTerceiroDrawer({
  isOpen,
  onClose,
  onSalvar,
  isSalvando = false,
}: ReceberTerceiroDrawerProps) {
  const { toast } = useToast();
  const { clientes, isLoading: isLoadingClientes } = useClientes();
  const primeiroInputRef = useRef<HTMLSelectElement | null>(null);

  const hoje = new Date().toISOString().slice(0, 10);

  const [clienteId, setClienteId] = useState('');
  const [descricao, setDescricao] = useState('');
  const [codigoSku, setCodigoSku] = useState('');
  const [unidade, setUnidade] = useState('un');
  const [quantidade, setQuantidade] = useState<number | ''>(1);
  const [numeroNFRemessa, setNumeroNFRemessa] = useState('');
  const [dataRecebimento, setDataRecebimento] = useState(hoje);
  const [responsavel, setResponsavel] = useState('Recebimento Almoxarifado');
  const [observacao, setObservacao] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  // Filtra clientes elegíveis como parceiros/proprietários
  const clientesDisponiveis = clientes.filter(
    (c) => c.tipo === 'CLIENTE' || c.tipo === 'OUTRO' || !c.tipo
  );

  useEffect(() => {
    if (isOpen) {
      setDescricao('');
      setCodigoSku('');
      setUnidade('un');
      setQuantidade(1);
      setNumeroNFRemessa('');
      setDataRecebimento(new Date().toISOString().slice(0, 10));
      setResponsavel('Recebimento Almoxarifado');
      setObservacao('');
      setErro(null);

      if (clientesDisponiveis.length > 0 && !clienteId) {
        setClienteId(clientesDisponiveis[0].id);
      }

      setTimeout(() => primeiroInputRef.current?.focus(), 150);
    }
  }, [isOpen, clientesDisponiveis.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (!clienteId) {
      setErro('Selecione o cliente proprietário do material.');
      return;
    }
    if (!descricao.trim()) {
      setErro('Informe a descrição do material recebido.');
      return;
    }
    if (!quantidade || Number(quantidade) <= 0) {
      setErro('A quantidade recebida deve ser maior que zero.');
      return;
    }
    if (!numeroNFRemessa.trim()) {
      setErro('Informe o número da NF-e de remessa do cliente.');
      return;
    }

    try {
      await onSalvar({
        clienteId,
        descricao: descricao.trim(),
        codigoSku: codigoSku.trim() || undefined,
        unidade: unidade.trim() || 'un',
        quantidade: Number(quantidade),
        numeroNFRemessa: numeroNFRemessa.trim(),
        dataRecebimento,
        responsavel: responsavel.trim() || undefined,
        observacao: observacao.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setErro(err.message || 'Erro ao registrar remessa de terceiro.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-fade-in">
      <div
        className="w-full max-w-xl bg-surface-container-lowest dark:bg-slate-900 h-full shadow-2xl flex flex-col border-l border-outline-variant/30 animate-slide-left"
        role="dialog"
        aria-modal="true"
      >
        {/* Cabeçalho */}
        <div className="p-5 border-b border-outline-variant/30 flex items-center justify-between bg-surface-container-low dark:bg-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Receber Material de Terceiro
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Remessa de cliente para industrialização por encomenda
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {erro && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{erro}</span>
            </div>
          )}

          {/* Cliente Proprietário */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Cliente Proprietário (Contratante) *
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 absolute left-3 top-3 text-slate-400 pointer-events-none" />
              <select
                ref={primeiroInputRef}
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                disabled={isLoadingClientes || isSalvando}
                className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl bg-surface-container-low dark:bg-slate-800 border border-outline-variant/40 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Selecione o cliente proprietário...</option>
                {clientesDisponiveis.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome} {c.cidade ? `(${c.cidade})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Descrição do Material */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Descrição do Material / Peça do Cliente *
            </label>
            <input
              type="text"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Chapa Aço 1020 3mm x 1200 x 2000mm ou Peça Fundida Bruta"
              disabled={isSalvando}
              className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container-low dark:bg-slate-800 border border-outline-variant/40 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Código SKU do Cliente & Unidade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Código / SKU no Cliente (Opcional)
              </label>
              <input
                type="text"
                value={codigoSku}
                onChange={(e) => setCodigoSku(e.target.value)}
                placeholder="Ex: TERC-CHP-01"
                disabled={isSalvando}
                className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container-low dark:bg-slate-800 border border-outline-variant/40 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Unidade de Medida *
              </label>
              <select
                value={unidade}
                onChange={(e) => setUnidade(e.target.value)}
                disabled={isSalvando}
                className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container-low dark:bg-slate-800 border border-outline-variant/40 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="un">Unidade (un)</option>
                <option value="peca">Peça (pç)</option>
                <option value="chapa">Chapa</option>
                <option value="barra">Barra</option>
                <option value="kg">Quilograma (kg)</option>
                <option value="m">Metro (m)</option>
                <option value="m2">Metro Quadrado (m²)</option>
                <option value="rolo">Rolo / Bobina</option>
              </select>
            </div>
          </div>

          {/* Quantidade e NF de Remessa */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Quantidade Recebida *
              </label>
              <input
                type="number"
                min="0.001"
                step="any"
                value={quantidade}
                onChange={(e) =>
                  setQuantidade(e.target.value === '' ? '' : Number(e.target.value))
                }
                disabled={isSalvando}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-surface-container-low dark:bg-slate-800 border border-outline-variant/40 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Nº NF-e de Remessa do Cliente *
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={numeroNFRemessa}
                  onChange={(e) => setNumeroNFRemessa(e.target.value)}
                  placeholder="Ex: 44812"
                  disabled={isSalvando}
                  className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl bg-surface-container-low dark:bg-slate-800 border border-outline-variant/40 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Data do Recebimento e Responsável */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Data do Recebimento *
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="date"
                  value={dataRecebimento}
                  onChange={(e) => setDataRecebimento(e.target.value)}
                  disabled={isSalvando}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-surface-container-low dark:bg-slate-800 border border-outline-variant/40 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Responsável / Setor Recebedor
              </label>
              <input
                type="text"
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
                disabled={isSalvando}
                className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container-low dark:bg-slate-800 border border-outline-variant/40 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Observações / Instruções de Beneficiamento
            </label>
            <textarea
              rows={3}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex: Material sob custódia para corte a laser e dobra conforme projeto do cliente."
              disabled={isSalvando}
              className="w-full px-3 py-2 text-xs rounded-xl bg-surface-container-low dark:bg-slate-800 border border-outline-variant/40 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Banner de Aviso de Saldo Segregado */}
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-start gap-2.5">
            <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
              <strong>Estoque Segregado:</strong> Este material será mantido em saldo apartado
              sob custódia do cliente, não integrando o ativo de estoque próprio e não interferindo
              no cálculo de compras da empresa.
            </p>
          </div>
        </form>

        {/* Rodapé com Ações */}
        <div className="p-4 border-t border-outline-variant/30 bg-surface-container-low dark:bg-slate-800/60 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSalvando}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-xl transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSalvando}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {isSalvando ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Registrando Remessa...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Salvar e Dar Entrada</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
