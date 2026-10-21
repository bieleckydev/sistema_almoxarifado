'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/core/api/client';
import type { EventoAuditoriaOperacional } from '@/core/domain/auditoria-operacional.schema';

export function useAuditoria(filtros?: { acao?: string; usuarioId?: string }) {
  const queryParams = new URLSearchParams();
  if (filtros?.acao && filtros.acao !== 'TODAS') queryParams.set('acao', filtros.acao);
  if (filtros?.usuarioId) queryParams.set('usuarioId', filtros.usuarioId);

  const endpoint = queryParams.toString()
    ? `/auditoria?${queryParams.toString()}`
    : '/auditoria';

  return useQuery<{
    dados: EventoAuditoriaOperacional[];
    total: number;
  }>({
    queryKey: ['auditoria-eventos', filtros],
    queryFn: async () => {
      const res = await api.get<{
        dados: EventoAuditoriaOperacional[];
        total: number;
      }>(endpoint);
      return res.data;
    },
    staleTime: 15 * 1000,
  });
}
