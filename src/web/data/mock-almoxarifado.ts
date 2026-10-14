import type { Item } from '@/core/domain/item.schema';
import type { TipoItem } from '@/core/domain/types';
import type { Cliente } from '@/core/domain/cliente.schema';
import type { Pedido } from '@/core/domain/pedido.schema';

export type AbaEstoque = 'mp' | 'imp' | 'motos';
export type StatusCriticidade = 'ok' | 'low' | 'crit';

export interface DashboardItem extends Omit<Item, 'embalagem'> {
  aba: AbaEstoque;
  categoria: string;
  capacidadeMaxima: number;
  especificacoes?: Record<string, string>;
  embalagem?: Item['embalagem'];
}

export interface DashboardMovimentacao {
  id: string;
  itemId: string;
  tipo: 'Entrada' | 'Saída';
  quantidade: number;
  dataHora: string;
  responsavel: string;
}

export const METADADOS_ABAS: Record<
  AbaEstoque,
  {
    titulo: string;
    subtitulo: string;
    tipoDominio: TipoItem;
  }
> = {
  mp: {
    titulo: 'Matéria-prima',
    subtitulo: 'Chapas, barras, tubos e insumos produtivos de fabricação.',
    tipoDominio: 'PRODUTIVO_MATERIA_PRIMA',
  },
  imp: {
    titulo: 'Materiais improdutivos',
    subtitulo: 'Itens de consumo e manutenção: EPIs, abrasivos, lubrificantes e ferramentas.',
    tipoDominio: 'IMPRODUTIVO_CONSUMIVEL',
  },
  motos: {
    titulo: 'Peças de motos',
    subtitulo: 'Peças automotivas acabadas para reposição e montagem.',
    tipoDominio: 'ACABADO',
  },
};

/**
 * Mapeamento de unidades de medida para exibição simplificada.
 */
export const UNIDADE_LABELS: Record<string, string> = {
  UNIDADE: 'un',
  KG: 'kg',
  METRO: 'm',
  PACOTE: 'pct',
  PECA: 'pç',
  LITRO: 'L',
};

/**
 * Dicionário de especificações (mantido vazio; obtido dinamicamente dos dados dos itens).
 */
export const ESPECIFICACOES_ITENS: Record<string, Record<string, string>> = {};

/**
 * Coleções de dados mock eliminadas do sistema.
 */
export const MOCK_ITENS: DashboardItem[] = [];
export const MOCK_MOVIMENTACOES: DashboardMovimentacao[] = [];

/**
 * Calcula a classificação de criticidade do item.
 * - 'crit': saldo <= min * 0.5 (situação crítica)
 * - 'low': saldo <= min (abaixo do mínimo de segurança)
 * - 'ok': saldo > min (nível normal)
 */
export function calcularStatusCriticidade(
  estoqueAtual: number,
  estoqueSeguranca: number
): StatusCriticidade {
  if (estoqueAtual <= estoqueSeguranca * 0.5) {
    return 'crit';
  }
  if (estoqueAtual <= estoqueSeguranca) {
    return 'low';
  }
  return 'ok';
}

/**
 * Rótulos legíveis para a situação do estoque.
 */
export const STATUS_LABELS: Record<StatusCriticidade, string> = {
  ok: 'Normal',
  low: 'Abaixo do mínimo',
  crit: 'Crítico',
};

/**
 * Tipos de tela ou aba navegáveis no sistema V2/V5.
 */
export type TelaOuAba = 'inicio' | AbaEstoque | 'vendas' | 'clientes' | 'saida';

/**
 * Módulos corporativos introduzidos na V5 (Ribbon / Sidebar de Módulos).
 */
export type ModuloCorporativo = 'inicio' | 'estoque' | 'compras' | 'vendas';

export type RibbonIconName =
  | 'inicio'
  | 'mp'
  | 'imp'
  | 'motos'
  | 'vendas'
  | 'clientes'
  | 'saida'
  | 'entrada'
  | 'retirada'
  | 'novo'
  | 'rel'
  | 'cal';

export interface RibbonButtonDef {
  action: string;
  label: string;
  icon: RibbonIconName;
}

export interface RibbonGroupDef {
  title: string;
  buttons: RibbonButtonDef[];
}

export interface RibbonTabDef {
  name: string;
  groups: RibbonGroupDef[];
}

export interface ModuloConfig {
  id: ModuloCorporativo;
  nome: string;
  icon: RibbonIconName;
  viewInicial: TelaOuAba;
  abas: RibbonTabDef[];
}

/**
 * Configuração hierárquica dos módulos corporativos e suas faixas de opções (Ribbon).
 * Mapeamento fiel da estrutura MOD de almoxarifado5.html.
 */
export const MODULOS_CONFIG: Record<'estoque' | 'compras' | 'vendas', ModuloConfig> = {
  estoque: {
    id: 'estoque',
    nome: 'Estoque',
    icon: 'mp',
    viewInicial: 'mp',
    abas: [
      {
        name: 'Materiais',
        groups: [
          {
            title: 'Consulta',
            buttons: [
              { action: 'v:mp', label: 'Matéria-prima', icon: 'mp' },
              { action: 'v:imp', label: 'Materiais improdutivos', icon: 'imp' },
              { action: 'v:motos', label: 'Peças de motos', icon: 'motos' },
            ],
          },
          {
            title: 'Cadastro',
            buttons: [
              { action: 'novoitem:mp', label: 'Nova matéria-prima', icon: 'novo' },
              { action: 'novoitem:imp', label: 'Novo improdutivo', icon: 'novo' },
              { action: 'novoitem:motos', label: 'Nova peça de moto', icon: 'novo' },
            ],
          },
        ],
      },
      {
        name: 'Movimentação',
        groups: [
          {
            title: 'Registrar',
            buttons: [
              { action: 'pick:Entrada', label: 'Adicionar entrada', icon: 'entrada' },
              { action: 'pick:Saída', label: 'Retirar para produção', icon: 'retirada' },
              { action: 'v:saida', label: 'Saída manual', icon: 'saida' },
            ],
          },
          {
            title: 'Relatórios',
            buttons: [
              { action: 'v:saida', label: 'Entradas e saídas', icon: 'rel' },
              { action: 'csv', label: 'Baixar CSV', icon: 'rel' },
            ],
          },
        ],
      },
    ],
  },
  compras: {
    id: 'compras',
    nome: 'Compras',
    icon: 'entrada',
    viewInicial: 'saida',
    abas: [
      {
        name: 'Recebimentos',
        groups: [
          {
            title: 'Entregas',
            buttons: [
              { action: 'pick:Entrada', label: 'Receber material', icon: 'entrada' },
              { action: 'fc:FORNECEDOR', label: 'Fornecedores', icon: 'clientes' },
              { action: 'novocad:FORNECEDOR', label: 'Novo fornecedor', icon: 'novo' },
            ],
          },
          {
            title: 'Relatórios',
            buttons: [
              { action: 'v:saida', label: 'Entradas por NF-e', icon: 'rel' },
            ],
          },
        ],
      },
    ],
  },
  vendas: {
    id: 'vendas',
    nome: 'Vendas',
    icon: 'vendas',
    viewInicial: 'vendas',
    abas: [
      {
        name: 'Pedidos',
        groups: [
          {
            title: 'Pedidos',
            buttons: [
              { action: 'v:vendas', label: 'Pedidos a entregar', icon: 'vendas' },
              { action: 'novopedido', label: 'Novo pedido', icon: 'novo' },
            ],
          },
        ],
      },
      {
        name: 'Cadastros',
        groups: [
          {
            title: 'Entidades',
            buttons: [
              { action: 'fc:TODOS', label: 'Todos os cadastros', icon: 'clientes' },
              { action: 'fc:CLIENTE', label: 'Clientes', icon: 'clientes' },
              { action: 'novocad:CLIENTE', label: 'Novo cadastro', icon: 'novo' },
            ],
          },
        ],
      },
    ],
  },
};

/**
 * Mapeia a tela/view ativa para o seu respectivo módulo corporativo pai.
 * Equivalente à função modDe(v) do protótipo almoxarifado5.html.
 */
export function obterModuloDeTela(
  view: TelaOuAba,
  moduloAtual?: ModuloCorporativo | null
): ModuloCorporativo {
  if (view === 'inicio') return 'inicio';
  if (view === 'mp' || view === 'imp' || view === 'motos') return 'estoque';
  if (view === 'vendas') return 'vendas';
  if (view === 'saida') return moduloAtual === 'compras' ? 'compras' : 'estoque';
  if (view === 'clientes') return moduloAtual === 'compras' ? 'compras' : 'vendas';
  return 'estoque';
}

export const CLIENTES_INICIAIS: Cliente[] = [
  {
    id: 'cli-1',
    tipo: 'CLIENTE',
    nome: 'Metalúrgica Horizonte',
    documento: '00.000.000/0001-01',
    contato: 'Marcos Lima',
    telefone: '(11) 90000-0001',
    cidade: 'São Paulo',
    ativo: true,
  },
  {
    id: 'cli-2',
    tipo: 'CLIENTE',
    nome: 'Oficina Duas Rodas',
    documento: '00.000.000/0001-02',
    contato: 'Paulo Souza',
    telefone: '(11) 90000-0002',
    cidade: 'Guarulhos',
    ativo: true,
  },
  {
    id: 'cli-3',
    tipo: 'CLIENTE',
    nome: 'Construtora Alfa',
    documento: '00.000.000/0001-03',
    contato: 'Ana Prado',
    telefone: '(11) 90000-0003',
    cidade: 'Osasco',
    ativo: true,
  },
  {
    id: 'cli-4',
    tipo: 'FORNECEDOR',
    nome: 'Aços Santa Rita',
    documento: '00.000.000/0001-04',
    contato: 'Vendas',
    telefone: '(11) 90000-0004',
    cidade: 'Mauá',
    ativo: true,
  },
  {
    id: 'cli-5',
    tipo: 'FORNECEDOR',
    nome: 'Metalfer',
    documento: '00.000.000/0001-05',
    contato: 'Vendas',
    telefone: '(11) 90000-0005',
    cidade: 'Diadema',
    ativo: true,
  },
  {
    id: 'cli-6',
    tipo: 'TRANSPORTADORA',
    nome: 'Rápido Sul Transportes',
    documento: '00.000.000/0001-06',
    contato: 'Despacho',
    telefone: '(11) 90000-0006',
    cidade: 'São Paulo',
    ativo: true,
  },
];

export const PEDIDOS_INICIAIS: Pedido[] = [
  {
    id: 'ped-101',
    numeroSequencial: 101,
    clienteId: 'cli-1',
    prazoEntrega: '2026-10-08',
    status: 'PENDENTE',
    itens: [
      { itemId: 'item-1', quantidade: 10 },
      { itemId: 'item-3', quantidade: 20 },
    ],
  },
  {
    id: 'ped-102',
    numeroSequencial: 102,
    clienteId: 'cli-2',
    prazoEntrega: '2026-10-05',
    status: 'SEPARADO',
    itens: [
      { itemId: 'item-13', quantidade: 6 },
      { itemId: 'item-15', quantidade: 10 },
    ],
  },
  {
    id: 'ped-103',
    numeroSequencial: 103,
    clienteId: 'cli-3',
    prazoEntrega: '2026-10-12',
    status: 'PENDENTE',
    itens: [{ itemId: 'item-2', quantidade: 20 }],
  },
  {
    id: 'ped-104',
    numeroSequencial: 104,
    clienteId: 'cli-1',
    prazoEntrega: '2026-10-02',
    status: 'ENTREGUE',
    itens: [{ itemId: 'item-6', quantidade: 10 }],
  },
];
