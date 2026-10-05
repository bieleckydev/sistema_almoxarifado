import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import * as XLSX from 'xlsx';
import { CreateItemSchema, type CreateItemInput } from '../../core/domain/item.schema';
import {
  normalizeCode,
  normalizeNumber,
  normalizeText,
  normalizeUnit,
  type NormalizationIssue,
} from '../normalizers';
import {
  classifyMigrationIssues,
  type ClassifiedMigrationIssue,
} from '../issue-classification';
import type { SourceCellValue, SourceRecord } from '../source-record';

const WORKBOOK_NAME = 'Cont. de Estoque Disco Flap, Mat. de Solda e Brocas.xlsx';
const SHEET_NAME = 'Tabela de ítens';
const EXPECTED_HEADERS = ['Código', 'Descrição', 'Estoque de Segurança', 'Desc.'];

export interface ItemMigrationCandidate {
  origin: SourceRecord['origin'];
  valuesOriginal: Record<string, SourceCellValue>;
  valuesNormalized: Record<string, SourceCellValue>;
  candidate: CreateItemInput | null;
  issues: ClassifiedMigrationIssue[];
  action: 'CREATE' | 'REJECT';
}

export interface ItemMigrationPreview {
  source: { file: string; sheet: string; headerRow: number };
  candidates: ItemMigrationCandidate[];
  summary: {
    rowsRead: number;
    valid: number;
    rejected: number;
    duplicates: number;
    warnings: number;
    errors: number;
  };
}

function sourceValue(cell: XLSX.CellObject | undefined): SourceCellValue {
  const value = cell?.v;
  if (value === undefined || value === null || value === '') return null;
  if (value instanceof Date || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  return String(value);
}

function findHeaderRow(rows: unknown[][]): number {
  const expected = EXPECTED_HEADERS.map((header) => header.toLowerCase());
  const index = rows.findIndex((row) => {
    const values = row.map((value) => String(value ?? '').trim().toLowerCase());
    return expected.every((header) => values.includes(header));
  });

  if (index < 0) {
    throw new Error(`Cabeçalho esperado não encontrado na aba "${SHEET_NAME}".`);
  }
  return index;
}

function columnIndex(row: unknown[], header: string): number {
  const index = row.findIndex(
    (value) => String(value ?? '').trim().toLowerCase() === header.toLowerCase()
  );
  if (index < 0) throw new Error(`Coluna obrigatória não encontrada: ${header}`);
  return index;
}

function buildOrigin(file: string, row: number): SourceRecord['origin'] {
  return {
    file,
    sheet: SHEET_NAME,
    row,
    sourceKey: `${file}|${SHEET_NAME}|${row}|item`,
  };
}

function addIssue(
  issues: NormalizationIssue[],
  field: string,
  severity: NormalizationIssue['severity'],
  message: string
): void {
  issues.push({ field, severity, message });
}

export function mapImprodutivosItems(filePath: string): ItemMigrationPreview {
  const workbook = XLSX.read(readFileSync(filePath), { cellDates: true, cellFormula: true });
  const sheet = workbook.Sheets[SHEET_NAME];
  if (!sheet) throw new Error(`Aba não encontrada: ${SHEET_NAME}`);

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null, raw: true });
  const headerRowIndex = findHeaderRow(rows);
  const headerRow = rows[headerRowIndex];
  const codeColumn = columnIndex(headerRow, 'Código');
  const descriptionColumn = columnIndex(headerRow, 'Descrição');
  const safetyColumn = columnIndex(headerRow, 'Estoque de Segurança');
  const unitColumn = columnIndex(headerRow, 'Desc.');
  const file = basename(filePath);
  const candidates: ItemMigrationCandidate[] = [];
  const seenCodes = new Map<string, number>();

  for (let rowIndex = headerRowIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const code = row[codeColumn] as SourceCellValue;
    const description = row[descriptionColumn] as SourceCellValue;
    const safety = row[safetyColumn] as SourceCellValue;
    const unit = row[unitColumn] as SourceCellValue;

    if ([code, description, safety, unit].every((value) => value === null || value === '')) continue;

    const origin = buildOrigin(file, rowIndex + 1);
    const valuesOriginal = {
      Código: code ?? null,
      Descrição: description ?? null,
      'Estoque de Segurança': safety ?? null,
      'Desc.': unit ?? null,
    };
    const codeResult = normalizeCode(code, 'Código');
    const descriptionResult = normalizeText(description);
    const safetyResult = normalizeNumber(safety, 'Estoque de Segurança');
    const unitResult = normalizeUnit(unit, 'Desc.');
    const issues = [...codeResult.issues, ...safetyResult.issues, ...unitResult.issues];
    const normalizedCode = codeResult.normalized;
    const normalizedDescription = descriptionResult.normalized;
    const normalizedSafety = safetyResult.normalized;
    const normalizedUnit = unitResult.normalized;
    const valuesNormalized = {
      Código: normalizedCode,
      Descrição: normalizedDescription,
      'Estoque de Segurança': normalizedSafety,
      'Desc.': normalizedUnit,
    };

    if (typeof normalizedCode !== 'string' || !normalizedCode) {
      addIssue(issues, 'Código', 'error', 'Código do item é obrigatório.');
    }
    if (typeof normalizedDescription !== 'string' || normalizedDescription.length < 3) {
      addIssue(issues, 'Descrição', 'error', 'Descrição deve conter no mínimo 3 caracteres.');
    }
    if (typeof normalizedSafety !== 'number' || normalizedSafety < 0) {
      addIssue(issues, 'Estoque de Segurança', 'error', 'Estoque de segurança deve ser um número não negativo.');
    }
    if (typeof normalizedUnit !== 'string' || normalizedUnit !== 'UNIDADE') {
      addIssue(issues, 'Desc.', 'warning', 'A unidade legada será revisada antes da persistência.');
    }

    const codeKey = typeof normalizedCode === 'string' ? normalizedCode : '';
    if (codeKey && seenCodes.has(codeKey)) {
      addIssue(
        issues,
        'Código',
        'error',
        `Código duplicado; primeira ocorrência na linha ${seenCodes.get(codeKey)}.`
      );
    } else if (codeKey) {
      seenCodes.set(codeKey, rowIndex + 1);
    }

    let candidate: CreateItemInput | null = null;
    if (!issues.some((issue) => issue.severity === 'error')) {
      const parsed = CreateItemSchema.safeParse({
        id: `legacy-${codeKey}`,
        codigo: codeKey,
        descricao: normalizedDescription,
        tipo: 'IMPRODUTIVO_CONSUMIVEL',
        unidade: normalizedUnit,
        estoqueSeguranca: normalizedSafety,
        estoqueInicial: 0,
        ativo: true,
      });

      if (parsed.success) {
        candidate = parsed.data;
      } else {
        for (const issue of parsed.error.issues) {
          addIssue(issues, issue.path.join('.') || 'item', 'error', issue.message);
        }
      }
    }

    candidates.push({
      origin,
      valuesOriginal,
      valuesNormalized,
      candidate,
      issues: classifyMigrationIssues(issues),
      action: candidate ? 'CREATE' : 'REJECT',
    });
  }

  const summary = candidates.reduce(
    (result, item) => {
      result.valid += item.action === 'CREATE' ? 1 : 0;
      result.rejected += item.action === 'REJECT' ? 1 : 0;
      result.warnings += item.issues.filter((issue) => issue.severity === 'warning').length;
      result.errors += item.issues.filter((issue) => issue.severity === 'error').length;
      result.duplicates += item.issues.some((issue) => issue.message.startsWith('Código duplicado')) ? 1 : 0;
      return result;
    },
    { rowsRead: candidates.length, valid: 0, rejected: 0, duplicates: 0, warnings: 0, errors: 0 }
  );

  return {
    source: { file, sheet: SHEET_NAME, headerRow: headerRowIndex + 1 },
    candidates,
    summary,
  };
}
