import type { Item } from '@/core/domain/item.schema';
import type { TipoItem } from '@/core/domain/types';
import type { Cliente } from '@/core/domain/cliente.schema';
import type { Pedido } from '@/core/domain/pedido.schema';
import type { MaterialTerceiro, MovimentacaoTerceiro } from '@/core/domain/material-terceiro.schema';

export {
  calcularStatusCriticidade,
  type StatusCriticidade,
} from '@/core/services/estoque-calculator';
import type { StatusCriticidade } from '@/core/services/estoque-calculator';
import {
  TIPO_ITEM_POR_CATEGORIA,
  type CategoriaEstoque,
} from '@/core/domain/categoria-estoque';

/** Aba do estoque na UI: uma das três categorias oficiais do core. */
export type AbaEstoque = CategoriaEstoque;

export interface DashboardItem extends Omit<Item, 'embalagem' | 'especificacoes'> {
  aba: AbaEstoque;
  categoria: string;
  capacidadeMaxima: number;
  custoUnitario?: number;
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
    tipoDominio: TIPO_ITEM_POR_CATEGORIA.mp,
  },
  imp: {
    titulo: 'Materiais improdutivos',
    subtitulo: 'Itens de consumo e manutenção: EPIs, abrasivos, lubrificantes e ferramentas.',
    tipoDominio: TIPO_ITEM_POR_CATEGORIA.imp,
  },
  motos: {
    titulo: 'Peças de motos',
    subtitulo: 'Peças automotivas acabadas para reposição e montagem.',
    tipoDominio: TIPO_ITEM_POR_CATEGORIA.motos,
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
export type TelaOuAba =
  | 'inicio'
  | AbaEstoque
  | 'vendas'
  | 'clientes'
  | 'saida'
  | 'fat'
  | 'terc'
  | 'req'
  | 'inv'
  | 'aud'
  | 'usuarios'
  | 'colab';

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
  | 'fat'
  | 'terc'
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
              { action: 'v:terc', label: 'Material de terceiros', icon: 'terc' },
            ],
          },
          {
            title: 'Cadastro',
            buttons: [
              { action: 'novoitem:mp', label: 'Nova matéria-prima', icon: 'novo' },
              { action: 'novoitem:imp', label: 'Novo improdutivo', icon: 'novo' },
              { action: 'novoitem:motos', label: 'Nova peça de moto', icon: 'novo' },
              { action: 'receberterceiro', label: 'Receber de terceiro', icon: 'novo' },
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
              { action: 'receberterceiro', label: 'Receber de terceiro', icon: 'novo' },
              { action: 'v:saida', label: 'Saída manual', icon: 'saida' },
            ],
          },
          {
            title: 'Relatórios',
            buttons: [
              { action: 'v:saida', label: 'Entradas e saídas', icon: 'rel' },
              { action: 'v:terc', label: 'Custódia de terceiros', icon: 'terc' },
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
              { action: 'receberterceiro', label: 'Receber de terceiro', icon: 'novo' },
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
            title: 'Pedidos & Notas',
            buttons: [
              { action: 'v:vendas', label: 'Pedidos a entregar', icon: 'vendas' },
              { action: 'v:fat', label: 'Faturamento e Notas', icon: 'fat' },
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
  if (view === 'mp' || view === 'imp' || view === 'motos' || view === 'terc') return 'estoque';
  if (view === 'vendas' || view === 'fat') return 'vendas';
  if (view === 'saida') return moduloAtual === 'compras' ? 'compras' : 'estoque';
  if (view === 'clientes') return moduloAtual === 'compras' ? 'compras' : 'vendas';
  if (view === 'usuarios') return 'inicio';
  if (view === 'colab') return 'estoque';
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
      { itemId: 'item-1', quantidade: 10, precoUnitario: 450 },
      { itemId: 'item-3', quantidade: 20, precoUnitario: 95 },
    ],
    valorTotal: 6400,
  },
  {
    id: 'ped-102',
    numeroSequencial: 102,
    clienteId: 'cli-2',
    prazoEntrega: '2026-10-05',
    status: 'SEPARADO',
    itens: [
      { itemId: 'item-13', quantidade: 6, precoUnitario: 89.9 },
      { itemId: 'item-15', quantidade: 10, precoUnitario: 24.5 },
    ],
    valorTotal: 784.4,
  },
  {
    id: 'ped-103',
    numeroSequencial: 103,
    clienteId: 'cli-3',
    prazoEntrega: '2026-10-12',
    status: 'PENDENTE',
    itens: [{ itemId: 'item-2', quantidade: 20, precoUnitario: 310 }],
    valorTotal: 6200,
  },
  {
    id: 'ped-104',
    numeroSequencial: 104,
    clienteId: 'cli-1',
    prazoEntrega: '2026-10-02',
    status: 'ENTREGUE',
    itens: [{ itemId: 'item-6', quantidade: 10, precoUnitario: 28 }],
    valorTotal: 280,
    faturamento: {
      numeroNFe: '1520',
      serie: '1',
      dataEmissao: '2026-10-03',
      dataVencimento: '2026-11-02',
      valorTotal: 280,
    },
  },
];

export interface NotaFiscalMock {
  id: string;
  numeroNF: string;
  serie: string;
  dataEmissao: string;
  dataVencimento?: string;
  tipo: 'VENDA' | 'RETORNO_INDUSTRIALIZACAO';
  clienteId: string;
  valorTotal: number;
  referencia: string;
  pedidoId?: string;
}

export const NOTAS_INICIAIS: NotaFiscalMock[] = [
  {
    id: 'nf-1520',
    numeroNF: '1520',
    serie: '1',
    dataEmissao: '2026-10-03',
    dataVencimento: '2026-11-02',
    tipo: 'VENDA',
    clienteId: 'cli-1',
    valorTotal: 280,
    referencia: 'Pedido #104',
    pedidoId: 'ped-104',
  },
];

export const MATERIAIS_TERCEIROS_INICIAIS: MaterialTerceiro[] = [
  {
    id: 'terc-1',
    clienteId: 'cli-1',
    descricao: 'Chapa Aço 1020 3mm x 1200 x 2000mm (Cliente)',
    codigoSku: 'TERC-CHP-01',
    unidade: 'chapa',
    saldoAtual: 25,
    numeroNFRemessa: '44812',
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-05T14:30:00.000Z',
  },
  {
    id: 'terc-2',
    clienteId: 'cli-1',
    descricao: 'Perfil U Dobrado 100x50x3mm (Cliente)',
    codigoSku: 'TERC-PRF-02',
    unidade: 'barra',
    saldoAtual: 60,
    numeroNFRemessa: '44930',
    createdAt: '2026-10-04T09:15:00.000Z',
    updatedAt: '2026-10-04T09:15:00.000Z',
  },
  {
    id: 'terc-3',
    clienteId: 'cli-2',
    descricao: 'Tubo Redondo Inox 304 2" x 1.5mm (Cliente)',
    codigoSku: 'TERC-TB-03',
    unidade: 'barra',
    saldoAtual: 14,
    numeroNFRemessa: '88210',
    createdAt: '2026-10-02T10:00:00.000Z',
    updatedAt: '2026-10-08T16:00:00.000Z',
  },
];

export const MOVIMENTACOES_TERCEIROS_INICIAIS: MovimentacaoTerceiro[] = [
  {
    id: 'mov-terc-1',
    materialTerceiroId: 'terc-1',
    tipo: 'ENTRADA_REMESSA',
    quantidade: 40,
    saldoAnterior: 0,
    saldoResultante: 40,
    documento: 'NF-e 44812',
    dataMovimentacao: '2026-10-01',
    responsavel: 'Recebimento Almoxarifado',
    observacao: 'Remessa para corte a laser e dobra',
  },
  {
    id: 'mov-terc-2',
    materialTerceiroId: 'terc-1',
    tipo: 'CONSUMO_PRODUCAO',
    quantidade: 15,
    saldoAnterior: 40,
    saldoResultante: 25,
    documento: 'OP-2026-88',
    dataMovimentacao: '2026-10-05',
    responsavel: 'Corte Laser / Usinagem',
    observacao: 'Corte de 15 chapas conforme projeto P-44',
  },
  {
    id: 'mov-terc-3',
    materialTerceiroId: 'terc-2',
    tipo: 'ENTRADA_REMESSA',
    quantidade: 60,
    saldoAnterior: 0,
    saldoResultante: 60,
    documento: 'NF-e 44930',
    dataMovimentacao: '2026-10-04',
    responsavel: 'Recebimento Almoxarifado',
    observacao: 'Remessa para furação e solda',
  },
  {
    id: 'mov-terc-4',
    materialTerceiroId: 'terc-3',
    tipo: 'ENTRADA_REMESSA',
    quantidade: 20,
    saldoAnterior: 0,
    saldoResultante: 20,
    documento: 'NF-e 88210',
    dataMovimentacao: '2026-10-02',
    responsavel: 'Recebimento Almoxarifado',
    observacao: 'Remessa para polimento sanitário',
  },
  {
    id: 'mov-terc-5',
    materialTerceiroId: 'terc-3',
    tipo: 'CONSUMO_PRODUCAO',
    quantidade: 6,
    saldoAnterior: 20,
    saldoResultante: 14,
    documento: 'OP-2026-92',
    dataMovimentacao: '2026-10-08',
    responsavel: 'Polimento',
    observacao: 'Polimento sanitário lote 1',
  },
];
