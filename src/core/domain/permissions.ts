import { type UserRole } from './user.schema';

/**
 * 13 permissões operacionais finas consolidadas do Protótipo 3.0
 */
export const ACOES_PERMISSAO = [
  'mover',
  'cadastrar',
  'editar',
  'estornar',
  'ajustar',
  'faturar',
  'vender',
  'cadastros',
  'terceiros',
  'aprovar',
  'requisitar',
  'entregar',
  'auditar',
] as const;

export type AcaoPermissao = (typeof ACOES_PERMISSAO)[number];

/**
 * Matriz de permissões por perfil do sistema (Mapeamento Protótipo 3.0 <-> Roles reais):
 * - mestre: Administrador ('*')
 * - admin: Gestor (operações gerais, aprovação, estorno, ajuste, faturamento, auditoria)
 * - operador: Almoxarife (movimentação, catálogo, vendas, terceiros, cadastros, entrega de requisições)
 * - requisitante: Produção (criação e acompanhamento de requisições de material)
 */
export const MATRIZ_PERMISSOES: Record<UserRole, readonly AcaoPermissao[] | '*'> = {
  mestre: '*',
  admin: [
    'mover',
    'cadastrar',
    'editar',
    'estornar',
    'ajustar',
    'faturar',
    'vender',
    'cadastros',
    'terceiros',
    'aprovar',
    'requisitar',
    'entregar',
    'auditar',
  ],
  operador: [
    'mover',
    'cadastrar',
    'editar',
    'vender',
    'cadastros',
    'terceiros',
    'requisitar',
    'entregar',
  ],
  requisitante: ['requisitar'],
};

/**
 * Mapeamento de telas operacionais para suas permissões de visualização obrigatórias (VER do 3.0)
 */
export const TELAS_PERMISSAO: Record<string, AcaoPermissao> = {
  fat: 'faturar',
  inv: 'ajustar',
  aud: 'auditar',
  terc: 'terceiros',
  vendas: 'vender',
  clientes: 'cadastros',
  colab: 'cadastros',
  saida: 'mover',
  req: 'requisitar',
};

/**
 * Mapeamento das ações rápidas e botões do sistema para suas permissões (ACAO do 3.0)
 */
export const BOTOES_PERMISSAO: Record<string, AcaoPermissao> = {
  ent: 'mover',
  ret: 'mover',
  pick: 'mover',
  pk: 'mover',
  new: 'cadastrar',
  newt: 'terceiros',
  tmov: 'terceiros',
  fat: 'faturar',
  newp: 'vender',
  adv: 'vender',
  newc: 'cadastros',
  edit: 'editar',
  est: 'estornar',
  canc: 'estornar',
  inv: 'ajustar',
  aprov: 'aprovar',
  entr: 'entregar',
  newr: 'requisitar',
  cpd: 'vender',
};

/**
 * Rótulo amigável em português para exibição em mensagens de bloqueio
 */
export const ROTULO_PAPEL: Record<UserRole, string> = {
  mestre: 'Administrador',
  admin: 'Gestor',
  operador: 'Almoxarife',
  requisitante: 'Produção',
};

/**
 * Avalia se um usuário com determinada role possui permissão para executar a ação informada.
 */
export function podeExecutar(role: UserRole | undefined | null, acao: AcaoPermissao): boolean {
  if (!role) return false;
  const permissoes = MATRIZ_PERMISSOES[role];
  if (!permissoes) return false;
  if (permissoes === '*') return true;
  return permissoes.includes(acao);
}

/**
 * Avalia se o usuário pode acessar determinada tela do sistema.
 * Telas não listadas em TELAS_PERMISSAO (como 'inicio', 'mp', 'imp', 'motos') são acessíveis por padrão.
 */
export function podeAcessarTela(role: UserRole | undefined | null, tela: string): boolean {
  if (tela === 'usuarios') {
    return role === 'mestre';
  }
  const permExigida = TELAS_PERMISSAO[tela];
  if (!permExigida) return true;
  // Na tela de requisições, quem pode aprovar ou entregar também deve conseguir acessar para gerenciar
  if (tela === 'req') {
    return podeExecutar(role, 'requisitar') || podeExecutar(role, 'aprovar') || podeExecutar(role, 'entregar');
  }
  return podeExecutar(role, permExigida);
}
