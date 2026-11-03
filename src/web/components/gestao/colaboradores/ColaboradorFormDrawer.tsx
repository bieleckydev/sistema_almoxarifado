'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Ban, HardHat, Loader2, RotateCcw, Save, X } from 'lucide-react';
import {
  type Colaborador,
  type SetorFabril,
  SETOR_FABRIL_LABELS,
} from '@/core/domain/colaborador.schema';
import { useAtualizarColaborador, useCriarColaborador } from '@/web/hooks/useColaboradores';
import { useToast } from '@/web/hooks/useToast';

export interface ColaboradorFormDrawerProps {
  isOpen: boolean;
  /** Colaborador em edição. Quando nulo, o drawer cadastra um novo. */
  colaborador: Colaborador | null;
  onClose: () => void;
}

const SETORES = Object.keys(SETOR_FABRIL_LABELS) as SetorFabril[];

const CAMPO =
  'w-full px-3 py-2 bg-surface-container-low text-on-surface text-xs rounded-xl border border-outline-variant/30 focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all';

/**
 * Painel lateral para cadastrar, editar, inativar e reativar colaboradores fabris.
 * Não há exclusão física: as baixas internas já registradas referenciam o colaborador.
 */
export function ColaboradorFormDrawer({ isOpen, colaborador, onClose }: ColaboradorFormDrawerProps) {
  const { toast } = useToast();
  const criar = useCriarColaborador();
  const atualizar = useAtualizarColaborador();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const emEdicao = colaborador !== null;
  const salvando = criar.isPending || atualizar.isPending;

  const [matricula, setMatricula] = useState('');
  const [nome, setNome] = useState('');
  const [setor, setSetor] = useState<SetorFabril>('MONTAGEM');
  const [funcao, setFuncao] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [confirmandoInativacao, setConfirmandoInativacao] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setMatricula(colaborador?.matricula ?? '');
    setNome(colaborador?.nome ?? '');
    setSetor(colaborador?.setor ?? 'MONTAGEM');
    setFuncao(colaborador?.funcao ?? '');
    setEmail(colaborador?.email ?? '');
    setTelefone(colaborador?.telefone ?? '');
    setObservacoes(colaborador?.observacoes ?? '');
    setErro(null);
    setConfirmandoInativacao(false);
  }, [isOpen, colaborador]);

  // Mantém a referência mais recente de onClose sem refazer o efeito de foco a cada render.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => closeButtonRef.current?.focus(), 50);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const mensagemDeErro = (err: unknown) =>
    (err as { message?: string })?.message || 'Não foi possível salvar o colaborador.';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (!/^\d{1,5}$/.test(matricula.trim())) {
      setErro('A matrícula deve ter apenas números (até 5 dígitos).');
      return;
    }
    if (nome.trim().length < 3) {
      setErro('O nome deve ter pelo menos 3 caracteres.');
      return;
    }
    if (funcao.trim().length < 2) {
      setErro('Informe a função do colaborador.');
      return;
    }

    const dados = {
      matricula: matricula.trim(),
      nome: nome.trim(),
      setor,
      funcao: funcao.trim(),
      email: email.trim(),
      telefone: telefone.trim(),
      observacoes: observacoes.trim(),
    };

    try {
      if (colaborador) {
        await atualizar.mutateAsync({ id: colaborador.id, dados });
        toast(`Colaborador ${dados.nome} atualizado.`, { type: 'success' });
      } else {
        await criar.mutateAsync({ ...dados, ativo: true });
        toast(`Colaborador ${dados.nome} cadastrado.`, { type: 'success' });
      }
      onClose();
    } catch (err) {
      setErro(mensagemDeErro(err));
    }
  };

  const alterarStatus = async (ativo: boolean) => {
    if (!colaborador) return;
    setErro(null);
    try {
      await atualizar.mutateAsync({ id: colaborador.id, dados: { ativo } });
      toast(ativo ? `${colaborador.nome} reativado.` : `${colaborador.nome} inativado.`, {
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
        className="fixed inset-0 bg-inverse-surface/60 transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={emEdicao ? `Editar colaborador ${colaborador?.nome}` : 'Novo colaborador'}
        className="relative w-full max-w-lg bg-surface-container-lowest border-l border-outline-variant/30 flex flex-col h-full z-10 overflow-y-auto animate-in slide-in-from-right duration-250"
      >
        <div className="sticky top-0 bg-surface-container-lowest z-20 px-6 py-4 border-b border-outline-variant/20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center shrink-0">
              <HardHat className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-headline text-lg font-bold text-on-surface leading-tight">
                {emEdicao ? 'Editar colaborador' : 'Novo colaborador'}
              </h2>
              {colaborador && (
                <p className="text-xs text-on-surface-variant mt-0.5 truncate">
                  <span className="font-mono">{colaborador.matricula}</span> · {colaborador.nome}
                  {!colaborador.ativo && ' · inativo'}
                </p>
              )}
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="colab-matricula" className="text-xs font-semibold text-on-surface-variant">
                Matrícula <span className="text-error">*</span>
              </label>
              <input
                id="colab-matricula"
                type="text"
                inputMode="numeric"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value.replace(/\D/g, '').slice(0, 5))}
                placeholder="042"
                required
                className={`${CAMPO} font-mono`}
              />
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label htmlFor="colab-nome" className="text-xs font-semibold text-on-surface-variant">
                Nome completo <span className="text-error">*</span>
              </label>
              <input
                id="colab-nome"
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                className={`${CAMPO} font-medium`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="colab-setor" className="text-xs font-semibold text-on-surface-variant">
                Setor <span className="text-error">*</span>
              </label>
              <select
                id="colab-setor"
                value={setor}
                onChange={(e) => setSetor(e.target.value as SetorFabril)}
                className={`${CAMPO} cursor-pointer`}
              >
                {SETORES.map((s) => (
                  <option key={s} value={s}>
                    {SETOR_FABRIL_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="colab-funcao" className="text-xs font-semibold text-on-surface-variant">
                Função <span className="text-error">*</span>
              </label>
              <input
                id="colab-funcao"
                type="text"
                value={funcao}
                onChange={(e) => setFuncao(e.target.value)}
                placeholder="Ex: Soldador"
                required
                className={CAMPO}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="colab-email" className="text-xs font-semibold text-on-surface-variant">
                E-mail
              </label>
              <input
                id="colab-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={CAMPO}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="colab-tel" className="text-xs font-semibold text-on-surface-variant">
                Telefone
              </label>
              <input
                id="colab-tel"
                type="text"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className={`${CAMPO} font-mono`}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="colab-obs" className="text-xs font-semibold text-on-surface-variant">
              Observações
            </label>
            <textarea
              id="colab-obs"
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className={`${CAMPO} resize-none`}
            />
          </div>

          {colaborador && (
            <section className="mt-2 p-3 rounded-xl border border-outline-variant/30 bg-surface-container-low flex flex-col gap-2">
              {colaborador.ativo ? (
                confirmandoInativacao ? (
                  <>
                    <p className="text-xs text-on-surface">
                      Inativar <strong>{colaborador.nome}</strong>? Ele deixa de aparecer na seleção de
                      baixas internas. As retiradas já registradas continuam no histórico e você pode
                      reativar depois.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => alterarStatus(false)}
                        disabled={salvando}
                        className="h-8 px-3 rounded-lg text-xs font-semibold text-on-error bg-error hover:bg-error/90 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Confirmar inativação
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmandoInativacao(false)}
                        disabled={salvando}
                        className="h-8 px-3 rounded-lg text-xs font-semibold text-secondary hover:bg-surface-container border border-outline-variant/30 cursor-pointer"
                      >
                        Voltar
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-on-surface-variant">Colaborador ativo</span>
                    <button
                      type="button"
                      onClick={() => setConfirmandoInativacao(true)}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-error hover:bg-error-container/40 border border-error/30 transition-colors cursor-pointer"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      Inativar
                    </button>
                  </div>
                )
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-on-surface-variant">Colaborador inativo</span>
                  <button
                    type="button"
                    onClick={() => alterarStatus(true)}
                    disabled={salvando}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-primary hover:bg-primary-container/20 border border-primary/30 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reativar
                  </button>
                </div>
              )}
            </section>
          )}

          <div className="mt-auto pt-4 border-t border-outline-variant/20 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={salvando}
              className="h-10 px-4 rounded-xl text-xs font-semibold text-secondary hover:text-on-surface hover:bg-surface-container border border-outline-variant/30 transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="h-10 px-5 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-on-primary transition-all flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{emEdicao ? 'Salvar alterações' : 'Cadastrar colaborador'}</span>
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
