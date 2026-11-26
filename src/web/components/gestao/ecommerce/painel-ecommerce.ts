/**
 * Modelo e regras de apresentação do Painel E-commerce (Peças de motos).
 * Funções puras: cruzam o catálogo de peças com as saídas do período global
 * e aplicam a regra de balanceamento comercial (vender x produzir) do core.
 */
import {
  agregarSaidasPorItem,
  classificarBalanceamentoComercial,
  type ClassificacaoGiro,
  type MovimentacaoParaGiro,
  type RecomendacaoComercial,
} from '@/core/services/estoque-calculator';
import { calcularValorTotalItem } from '@/core/services/custo-medio';
import { UNIDADE_LABELS, type DashboardItem } from '@/web/data/mock-almoxarifado';
import { serializarCsv } from '../saida/exportCsv';

export const RECOMENDACAO_LABELS: Record<RecomendacaoComercial, string> = {
  produzir: 'Solicitar produção',
  vender: 'Priorizar venda ML',
  equilibrado: 'Equilibrado',
};

export interface LinhaPainelEcommerce {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string;
  estoqueAtual: number;
  estoqueSeguranca: number;
  totalVendido: number;
  totalSaidas: number;
  coberturaDias: number;
  giro: ClassificacaoGiro;
  recomendacao: RecomendacaoComercial;
  saldoAlvo: number;
  quantidadeProduzir: number;
  quantidadeExcedente: number;
  /** Custo médio do excedente vendável (capital parado a liberar). */
  valorExcedente: number;
  item: DashboardItem;
}

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/**
 * Duração em dias do histórico lido (período 'Tudo'): da movimentação mais
 * antiga até a data base, contando os dois dias. Mínimo de 1.
 */
export function calcularJanelaDoHistorico(
  movimentacoes: MovimentacaoParaGiro[],
  dataBase: Date = new Date()
): number {
  let maisAntiga: number | undefined;
  for (const m of movimentacoes) {
    if (!m.dataMovimentacao) continue;
    const t = new Date(m.dataMovimentacao).getTime();
    if (!Number.isNaN(t) && (maisAntiga === undefined || t < maisAntiga)) maisAntiga = t;
  }
  if (maisAntiga === undefined) return 1;

  const inicio = new Date(maisAntiga);
  inicio.setHours(0, 0, 0, 0);
  const fim = new Date(dataBase);
  fim.setHours(0, 0, 0, 0);
  return Math.max(1, Math.round((fim.getTime() - inicio.getTime()) / MS_POR_DIA) + 1);
}

/**
 * Cruza as peças de motos ativas com as saídas de giro do período e classifica
 * cada uma. Itens de outras categorias são descartados.
 */
export function montarLinhasPainelEcommerce(
  itens: DashboardItem[],
  movimentacoes: MovimentacaoParaGiro[],
  janelaDias: number
): LinhaPainelEcommerce[] {
  const saidas = agregarSaidasPorItem(movimentacoes);

  return itens
    .filter((item) => item.aba === 'motos' && item.ativo !== false)
    .map((item) => {
      const metricas = saidas.get(item.id);
      const totalSaidas = metricas?.totalSaidas ?? 0;
      const b = classificarBalanceamentoComercial(
        item.estoqueAtual,
        item.estoqueSeguranca,
        totalSaidas,
        janelaDias
      );

      return {
        id: item.id,
        codigo: item.codigo,
        descricao: item.descricao,
        unidade: UNIDADE_LABELS[item.unidade] || item.unidade.toLowerCase(),
        estoqueAtual: item.estoqueAtual,
        estoqueSeguranca: item.estoqueSeguranca,
        totalVendido: metricas?.totalVendido ?? 0,
        totalSaidas,
        coberturaDias: b.coberturaDias,
        giro: b.giro,
        recomendacao: b.recomendacao,
        saldoAlvo: b.saldoAlvo,
        quantidadeProduzir: b.quantidadeProduzir,
        quantidadeExcedente: b.quantidadeExcedente,
        valorExcedente: calcularValorTotalItem(b.quantidadeExcedente, item.custoUnitario),
        item,
      };
    });
}

export interface ResumoPainelEcommerce {
  contagem: Record<'todas' | RecomendacaoComercial, number>;
  unidadesProduzir: number;
  unidadesExcedentes: number;
  valorExcedente: number;
}

export function resumirPainelEcommerce(linhas: LinhaPainelEcommerce[]): ResumoPainelEcommerce {
  const resumo: ResumoPainelEcommerce = {
    contagem: { todas: linhas.length, produzir: 0, vender: 0, equilibrado: 0 },
    unidadesProduzir: 0,
    unidadesExcedentes: 0,
    valorExcedente: 0,
  };
  for (const l of linhas) {
    resumo.contagem[l.recomendacao]++;
    resumo.unidadesProduzir += l.quantidadeProduzir;
    resumo.unidadesExcedentes += l.quantidadeExcedente;
    resumo.valorExcedente += l.valorExcedente;
  }
  resumo.valorExcedente = Math.round(resumo.valorExcedente * 100) / 100;
  return resumo;
}

export interface FiltrosPainelEcommerce {
  busca?: string;
  recomendacao?: 'todas' | RecomendacaoComercial;
}

export function filtrarLinhasPainelEcommerce(
  linhas: LinhaPainelEcommerce[],
  { busca = '', recomendacao = 'todas' }: FiltrosPainelEcommerce
): LinhaPainelEcommerce[] {
  const termo = busca.trim().toLowerCase();
  return linhas.filter((l) => {
    if (recomendacao !== 'todas' && l.recomendacao !== recomendacao) return false;
    if (termo && !l.codigo.toLowerCase().includes(termo) && !l.descricao.toLowerCase().includes(termo)) {
      return false;
    }
    return true;
  });
}

const PRIORIDADE: Record<RecomendacaoComercial, number> = { produzir: 0, vender: 1, equilibrado: 2 };

/**
 * Ordem operacional (sem mutar): primeiro o que precisa de produção (menor
 * cobertura, depois maior quantidade), em seguida os excedentes (maior capital
 * parado) e, por fim, os equilibrados por descrição.
 */
export function ordenarLinhasPainelEcommerce(linhas: LinhaPainelEcommerce[]): LinhaPainelEcommerce[] {
  return [...linhas].sort((a, b) => {
    const prioridade = PRIORIDADE[a.recomendacao] - PRIORIDADE[b.recomendacao];
    if (prioridade !== 0) return prioridade;
    if (a.recomendacao === 'produzir') {
      // Sem saída (cobertura infinita) vai por último; Infinity - Infinity é NaN e cai no desempate.
      const cobertura = a.coberturaDias - b.coberturaDias;
      if (!Number.isNaN(cobertura) && cobertura !== 0) return cobertura;
      const qtd = b.quantidadeProduzir - a.quantidadeProduzir;
      if (qtd !== 0) return qtd;
    } else if (a.recomendacao === 'vender') {
      const valor = b.valorExcedente - a.valorExcedente;
      if (valor !== 0) return valor;
      const qtd = b.quantidadeExcedente - a.quantidadeExcedente;
      if (qtd !== 0) return qtd;
    }
    return a.descricao.localeCompare(b.descricao, 'pt-BR');
  });
}

function numeroCsv(valor: number, casas = 4): string {
  return valor.toLocaleString('pt-BR', { useGrouping: false, maximumFractionDigits: casas });
}

/**
 * CSV na ordem recebida, pronto para virar lista de produção ou de anúncios.
 */
export function gerarPainelEcommerceCSV(linhas: LinhaPainelEcommerce[], rotuloPeriodo: string): string {
  return serializarCsv([
    [
      'Código',
      'Descrição',
      'Unidade',
      'Saldo atual',
      'Estoque mínimo',
      `Vendido (${rotuloPeriodo})`,
      `Total de saídas (${rotuloPeriodo})`,
      'Cobertura (dias)',
      'Recomendação',
      'Qtd. a produzir',
      'Qtd. excedente',
      'Valor do excedente (R$)',
    ],
    ...linhas.map((l) => [
      l.codigo,
      l.descricao,
      l.unidade,
      numeroCsv(l.estoqueAtual),
      numeroCsv(l.estoqueSeguranca),
      numeroCsv(l.totalVendido),
      numeroCsv(l.totalSaidas),
      l.coberturaDias === Number.POSITIVE_INFINITY ? 'Sem saída' : numeroCsv(l.coberturaDias, 0),
      RECOMENDACAO_LABELS[l.recomendacao],
      numeroCsv(l.quantidadeProduzir),
      numeroCsv(l.quantidadeExcedente),
      numeroCsv(l.valorExcedente, 2),
    ]),
  ]);
}
