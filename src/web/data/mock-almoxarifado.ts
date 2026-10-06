import type { Item } from '@/core/domain/item.schema';
import type { TipoItem, UnidadeMedida } from '@/core/domain/types';

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
