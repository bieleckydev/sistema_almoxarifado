import { useAuthStore } from '@/core/store/useAuthStore';
import {
  podeExecutar,
  podeAcessarTela,
  ROTULO_PAPEL,
  type AcaoPermissao,
} from '@/core/domain/permissions';

/**
 * Hook de controle de permissões de acesso e RBAC para a interface React.
 * Segue fielmente as regras de permissões e mensagens do Protótipo 3.0.
 */
export function usePermissao() {
  const { user } = useAuthStore();
  const role = user?.role;

  const pode = (acao: AcaoPermissao): boolean => {
    return podeExecutar(role, acao);
  };

  const podeVer = (tela: string): boolean => {
    return podeAcessarTela(role, tela);
  };

  const papelDescricao = role ? ROTULO_PAPEL[role] || role : 'Visitante';

  const gerarAvisoBloqueio = (acao?: AcaoPermissao): string => {
    return `O perfil ${papelDescricao} não permite esta ação.`;
  };

  const gerarAvisoTelaBloqueada = (tela?: string): string => {
    return `O perfil ${papelDescricao} não tem acesso a esta tela.`;
  };

  return {
    user,
    role,
    papelDescricao,
    pode,
    podeVer,
    gerarAvisoBloqueio,
    gerarAvisoTelaBloqueada,
  };
}
