import { z } from 'zod';

/**
 * Arredonda um número para 3 casas decimais (padrão de precisão do Protótipo 3.0 para quilos, metros, unidades).
 */
export function arredondar3(valor: number): number {
  return Math.round(valor * 1000) / 1000;
}

/**
 * Calcula a razão de cobertura do estoque em relação ao mínimo de forma segura contra divisão por zero.
 * (Fórmula exata do Protótipo 3.0: p.min > 0 ? p.qtd / p.min : (p.qtd > 0 ? 999 : 0))
 */
export function calcularRazaoEstoque(qtd: number, min: number): number {
  if (min > 0) {
    return qtd / min;
  }
  return qtd > 0 ? 999 : 0;
}

/**
 * Formata um número no padrão brasileiro com separador de milhar.
 */
export function formatarNumeroPtBr(valor: number): string {
  return Number(valor).toLocaleString('pt-BR', {
    maximumFractionDigits: 3,
  });
}

/**
 * Schema Zod para quantidades fracionárias positivas com mínimo 0.001.
 */
export const QuantidadeFracionariaSchema = z
  .number({
    error: 'A quantidade deve ser um número válido',
  })
  .positive('A quantidade deve ser maior que zero')
  .min(0.001, 'A quantidade mínima é 0,001')
  .transform(arredondar3);
