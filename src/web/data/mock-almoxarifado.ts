import type { Item } from '@/core/domain/item.schema';
import type { TipoItem, UnidadeMedida } from '@/core/domain/types';
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
 * Especificações técnicas por ID de item (do protótipo original).
 */
export const ESPECIFICACOES_ITENS: Record<string, Record<string, string>> = {
  '1': {
    Material: 'Aço carbono SAE 1020',
    Especificação: 'Laminada a quente, chapa grossa',
    Dimensões: '1200 x 3000 mm',
    Fornecedor: 'Aços Santa Rita',
  },
  '2': {
    Material: 'Aço SAE 1045',
    Especificação: 'Trefilada, tolerância h11',
    Dimensões: 'Ø25 mm x 6 m',
    Fornecedor: 'Aços Santa Rita',
  },
  '3': {
    Material: 'Aço carbono',
    Especificação: 'Tubo quadrado com costura',
    Dimensões: '40 x 40 x 2 mm, barra de 6 m',
    Fornecedor: 'Metalfer',
  },
  '4': {
    Material: 'Revestido rutílico',
    Especificação: 'AWS E6013, 2,5 mm',
    Aplicação: 'Soldagem geral em aço carbono',
    Fornecedor: 'Esab',
  },
  '5': {
    Material: 'Aço ASTM A36',
    Especificação: 'Perfil L abas iguais',
    Dimensões: '1" x 1/8", barra de 6 m',
    Fornecedor: 'Metalfer',
  },
  '6': {
    Material: 'Arame maciço ER70S-6',
    Especificação: 'AWS A5.18, bobina de 15 kg',
    Dimensões: 'Ø0,8 mm',
    Fornecedor: 'Esab',
  },
  '7': {
    Tipo: 'Proteção das mãos',
    Material: 'Raspa de couro',
    'Certificado (CA)': 'CA 35.120',
    Aplicação: 'Soldagem e manuseio de chapas',
  },
  '8': {
    Tipo: 'Proteção dos olhos',
    Material: 'Policarbonato incolor',
    'Certificado (CA)': 'CA 11.205',
    Aplicação: 'Corte, esmerilhamento e usinagem',
  },
  '9': {
    Tipo: 'Abrasivo',
    Especificação: 'Disco fino para corte de aço',
    Dimensões: '178 x 1,6 x 22,23 mm',
    Aplicação: 'Esmerilhadeira angular',
  },
  '10': {
    Tipo: 'Lubrificante',
    Especificação: 'Graxa de lítio NLGI 2',
    Embalagem: 'Balde de 1 kg',
    Aplicação: 'Mancais e rolamentos',
  },
  '11': {
    Tipo: 'Material elétrico',
    Especificação: 'PVC antichama 750 V',
    Dimensões: '19 mm x 20 m',
    Aplicação: 'Isolação de emendas',
  },
  '12': {
    Tipo: 'Ferramenta de corte',
    Material: 'Aço rápido HSS',
    Dimensões: 'Ø10 mm',
    Aplicação: 'Furação em aço carbono',
  },
  '13': {
    'Modelo compatível': 'Honda CG 160',
    Posição: 'Dianteira',
    Marca: 'Cobreq',
    'Código original': '06455-KRE-G01',
  },
  '14': {
    'Modelo compatível': 'Honda CG 160',
    Composição: 'Corrente 428H, coroa e pinhão',
    Marca: 'KMC / Riffel',
    'Código original': '06406-KVS-J00',
  },
  '15': {
    'Modelo compatível': 'Universal',
    Especificação: 'Velas de ignição iridium ou níquel',
    Marca: 'NGK',
    'Código original': 'CPR8EA-9',
  },
  '16': {
    'Modelo compatível': 'Honda XRE 300',
    Tipo: 'Filtro de óleo',
    Marca: 'Tecfil',
    'Código original': '15412-MGS-D21',
  },
  '17': {
    'Modelo compatível': 'Aro 18',
    Medida: '2.75 / 3.00-18',
    Marca: 'Pirelli',
    'Código original': 'CAM-18-HD',
  },
  '18': {
    'Modelo compatível': 'Universal',
    Tipo: 'Cabo de embreagem',
    Marca: 'Soretto',
    'Código original': '22870-KVS-900',
  },
};

/**
 * Itens mockados enriquecidos baseados no protótipo estático.
 */
export const MOCK_ITENS: DashboardItem[] = [
  {
    id: '1',
    codigo: '10-CHP-0300',
    descricao: 'Chapa de aço 3 mm',
    tipo: 'PRODUTIVO_MATERIA_PRIMA',
    unidade: 'UNIDADE',
    aba: 'mp',
    categoria: 'Chapas',
    localizacaoFisica: 'E-00-01',
    estoqueAtual: 48,
    estoqueSeguranca: 20,
    capacidadeMaxima: 90,
    ativo: true,
    especificacoes: ESPECIFICACOES_ITENS['1'],
  },
  {
    id: '2',
    codigo: '10-BAR-1045',
    descricao: 'Barra redonda SAE 1045 Ø25',
    tipo: 'PRODUTIVO_MATERIA_PRIMA',
    unidade: 'UNIDADE',
    aba: 'mp',
    categoria: 'Barras',
    localizacaoFisica: 'E-01-02',
    estoqueAtual: 14,
    estoqueSeguranca: 15,
    capacidadeMaxima: 60,
    ativo: true,
    especificacoes: ESPECIFICACOES_ITENS['2'],
  },
  {
    id: '3',
    codigo: '10-TUB-4040',
    descricao: 'Tubo industrial 40 x 40',
    tipo: 'PRODUTIVO_MATERIA_PRIMA',
    unidade: 'UNIDADE',
    aba: 'mp',
    categoria: 'Tubos',
    localizacaoFisica: 'E-02-01',
    estoqueAtual: 62,
    estoqueSeguranca: 30,
    capacidadeMaxima: 120,
    ativo: true,
    especificacoes: ESPECIFICACOES_ITENS['3'],
  },
  {
    id: '4',
    codigo: '10-SOL-6013',
    descricao: 'Eletrodo E6013 2,5 mm',
    tipo: 'PRODUTIVO_MATERIA_PRIMA',
    unidade: 'KG',
    aba: 'mp',
    categoria: 'Soldagem',
    localizacaoFisica: 'B-01-04',
    estoqueAtual: 12,
    estoqueSeguranca: 20,
    capacidadeMaxima: 80,
    ativo: true,
    especificacoes: ESPECIFICACOES_ITENS['4'],
  },
  {
    id: '5',
    codigo: '10-CAN-0100',
    descricao: 'Cantoneira 1"',
    tipo: 'PRODUTIVO_MATERIA_PRIMA',
    unidade: 'UNIDADE',
    aba: 'mp',
    categoria: 'Perfis',
    localizacaoFisica: 'E-01-04',
    estoqueAtual: 6,
    estoqueSeguranca: 20,
    capacidadeMaxima: 70,
    ativo: true,
    especificacoes: ESPECIFICACOES_ITENS['5'],
  },
  {
    id: '6',
    codigo: '10-SOL-0800',
    descricao: 'Arame MIG 0,8 mm',
    tipo: 'PRODUTIVO_MATERIA_PRIMA',
    unidade: 'KG',
    aba: 'mp',
    categoria: 'Soldagem',
    localizacaoFisica: 'B-01-05',
    estoqueAtual: 90,
    estoqueSeguranca: 40,
    capacidadeMaxima: 160,
    ativo: true,
    especificacoes: ESPECIFICACOES_ITENS['6'],
  },
  {
    id: '7',
    codigo: '90-EPI-0112',
    descricao: 'Luva de raspa',
    tipo: 'IMPRODUTIVO_CONSUMIVEL',
    unidade: 'UNIDADE',
    aba: 'imp',
    categoria: 'EPI',
    localizacaoFisica: 'C-02-01',
    estoqueAtual: 38,
    estoqueSeguranca: 40,
    capacidadeMaxima: 120,
    ativo: true,
    especificacoes: ESPECIFICACOES_ITENS['7'],
  },
  {
    id: '8',
    codigo: '90-EPI-0120',
    descricao: 'Óculos de proteção',
    tipo: 'IMPRODUTIVO_CONSUMIVEL',
    unidade: 'UNIDADE',
    aba: 'imp',
    categoria: 'EPI',
    localizacaoFisica: 'C-02-02',
    estoqueAtual: 9,
    estoqueSeguranca: 30,
    capacidadeMaxima: 90,
    ativo: true,
    especificacoes: ESPECIFICACOES_ITENS['8'],
  },
  {
    id: '9',
    codigo: '90-ABR-0710',
    descricao: 'Disco de corte 7"',
    tipo: 'IMPRODUTIVO_CONSUMIVEL',
    unidade: 'UNIDADE',
    aba: 'imp',
    categoria: 'Abrasivos',
    localizacaoFisica: 'B-03-01',
    estoqueAtual: 64,
    estoqueSeguranca: 50,
    capacidadeMaxima: 200,
    ativo: true,
    especificacoes: ESPECIFICACOES_ITENS['9'],
  },
  {
    id: '10',
    codigo: '90-LUB-0300',
    descricao: 'Graxa multiuso',
    tipo: 'IMPRODUTIVO_CONSUMIVEL',
    unidade: 'KG',
    aba: 'imp',
    categoria: 'Lubrificantes',
    localizacaoFisica: 'D-01-02',
    estoqueAtual: 5,
    estoqueSeguranca: 12,
    capacidadeMaxima: 30,
    ativo: true,
    especificacoes: ESPECIFICACOES_ITENS['10'],
  },
  {
    id: '11',
    codigo: '90-ELE-0010',
    descricao: 'Fita isolante',
    tipo: 'IMPRODUTIVO_CONSUMIVEL',
    unidade: 'UNIDADE',
    aba: 'imp',
    categoria: 'Elétrica',
    localizacaoFisica: 'F-01-02',
    estoqueAtual: 140,
    estoqueSeguranca: 40,
    capacidadeMaxima: 200,
    ativo: true,
    especificacoes: ESPECIFICACOES_ITENS['11'],
  },
  {
    id: '12',
    codigo: '90-FER-1010',
    descricao: 'Broca HSS 10 mm',
    tipo: 'IMPRODUTIVO_CONSUMIVEL',
    unidade: 'UNIDADE',
    aba: 'imp',
    categoria: 'Ferramentas',
    localizacaoFisica: 'B-02-03',
    estoqueAtual: 7,
    estoqueSeguranca: 10,
    capacidadeMaxima: 30,
    ativo: true,
    especificacoes: ESPECIFICACOES_ITENS['12'],
  },
  {
    id: '13',
    codigo: '100-PEC-1601',
    descricao: 'Pastilha de freio',
    tipo: 'ACABADO',
    unidade: 'UNIDADE',
    aba: 'motos',
    categoria: 'CG 160 · Freios',
    localizacaoFisica: 'H-01-01',
    estoqueAtual: 18,
    estoqueSeguranca: 12,
    capacidadeMaxima: 60,
    ativo: true,
    especificacoes: ESPECIFICACOES_ITENS['13'],
  },
  {
    id: '14',
    codigo: '100-PEC-1602',
    descricao: 'Kit relação',
    tipo: 'ACABADO',
    unidade: 'UNIDADE',
    aba: 'motos',
    categoria: 'CG 160 · Transmissão',
    localizacaoFisica: 'H-01-04',
    estoqueAtual: 4,
    estoqueSeguranca: 8,
    capacidadeMaxima: 30,
    ativo: true,
    especificacoes: ESPECIFICACOES_ITENS['14'],
  },
  {
    id: '15',
    codigo: '100-PEC-0310',
    descricao: 'Vela de ignição',
    tipo: 'ACABADO',
    unidade: 'UNIDADE',
    aba: 'motos',
    categoria: 'Universal · Elétrica',
    localizacaoFisica: 'H-02-01',
    estoqueAtual: 46,
    estoqueSeguranca: 30,
    capacidadeMaxima: 120,
    ativo: true,
    especificacoes: ESPECIFICACOES_ITENS['15'],
  },
  {
    id: '16',
    codigo: '100-PEC-3001',
    descricao: 'Filtro de óleo',
    tipo: 'ACABADO',
    unidade: 'UNIDADE',
    aba: 'motos',
    categoria: 'XRE 300 · Filtros',
    localizacaoFisica: 'H-02-03',
    estoqueAtual: 9,
    estoqueSeguranca: 10,
    capacidadeMaxima: 40,
    ativo: true,
    especificacoes: ESPECIFICACOES_ITENS['16'],
  },
  {
    id: '17',
    codigo: '100-PEC-1800',
    descricao: 'Câmara de ar aro 18',
    tipo: 'ACABADO',
    unidade: 'UNIDADE',
    aba: 'motos',
    categoria: 'Universal · Pneus',
    localizacaoFisica: 'H-03-02',
    estoqueAtual: 22,
    estoqueSeguranca: 10,
    capacidadeMaxima: 40,
    ativo: true,
    especificacoes: ESPECIFICACOES_ITENS['17'],
  },
  {
    id: '18',
    codigo: '100-PEC-0220',
    descricao: 'Cabo de embreagem',
    tipo: 'ACABADO',
    unidade: 'UNIDADE',
    aba: 'motos',
    categoria: 'Universal · Cabos',
    localizacaoFisica: 'H-03-04',
    estoqueAtual: 0,
    estoqueSeguranca: 6,
    capacidadeMaxima: 24,
    ativo: true,
    especificacoes: ESPECIFICACOES_ITENS['18'],
  },
];

/**
 * Movimentações mockadas registradas no protótipo.
 */
export const MOCK_MOVIMENTACOES: DashboardMovimentacao[] = [
  {
    id: 'mov-1',
    itemId: '8',
    tipo: 'Saída',
    quantidade: 6,
    dataHora: 'Hoje, 09:42',
    responsavel: 'Manutenção',
  },
  {
    id: 'mov-2',
    itemId: '10',
    tipo: 'Saída',
    quantidade: 3,
    dataHora: 'Hoje, 09:15',
    responsavel: 'Produção',
  },
  {
    id: 'mov-3',
    itemId: '1',
    tipo: 'Entrada',
    quantidade: 20,
    dataHora: 'Hoje, 08:30',
    responsavel: 'Recebimento',
  },
  {
    id: 'mov-4',
    itemId: '18',
    tipo: 'Saída',
    quantidade: 4,
    dataHora: 'Ontem, 17:10',
    responsavel: 'Oficina',
  },
  {
    id: 'mov-5',
    itemId: '5',
    tipo: 'Saída',
    quantidade: 12,
    dataHora: 'Ontem, 16:58',
    responsavel: 'Serralheria',
  },
  {
    id: 'mov-6',
    itemId: '4',
    tipo: 'Saída',
    quantidade: 8,
    dataHora: 'Ontem, 15:20',
    responsavel: 'Soldagem',
  },
  {
    id: 'mov-7',
    itemId: '13',
    tipo: 'Entrada',
    quantidade: 24,
    dataHora: 'Ontem, 11:05',
    responsavel: 'Recebimento',
  },
  {
    id: 'mov-8',
    itemId: '14',
    tipo: 'Saída',
    quantidade: 3,
    dataHora: 'Ontem, 08:47',
    responsavel: 'Balcão',
  },
];

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
 * Tipos de tela ou aba navegáveis no sistema V2.
 */
export type TelaOuAba = 'inicio' | AbaEstoque | 'vendas' | 'clientes' | 'saida';

/**
 * Clientes, fornecedores e transportadoras reais cadastrados no sistema
 * (Sincronizados com a coleção 'clients' do Firestore).
 */
export const CLIENTES_INICIAIS: Cliente[] = [
  {
    id: 'client-jaguaribe',
    tipo: 'CLIENTE',
    nome: 'Jaguaribe Indústria de Cadeiras de Rodas',
    documento: '61.123.456/0001-10',
    contato: 'Marcos Suprimentos',
    telefone: '(16) 3300-1000',
    cidade: 'Ribeirão Preto',
    ativo: true,
  },
  {
    id: 'client-brudden',
    tipo: 'CLIENTE',
    nome: 'Brudden Equipamentos Ltda',
    documento: '54.987.654/0001-20',
    contato: 'Carlos Compras',
    telefone: '(14) 3452-8000',
    cidade: 'Pompéia',
    ativo: true,
  },
  {
    id: 'client-grajau-motos',
    tipo: 'CLIENTE',
    nome: 'Grajaú Motos e Peças',
    documento: '08.765.432/0001-30',
    contato: 'Paulo Vendas',
    telefone: '(11) 98765-4321',
    cidade: 'São Paulo',
    ativo: true,
  },
  {
    id: 'client-moto-pecas',
    tipo: 'CLIENTE',
    nome: 'Moto Peças Distribuidora',
    documento: '12.345.678/0001-40',
    contato: 'Balcão Vendas',
    telefone: '(11) 98111-2233',
    cidade: 'São Paulo',
    ativo: true,
  },
  {
    id: 'client-protominas',
    tipo: 'CLIENTE',
    nome: 'Protominas Usinagem e Protótipos',
    documento: '23.456.789/0001-50',
    contato: 'Engenharia',
    telefone: '(31) 3200-4000',
    cidade: 'Belo Horizonte',
    ativo: true,
  },
  {
    id: 'client-irbas',
    tipo: 'CLIENTE',
    nome: 'Metalúrgica Irbas',
    documento: '34.567.890/0001-60',
    contato: 'Recebimento',
    telefone: '(11) 2900-5000',
    cidade: 'São Paulo',
    ativo: true,
  },
  {
    id: 'client-nakayone',
    tipo: 'CLIENTE',
    nome: 'Metalúrgica Nakayone',
    documento: '45.678.901/0001-70',
    contato: 'Compras',
    telefone: '(11) 2150-6000',
    cidade: 'São Paulo',
    ativo: true,
  },
  {
    id: 'client-jardim-sistemas',
    tipo: 'CLIENTE',
    nome: 'Jardim Sistemas e Automação',
    documento: '56.789.012/0001-80',
    contato: 'Almoxarifado',
    telefone: '(11) 3780-7000',
    cidade: 'São Paulo',
    ativo: true,
  },
  {
    id: 'client-copam',
    tipo: 'CLIENTE',
    nome: 'Copam Autopeças',
    documento: '67.890.123/0001-90',
    contato: 'Planejamento PCP',
    telefone: '(11) 2460-8000',
    cidade: 'Guarulhos',
    ativo: true,
  },
  {
    id: 'client-galpao-matriz',
    tipo: 'CLIENTE',
    nome: 'Galpão Matriz Rhowert',
    documento: '00.000.000/0001-00',
    contato: 'Despacho Interno',
    telefone: '(11) 90000-0001',
    cidade: 'São Paulo',
    ativo: true,
  },
  {
    id: 'supplier-borplas',
    tipo: 'FORNECEDOR',
    nome: 'Borplas Suprimentos Industriais',
    documento: '11.222.333/0001-44',
    contato: 'Vendas Borplas',
    telefone: '(11) 3344-5566',
    cidade: 'São Paulo',
    ativo: true,
  },
  {
    id: 'supplier-braganfer',
    tipo: 'FORNECEDOR',
    nome: 'Braganfer Ferro e Aço',
    documento: '22.333.444/0001-55',
    contato: 'Comercial Aço',
    telefone: '(11) 4032-1100',
    cidade: 'Bragança Paulista',
    ativo: true,
  },
  {
    id: 'supplier-oximig',
    tipo: 'FORNECEDOR',
    nome: 'Oximig Soldas e Equipamentos',
    documento: '33.444.555/0001-66',
    contato: 'Técnico Solda',
    telefone: '(15) 3243-7000',
    cidade: 'Votorantim',
    ativo: true,
  },
  {
    id: 'supplier-parafusos-rudge',
    tipo: 'FORNECEDOR',
    nome: 'Parafusos Rudge Ramos',
    documento: '55.666.777/0001-88',
    contato: 'Fixadores',
    telefone: '(11) 4368-2000',
    cidade: 'São Bernardo do Campo',
    ativo: true,
  },
  {
    id: 'supplier-leoplast',
    tipo: 'FORNECEDOR',
    nome: 'Leoplast Comércio de Embalagens',
    documento: '66.777.888/0001-99',
    contato: 'Embalagens',
    telefone: '(11) 4070-5000',
    cidade: 'Diadema',
    ativo: true,
  },
  {
    id: 'carrier-galpao-express',
    tipo: 'TRANSPORTADORA',
    nome: 'Galpão Express Cargas Rápidas',
    documento: '23.334.445/0001-66',
    contato: 'Despacho Rápido',
    telefone: '(11) 97777-8899',
    cidade: 'São Paulo',
    ativo: true,
  },
  {
    id: 'carrier-rapido-sul',
    tipo: 'TRANSPORTADORA',
    nome: 'Rápido Sul Transportes Rodoviários',
    documento: '34.445.556/0001-77',
    contato: 'Operações Sul',
    telefone: '(11) 2200-9988',
    cidade: 'São Paulo',
    ativo: true,
  },
];

/**
 * Pedidos reais de venda cadastrados no sistema
 * (Sincronizados com a coleção 'orders' do Firestore).
 */
export const PEDIDOS_INICIAIS: Pedido[] = [
  {
    id: 'order-101',
    numeroSequencial: 101,
    clienteId: 'client-grajau-motos',
    prazoEntrega: '2026-10-15',
    status: 'PENDENTE',
    itens: [
      { itemId: 'legacy-100-0307', quantidade: 20, observacao: 'Protetor Carenagem 160' },
      { itemId: 'legacy-100-0405', quantidade: 50, observacao: 'Guidão Titan Cargo' },
    ],
    observacoes: 'Pedido para reposição de balcão Grajaú Motos',
  },
  {
    id: 'order-102',
    numeroSequencial: 102,
    clienteId: 'client-jaguaribe',
    prazoEntrega: '2026-10-10',
    status: 'SEPARADO',
    itens: [
      { itemId: 'legacy-100-0245', quantidade: 11, observacao: 'Pedal Soldado L50 BIG' },
      { itemId: 'legacy-100-0248', quantidade: 13, observacao: 'Assento Soldado D03584' },
    ],
    observacoes: 'Linha de cadeiras de rodas hospitalar',
  },
  {
    id: 'order-103',
    numeroSequencial: 103,
    clienteId: 'client-brudden',
    prazoEntrega: '2026-10-20',
    status: 'PENDENTE',
    itens: [
      { itemId: 'legacy-100-0315', quantidade: 15, observacao: 'Articulador do Elevador' },
    ],
    observacoes: 'Produção programada safra agrícola',
  },
  {
    id: 'order-104',
    numeroSequencial: 104,
    clienteId: 'client-galpao-matriz',
    prazoEntrega: '2026-10-05',
    status: 'ENTREGUE',
    itens: [
      { itemId: 'legacy-100-0411', quantidade: 500, observacao: 'Conjunto Barra Estabilizadora' },
    ],
    observacoes: 'Expedição Galpão Matriz - NFe 023.730',
  },
  {
    id: 'order-105',
    numeroSequencial: 105,
    clienteId: 'client-copam',
    prazoEntrega: '2026-10-04',
    status: 'PENDENTE',
    itens: [
      { itemId: 'legacy-100-0314', quantidade: 40, observacao: 'Alça Super Alta FAN/Start' },
    ],
    observacoes: 'Urgência - Pedido fabril atrasado',
  },
  {
    id: 'order-106',
    numeroSequencial: 106,
    clienteId: 'client-galpao-matriz',
    prazoEntrega: '2026-10-02',
    status: 'ENTREGUE',
    itens: [
      { itemId: 'legacy-100-0335', quantidade: 150, observacao: 'Alça Reta POP' },
      { itemId: 'legacy-100-0422', quantidade: 50, observacao: 'Alça Pop Esportiva' },
    ],
    observacoes: 'Despacho Galpão Matriz - NFe 023.733 - P. 9610',
  },
];

