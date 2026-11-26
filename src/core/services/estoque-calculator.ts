import { TipoMovimentacao, StatusEstoque } from '../domain/types';

/**
 * Erro específico disparado quando uma operação de baixa ou ajuste negativo
 * excede o saldo físico disponível em estoque.
 */
export class SaldoInsuficienteError extends Error {
  public readonly saldoAtual: number;
  public readonly quantidadeSolicitada: number;
  public readonly saldoInsuficienteEm: number;
  public readonly itemId?: string;

  constructor(
    saldoAtual: number,
    quantidadeSolicitada: number,
    itemId?: string
  ) {
    const faltante = quantidadeSolicitada - saldoAtual;
    super(
      `Saldo insuficiente em estoque${itemId ? ` para o item ${itemId}` : ''}. ` +
      `Disponível: ${saldoAtual}, Solicitado: ${quantidadeSolicitada}, Faltante: ${faltante}.`
    );
    this.name = 'SaldoInsuficienteError';
    this.saldoAtual = saldoAtual;
    this.quantidadeSolicitada = quantidadeSolicitada;
    this.saldoInsuficienteEm = faltante;
    this.itemId = itemId;
  }
}

export interface CalculoSaldoOptions {
  /**
   * Se true, permite que o saldo final fique negativo (útil se a fábrica configurar
   * política de tolerância de entrega pré-faturamento). Default: false (estrito).
   */
  permitirSaldoNegativo?: boolean;
  /**
   * Identificador do item para contextualizar mensagens de erro de auditoria.
   */
  itemId?: string;
}

/**
 * Arredonda números para precisão de até 4 casas decimais para evitar imprecisões de ponto flutuante.
 */
function arredondarPrecisao(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 10000) / 10000;
}

/**
 * Verifica se um tipo de movimentação adiciona saldo ao estoque.
 */
export function isMovimentacaoEntrada(tipo: TipoMovimentacao): boolean {
  return (
    tipo === 'ENTRADA_COMPRA' ||
    tipo === 'ENTRADA_PRODUCAO' ||
    tipo === 'AJUSTE_INVENTARIO_POSITIVO'
  );
}

/**
 * Verifica se um tipo de movimentação reduz saldo do estoque.
 */
export function isMovimentacaoSaida(tipo: TipoMovimentacao): boolean {
  return (
    tipo === 'SAIDA_CONSUMO_INTERNO' ||
    tipo === 'SAIDA_EXPEDICAO' ||
    tipo === 'AJUSTE_INVENTARIO_NEGATIVO'
  );
}

/**
 * Função pura que calcula o novo saldo resultante de uma movimentação física.
 *
 * @param saldoAtual Saldo disponível antes da operação
 * @param tipo Natureza da movimentação (entrada, baixa, ajuste)
 * @param quantidade Quantidade física movimentada (deve ser > 0)
 * @param options Opções adicionais de tolerância e identificação
 * @returns Novo saldo matemático após a aplicação da movimentação
 * @throws SaldoInsuficienteError Se a saída ultrapassar o saldo atual e permitirSaldoNegativo for false
 */
export function calcularNovoSaldo(
  saldoAtual: number,
  tipo: TipoMovimentacao,
  quantidade: number,
  options: CalculoSaldoOptions = {}
): number {
  if (quantidade <= 0) {
    throw new Error('A quantidade da movimentação deve ser estritamente maior que zero.');
  }

  const { permitirSaldoNegativo = false, itemId } = options;

  let delta = 0;
  if (isMovimentacaoEntrada(tipo)) {
    delta = quantidade;
  } else if (isMovimentacaoSaida(tipo)) {
    delta = -quantidade;
  } else {
    throw new Error(`Tipo de movimentação desconhecido: ${tipo}`);
  }

  const novoSaldo = arredondarPrecisao(saldoAtual + delta);

  if (novoSaldo < 0 && !permitirSaldoNegativo) {
    throw new SaldoInsuficienteError(saldoAtual, quantidade, itemId);
  }

  return novoSaldo;
}

/**
 * Função pura que determina a classificação de saúde/criticidade do estoque
 * comparando o saldo atual com a margem de segurança cadastrada.
 *
 * - CRITICO_ZERADO: saldo <= 0
 * - ESTOQUE_BAIXO: 0 < saldo <= estoqueSeguranca
 * - NORMAL: saldo > estoqueSeguranca
 */
export function determinarStatusEstoque(
  saldoAtual: number,
  estoqueSeguranca: number
): StatusEstoque {
  if (saldoAtual <= 0) {
    return 'CRITICO_ZERADO';
  }

  if (saldoAtual <= estoqueSeguranca) {
    return 'ESTOQUE_BAIXO';
  }

  return 'NORMAL';
}

/**
 * Situação do item frente ao estoque mínimo, como exibida nas telas.
 * - 'crit': saldo até 50% do mínimo (crítico)
 * - 'low': saldo até o mínimo (abaixo do mínimo de segurança)
 * - 'ok': saldo acima do mínimo (normal)
 */
export type StatusCriticidade = 'ok' | 'low' | 'crit';

/** Fração do estoque mínimo a partir da qual o item é considerado crítico. */
export const LIMITE_CRITICO_SOBRE_MINIMO = 0.5;

/**
 * Regra única de criticidade usada por badges, barras, cards e resumos.
 * Saldo zerado é um caso particular de crítico (quando há mínimo definido).
 */
export function calcularStatusCriticidade(
  estoqueAtual: number,
  estoqueSeguranca: number
): StatusCriticidade {
  if (estoqueAtual <= estoqueSeguranca * LIMITE_CRITICO_SOBRE_MINIMO) {
    return 'crit';
  }
  if (estoqueAtual <= estoqueSeguranca) {
    return 'low';
  }
  return 'ok';
}

/**
 * Função pura que valida a disponibilidade imediata de estoque para uma requisição de saída.
 * Não lança erro, retornando a análise detalhada para feedback em tempo real na UI ou validação prévia.
 */
export function validarDisponibilidadeEstoque(
  saldoAtual: number,
  quantidadeSolicitada: number
): {
  disponivel: boolean;
  saldoRestante: number;
  faltante: number;
} {
  const diferenca = arredondarPrecisao(saldoAtual - quantidadeSolicitada);

  if (diferenca >= 0) {
    return {
      disponivel: true,
      saldoRestante: diferenca,
      faltante: 0,
    };
  }

  return {
    disponivel: false,
    saldoRestante: 0,
    faltante: arredondarPrecisao(Math.abs(diferenca)),
  };
}

/**
 * Função pura que calcula a necessidade e quantidade sugerida de reposição de estoque
 * para atingir o estoque de segurança mais o lote padrão de compra.
 */
export function calcularNecessidadeReposicao(
  saldoAtual: number,
  estoqueSeguranca: number,
  lotePadraoCompra: number = 0
): {
  precisaRepor: boolean;
  quantidadeSugerida: number;
  status: StatusEstoque;
} {
  const status = determinarStatusEstoque(saldoAtual, estoqueSeguranca);
  const precisaRepor = status !== 'NORMAL';

  if (!precisaRepor) {
    return {
      precisaRepor: false,
      quantidadeSugerida: 0,
      status,
    };
  }

  // Quantidade para atingir o estoque de segurança + lote de compra (se houver)
  const deficitSeguranca = Math.max(0, estoqueSeguranca - saldoAtual);
  const quantidadeSugerida = arredondarPrecisao(deficitSeguranca + lotePadraoCompra);

  return {
    precisaRepor: true,
    quantidadeSugerida,
    status,
  };
}

// ==========================================
// LEVANTAMENTO / QUEIMA DE ESTOQUE (ANÁLISE DE GIRO)
// ==========================================

/**
 * Recorte mínimo de uma movimentação necessário para medir o volume de saídas.
 */
export interface MovimentacaoParaGiro {
  itemId: string;
  tipo: TipoMovimentacao;
  quantidade: number;
  dataMovimentacao?: string;
  /** Movimentação original que foi estornada (não conta como saída real). */
  estornado?: boolean;
  /** Movimentação de estorno que anula outra (também não conta). */
  estornoDe?: string;
}

/**
 * Volume de saídas de um item dentro da janela analisada.
 * - totalVendido: expedições (SAIDA_EXPEDICAO), ou seja, vendas faturadas/expedidas
 * - totalConsumido: baixas internas (SAIDA_CONSUMO_INTERNO)
 * - totalSaidas: soma das duas (ajuste negativo de inventário não é giro)
 */
export interface MetricasSaidaItem {
  totalVendido: number;
  totalConsumido: number;
  totalSaidas: number;
  quantidadeMovimentos: number;
  ultimaSaida?: string;
}

/**
 * Indica se a movimentação representa giro real de estoque (venda ou consumo),
 * desconsiderando ajustes de inventário e pares estornados.
 */
export function isSaidaDeGiro(mov: MovimentacaoParaGiro): boolean {
  if (mov.estornado || mov.estornoDe) return false;
  return mov.tipo === 'SAIDA_EXPEDICAO' || mov.tipo === 'SAIDA_CONSUMO_INTERNO';
}

/**
 * Agrega as saídas de giro por item. Itens sem saída simplesmente não aparecem no mapa.
 */
export function agregarSaidasPorItem(
  movimentacoes: MovimentacaoParaGiro[]
): Map<string, MetricasSaidaItem> {
  const mapa = new Map<string, MetricasSaidaItem>();

  for (const mov of movimentacoes) {
    if (!isSaidaDeGiro(mov)) continue;

    const atual = mapa.get(mov.itemId) || {
      totalVendido: 0,
      totalConsumido: 0,
      totalSaidas: 0,
      quantidadeMovimentos: 0,
    };

    if (mov.tipo === 'SAIDA_EXPEDICAO') {
      atual.totalVendido = arredondarPrecisao(atual.totalVendido + mov.quantidade);
    } else {
      atual.totalConsumido = arredondarPrecisao(atual.totalConsumido + mov.quantidade);
    }
    atual.totalSaidas = arredondarPrecisao(atual.totalSaidas + mov.quantidade);
    atual.quantidadeMovimentos += 1;

    if (mov.dataMovimentacao && (!atual.ultimaSaida || mov.dataMovimentacao > atual.ultimaSaida)) {
      atual.ultimaSaida = mov.dataMovimentacao;
    }

    mapa.set(mov.itemId, atual);
  }

  return mapa;
}

/**
 * Dias de cobertura: por quantos dias o saldo atual dura no ritmo de saída observado.
 * Retorna Infinity quando não houve saída na janela (estoque parado).
 */
export function calcularCoberturaDias(
  saldoAtual: number,
  totalSaidas: number,
  janelaDias: number
): number {
  if (saldoAtual <= 0) return 0;
  if (totalSaidas <= 0 || janelaDias <= 0) return Number.POSITIVE_INFINITY;
  const consumoDiario = totalSaidas / janelaDias;
  return Math.round(saldoAtual / consumoDiario);
}

/**
 * Classificação de giro usada para decidir liquidação/queima:
 * - 'parado': nenhuma saída na janela
 * - 'lento': cobertura acima de LIMITE_GIRO_LENTO_DIAS (excedente)
 * - 'regular': cobertura entre os dois limites
 * - 'alto': cobertura até LIMITE_GIRO_ALTO_DIAS (risco de ruptura)
 */
export type ClassificacaoGiro = 'parado' | 'lento' | 'regular' | 'alto';

export const LIMITE_GIRO_ALTO_DIAS = 30;
export const LIMITE_GIRO_LENTO_DIAS = 180;

export function classificarGiro(
  saldoAtual: number,
  totalSaidas: number,
  janelaDias: number
): ClassificacaoGiro {
  if (totalSaidas <= 0) return 'parado';
  const cobertura = calcularCoberturaDias(saldoAtual, totalSaidas, janelaDias);
  if (cobertura > LIMITE_GIRO_LENTO_DIAS) return 'lento';
  if (cobertura > LIMITE_GIRO_ALTO_DIAS) return 'regular';
  return 'alto';
}

/**
 * Critérios de ordenação da tela de levantamento.
 * - saldo_desc: maior saldo primeiro (excedente para liquidação)
 * - saldo_asc: menor saldo primeiro (pontos de ruptura)
 * - saidas_desc: mais vendidos/consumidos primeiro
 * - saidas_asc: giro baixo/estagnados primeiro
 * - cobertura_desc: maior cobertura em dias primeiro (parados no topo)
 */
export type CriterioOrdenacaoLevantamento =
  | 'saldo_desc'
  | 'saldo_asc'
  | 'saidas_desc'
  | 'saidas_asc'
  | 'cobertura_desc';

export interface LinhaOrdenavelLevantamento {
  descricao: string;
  estoqueAtual: number;
  totalSaidas: number;
  coberturaDias: number;
}

function compararCobertura(a: number, b: number): number {
  if (a === b) return 0;
  if (a === Number.POSITIVE_INFINITY) return 1;
  if (b === Number.POSITIVE_INFINITY) return -1;
  return a - b;
}

/**
 * Ordena (sem mutar) as linhas do levantamento. Empates são resolvidos
 * pelo critério secundário de negócio e, por fim, pela descrição.
 */
export function ordenarLevantamento<T extends LinhaOrdenavelLevantamento>(
  linhas: T[],
  criterio: CriterioOrdenacaoLevantamento
): T[] {
  const porDescricao = (a: T, b: T) => a.descricao.localeCompare(b.descricao, 'pt-BR');

  const comparadores: Record<CriterioOrdenacaoLevantamento, (a: T, b: T) => number> = {
    saldo_desc: (a, b) => b.estoqueAtual - a.estoqueAtual || porDescricao(a, b),
    saldo_asc: (a, b) => a.estoqueAtual - b.estoqueAtual || porDescricao(a, b),
    saidas_desc: (a, b) => b.totalSaidas - a.totalSaidas || porDescricao(a, b),
    // Entre itens com o mesmo giro, o maior saldo parado vem primeiro (mais urgente para queima)
    saidas_asc: (a, b) =>
      a.totalSaidas - b.totalSaidas || b.estoqueAtual - a.estoqueAtual || porDescricao(a, b),
    cobertura_desc: (a, b) =>
      compararCobertura(b.coberturaDias, a.coberturaDias) ||
      b.estoqueAtual - a.estoqueAtual ||
      porDescricao(a, b),
  };

  return [...linhas].sort(comparadores[criterio]);
}

// ==========================================
// BALANCEAMENTO COMERCIAL (VENDER X PRODUZIR)
// ==========================================

/**
 * Recomendação operacional do balanceamento entre demanda comercial e produção.
 * - 'vender': excedente parado — priorizar anúncio/queima no canal online
 * - 'produzir': saldo no mínimo ou alta procura — abrir ordem de fabricação
 * - 'equilibrado': nenhuma ação imediata
 */
export type RecomendacaoComercial = 'vender' | 'produzir' | 'equilibrado';

/** Saldo a partir do qual o item é excedente, em múltiplos do estoque mínimo. */
export const FATOR_EXCESSO_SOBRE_MINIMO = 3;

/** Saldo a partir do qual giro parado/lento já caracteriza excedente, em múltiplos do mínimo. */
export const FATOR_BAIXO_GIRO_SOBRE_MINIMO = 2;

export interface BalanceamentoComercial {
  recomendacao: RecomendacaoComercial;
  /** Saldo-alvo: mínimo de segurança + demanda projetada para LIMITE_GIRO_ALTO_DIAS. */
  saldoAlvo: number;
  /** Quantidade sugerida para a ordem de fabricação (0 se não for 'produzir'). */
  quantidadeProduzir: number;
  /** Quantidade acima do saldo-alvo disponível para venda (0 se não for 'vender'). */
  quantidadeExcedente: number;
  coberturaDias: number;
  giro: ClassificacaoGiro;
}

/**
 * Classifica um item de venda online pelo balanceamento estoque vs. produção,
 * usando o ritmo diário de saídas da janela (mesma régua do levantamento de giro).
 *
 * Produzir (prioridade): saldo na faixa de criticidade (até o mínimo) ou giro
 * alto — cobertura de até LIMITE_GIRO_ALTO_DIAS no ritmo observado.
 *
 * Vender: com mínimo definido, saldo >= 3x o mínimo, ou saldo >= 2x o mínimo com
 * giro parado ou lento. Sem mínimo cadastrado não há referência de excesso.
 *
 * @param saidasJanela Saídas de giro (venda/consumo) dentro da janela
 * @param janelaDias Duração da janela em dias (>= 1)
 */
export function classificarBalanceamentoComercial(
  estoqueAtual: number,
  estoqueSeguranca: number,
  saidasJanela: number,
  janelaDias: number
): BalanceamentoComercial {
  const minimo = Math.max(0, estoqueSeguranca);
  const saidas = Math.max(0, saidasJanela);
  const dias = Math.max(1, janelaDias);
  const demandaHorizonte = (saidas / dias) * LIMITE_GIRO_ALTO_DIAS;
  const saldoAlvo = arredondarPrecisao(minimo + demandaHorizonte);
  const coberturaDias = calcularCoberturaDias(estoqueAtual, saidas, dias);
  const giro = classificarGiro(estoqueAtual, saidas, dias);

  const base = { saldoAlvo, coberturaDias, giro };

  if (calcularStatusCriticidade(estoqueAtual, minimo) !== 'ok' || giro === 'alto') {
    return {
      ...base,
      recomendacao: 'produzir',
      quantidadeProduzir: arredondarPrecisao(Math.max(0, saldoAlvo - estoqueAtual)),
      quantidadeExcedente: 0,
    };
  }

  const giroBaixo = giro === 'parado' || giro === 'lento';
  const excesso =
    minimo > 0 &&
    (estoqueAtual >= minimo * FATOR_EXCESSO_SOBRE_MINIMO ||
      (estoqueAtual >= minimo * FATOR_BAIXO_GIRO_SOBRE_MINIMO && giroBaixo));

  if (excesso) {
    return {
      ...base,
      recomendacao: 'vender',
      quantidadeProduzir: 0,
      quantidadeExcedente: arredondarPrecisao(Math.max(0, estoqueAtual - saldoAlvo)),
    };
  }

  return { ...base, recomendacao: 'equilibrado', quantidadeProduzir: 0, quantidadeExcedente: 0 };
}
