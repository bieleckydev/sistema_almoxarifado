import { Item, ItemSchema } from '@/core/domain/item.schema';
import { Colaborador, ColaboradorSchema } from '@/core/domain/colaborador.schema';
import { Movimentacao, MovimentacaoSchema } from '@/core/domain/movimentacao.schema';

/**
 * Converte com segurança datas de documentos Firestore (Timestamp, Date, string ISO ou epoch)
 * para uma string ISO 8601 exigida pelos schemas Zod do Core.
 */
export function toIsoString(value: unknown): string | undefined {
  if (!value) return undefined;

  // Objeto Timestamp do Firestore (possui toDate)
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  // Objeto Date padrão do JS
  if (value instanceof Date) {
    return value.toISOString();
  }

  // String que pode já ser ISO ou data válida
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
    return value;
  }

  // Número (epoch timestamp em ms ou s)
  if (typeof value === 'number') {
    const isSeconds = value < 10000000000;
    const date = new Date(isSeconds ? value * 1000 : value);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  return undefined;
}

/**
 * Remove recursivamente todas as chaves cujo valor é `undefined`,
 * pois o Firestore rejeita documentos com campos `undefined`.
 */
export function sanitizeForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      continue;
    }
    if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      result[key] = sanitizeForFirestore(value);
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Converte dados brutos do Firestore para a entidade pura Item.
 */
export function itemFromFirestore(docId: string, rawData: Record<string, any>): Item {
  const rawCreatedAt = rawData.createdAt ? toIsoString(rawData.createdAt) : undefined;
  const rawUpdatedAt = rawData.updatedAt ? toIsoString(rawData.updatedAt) : undefined;

  const candidate = {
    ...rawData,
    id: rawData.id || docId,
    createdAt: rawCreatedAt,
    updatedAt: rawUpdatedAt,
  };

  return ItemSchema.parse(candidate);
}

/**
 * Sanitiza a entidade Item para persistência limpa no Firestore.
 */
export function itemToFirestore(item: Item): Record<string, any> {
  return sanitizeForFirestore({
    ...item,
    updatedAt: item.updatedAt || new Date().toISOString(),
  });
}

/**
 * Converte dados brutos do Firestore para a entidade pura Colaborador.
 */
export function colaboradorFromFirestore(docId: string, rawData: Record<string, any>): Colaborador {
  const rawCreatedAt = rawData.createdAt ? toIsoString(rawData.createdAt) : undefined;
  const rawUpdatedAt = rawData.updatedAt ? toIsoString(rawData.updatedAt) : undefined;

  const candidate = {
    ...rawData,
    id: rawData.id || docId,
    createdAt: rawCreatedAt,
    updatedAt: rawUpdatedAt,
  };

  return ColaboradorSchema.parse(candidate);
}

/**
 * Sanitiza a entidade Colaborador para persistência limpa no Firestore.
 */
export function colaboradorToFirestore(colaborador: Colaborador): Record<string, any> {
  return sanitizeForFirestore({
    ...colaborador,
    updatedAt: colaborador.updatedAt || new Date().toISOString(),
  });
}

/**
 * Converte dados brutos do Firestore para a entidade pura Movimentacao.
 */
export function movimentacaoFromFirestore(docId: string, rawData: Record<string, any>): Movimentacao {
  const dataMovimentacao = toIsoString(rawData.dataMovimentacao) || new Date().toISOString();
  const rawCreatedAt = rawData.createdAt ? toIsoString(rawData.createdAt) : undefined;

  const candidate = {
    ...rawData,
    id: rawData.id || docId,
    dataMovimentacao,
    createdAt: rawCreatedAt,
  };

  return MovimentacaoSchema.parse(candidate);
}

/**
 * Sanitiza a entidade Movimentacao para persistência limpa no Firestore.
 */
export function movimentacaoToFirestore(movimentacao: Movimentacao): Record<string, any> {
  return sanitizeForFirestore({
    ...movimentacao,
    createdAt: movimentacao.createdAt || new Date().toISOString(),
  });
}
