import React from 'react';
import { usePermissao } from '@/web/hooks/usePermissao';
import { type AcaoPermissao } from '@/core/domain/permissions';

export interface CanProps {
  acao: AcaoPermissao;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Componente declarativo para controle de renderização baseado em permissões do Protótipo 3.0.
 */
export function Can({ acao, children, fallback = null }: CanProps) {
  const { pode } = usePermissao();

  if (!pode(acao)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
