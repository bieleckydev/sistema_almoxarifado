import {
  LayoutDashboard,
  Layers,
  Wrench,
  Bike,
  PackageCheck,
  ArrowLeftRight,
  ClipboardList,
  CheckSquare,
  ShoppingCart,
  Receipt,
  Users,
  HardHat,
  ShieldCheck,
  UserCog,
  TrendingDown,
  type LucideIcon,
} from 'lucide-react';
import type { AbaEstoque } from './mock-almoxarifado';
import { type AcaoPermissao, TELAS_PERMISSAO, podeAcessarTela } from '@/core/domain/permissions';
import type { UserRole } from '@/core/domain/user.schema';

/**
 * Identificadores canônicos de todas as 12 telas do Protótipo 3.0:
 * - inicio: Hub Geral e Ações Rápidas
 * - mp: Matéria-prima
 * - imp: Materiais improdutivos
 * - motos: Peças de motos
 * - terc: Material de terceiros
 * - saida: Entradas e saídas (saída manual e extrato analítico)
 * - req: Requisições de material
 * - inv: Inventário (contagem física e ajuste)
 * - vendas: Pedidos de venda
 * - fat: Faturamento e emissão de notas
 * - clientes: Cadastro de clientes, fornecedores e parceiros
 * - aud: Auditoria e log operacional
 * - usuarios: Gestão administrativa de usuários e acessos
 * - colab: Cadastro de colaboradores fabris (baixas internas)
 * - levantamento: Levantamento e queima de estoque (giro e excedente)
 */
export type TelaOuAba3 =
  | 'inicio'
  | 'mp'
  | 'imp'
  | 'motos'
  | 'terc'
  | 'saida'
  | 'req'
  | 'inv'
  | 'vendas'
  | 'fat'
  | 'clientes'
  | 'aud'
  | 'usuarios'
  | 'colab'
  | 'levantamento';

export interface ItemMenuDef {
  chave: TelaOuAba3;
  nome: string;
  icon: LucideIcon;
  permissao?: AcaoPermissao;
  abaEstoque?: AbaEstoque;
}

export interface GrupoMenuDef {
  titulo: string; // Vazio para o grupo de Início
  itens: ItemMenuDef[];
}

/**
 * Estrutura do MENU do Protótipo 3.0 (organizado em 5 grupos operacionais):
 * 1. (Início)
 * 2. Estoque
 * 3. Movimentações
 * 4. Comercial
 * 5. Controle
 */
export const MENU_ESTRUTURA_3_0: GrupoMenuDef[] = [
  {
    titulo: '',
    itens: [
      {
        chave: 'inicio',
        nome: 'Início',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    titulo: 'Estoque',
    itens: [
      {
        chave: 'mp',
        nome: 'Matéria-prima',
        icon: Layers,
        abaEstoque: 'mp',
      },
      {
        chave: 'imp',
        nome: 'Materiais improdutivos',
        icon: Wrench,
        abaEstoque: 'imp',
      },
      {
        chave: 'motos',
        nome: 'Peças de motos',
        icon: Bike,
        abaEstoque: 'motos',
      },
      {
        chave: 'terc',
        nome: 'Material de terceiros',
        icon: PackageCheck,
        permissao: 'terceiros',
      },
      {
        chave: 'levantamento',
        nome: 'Levantamento e queima',
        icon: TrendingDown,
      },
    ],
  },
  {
    titulo: 'Movimentações',
    itens: [
      {
        chave: 'saida',
        nome: 'Entradas e saídas',
        icon: ArrowLeftRight,
        permissao: 'mover',
      },
      {
        chave: 'req',
        nome: 'Requisições',
        icon: ClipboardList,
        permissao: 'requisitar',
      },
      {
        chave: 'inv',
        nome: 'Inventário (contagem)',
        icon: CheckSquare,
        permissao: 'ajustar',
      },
      {
        chave: 'colab',
        nome: 'Colaboradores',
        icon: HardHat,
        permissao: 'cadastros',
      },
    ],
  },
  {
    titulo: 'Comercial',
    itens: [
      {
        chave: 'vendas',
        nome: 'Pedidos de venda',
        icon: ShoppingCart,
        permissao: 'vender',
      },
      {
        chave: 'fat',
        nome: 'Faturamento',
        icon: Receipt,
        permissao: 'faturar',
      },
      {
        chave: 'clientes',
        nome: 'Clientes e fornecedores',
        icon: Users,
        permissao: 'cadastros',
      },
    ],
  },
  {
    titulo: 'Controle',
    itens: [
      {
        chave: 'aud',
        nome: 'Auditoria',
        icon: ShieldCheck,
        permissao: 'auditar',
      },
      {
        chave: 'usuarios',
        nome: 'Usuários do Sistema',
        icon: UserCog,
      },
    ],
  },
];

/**
 * Filtra a estrutura de menus considerando o perfil do usuário logado (Regra VER do 3.0).
 * Se um grupo não possuir nenhum item visível para o usuário, o grupo é suprimido.
 */
export function filtrarMenuPorPerfil(role: UserRole | undefined | null): GrupoMenuDef[] {
  return MENU_ESTRUTURA_3_0.map((grupo) => {
    const itensFiltrados = grupo.itens.filter((item) => podeAcessarTela(role, item.chave));
    return {
      titulo: grupo.titulo,
      itens: itensFiltrados,
    };
  }).filter((grupo) => grupo.itens.length > 0);
}
