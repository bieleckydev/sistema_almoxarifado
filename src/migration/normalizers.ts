import { normalizarCodigoItem } from '../core/utils/formatters';
import { normalizarMatricula } from '../core/domain/colaborador.schema';
import type { SourceCellValue, SourceRecord } from './source-record';

export type NormalizationSeverity = 'warning' | 'error';

export interface NormalizationIssue {
  field: string;
  severity: NormalizationSeverity;
  message: string;
}

export interface NormalizedValue {
  original: SourceCellValue;
  normalized: SourceCellValue;
  changed: boolean;
  issues: NormalizationIssue[];
}

export interface NormalizedSourceRecord {
  origin: SourceRecord['origin'];
  valuesOriginal: SourceRecord['valuesOriginal'];
  valuesNormalized: Record<string, SourceCellValue>;
  formulas: SourceRecord['formulas'];
  changes: string[];
  issues: NormalizationIssue[];
}

const UNIT_ALIASES: Record<string, string> = {
  KG: 'KG',
  QUILO: 'KG',
  QUILOGRAMA: 'KG',
  QUILOGRAMAS: 'KG',
  KILO: 'KG',
  KILOGRAMA: 'KG',
  M: 'METRO',
  MT: 'METRO',
  MTS: 'METRO',
  METRO: 'METRO',
  METROS: 'METRO',
  UN: 'UNIDADE',
  UND: 'UNIDADE',
  UNID: 'UNIDADE',
  UNIDADE: 'UNIDADE',
  UNIDADES: 'UNIDADE',
  PCT: 'PACOTE',
  PACOTE: 'PACOTE',
  PACOTES: 'PACOTE',
  PC: 'PECA',
  PÇ: 'PECA',
  PECA: 'PECA',
  PECAS: 'PECA',
  L: 'LITRO',
  LT: 'LITRO',
  LITRO: 'LITRO',
  LITROS: 'LITRO',
};

const DATE_FIELD_PATTERN = /(data|date|emiss|receb|moviment|lan[cç]amento|dia)/i;
const NUMBER_FIELD_PATTERN = /(quant|qtd|quantidade|saldo|estoque|peso|valor|pre[cç]o|kg|metro|n[uú]mero|nf)/i;
const CODE_FIELD_PATTERN = /(c[oó]digo|cod\b|item|produto)/i;
const MATRICULA_FIELD_PATTERN = /(matr[ií]cula|colaborador|funcion[aá]rio|c[oó]digo.*pessoa)/i;
const UNIT_FIELD_PATTERN = /(unidade|und|u\.m\.|medida)/i;

function emptyIssueList(): NormalizationIssue[] {
  return [];
}

function asText(value: SourceCellValue): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

function normalizeText(value: SourceCellValue): NormalizedValue {
  if (value === null || typeof value !== 'string') {
    return { original: value, normalized: value, changed: false, issues: emptyIssueList() };
  }

  const normalized = value.trim().replace(/\s+/g, ' ');
  return {
    original: value,
    normalized,
    changed: normalized !== value,
    issues: emptyIssueList(),
  };
}

export function normalizeCode(value: SourceCellValue, field: string): NormalizedValue {
  if (value === null) return normalizeText(value);
  const normalized = normalizarCodigoItem(asText(value));
  const issues = emptyIssueList();

  if (!normalized) {
    issues.push({ field, severity: 'error', message: 'Código vazio após normalização.' });
  } else if (!/^(10|90|100)-[A-Z0-9-]+$/.test(normalized)) {
    issues.push({
      field,
      severity: 'warning',
      message: `Código "${normalized}" não segue o padrão esperado de prefixos 10, 90 ou 100.`,
    });
  }

  return {
    original: value,
    normalized,
    changed: normalized !== value,
    issues,
  };
}

export function normalizeRegistration(value: SourceCellValue, field: string): NormalizedValue {
  if (value === null) return normalizeText(value);
  const normalized = normalizarMatricula(asText(value));
  const issues = emptyIssueList();

  if (!normalized) {
    issues.push({ field, severity: 'error', message: 'Matrícula vazia após normalização.' });
  } else if (!/^\d{3,4}$/.test(normalized)) {
    issues.push({ field, severity: 'error', message: 'Matrícula deve conter de 3 a 4 dígitos.' });
  }

  return {
    original: value,
    normalized,
    changed: normalized !== value,
    issues,
  };
}

export function normalizeUnit(value: SourceCellValue, field: string): NormalizedValue {
  if (value === null) return normalizeText(value);
  const original = asText(value);
  const normalized = UNIT_ALIASES[original.trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')];
  const issues = emptyIssueList();

  if (!normalized) {
    issues.push({
      field,
      severity: 'error',
      message: `Unidade "${original}" não foi reconhecida.`,
    });
  }

  return {
    original: value,
    normalized: normalized ?? original.trim(),
    changed: (normalized ?? original.trim()) !== value,
    issues,
  };
}

export function normalizeNumber(value: SourceCellValue, field: string): NormalizedValue {
  if (value === null || typeof value === 'number') {
    return {
      original: value,
      normalized: value,
      changed: false,
      issues: emptyIssueList(),
    };
  }

  const original = asText(value).trim();
  if (!original) return normalizeText(value);

  const compact = original.replace(/\s/g, '');
  const normalizedText =
    compact.includes(',') && compact.includes('.')
      ? compact.lastIndexOf(',') > compact.lastIndexOf('.')
        ? compact.replace(/\./g, '').replace(',', '.')
        : compact.replace(/,/g, '')
      : compact.replace(',', '.');
  const parsed = Number(normalizedText);
  const issues = emptyIssueList();

  if (!Number.isFinite(parsed)) {
    issues.push({
      field,
      severity: 'error',
      message: `Valor numérico inválido: "${original}".`,
    });
    return { original: value, normalized: value, changed: false, issues };
  }

  return {
    original: value,
    normalized: parsed,
    changed: typeof value !== 'number' || parsed !== value,
    issues,
  };
}

function parseDate(value: SourceCellValue): string | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = XLSXDateFromSerial(value);
    return parsed?.toISOString() ?? null;
  }
  if (typeof value !== 'string') return null;

  const text = value.trim();
  const brazilian = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (brazilian) {
    const year = Number(brazilian[3].length === 2 ? `20${brazilian[3]}` : brazilian[3]);
    const date = new Date(
      Date.UTC(year, Number(brazilian[2]) - 1, Number(brazilian[1]), Number(brazilian[4] ?? 0), Number(brazilian[5] ?? 0), Number(brazilian[6] ?? 0))
    );
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function XLSXDateFromSerial(serial: number): Date | null {
  const milliseconds = Math.round((serial - 25569) * 86400 * 1000);
  const date = new Date(milliseconds);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function normalizeDate(value: SourceCellValue, field: string): NormalizedValue {
  if (value === null) return normalizeText(value);
  const normalized = parseDate(value);
  const issues = emptyIssueList();

  if (!normalized) {
    issues.push({ field, severity: 'error', message: `Data inválida: "${asText(value)}".` });
  }

  return {
    original: value,
    normalized: normalized ?? value,
    changed: normalized !== value,
    issues,
  };
}

export function normalizeField(field: string, value: SourceCellValue): NormalizedValue {
  if (MATRICULA_FIELD_PATTERN.test(field)) return normalizeRegistration(value, field);
  if (CODE_FIELD_PATTERN.test(field)) return normalizeCode(value, field);
  if (UNIT_FIELD_PATTERN.test(field)) return normalizeUnit(value, field);
  if (DATE_FIELD_PATTERN.test(field)) return normalizeDate(value, field);
  if (NUMBER_FIELD_PATTERN.test(field)) return normalizeNumber(value, field);
  return normalizeText(value);
}

export function normalizeSourceRecord(record: SourceRecord): NormalizedSourceRecord {
  const valuesNormalized: Record<string, SourceCellValue> = {};
  const changes: string[] = [];
  const issues: NormalizationIssue[] = [];

  for (const [field, value] of Object.entries(record.valuesOriginal)) {
    const result = normalizeField(field, value);
    valuesNormalized[field] = result.normalized;
    issues.push(...result.issues);
    if (result.changed) changes.push(field);
  }

  return {
    origin: record.origin,
    valuesOriginal: record.valuesOriginal,
    valuesNormalized,
    formulas: record.formulas,
    changes,
    issues,
  };
}
