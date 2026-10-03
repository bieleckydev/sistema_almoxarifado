/**
 * Constantes de rotas e endpoints da API REST do Sistema de Almoxarifado.
 * Centraliza os caminhos de comunicação entre o Core agnóstico e o Backend/BFF.
 */
export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
    REFRESH: '/auth/refresh',
  },
  ITENS: {
    BASE: '/itens',
    BUSCA_CODIGO: (codigo: string) => `/itens/codigo/${encodeURIComponent(codigo)}`,
    DETALHE: (id: string) => `/itens/${id}`,
    ATUALIZAR_SALDO: (id: string) => `/itens/${id}/saldo`,
  },
  COLABORADORES: {
    BASE: '/colaboradores',
    DETALHE: (id: string) => `/colaboradores/${id}`,
    BUSCA_MATRICULA: (matricula: string) => `/colaboradores/matricula/${encodeURIComponent(matricula)}`,
  },
  MOVIMENTACOES: {
    BASE: '/movimentacoes',
    ENTRADA: '/movimentacoes/entrada',
    BAIXA_INTERNA: '/movimentacoes/baixa-interna',
    BAIXA_LOTE: '/movimentacoes/baixa-lote',
    EXPEDICAO: '/movimentacoes/expedicao',
    AJUSTE: '/movimentacoes/ajuste',
    EXTRATO_ITEM: (itemId: string) => `/movimentacoes/extrato/${itemId}`,
  },
  INVENTARIO: {
    SESSOES: '/inventario/sessoes',
    SESSAO_DETALHE: (id: string) => `/inventario/sessoes/${id}`,
    CONTAGENS: (sessaoId: string) => `/inventario/sessoes/${sessaoId}/contagens`,
    ENCERRAR: (sessaoId: string) => `/inventario/sessoes/${sessaoId}/encerrar`,
    FECHAMENTOS_MENSAIS: '/inventario/fechamentos-mensais',
    CONSOLIDAR_FECHAMENTO: '/inventario/fechamentos-mensais/consolidar',
  },
  NFE: {
    BASE: '/nfe',
    DETALHE: (chaveAcesso: string) => `/nfe/${chaveAcesso}`,
    RECONCILIAR: '/nfe/reconciliar',
    EFETIVAR_ENTRADA: '/nfe/efetivar-entrada',
    ARQUIVAMENTO: '/nfe/arquivamento',
  },
} as const;
