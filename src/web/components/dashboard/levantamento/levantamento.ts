/**
 * Modelo e regras de apresentação da visão de Levantamento / Queima de Estoque.
 * Funções puras: cruzam o catálogo de itens com as saídas da janela analisada,
 * filtram e serializam o relatório em CSV respeitando a ordem exibida na tela.
 */
import {
  agregarSaidasPorItem,
  calcularCoberturaDias,
  classificarGiro,
  type ClassificacaoGiro,
  type MovimentacaoParaGiro,
} from '@/core/services/estoque-calculator';
import { calcularValorTotalItem } from '@/core/services/custo-medio';
import {
  CATEGORIA_ESTOQUE_LABELS,
  type CategoriaEstoque,
} from '@/core/domain/categoria-estoque';
import { UNIDADE_LABELS, type DashboardItem } from '@/web/data/mock-almoxarifado';
import { formatarDataBR, serializarCsv } from '../../gestao/saida/exportCsv';

/** Janelas de análise disponíveis, em dias. */
export const JANELAS_LEVANTAMENTO_DIAS = [30, 90, 180, 365] as const;
export type JanelaLevantamentoDias = (typeof JANELAS_LEVANTAMENTO_DIAS)[number];

export const GIRO_LABELS: Record<ClassificacaoGiro, string> = {
  parado: 'Parado',
  lento: 'Giro lento',
  regular: 'Giro regular',
  alto: 'Giro alto',
};

export interface LinhaLevantamento {
  id: string;
  codigo: string;
  descricao: string;
  categoria: CategoriaEstoque;
  unidade: string;
  estoqueAtual: number;
  estoqueSeguranca: number;
  totalVendido: number;
  totalConsumido: number;
  totalSaidas: number;
  ultimaSaida?: string;
  coberturaDias: number;
  giro: ClassificacaoGiro;
  valorEstoque: number;
  item: DashboardItem;
}

/**
 * Cruza cada item cadastrado com as saídas de giro da janela.
 * Itens sem nenhuma saída entram com totais zerados (são os candidatos à queima).
 */
export function montarLinhasLevantamento(
  itens: DashboardItem[],
  movimentacoes: MovimentacaoParaGiro[],
  janelaDias: number
): LinhaLevantamento[] {
  const saidas = agregarSaidasPorItem(movimentacoes);

  return itens.map((item) => {
    const metricas = saidas.get(item.id);
    const totalSaidas = metricas?.totalSaidas ?? 0;

    return {
      id: item.id,
      codigo: item.codigo,
      descricao: item.descricao,
      categoria: item.aba,
      unidade: UNIDADE_LABELS[item.unidade] || item.unidade.toLowerCase(),
      estoqueAtual: item.estoqueAtual,
      estoqueSeguranca: item.estoqueSeguranca,
      totalVendido: metricas?.totalVendido ?? 0,
      totalConsumido: metricas?.totalConsumido ?? 0,
      totalSaidas,
      ultimaSaida: metricas?.ultimaSaida,
      coberturaDias: calcularCoberturaDias(item.estoqueAtual, totalSaidas, janelaDias),
      giro: classificarGiro(item.estoqueAtual, totalSaidas, janelaDias),
      valorEstoque: calcularValorTotalItem(item.estoqueAtual, item.custoUnitario),
      item,
    };
  });
}

export interface FiltrosLevantamento {
  busca?: string;
  categoria?: 'todas' | CategoriaEstoque;
  giro?: 'todos' | ClassificacaoGiro;
  /** Oculta itens sem saldo (não há o que liquidar). */
  somenteComSaldo?: boolean;
}

export function filtrarLinhasLevantamento(
  linhas: LinhaLevantamento[],
  { busca = '', categoria = 'todas', giro = 'todos', somenteComSaldo = false }: FiltrosLevantamento
): LinhaLevantamento[] {
  const termo = busca.trim().toLowerCase();

  return linhas.filter((l) => {
    if (categoria !== 'todas' && l.categoria !== categoria) return false;
    if (giro !== 'todos' && l.giro !== giro) return false;
    if (somenteComSaldo && l.estoqueAtual <= 0) return false;
    if (termo && !l.codigo.toLowerCase().includes(termo) && !l.descricao.toLowerCase().includes(termo)) {
      return false;
    }
    return true;
  });
}

/** Número no padrão do Excel pt-BR: vírgula decimal e sem separador de milhar. */
function numeroCsv(valor: number, casas = 4): string {
  return valor.toLocaleString('pt-BR', { useGrouping: false, maximumFractionDigits: casas });
}

export function formatarCobertura(coberturaDias: number): string {
  if (coberturaDias === Number.POSITIVE_INFINITY) return 'Sem saída';
  return `${coberturaDias.toLocaleString('pt-BR')} dias`;
}

/**
 * Gera o CSV do levantamento na mesma ordem das linhas recebidas
 * (a tela passa as linhas já filtradas e ordenadas).
 */
export function gerarLevantamentoCSV(linhas: LinhaLevantamento[], janelaDias: number): string {
  const cabecalho = [
    'Código',
    'Descrição',
    'Categoria',
    'Unidade',
    'Saldo atual',
    'Estoque mínimo',
    `Vendido (${janelaDias}d)`,
    `Consumido (${janelaDias}d)`,
    `Total de saídas (${janelaDias}d)`,
    'Cobertura (dias)',
    'Giro',
    'Última saída',
    'Valor em estoque (R$)',
  ];

  return serializarCsv([
    cabecalho,
    ...linhas.map((l) => [
      l.codigo,
      l.descricao,
      CATEGORIA_ESTOQUE_LABELS[l.categoria],
      l.unidade,
      numeroCsv(l.estoqueAtual),
      numeroCsv(l.estoqueSeguranca),
      numeroCsv(l.totalVendido),
      numeroCsv(l.totalConsumido),
      numeroCsv(l.totalSaidas),
      l.coberturaDias === Number.POSITIVE_INFINITY ? 'Sem saída' : numeroCsv(l.coberturaDias, 0),
      GIRO_LABELS[l.giro],
      l.ultimaSaida ? formatarDataBR(l.ultimaSaida) : '',
      numeroCsv(l.valorEstoque, 2),
    ]),
  ]);
}
