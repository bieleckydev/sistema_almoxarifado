'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Users, AlertCircle, Loader2 } from 'lucide-react';
import { useCriarCliente } from '@/web/hooks/useClientes';
import { useToast } from '@/web/hooks/useToast';
import {
  type TipoParceiro,
  TIPO_PARCEIRO_LABELS,
} from '@/core/domain/cliente.schema';

export interface ClientCreateDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onClientCreated?: () => void;
}

const OPCOES_TIPO: Array<{ valor: TipoParceiro; label: string }> = [
  { valor: 'CLIENTE', label: TIPO_PARCEIRO_LABELS.CLIENTE },
  { valor: 'FORNECEDOR', label: TIPO_PARCEIRO_LABELS.FORNECEDOR },
  { valor: 'TRANSPORTADORA', label: TIPO_PARCEIRO_LABELS.TRANSPORTADORA },
  { valor: 'OUTRO', label: TIPO_PARCEIRO_LABELS.OUTRO },
];

export function ClientCreateDrawer({
  isOpen,
  onClose,
  onClientCreated,
}: ClientCreateDrawerProps) {
  const { toast } = useToast();
  const criarClienteMutation = useCriarCliente();

  const [tipo, setTipo] = useState<TipoParceiro>('CLIENTE');
  const [nome, setNome] = useState('');
  const [documento, setDocumento] = useState('');
  const [contato, setContato] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cidade, setCidade] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Reset de campos ao abrir
  useEffect(() => {
    if (isOpen) {
      setTipo('CLIENTE');
      setNome('');
      setDocumento('');
      setContato('');
      setTelefone('');
      setCidade('');
      setErro(null);
    }
  }, [isOpen]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    const nomeFormatado = nome.trim();
    if (!nomeFormatado || nomeFormatado.length < 2) {
      setErro('Informe o nome ou razão social (mínimo 2 caracteres).');
      return;
    }

    try {
      await criarClienteMutation.mutateAsync({
        tipo,
        nome: nomeFormatado,
        documento: documento.trim() || undefined,
        contato: contato.trim() || undefined,
        telefone: telefone.trim() || undefined,
        cidade: cidade.trim() || undefined,
        ativo: true,
      });

      toast(`Parceiro ${nomeFormatado} cadastrado com sucesso!`, { type: 'success' });
      onClientCreated?.();
      onClose();
    } catch (err: any) {
      setErro(err?.message || 'Falha ao salvar cadastro. Verifique os dados.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop escurecido */}
      <div
        className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Painel Deslizante Lateral */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Novo cadastro de parceiro"
        className="relative w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col h-full z-10 overflow-y-auto animate-in slide-in-from-right duration-250"
      >
        {/* Cabeçalho */}
        <div className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm z-20 px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                Novo cadastro
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Clientes, fornecedores, transportadoras e contatos.
              </p>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar painel"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 flex-1">
          {erro && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{erro}</span>
            </div>
          )}

          {/* Tipo do Parceiro */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Tipo <span className="text-rose-500">*</span>
            </label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoParceiro)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {OPCOES_TIPO.map((opt) => (
                <option key={opt.valor} value={opt.valor}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Nome ou Razão Social */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Nome ou razão social <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Grajaú Motos Distribuidora Ltda"
              required
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* CNPJ / CPF */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              CNPJ / CPF
            </label>
            <input
              type="text"
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
              placeholder="00.000.000/0001-00 ou 000.000.000-00"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
            />
          </div>

          {/* Linha Dupla: Contato e Telefone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Contato
              </label>
              <input
                type="text"
                value={contato}
                onChange={(e) => setContato(e.target.value)}
                placeholder="Ex: João Silva"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Telefone
              </label>
              <input
                type="text"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(11) 98765-4321"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>

          {/* Cidade */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Cidade
            </label>
            <input
              type="text"
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              placeholder="Ex: São Paulo, Diadema, Curitiba"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Botões de Ação */}
          <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={criarClienteMutation.isPending}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={criarClienteMutation.isPending}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#1d4ea3] dark:bg-[#3273dc] hover:bg-blue-800 dark:hover:bg-blue-600 text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {criarClienteMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando cadastro...</span>
                </>
              ) : (
                <span>Salvar cadastro</span>
              )}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
