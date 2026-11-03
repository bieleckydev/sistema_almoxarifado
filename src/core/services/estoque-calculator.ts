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
