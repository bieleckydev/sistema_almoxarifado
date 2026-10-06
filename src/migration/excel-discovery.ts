import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx';

const SUPPORTED_EXTENSIONS = new Set(['.xlsx', '.xls', '.xlsm']);
const DEFAULT_INPUT_DIRECTORY = resolve('docs/excel');
const DEFAULT_OUTPUT_FILE = resolve('migration-reports/excel-discovery.json');
const DISTINCT_VALUE_LIMIT = 20;

type CellKind = 'empty' | 'text' | 'number' | 'date' | 'boolean' | 'formula' | 'error';

export interface ColumnDiscovery {
  index: number;
  letter: string;
  header: string | null;
  nonEmptyCells: number;
  kinds: Record<CellKind, number>;
  distinctValues: string[];
  formulaCount: number;
}

export interface SheetDiscovery {
  name: string;
  rows: number;
  columnCount: number;
  range: string | null;
  mergedRanges: string[];
  formulaCount: number;
  emptyRows: number;
  repeatedHeaderRows: number[];
  columns: ColumnDiscovery[];
}

export interface WorkbookDiscovery {
  file: string;
  path: string;
  fileSizeBytes: number;
  sheets: SheetDiscovery[];
  warnings: string[];
}

export interface ExcelDiscoveryReport {
  generatedAt: string;
  inputDirectory: string;
  workbooks: WorkbookDiscovery[];
  warnings: string[];
}

function normalizeHeader(value: unknown): string | null {
  if (value === null || value === undefined || String(value).trim() === '') {
    return null;
  }

  return String(value).trim().replace(/\s+/g, ' ');
}

function cellKind(cell: XLSX.CellObject | undefined): CellKind {
  if (!cell || cell.v === undefined || cell.v === null || cell.v === '') return 'empty';
  if (cell.f) return 'formula';
  if (cell.t === 'n') return cell.v instanceof Date ? 'date' : 'number';
  if (cell.t === 'd') return 'date';
  if (cell.t === 'b') return 'boolean';
  if (cell.t === 'e') return 'error';
  return 'text';
}

function displayValue(cell: XLSX.CellObject | undefined): string | null {
  if (!cell || cell.v === undefined || cell.v === null || cell.v === '') return null;
  return String(cell.w ?? cell.v).trim();
}

function countEmptyRows(sheet: XLSX.WorkSheet, range: XLSX.Range): number {
  let emptyRows = 0;

  for (let row = range.s.r; row <= range.e.r; row += 1) {
    const hasValue = Array.from({ length: range.e.c - range.s.c + 1 }, (_, offset) => {
      const cell = sheet[XLSX.utils.encode_cell({ r: row, c: range.s.c + offset })];
      return cellKind(cell) !== 'empty';
    }).some(Boolean);

    if (!hasValue) emptyRows += 1;
  }

  return emptyRows;
}

function findRepeatedHeaderRows(sheet: XLSX.WorkSheet, range: XLSX.Range): number[] {
  const firstRow = Array.from({ length: range.e.c - range.s.c + 1 }, (_, offset) =>
    normalizeHeader(sheet[XLSX.utils.encode_cell({ r: range.s.r, c: range.s.c + offset })]?.v)
  );

  if (!firstRow.some(Boolean)) return [];

  const repeatedRows: number[] = [];
  for (let row = range.s.r + 1; row <= range.e.r; row += 1) {
    const currentRow = Array.from({ length: firstRow.length }, (_, offset) =>
      normalizeHeader(sheet[XLSX.utils.encode_cell({ r: row, c: range.s.c + offset })]?.v)
    );

    if (currentRow.every((value, index) => value === firstRow[index])) {
      repeatedRows.push(row + 1);
    }
  }

  return repeatedRows;
}

function inspectSheet(workbook: XLSX.WorkBook, name: string): SheetDiscovery {
  const sheet = workbook.Sheets[name];
  const range = sheet['!ref'] ? XLSX.utils.decode_range(sheet['!ref']) : null;
  const columns: ColumnDiscovery[] = [];

  if (!range) {
    return {
      name,
      rows: 0,
      columnCount: 0,
      range: null,
      mergedRanges: (sheet['!merges'] ?? []).map((merge) => XLSX.utils.encode_range(merge)),
      formulaCount: 0,
      emptyRows: 0,
      repeatedHeaderRows: [],
      columns,
    };
  }

  for (let column = range.s.c; column <= range.e.c; column += 1) {
    const kinds: Record<CellKind, number> = {
      empty: 0,
      text: 0,
      number: 0,
      date: 0,
      boolean: 0,
      formula: 0,
      error: 0,
    };
    const distinctValues = new Set<string>();
    let formulaCount = 0;

    for (let row = range.s.r; row <= range.e.r; row += 1) {
      const cell = sheet[XLSX.utils.encode_cell({ r: row, c: column })];
      const kind = cellKind(cell);
      kinds[kind] += 1;
      if (kind === 'formula') formulaCount += 1;

      const value = displayValue(cell);
      if (value !== null && distinctValues.size < DISTINCT_VALUE_LIMIT) {
        distinctValues.add(value);
      }
    }

    columns.push({
      index: column + 1,
      letter: XLSX.utils.encode_col(column),
      header: normalizeHeader(sheet[XLSX.utils.encode_cell({ r: range.s.r, c: column })]?.v),
      nonEmptyCells: range.e.r - range.s.r + 1 - kinds.empty,
      kinds,
      distinctValues: [...distinctValues],
      formulaCount,
    });
  }

  return {
    name,
    rows: range.e.r - range.s.r + 1,
    columnCount: range.e.c - range.s.c + 1,
    range: XLSX.utils.encode_range(range),
    mergedRanges: (sheet['!merges'] ?? []).map((merge) => XLSX.utils.encode_range(merge)),
    formulaCount: columns.reduce((total, column) => total + column.formulaCount, 0),
    emptyRows: countEmptyRows(sheet, range),
    repeatedHeaderRows: findRepeatedHeaderRows(sheet, range),
    columns,
  };
}

function inspectWorkbook(filePath: string): WorkbookDiscovery {
  const workbook = XLSX.read(readFileSync(filePath), {
    cellDates: true,
    cellFormula: true,
    cellNF: false,
    cellStyles: false,
  });
  const warnings: string[] = [];

  if (workbook.SheetNames.length === 0) {
    warnings.push('O arquivo não contém abas.');
  }

  const sheets = workbook.SheetNames.map((name) => inspectSheet(workbook, name));
  for (const sheet of sheets) {
    if (sheet.formulaCount > 0) {
      warnings.push(`A aba "${sheet.name}" contém ${sheet.formulaCount} fórmula(s); os valores precisam ser reconciliados.`);
    }
    if (sheet.repeatedHeaderRows.length > 0) {
      warnings.push(`A aba "${sheet.name}" contém cabeçalho(s) repetido(s) nas linhas ${sheet.repeatedHeaderRows.join(', ')}.`);
    }
    if (sheet.emptyRows > 0) {
      warnings.push(`A aba "${sheet.name}" contém ${sheet.emptyRows} linha(s) vazia(s) dentro do intervalo usado.`);
    }
  }

  return {
    file: basename(filePath),
    path: filePath,
    fileSizeBytes: readFileSync(filePath).byteLength,
    sheets,
    warnings,
  };
}

export function discoverExcelFiles(inputDirectory: string = DEFAULT_INPUT_DIRECTORY): ExcelDiscoveryReport {
  if (!existsSync(inputDirectory)) {
    throw new Error(`Diretório de entrada não encontrado: ${inputDirectory}`);
  }

  const files = readdirSync(inputDirectory)
    .filter((file) => SUPPORTED_EXTENSIONS.has(extname(file).toLowerCase()))
    .sort()
    .map((file) => join(inputDirectory, file));

  if (files.length === 0) {
    throw new Error(`Nenhuma planilha suportada foi encontrada em: ${inputDirectory}`);
  }

  const workbooks = files.map(inspectWorkbook);
  return {
    generatedAt: new Date().toISOString(),
    inputDirectory: resolve(inputDirectory),
    workbooks,
    warnings: workbooks.flatMap((workbook) =>
      workbook.warnings.map((warning) => `${workbook.file}: ${warning}`)
    ),
  };
}

function parseArgument(name: string): string | undefined {
  const argument = process.argv.find((value) => value.startsWith(`${name}=`));
  return argument?.slice(name.length + 1);
}

function main(): void {
  const inputDirectory = resolve(parseArgument('--input') ?? DEFAULT_INPUT_DIRECTORY);
  const outputFile = resolve(parseArgument('--output') ?? DEFAULT_OUTPUT_FILE);
  const report = discoverExcelFiles(inputDirectory);

  mkdirSync(dirname(outputFile), { recursive: true });
  writeFileSync(outputFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  const sheets = report.workbooks.reduce((total, workbook) => total + workbook.sheets.length, 0);
  console.log(
    `Relatório gerado: ${outputFile}\n` +
      `Arquivos: ${report.workbooks.length} | Abas: ${sheets} | Avisos: ${report.warnings.length}`
  );
}

const isMain =
  Boolean(process.argv[1]) &&
  fileURLToPath(import.meta.url).toLowerCase() === resolve(process.argv[1]).toLowerCase();

if (isMain) {
  main();
}
