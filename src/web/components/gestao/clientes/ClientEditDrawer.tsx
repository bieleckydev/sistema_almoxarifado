'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Ban, Building2, Loader2, RotateCcw, Save, X } from 'lucide-react';
import { useAtualizarCliente } from '@/web/hooks/useClientes';
import { useToast } from '@/web/hooks/useToast';
import {
  type Cliente,
  type TipoParceiro,
  TIPO_PARCEIRO_LABELS,
} from '@/core/domain/cliente.schema';

export interface ClientEditDrawerProps {
  cliente: Cliente | null;
  onClose: () => void;
}

const TIPOS: TipoParceiro[] = ['CLIENTE', 'FORNECEDOR', 'TRANSPORTADORA', 'OUTRO'];

const CAMPO =
  'w-full px-3 py-2 bg-surface-container-low text-on-surface text-xs rounded-xl border border-outline-variant/30 focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all';

/**
 * Painel lateral para editar, inativar ou reativar um parceiro comercial.
 * Não há exclusão física: o parceiro inativo continua nos pedidos e notas já emitidos.
 */
export function ClientEditDrawer({ cliente, onClose }: ClientEditDrawerProps) {
  const { toast } = useToast();
  const atualizar = useAtualizarCliente();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const [tipo, setTipo] = useState<TipoParceiro>('CLIENTE');
  const [nome, setNome] = useState('');
  const [documento, setDocumento] = useState('');
  const [contato, setContato] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cidade, setCidade] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [confirmandoInativacao, setConfirmandoInativacao] = useState(false);

  const isOpen = cliente !== null;

  useEffect(() => {
    if (!cliente) return;
    setTipo(cliente.tipo);
    setNome(cliente.nome);
    setDocumento(cliente.documento ?? '');
    setContato(cliente.contato ?? '');
    setTelefone(cliente.telefone ?? '');
    setCidade(cliente.cidade ?? '');
    setErro(null);
    setConfirmandoInativacao(false);
  }, [cliente]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => closeButtonRef.current?.focus(), 50);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!cliente) return null;

  const mensagemDeErro = (err: unknown) =>
    (err as { message?: string })?.message || 'Não foi possível salvar o cadastro.';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (nome.trim().length < 2) {
      setErro('Informe o nome ou razão social (mínimo 2 caracteres).');
      return;
    }
    try {
      await atualizar.mutateAsync({
        id: cliente.id,
        dados: {
          tipo,
          nome: nome.trim(),
          documento: documento.trim(),
          contato: contato.trim(),
          telefone: telefone.trim(),
          cidade: cidade.trim(),
        },
      });
      toast(`Cadastro de ${nome.trim()} atualizado.`, { type: 'success' });
      onClose();
    } catch (err) {
      setErro(mensagemDeErro(err));
    }
  };

  const alterarStatus = async (ativo: boolean) => {
    setErro(null);
    try {
      await atualizar.mutateAsync({ id: cliente.id, dados: { ativo } });
      toast(ativo ? `${cliente.nome} reativado.` : `${cliente.nome} inativado.`, {
        type: 'success',
      });
      onClose();
    } catch (err) {
      setErro(mensagemDeErro(err));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="fixed inset-0 bg-inverse-surface/60 transition-opacity duration-200 animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Editar cadastro de ${cliente.nome}`}
        className="relative w-full max-w-lg bg-surface-container-lowest border-l border-outline-variant/30 flex flex-col h-full z-10 overflow-y-auto animate-in slide-in-from-right duration-250"
      >
        <div className="sticky top-0 bg-surface-container-lowest z-20 px-6 py-4 border-b border-outline-variant/20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-headline text-lg font-bold text-on-surface leading-tight truncate">
                Editar cadastro
              </h2>
              <p className="text-xs text-on-surface-variant mt-0.5 truncate">
                {cliente.nome}
                {!cliente.ativo && ' · inativo'}
              </p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar painel"
            className="w-9 h-9 rounded-xl text-outline hover:text-on-surface bg-surface-container hover:bg-surface-container-high flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 flex-1">
          {erro && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-error-container/40 border border-error/20 text-error text-xs flex items-center gap-2.5"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-medium">{erro}</span>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label htmlFor="cli-tipo" className="text-xs font-semibold text-on-surface-variant">
              Categoria
            </label>
            <select
              id="cli-tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoParceiro)}
              className={`${CAMPO} cursor-pointer`}
            >
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {TIPO_PARCEIRO_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="cli-nome" className="text-xs font-semibold text-on-surface-variant">
              Nome / Razão social <span className="text-error">*</span>
            </label>
            <input
              id="cli-nome"
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              className={`${CAMPO} font-medium`}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="cli-doc" className="text-xs font-semibold text-on-surface-variant">
              CNPJ / CPF
            </label>
            <input
              id="cli-doc"
              type="text"
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
              className={`${CAMPO} font-mono`}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="cli-contato" className="text-xs font-semibold text-on-surface-variant">
              Contato comercial
            </label>
            <input
              id="cli-contato"
              type="text"
              value={contato}
              onChange={(e) => setContato(e.target.value)}
              className={CAMPO}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="cli-tel" className="text-xs font-semibold text-on-surface-variant">
                Telefone
              </label>
              <input
                id="cli-tel"
                type="text"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className={`${CAMPO} font-mono`}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="cli-cidade" className="text-xs font-semibold text-on-surface-variant">
                Cidade / UF
              </label>
              <input
                id="cli-cidade"
                type="text"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                className={CAMPO}
              />
            </div>
          </div>

          {/* Status do cadastro */}
          <section className="mt-2 p-3 rounded-xl border border-outline-variant/30 bg-surface-container-low flex flex-col gap-2">
            {cliente.ativo ? (
              confirmandoInativacao ? (
                <>
                  <p className="text-xs text-on-surface">
                    Inativar <strong>{cliente.nome}</strong>? O cadastro sai das listas e não poderá
                    receber novos pedidos. Pedidos e notas já lançados continuam intactos, e você pode
                    reativar depois.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => alterarStatus(false)}
                      disabled={atualizar.isPending}
                      className="h-8 px-3 rounded-lg text-xs font-semibold text-on-error bg-error hover:bg-error/90 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Confirmar inativação
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmandoInativacao(false)}
                      disabled={atualizar.isPending}
                      className="h-8 px-3 rounded-lg text-xs font-semibold text-secondary hover:bg-surface-container border border-outline-variant/30 cursor-pointer"
                    >
                      Voltar
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-on-surface-variant">Cadastro ativo</span>
                  <button
                    type="button"
                    onClick={() => setConfirmandoInativacao(true)}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-error hover:bg-error-container/40 border border-error/30 transition-colors cursor-pointer"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    Inativar cadastro
                  </button>
                </div>
              )
            ) : (
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-on-surface-variant">Cadastro inativo</span>
                <button
                  type="button"
                  onClick={() => alterarStatus(true)}
                  disabled={atualizar.isPending}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-primary hover:bg-primary-container/20 border border-primary/30 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reativar cadastro
                </button>
              </div>
            )}
          </section>

          <div className="mt-auto pt-4 border-t border-outline-variant/20 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={atualizar.isPending}
              className="h-10 px-4 rounded-xl text-xs font-semibold text-secondary hover:text-on-surface hover:bg-surface-container border border-outline-variant/30 transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={atualizar.isPending}
              className="h-10 px-5 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-on-primary transition-all flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              {atualizar.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Salvar alterações</span>
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
