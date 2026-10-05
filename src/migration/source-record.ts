import { readFileSync } from 'node:fs';
import * as XLSX from 'xlsx';

export type SourceCellValue = string | number | boolean | Date | null;

export interface SourceRecordOrigin {
  file: string;
  sheet: string;
  row: number;
  sourceKey: string;
}

export interface SourceRecord {
  origin: SourceRecordOrigin;
  headers: Record<string, string | null>;
  valuesOriginal: Record<string, SourceCellValue>;
  formulas: Record<string, string>;
}

export interface SourceExtractionResult {
  file: string;
  records: SourceRecord[];
  skippedEmptyRows: number;
}

function isEmptyValue(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}

function toSourceValue(cell: XLSX.CellObject | undefined): SourceCellValue {
  if (!cell || isEmptyValue(cell.v)) return null;
  if (cell.v instanceof Date) return cell.v;
  if (
    typeof cell.v === 'string' ||
    typeof cell.v === 'number' ||
    typeof cell.v === 'boolean'
  ) {
    return cell.v;
  }

  return String(cell.v);
}

function normalizeHeader(value: SourceCellValue): string | null {
  if (value === null) return null;
  const header = String(value).trim().replace(/\s+/g, ' ');
  return header === '' ? null : header;
}

function uniqueKey(baseKey: string, usedKeys: Set<string>): string {
  if (!usedKeys.has(baseKey)) {
    usedKeys.add(baseKey);
    return baseKey;
  }

  let suffix = 2;
  while (usedKeys.has(`${baseKey}_${suffix}`)) suffix += 1;
  const key = `${baseKey}_${suffix}`;
  usedKeys.add(key);
  return key;
}

function getSheetRange(sheet: XLSX.WorkSheet): XLSX.Range | null {
  return sheet['!ref'] ? XLSX.utils.decode_range(sheet['!ref']) : null;
}

function buildHeaders(
  sheet: XLSX.WorkSheet,
  range: XLSX.Range
): Record<string, string | null> {
  const headers: Record<string, string | null> = {};
  const usedHeaders = new Set<string>();

  for (let column = range.s.c; column <= range.e.c; column += 1) {
    const letter = XLSX.utils.encode_col(column);
    const rawHeader = toSourceValue(
      sheet[XLSX.utils.encode_cell({ r: range.s.r, c: column })]
    );
    const normalizedHeader = normalizeHeader(rawHeader);
    const baseKey = normalizedHeader ?? letter;
    headers[letter] = uniqueKey(baseKey, usedHeaders);
  }

  return headers;
}

function rowHasValue(
  sheet: XLSX.WorkSheet,
  row: number,
  range: XLSX.Range
): boolean {
  for (let column = range.s.c; column <= range.e.c; column += 1) {
    if (!isEmptyValue(sheet[XLSX.utils.encode_cell({ r: row, c: column })]?.v)) {
      return true;
    }
  }
  return false;
}

export function extractSheetRecords(
  file: string,
  sheetName: string,
  sheet: XLSX.WorkSheet
): SourceExtractionResult {
  const range = getSheetRange(sheet);
  if (!range) {
    return { file, records: [], skippedEmptyRows: 0 };
  }

  const headers = buildHeaders(sheet, range);
  const records: SourceRecord[] = [];
  let skippedEmptyRows = 0;

  for (let row = range.s.r + 1; row <= range.e.r; row += 1) {
    if (!rowHasValue(sheet, row, range)) {
      skippedEmptyRows += 1;
      continue;
    }

    const valuesOriginal: Record<string, SourceCellValue> = {};
    const formulas: Record<string, string> = {};

    for (let column = range.s.c; column <= range.e.c; column += 1) {
      const cell = sheet[XLSX.utils.encode_cell({ r: row, c: column })];
      const letter = XLSX.utils.encode_col(column);
      const key = headers[letter] ?? letter;
      valuesOriginal[key] = toSourceValue(cell);
      if (cell?.f) formulas[key] = cell.f;
    }

    const sourceRow = row + 1;
    records.push({
      origin: {
        file,
        sheet: sheetName,
        row: sourceRow,
        sourceKey: `${file}|${sheetName}|${sourceRow}|row`,
      },
      headers,
      valuesOriginal,
      formulas,
    });
  }

  return { file, records, skippedEmptyRows };
}

export function extractWorkbookRecords(filePath: string): SourceExtractionResult[] {
  const workbook = XLSX.read(readFileSync(filePath), {
    cellDates: true,
    cellFormula: true,
  });
  const file = filePath.split(/[\\/]/).pop() ?? filePath;

  return workbook.SheetNames.map((sheetName) =>
    extractSheetRecords(file, sheetName, workbook.Sheets[sheetName])
  );
}
