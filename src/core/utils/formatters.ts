import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { UnidadeMedida } from '../domain/types';

/**
 * Formatação de data/hora no padrão brasileiro.
 */
export const formatDate = (
  date: string | Date | null | undefined,
  pattern = 'dd/MM/yyyy HH:mm'
): string => {
  if (!date) return '-';
  try {
    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(parsedDate)) return '-';
    return format(parsedDate, pattern, { locale: ptBR });
  } catch {
    return '-';
  }
};

/**
 * Formatação de valor monetário em Real Brasileiro (BRL).
 */
export const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

/**
 * Formatação genérica de quantidade com sufixo de unidade.
 */
export const formatQuantity = (quantity: number, unit = 'un'): string => {
  return `${new Intl.NumberFormat('pt-BR').format(quantity)} ${unit}`;
};

/**
 * Normalizador de código de produto industrial.
 * Remove espaços em branco, barras indevidas, converte para maiúsculo
 * e padroniza separadores (ex.: " 10 - 042 " -> "10-042", "90/1001" -> "90-1001").
 */
export function normalizarCodigoItem(codigo: string | null | undefined): string {
  if (!codigo) return '';
  return codigo
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[/_]/g, '-');
}

/**
 * Alias semântico para normalizarCodigoItem
 */
export const normalizarCodigoProduto = normalizarCodigoItem;

/**
 * Formatador de peso em Quilogramas (KG) com 2 casas decimais no padrão brasileiro.
 * Exemplo: 1234.5 -> "1.234,50 KG" ou "1.234,50" (se semUnidade = true).
 */
export function formatarPesoKg(
  peso: number | null | undefined,
  incluirUnidade = true
): string {
  if (peso === null || peso === undefined || isNaN(peso)) {
    return incluirUnidade ? '0,00 KG' : '0,00';
  }
  const formatado = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(peso);

  return incluirUnidade ? `${formatado} KG` : formatado;
}

/**
 * Formatador de quantidade inteira para contagens e unidades discretas.
 * Remove casas decimais e formata com separadores de milhar.
 * Exemplo: 1500 -> "1.500".
 */
export function formatarQuantidadeInteira(quantidade: number | null | undefined): string {
  if (quantidade === null || quantidade === undefined || isNaN(quantidade)) {
    return '0';
  }
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 0,
  }).format(Math.floor(quantidade));
}

/**
 * Formatador de quantidade sensível à Unidade de Medida do item.
 * - KG: 2 casas decimais (ex: "12,50 KG")
 * - UNIDADE, PACOTE, PECA: quantidade inteira (ex: "50 UN", "10 PCT", "8 PÇ")
 * - METRO, LITRO: até 2 casas decimais (ex: "3,5 M", "1,25 L")
 */
export function formatarQuantidadePorUnidade(
  quantidade: number | null | undefined,
  unidade: UnidadeMedida
): string {
  const qtd = quantidade ?? 0;

  switch (unidade) {
    case 'KG':
      return formatarPesoKg(qtd, true);

    case 'UNIDADE':
      return `${formatarQuantidadeInteira(qtd)} UN`;

    case 'PACOTE':
      return `${formatarQuantidadeInteira(qtd)} PCT`;

    case 'PECA':
      return `${formatarQuantidadeInteira(qtd)} PÇ`;

    case 'METRO': {
      const formatado = new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(qtd);
      return `${formatado} M`;
    }

    case 'LITRO': {
      const formatado = new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(qtd);
      return `${formatado} L`;
    }

    default:
      return `${new Intl.NumberFormat('pt-BR').format(qtd)} ${unidade}`;
  }
}

/**
 * Sanitizador de número de Nota Fiscal.
 * Remove caracteres não numéricos e preserva o identificador sequencial da nota.
 * Exemplo: "NF 000.123.456-1" -> "123456" ou string numérica correspondente.
 */
export function sanitizarNumeroNF(numeroNF: string | number | null | undefined): string {
  if (!numeroNF) return '';
  const digits = String(numeroNF).replace(/\D/g, '');
  // Remove zeros à esquerda desnecessários, mas mantém '0' se for só zero
  const trimmedZeros = digits.replace(/^0+/, '');
  return trimmedZeros || digits;
}

/**
 * Formata um número de Nota Fiscal com separadores de milhar para exibição.
 * Exemplo: "123456" -> "123.456".
 */
export function formatarNumeroNF(numeroNF: string | number | null | undefined): string {
  const sanitizado = sanitizarNumeroNF(numeroNF);
  if (!sanitizado) return '-';
  const num = parseInt(sanitizado, 10);
  if (isNaN(num)) return sanitizado;
  return new Intl.NumberFormat('pt-BR').format(num);
}

/**
 * Sanitizador de chave de acesso de Nota Fiscal Eletrônica (NFe).
 * Remove espaços, pontos e traços, garantindo apenas os dígitos numéricos (44 dígitos).
 */
export function sanitizarChaveAcessoNFe(chave: string | null | undefined): string {
  if (!chave) return '';
  return chave.replace(/\D/g, '');
}

/**
 * Valida se uma chave de acesso da NFe possui exatamente 44 dígitos numéricos.
 */
export function validarChaveAcessoNFe(chave: string | null | undefined): boolean {
  if (!chave) return false;
  const sanitizada = sanitizarChaveAcessoNFe(chave);
  return sanitizada.length === 44;
}

/**
 * Formata chave de acesso da NFe em blocos de 4 dígitos para fácil leitura humana.
 * Exemplo: "35260100000000000000550010000000011000000010" ->
 * "3526 0100 0000 0000 0000 5500 1000 0000 0110 0000 0010"
 */
export function formatarChaveAcessoNFe(chave: string | null | undefined): string {
  const sanitizada = sanitizarChaveAcessoNFe(chave);
  if (!sanitizada) return '-';
  return sanitizada.replace(/(\d{4})(?=\d)/g, '$1 ');
}
