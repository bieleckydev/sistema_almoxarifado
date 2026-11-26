import { CATEGORIAS_ESTOQUE, type CategoriaEstoque } from '../domain/categoria-estoque';

/**
 * Dados mínimos de um item para a busca de materiais de um pedido de venda.
 */
export interface ItemBuscavelPedido {
  id: string;
  codigo: string;
  descricao: string;
  categoria: CategoriaEstoque;
  estoqueAtual: number;
  unidade: string;
  localizacaoFisica?: string;
  ativo?: boolean;
}

export type FiltroCategoriaPedido = CategoriaEstoque | 'todas';

export interface FiltroBuscaItensPedido {
  termo?: string;
  categoria?: FiltroCategoriaPedido;
  /** Inclui itens zerados no resultado (exibidos como indisponíveis). Padrão: false. */
  incluirSemSaldo?: boolean;
  /** Máximo de resultados devolvidos. Padrão: 50. */
  limite?: number;
}

export interface ResultadoBuscaItensPedido<T extends ItemBuscavelPedido> {
  resultados: T[];
  /** Quantos itens casam com o termo em cada categoria (respeitando o filtro de saldo). */
  contagemPorCategoria: Record<FiltroCategoriaPedido, number>;
  /** Itens que casam com o termo e a categoria, mas ficaram de fora por estarem sem saldo. */
  ocultosSemSaldo: number;
  /** Total que casa com os filtros antes do limite. */
  totalEncontrado: number;
}

export const LIMITE_PADRAO_BUSCA_PEDIDO = 50;

function normalizarTexto(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Item com saldo positivo pode entrar no pedido. */
export function temSaldoDisponivel(item: Pick<ItemBuscavelPedido, 'estoqueAtual'>): boolean {
  return item.estoqueAtual > 0;
}

/**
 * Relevância do item para o termo (menor é melhor) ou null quando não casa.
 * Todos os termos precisam aparecer no código, na descrição ou na localização.
 */
function pontuarItem(item: ItemBuscavelPedido, tokens: string[], termo: string): number | null {
  if (tokens.length === 0) return 4;
  const codigo = normalizarTexto(item.codigo);
  const descricao = normalizarTexto(item.descricao);
  const local = normalizarTexto(item.localizacaoFisica || '');
  const alvo = `${codigo} ${descricao} ${local}`;
  if (!tokens.every((t) => alvo.includes(t))) return null;

  if (codigo === termo) return 0;
  if (codigo.startsWith(termo)) return 1;
  if (descricao.startsWith(termo)) return 2;
  if (descricao.split(/\s+/).some((palavra) => palavra.startsWith(tokens[0]))) return 3;
  return 4;
}

/**
 * Busca preditiva de materiais para o pedido de venda.
 *
 * - Respeita a categoria escolhida (mp, imp, motos ou todas).
 * - Ignora itens inativos.
 * - Por padrão oculta itens sem saldo, para que não entrem no pedido.
 * - Ordena por relevância (código exato, prefixo de código, prefixo de descrição),
 *   depois itens com saldo antes dos zerados e, por fim, descrição.
 */
export function buscarItensParaPedido<T extends ItemBuscavelPedido>(
  itens: readonly T[],
  filtro: FiltroBuscaItensPedido = {}
): ResultadoBuscaItensPedido<T> {
  const termo = normalizarTexto(filtro.termo || '');
  const tokens = termo.split(/\s+/).filter(Boolean);
  const categoria = filtro.categoria ?? 'todas';
  const incluirSemSaldo = filtro.incluirSemSaldo ?? false;
  const limite = filtro.limite ?? LIMITE_PADRAO_BUSCA_PEDIDO;

  const contagemPorCategoria = { todas: 0, mp: 0, imp: 0, motos: 0 } as Record<
    FiltroCategoriaPedido,
    number
  >;
  const candidatos: Array<{ item: T; pontos: number }> = [];
  let ocultosSemSaldo = 0;

  for (const item of itens) {
    if (item.ativo === false) continue;
    const pontos = pontuarItem(item, tokens, termo);
    if (pontos === null) continue;

    const comSaldo = temSaldoDisponivel(item);
    const naCategoria = categoria === 'todas' || item.categoria === categoria;

    if (!comSaldo && !incluirSemSaldo) {
      if (naCategoria) ocultosSemSaldo += 1;
      continue;
    }

    contagemPorCategoria.todas += 1;
    contagemPorCategoria[item.categoria] += 1;
    if (naCategoria) candidatos.push({ item, pontos });
  }

  candidatos.sort((a, b) => {
    if (a.pontos !== b.pontos) return a.pontos - b.pontos;
    const saldoA = temSaldoDisponivel(a.item) ? 0 : 1;
    const saldoB = temSaldoDisponivel(b.item) ? 0 : 1;
    if (saldoA !== saldoB) return saldoA - saldoB;
    return a.item.descricao.localeCompare(b.item.descricao, 'pt-BR');
  });

  return {
    resultados: candidatos.slice(0, limite).map((c) => c.item),
    contagemPorCategoria,
    ocultosSemSaldo,
    totalEncontrado: candidatos.length,
  };
}

export interface AvaliacaoSaldoLinha {
  excede: boolean;
  /** Quanto falta no estoque para atender a quantidade (0 quando há saldo). */
  deficit: number;
}

/**
 * Compara a quantidade pedida com o saldo disponível do item.
 */
export function avaliarSaldoLinha(quantidade: number, saldoDisponivel: number): AvaliacaoSaldoLinha {
  const deficit = Math.round(Math.max(0, quantidade - Math.max(0, saldoDisponivel)) * 1000) / 1000;
  return { excede: deficit > 0, deficit };
}

/** Ordem canônica das categorias para os filtros da busca. */
export const FILTROS_CATEGORIA_PEDIDO: readonly FiltroCategoriaPedido[] = [
  'todas',
  ...CATEGORIAS_ESTOQUE,
];
