'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  RefreshCw,
  Plus,
  Search,
  X,
  Users,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
  Mail,
  KeyRound,
  MoreVertical,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  Loader2,
  Lock,
} from 'lucide-react';
import { useUsuariosAdmin } from '@/web/hooks/useUsuariosAdmin';
import { useAuthStore } from '@/core/store/useAuthStore';
import { useToast } from '@/web/hooks/useToast';
import { ROTULO_PAPEL } from '@/core/domain/permissions';
import type { PublicUserProfile } from '@/core/domain/user-audit.schema';
import type { UserRole } from '@/core/domain/user.schema';

export interface UsuariosViewProps {
  onNovoUsuario: () => void;
}

type FiltroPapel = 'todos' | UserRole;
type FiltroStatus = 'todos' | 'ativo' | 'inativo';

export function UsuariosView({ onNovoUsuario }: UsuariosViewProps) {
  const { toast } = useToast();
  const { user: currentUser } = useAuthStore();

  const [busca, setBusca] = useState('');
  const [filtroPapel, setFiltroPapel] = useState<FiltroPapel>('todos');
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('todos');

  // Modal de Alteração de Papel
  const [usuarioParaMudarPapel, setUsuarioParaMudarPapel] = useState<PublicUserProfile | null>(null);
  const [novoPapelSelecionado, setNovoPapelSelecionado] = useState<UserRole>('operador');
  const [motivoMudancaPapel, setMotivoMudancaPapel] = useState('');
  const [isProcessandoPapel, setIsProcessandoPapel] = useState(false);

  // Hook TanStack Query
  const {
    usuarios,
    isLoading,
    isFetching,
    refetch,
    ativarUsuario,
    desativarUsuario,
    alterarPapel,
    enviarConvite,
    redefinirSenha,
    isAlterandoStatus,
  } = useUsuariosAdmin({
    busca: busca || undefined,
    role: filtroPapel === 'todos' ? undefined : filtroPapel,
    ativo: filtroStatus === 'todos' ? undefined : filtroStatus === 'ativo',
  });

  // Métricas rápidas baseadas no conjunto carregado
  const metricas = useMemo(() => {
    let mestres = 0;
    let admins = 0;
    let operadores = 0;
    let requisitantes = 0;
    let inativos = 0;

    for (const u of usuarios) {
      if (!u.ativo) inativos++;
      if (u.role === 'mestre') mestres++;
      else if (u.role === 'admin') admins++;
      else if (u.role === 'operador') operadores++;
      else if (u.role === 'requisitante') requisitantes++;
    }

    return {
      total: usuarios.length,
      mestres,
      admins,
      operadores,
      requisitantes,
      inativos,
    };
  }, [usuarios]);

  const handleToggleStatus = async (u: PublicUserProfile) => {
    if (u.id === currentUser?.id) {
      toast('Você não pode alterar o status da sua própria conta.', { type: 'error' });
      return;
    }

    try {
      if (u.ativo) {
        await desativarUsuario(u.id, 'Desativação solicitada via painel administrativo.');
        toast(`Usuário ${u.name} foi desativado.`, { type: 'success' });
      } else {
        await ativarUsuario(u.id, 'Reativação solicitada via painel administrativo.');
        toast(`Usuário ${u.name} foi reativado.`, { type: 'success' });
      }
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao alterar status do usuário.';
      toast(msg, { type: 'error' });
    }
  };

  const handleReenviarConvite = async (u: PublicUserProfile) => {
    try {
      await enviarConvite(u.id);
      toast(`Convite reenviado com sucesso para ${u.email}!`, { type: 'success' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao reenviar convite.';
      toast(msg, { type: 'error' });
    }
  };

  const handleRedefinirSenha = async (u: PublicUserProfile) => {
    try {
      await redefinirSenha(u.id);
      toast(`E-mail de redefinição de senha enviado para ${u.email}!`, { type: 'success' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao solicitar redefinição de senha.';
      toast(msg, { type: 'error' });
    }
  };

  const handleConfirmarMudancaPapel = async () => {
    if (!usuarioParaMudarPapel) return;
    setIsProcessandoPapel(true);
    try {
      await alterarPapel(
        usuarioParaMudarPapel.id,
        novoPapelSelecionado,
        motivoMudancaPapel || 'Alteração pelo Administrador Mestre'
      );
      toast(`Papel de ${usuarioParaMudarPapel.name} alterado para ${ROTULO_PAPEL[novoPapelSelecionado]}.`, {
        type: 'success',
      });
      setUsuarioParaMudarPapel(null);
      setMotivoMudancaPapel('');
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao alterar papel.';
      toast(msg, { type: 'error' });
    } finally {
      setIsProcessandoPapel(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 pb-10">
      {/* 1. Cabeçalho da Visão de Usuários */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/20 mb-6 pb-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
            <span>Controle &amp; Segurança</span>
            <span>/</span>
            <span className="text-on-surface">Gestão de Usuários</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">
            Usuários &amp; Acessos do Sistema
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Cadastros de colaboradores, atribuição de permissões operacionais e controle de credenciais (RBAC).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onNovoUsuario}
            className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg text-xs font-semibold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-white transition-colors cursor-pointer shadow-xs"
            title="Cadastrar novo usuário no sistema"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Usuário</span>
          </button>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isLoading || isFetching}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium text-secondary hover:text-on-surface bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 transition-colors cursor-pointer disabled:opacity-50"
            title="Recarregar lista de usuários"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
        </div>
      </div>

      {/* 2. Cards de Métricas Sóbrios (Industrial Neutrality) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <div className="p-3.5 rounded-lg bg-surface-container-lowest border border-outline-variant/30 shadow-2xs">
          <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Total</span>
          <div className="text-xl font-bold font-mono text-on-surface mt-1">{metricas.total}</div>
          <span className="text-[10px] text-zinc-400">Usuários cadastrados</span>
        </div>

        <div className="p-3.5 rounded-lg bg-surface-container-lowest border border-outline-variant/30 shadow-2xs">
          <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Gestores</span>
          <div className="text-xl font-bold font-mono text-on-surface mt-1">
            {metricas.mestres + metricas.admins}
          </div>
          <span className="text-[10px] text-zinc-400">Mestres &amp; Admins</span>
        </div>

        <div className="p-3.5 rounded-lg bg-surface-container-lowest border border-outline-variant/30 shadow-2xs">
          <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Almoxarifes</span>
          <div className="text-xl font-bold font-mono text-on-surface mt-1">{metricas.operadores}</div>
          <span className="text-[10px] text-zinc-400">Operadores de estoque</span>
        </div>

        <div className="p-3.5 rounded-lg bg-surface-container-lowest border border-outline-variant/30 shadow-2xs">
          <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Produção</span>
          <div className="text-xl font-bold font-mono text-on-surface mt-1">{metricas.requisitantes}</div>
          <span className="text-[10px] text-zinc-400">Requisitantes</span>
        </div>

        <div className="p-3.5 rounded-lg bg-surface-container-lowest border border-outline-variant/30 shadow-2xs col-span-2 sm:col-span-1">
          <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Inativos</span>
          <div className="text-xl font-bold font-mono text-on-surface mt-1">{metricas.inativos}</div>
          <span className="text-[10px] text-zinc-400">Acesso bloqueado</span>
        </div>
      </div>

      {/* 3. Barra de Filtros e Busca */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4 bg-surface-container-low/40 p-3 rounded-lg border border-outline-variant/30">
        {/* Campo de Busca */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="w-full pl-9 pr-8 py-1.5 bg-surface-container-lowest text-on-surface text-xs rounded-md border border-outline-variant/30 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white transition-all font-mono"
          />
          {busca && (
            <button
              type="button"
              onClick={() => setBusca('')}
              className="absolute right-2.5 top-2 text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filtros por Papel e Status */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Seletor de Papel */}
          <select
            value={filtroPapel}
            onChange={(e) => setFiltroPapel(e.target.value as FiltroPapel)}
            className="h-8 px-2.5 bg-surface-container-lowest text-on-surface text-xs rounded-md border border-outline-variant/30 focus:outline-none cursor-pointer"
          >
            <option value="todos">Todos os Papéis</option>
            <option value="mestre">Administrador (Mestre)</option>
            <option value="admin">Gestor (Admin)</option>
            <option value="operador">Almoxarife (Operador)</option>
            <option value="requisitante">Produção (Requisitante)</option>
          </select>

          {/* Seletor de Status */}
          <div className="flex items-center p-0.5 rounded-md bg-surface-container border border-outline-variant/30 text-xs font-medium">
            <button
              type="button"
              onClick={() => setFiltroStatus('todos')}
              className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                filtroStatus === 'todos'
                  ? 'bg-surface-container-lowest text-on-surface shadow-xs font-semibold'
                  : 'text-zinc-500 hover:text-on-surface'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setFiltroStatus('ativo')}
              className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                filtroStatus === 'ativo'
                  ? 'bg-surface-container-lowest text-on-surface shadow-xs font-semibold'
                  : 'text-zinc-500 hover:text-on-surface'
              }`}
            >
              Ativos
            </button>
            <button
              type="button"
              onClick={() => setFiltroStatus('inativo')}
              className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                filtroStatus === 'inativo'
                  ? 'bg-surface-container-lowest text-on-surface shadow-xs font-semibold'
                  : 'text-zinc-500 hover:text-on-surface'
              }`}
            >
              Inativos
            </button>
          </div>
        </div>
      </div>

      {/* 4. Tabela de Alta Densidade de Usuários */}
      <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/30 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/20 bg-surface-container-low/50 font-mono text-[11px] text-zinc-500 uppercase tracking-wider">
                <th className="py-2.5 px-4 font-semibold">Usuário</th>
                <th className="py-2.5 px-3 font-semibold">Papel / Perfil</th>
                <th className="py-2.5 px-3 font-semibold">Status</th>
                <th className="py-2.5 px-3 font-semibold hidden md:table-cell">Segurança</th>
                <th className="py-2.5 px-3 font-semibold hidden lg:table-cell">Data Cadastro</th>
                <th className="py-2.5 px-4 font-semibold text-right">Ações Administrativas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/15 text-xs text-on-surface">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-zinc-500" />
                    <span>Carregando usuários do sistema...</span>
                  </td>
                </tr>
              ) : usuarios.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-zinc-300 dark:text-zinc-700" />
                    <p className="font-semibold text-zinc-600 dark:text-zinc-400">
                      Nenhum usuário encontrado
                    </p>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      {busca ? 'Tente ajustar os termos da sua busca.' : 'Cadastre o primeiro colaborador usando o botão acima.'}
                    </p>
                  </td>
                </tr>
              ) : (
                usuarios.map((u) => {
                  const isCurrent = u.id === currentUser?.id;
                  const initials = u.name
                    .split(' ')
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();

                  const papelLabel = ROTULO_PAPEL[u.role] || u.role;

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-surface-container-low/30 transition-colors"
                    >
                      {/* Usuário */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-on-surface truncate">
                                {u.name}
                              </span>
                              {isCurrent && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200">
                                  Você
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-[11px] text-zinc-400 block truncate">
                              {u.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Papel */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                            u.role === 'mestre'
                              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                              : u.role === 'admin'
                              ? 'bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200'
                              : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-400'
                          }`}
                        >
                          {papelLabel}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              u.ativo ? 'bg-emerald-500' : 'bg-zinc-400'
                            }`}
                          />
                          <span className={u.ativo ? 'text-zinc-700 dark:text-zinc-300' : 'text-zinc-400'}>
                            {u.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </span>
                      </td>

                      {/* Segurança */}
                      <td className="py-3 px-3 hidden md:table-cell">
                        {u.mustChangePassword ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                            <KeyRound className="w-3 h-3" />
                            Primeiro acesso pendente
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Senha definida
                          </span>
                        )}
                      </td>

                      {/* Data Cadastro */}
                      <td className="py-3 px-3 hidden lg:table-cell font-mono text-[11px] text-zinc-400">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('pt-BR') : '—'}
                      </td>

                      {/* Ações Administrativas */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botão de Alterar Papel */}
                          {u.role !== 'mestre' && (
                            <button
                              type="button"
                              onClick={() => {
                                setUsuarioParaMudarPapel(u);
                                setNovoPapelSelecionado(u.role);
                              }}
                              className="px-2 py-1 rounded text-[11px] font-medium text-zinc-600 dark:text-zinc-400 hover:text-on-surface hover:bg-surface-container border border-outline-variant/30 transition-colors cursor-pointer"
                              title="Alterar papel de acesso deste usuário"
                            >
                              Papel
                            </button>
                          )}

                          {/* Reenviar Convite */}
                          <button
                            type="button"
                            onClick={() => handleReenviarConvite(u)}
                            className="p-1 rounded text-zinc-400 hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                            title="Reenviar e-mail de convite / boas-vindas"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>

                          {/* Resetar Senha */}
                          <button
                            type="button"
                            onClick={() => handleRedefinirSenha(u)}
                            className="p-1 rounded text-zinc-400 hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                            title="Enviar e-mail para redefinição de senha"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          {/* Ativar / Desativar */}
                          {!isCurrent && u.role !== 'mestre' && (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(u)}
                              disabled={isAlterandoStatus}
                              className={`p-1 rounded transition-colors cursor-pointer ${
                                u.ativo
                                  ? 'text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30'
                                  : 'text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                              }`}
                              title={u.ativo ? 'Desativar acesso do usuário' : 'Reativar acesso do usuário'}
                            >
                              {u.ativo ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Alteração de Papel */}
      {usuarioParaMudarPapel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isProcessandoPapel) setUsuarioParaMudarPapel(null);
          }}
        >
          <div
            className="w-full max-w-md bg-surface-container-lowest rounded-xl shadow-2xl border border-outline-variant/30 p-5 space-y-4 animate-scale-in"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
                <h3 className="text-sm font-bold text-on-surface">Alterar Papel de Acesso</h3>
              </div>
              <button
                type="button"
                onClick={() => setUsuarioParaMudarPapel(null)}
                disabled={isProcessandoPapel}
                className="text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <p className="text-xs text-on-surface mb-2">
                Defina o novo papel operacional para <b>{usuarioParaMudarPapel.name}</b>:
              </p>

              <div className="space-y-2">
                {(['admin', 'operador', 'requisitante'] as const).map((r) => (
                  <label
                    key={r}
                    className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer text-xs transition-colors ${
                      novoPapelSelecionado === r
                        ? 'border-zinc-900 bg-zinc-50 dark:border-white dark:bg-zinc-800'
                        : 'border-outline-variant/30 hover:bg-surface-container-low'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="novo-papel"
                        checked={novoPapelSelecionado === r}
                        onChange={() => setNovoPapelSelecionado(r)}
                        className="text-zinc-900 dark:text-white"
                      />
                      <span className="font-semibold text-on-surface">{ROTULO_PAPEL[r]}</span>
                    </div>
                    <span className="text-[10px] text-zinc-400 uppercase font-mono">{r}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 mb-1">
                Motivo da Alteração (Auditoria)
              </label>
              <input
                type="text"
                value={motivoMudancaPapel}
                onChange={(e) => setMotivoMudancaPapel(e.target.value)}
                placeholder="Ex: Mudança de turno ou promoção para supervisão"
                className="w-full px-3 py-1.5 bg-surface-container-low text-on-surface text-xs rounded-md border border-outline-variant/30 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/20">
              <button
                type="button"
                onClick={() => setUsuarioParaMudarPapel(null)}
                disabled={isProcessandoPapel}
                className="px-3 py-1.5 rounded-md text-xs font-medium text-secondary hover:bg-surface-container transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarMudancaPapel}
                disabled={isProcessandoPapel}
                className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                {isProcessandoPapel ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <span>Confirmar Mudança</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
