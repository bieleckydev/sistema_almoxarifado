'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/core/api/client';
import type { PublicUserProfile } from '@/core/domain/user-audit.schema';
import type { CreateUserCommand, UserRole } from '@/core/domain/user.schema';

export interface UsuariosAdminFiltros {
  busca?: string;
  role?: UserRole | 'todos';
  ativo?: boolean | 'todos';
  pageSize?: number;
  pageToken?: string;
}

export interface UserAuthLinkResult {
  sent: boolean;
  resetLink?: string;
  emailDeliveryConfigured?: boolean;
  emailSent?: boolean;
}

export interface UseUsuariosAdminResult {
  usuarios: PublicUserProfile[];
  nextPageToken: string | null;
  total: number;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  refetch: () => void;
  cadastrarUsuario: (dados: CreateUserCommand) => Promise<{
    user: PublicUserProfile;
    invitationRequested: boolean;
  }>;
  isCadastrando: boolean;
  ativarUsuario: (uid: string, motivo?: string) => Promise<unknown>;
  desativarUsuario: (uid: string, motivo?: string) => Promise<unknown>;
  alterarPapel: (uid: string, novoPapel: UserRole, motivo?: string) => Promise<unknown>;
  enviarConvite: (uid: string) => Promise<UserAuthLinkResult>;
  redefinirSenha: (uid: string) => Promise<UserAuthLinkResult>;
  isAlterandoStatus: boolean;
}

export function useUsuariosAdmin(filtros?: UsuariosAdminFiltros): UseUsuariosAdminResult {
  const queryClient = useQueryClient();

  const queryParams = new URLSearchParams();
  if (filtros?.busca) {
    if (filtros.busca.includes('@')) {
      queryParams.set('email', filtros.busca.trim());
    } else {
      queryParams.set('name', filtros.busca.trim());
    }
  }
  if (filtros?.role && filtros.role !== 'todos') {
    queryParams.set('role', filtros.role);
  }
  if (filtros?.ativo !== undefined && filtros.ativo !== 'todos') {
    queryParams.set('ativo', String(filtros.ativo));
  }
  if (filtros?.pageSize) {
    queryParams.set('pageSize', String(filtros.pageSize));
  }
  if (filtros?.pageToken) {
    queryParams.set('pageToken', filtros.pageToken);
  }

  const queryString = queryParams.toString();
  const endpoint = queryString ? `/admin/users?${queryString}` : '/admin/users';

  const { data, isLoading, isFetching, error, refetch } = useQuery<{
    users: PublicUserProfile[];
    nextPageToken: string | null;
  }>({
    queryKey: ['admin-users-list', filtros],
    queryFn: async () => {
      const res = await api.get<{ users: PublicUserProfile[]; nextPageToken: string | null }>(endpoint);
      return res.data;
    },
    staleTime: 30 * 1000,
  });

  const mutationCadastrar = useMutation({
    mutationFn: async (dados: CreateUserCommand) => {
      const res = await api.post<{
        user: PublicUserProfile;
        invitationRequested: boolean;
      }>('/admin/users', dados);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-list'] });
    },
  });

  const mutationAtivar = useMutation({
    mutationFn: async ({ uid, motivo }: { uid: string; motivo?: string }) => {
      const res = await api.post(`/admin/users/${uid}/enable`, {
        reason: motivo || 'Ativação realizada pelo administrador mestre.',
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-list'] });
    },
  });

  const mutationDesativar = useMutation({
    mutationFn: async ({ uid, motivo }: { uid: string; motivo?: string }) => {
      const res = await api.post(`/admin/users/${uid}/disable`, {
        reason: motivo || 'Desativação realizada pelo administrador mestre.',
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-list'] });
    },
  });

  const mutationAlterarPapel = useMutation({
    mutationFn: async ({ uid, novoPapel, motivo }: { uid: string; novoPapel: UserRole; motivo?: string }) => {
      const res = await api.post(`/admin/users/${uid}/role`, {
        role: novoPapel,
        reason: motivo || 'Alteração de perfil pelo administrador mestre.',
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-list'] });
    },
  });

  const mutationEnviarConvite = useMutation({
    mutationFn: async (uid: string) => {
      const res = await api.post<UserAuthLinkResult>(`/admin/users/${uid}/send-invite`, {});
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-list'] });
    },
  });

  const mutationRedefinirSenha = useMutation({
    mutationFn: async (uid: string) => {
      const res = await api.post<UserAuthLinkResult>(`/admin/users/${uid}/reset-password`, {});
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-list'] });
    },
  });

  const usuarios = data?.users ?? [];

  return {
    usuarios,
    nextPageToken: data?.nextPageToken ?? null,
    total: usuarios.length,
    isLoading,
    isFetching,
    error: error as Error | null,
    refetch,
    cadastrarUsuario: mutationCadastrar.mutateAsync,
    isCadastrando: mutationCadastrar.isPending,
    ativarUsuario: (uid, motivo) => mutationAtivar.mutateAsync({ uid, motivo }),
    desativarUsuario: (uid, motivo) => mutationDesativar.mutateAsync({ uid, motivo }),
    alterarPapel: (uid, novoPapel, motivo) => mutationAlterarPapel.mutateAsync({ uid, novoPapel, motivo }),
    enviarConvite: (uid) => mutationEnviarConvite.mutateAsync(uid),
    redefinirSenha: (uid) => mutationRedefinirSenha.mutateAsync(uid),
    isAlterandoStatus: mutationAtivar.isPending || mutationDesativar.isPending || mutationAlterarPapel.isPending,
  };
}
