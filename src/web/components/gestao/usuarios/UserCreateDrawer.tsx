'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  UserPlus,
  Mail,
  User,
  Shield,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  KeyRound,
} from 'lucide-react';
import { useUsuariosAdmin } from '@/web/hooks/useUsuariosAdmin';
import { useToast } from '@/web/hooks/useToast';
import type { ManagedUserRole } from '@/core/domain/user.schema';

export interface UserCreateDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated?: () => void;
}

const PAPEIS_DISPONIVEIS: Array<{
  role: ManagedUserRole;
  titulo: string;
  subtitulo: string;
  descricao: string;
  badge: string;
}> = [
  {
    role: 'admin',
    titulo: 'Gestor (Admin)',
    subtitulo: 'Supervisão Operacional',
    descricao: 'Aprovação de requisições, estornos, contagem/ajuste de inventário, faturamento e auditoria.',
    badge: 'bg-zinc-800 text-zinc-100 dark:bg-zinc-200 dark:text-zinc-900',
  },
  {
    role: 'operador',
    titulo: 'Almoxarife (Operador)',
    subtitulo: 'Chão de Fábrica',
    descricao: 'Entradas de notas, saídas manuais, entregas, baixas rápidas e cadastro de materiais/clientes.',
    badge: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700',
  },
  {
    role: 'requisitante',
    titulo: 'Produção (Requisitante)',
    subtitulo: 'Linha Produtiva',
    descricao: 'Abertura e acompanhamento de requisições de matéria-prima e insumos de fabricação.',
    badge: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800',
  },
];

export function UserCreateDrawer({
  isOpen,
  onClose,
  onUserCreated,
}: UserCreateDrawerProps) {
  const { toast } = useToast();
  const { cadastrarUsuario, isCadastrando } = useUsuariosAdmin();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ManagedUserRole>('operador');
  const [sendInvite, setSendInvite] = useState(true);
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setNome('');
      setEmail('');
      setRole('operador');
      setSendInvite(true);
      setErroValidacao(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroValidacao(null);

    const nomeTrim = nome.trim();
    const emailTrim = email.trim();

    if (!nomeTrim) {
      setErroValidacao('Informe o nome completo do usuário.');
      return;
    }

    if (!emailTrim || !emailTrim.includes('@')) {
      setErroValidacao('Informe um e-mail válido.');
      return;
    }

    try {
      const res = await cadastrarUsuario({
        name: nomeTrim,
        email: emailTrim,
        role,
        sendInvite,
      });

      toast(`Usuário ${res.user.name} cadastrado com sucesso!`, { type: 'success' });
      onUserCreated?.();
      onClose();
    } catch (err: unknown) {
      const errorMsg =
        (err as any)?.response?.data?.error ||
        (err as any)?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Falha ao cadastrar novo usuário no sistema.');
      setErroValidacao(errorMsg);
      toast(errorMsg, { type: 'error' });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isCadastrando) onClose();
      }}
    >
      <aside
        className="w-full max-w-lg bg-surface-container-lowest h-full shadow-2xl flex flex-col border-l border-outline-variant/30 animate-slide-left"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-novo-usuario-titulo"
      >
        {/* Cabeçalho do Drawer */}
        <div className="flex items-center justify-between p-5 border-b border-outline-variant/20 bg-surface-container-low/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center shadow-xs">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="drawer-novo-usuario-titulo"
                className="text-base font-bold text-on-surface tracking-tight"
              >
                Novo Cadastro de Usuário
              </h2>
              <p className="text-xs text-on-surface-variant">
                Adicione um novo colaborador e defina seu papel de acesso operacional.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isCadastrando}
            className="p-2 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer disabled:opacity-50"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-6">
          {erroValidacao && (
            <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-start gap-2.5 text-xs text-red-800 dark:text-red-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
              <span>{erroValidacao}</span>
            </div>
          )}

          {/* Dados Principais */}
          <div className="space-y-4">
            <div>
              <label
                htmlFor="user-nome"
                className="block text-xs font-semibold text-on-surface mb-1.5"
              >
                Nome Completo *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                <input
                  id="user-nome"
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Carlos Eduardo Silveira"
                  className="w-full pl-9 pr-3 py-2 bg-surface-container-low text-on-surface text-xs rounded-lg border border-outline-variant/30 focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 transition-all"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="user-email"
                className="block text-xs font-semibold text-on-surface mb-1.5"
              >
                E-mail Corporativo *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                <input
                  id="user-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="carlos.silveira@empresa.com.br"
                  className="w-full pl-9 pr-3 py-2 bg-surface-container-low text-on-surface text-xs rounded-lg border border-outline-variant/30 focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 transition-all font-mono"
                />
              </div>
              <p className="text-[11px] text-on-surface-variant mt-1">
                Utilizado para o login no sistema e envio das credenciais de acesso.
              </p>
            </div>
          </div>

          {/* Seleção do Papel Operacional (RBAC 3.0) */}
          <div className="space-y-2.5 pt-2 border-t border-outline-variant/20">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-on-surface">
                Papel de Acesso Operacional (RBAC) *
              </label>
              <span className="text-[11px] text-zinc-400">Padrão 3.0</span>
            </div>

            <div className="space-y-2">
              {PAPEIS_DISPONIVEIS.map((p) => {
                const isSelected = role === p.role;
                return (
                  <div
                    key={p.role}
                    onClick={() => setRole(p.role)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
                      isSelected
                        ? 'border-zinc-900 bg-zinc-50/50 dark:border-white dark:bg-zinc-800/60 ring-1 ring-zinc-900/10 dark:ring-white/10'
                        : 'border-outline-variant/30 hover:border-outline-variant/60 bg-surface-container-low/40'
                    }`}
                  >
                    <div className="mt-0.5">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected
                            ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900'
                            : 'border-zinc-400 bg-transparent'
                        }`}
                      >
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-on-surface">{p.titulo}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${p.badge}`}>
                          {p.subtitulo}
                        </span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant mt-1 leading-relaxed">
                        {p.descricao}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Configuração de Envio de Convite & Segurança */}
          <div className="p-3.5 rounded-lg bg-surface-container-low/60 border border-outline-variant/30 space-y-3">
            <div className="flex items-start gap-2.5">
              <KeyRound className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="text-xs font-semibold text-on-surface block">
                  Segurança de Senhas
                </span>
                <p className="text-[11px] text-on-surface-variant mt-0.5 leading-relaxed">
                  Por conformidade estrita de segurança, nenhuma senha é digitada manualmente pelo administrador. O usuário receberá um convite por e-mail para cadastrar sua senha pessoal.
                </p>
              </div>
            </div>

            <label className="flex items-center gap-2.5 pt-2 border-t border-outline-variant/20 cursor-pointer">
              <input
                type="checkbox"
                checked={sendInvite}
                onChange={(e) => setSendInvite(e.target.checked)}
                className="w-4 h-4 rounded text-zinc-900 dark:text-white focus:ring-zinc-500 cursor-pointer"
              />
              <span className="text-xs font-medium text-on-surface">
                Enviar e-mail de convite e ativação imediatamente
              </span>
            </label>
          </div>
        </form>

        {/* Rodapé de Ações */}
        <div className="p-4 border-t border-outline-variant/20 bg-surface-container-low/50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isCadastrando}
            className="px-4 py-2 rounded-lg text-xs font-medium text-secondary hover:text-on-surface hover:bg-surface-container border border-outline-variant/30 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isCadastrando}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-white transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            {isCadastrando ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Cadastrando...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Salvar &amp; Criar Usuário</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </div>
  );
}
