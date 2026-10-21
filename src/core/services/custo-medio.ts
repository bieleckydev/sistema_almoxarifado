import { arredondar3 } from '../domain/quantidade';

/**
 * Calcula o custo médio ponderado de um item após uma nova entrada.
 * Fórmula exata do Protótipo 3.0:
 * novoCusto = ((saldoAtual * custoAtual) + (qtdEntrada * custoEntrada)) / (saldoAtual + qtdEntrada)
 */
export function calcularCustoMedioPonderado(
  saldoAtual: number,
  custoAtual: number,
  qtdEntrada: number,
  custoEntrada: number
): number {
  if (custoEntrada <= 0 || qtdEntrada <= 0) {
    return custoAtual || 0;
  }

  const saldoBase = Math.max(0, saldoAtual);
  const valorTotalAnterior = saldoBase * (custoAtual || 0);
  const valorEntrada = qtdEntrada * custoEntrada;
  const novoSaldo = saldoBase + qtdEntrada;

  if (novoSaldo <= 0) {
    return custoEntrada;
  }

  const novoCusto = (valorTotalAnterior + valorEntrada) / novoSaldo;
  return Math.round(novoCusto * 100) / 100;
}

/**
 * Formata um valor numérico em reais (BRL) no padrão brasileiro.
 */
export function formatarMoedaBrl(valor?: number | null): string {
  return (valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/**
 * Calcula o valor total financeiro em estoque de um item (Quantidade * Custo Unitário).
 */
export function calcularValorTotalItem(quantidade: number, custoUnitario?: number | null): number {
  const qtd = Math.max(0, quantidade);
  const custo = Math.max(0, custoUnitario || 0);
  return Math.round(qtd * custo * 100) / 100;
}
