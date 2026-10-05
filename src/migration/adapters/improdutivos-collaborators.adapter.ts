import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import * as XLSX from 'xlsx';
import {
  CreateColaboradorSchema,
  SetorFabrilSchema,
  type CreateColaboradorInput,
} from '../../core/domain/colaborador.schema';
import {
  normalizeRegistration,
  normalizeText,
  type NormalizationIssue,
} from '../normalizers';
import type { SourceCellValue, SourceRecord } from '../source-record';

const SHEET_NAME = 'Tabela de Colobaradores';
const EXPECTED_HEADERS = ['Código', 'Colaborador', 'Setor', 'Função'];

const SECTOR_ALIASES: Record<string, string> = {
  FERRAMENTARIA: 'FERRAMENTARIA',
  FERRAMANTERIA: 'FERRAMENTARIA',
  QUALIDADE: 'QUALIDADE',
  LOGISTICA: 'LOGISTICA',
  'LOGÍSTICA': 'LOGISTICA',
  CADEIRA: 'CADEIRA',
  MONTAGEM: 'MONTAGEM',
  SOLDA: 'SOLDA',
};

export interface CollaboratorMigrationCandidate {
  origin: SourceRecord['origin'];
  valuesOriginal: Record<string, SourceCellValue>;
  valuesNormalized: Record<string, SourceCellValue>;
  candidate: CreateColaboradorInput | null;
  issues: NormalizationIssue[];
  action: 'CREATE' | 'REJECT';
}

export interface CollaboratorMigrationPreview {
  source: { file: string; sheet: string; headerRow: number };
  candidates: CollaboratorMigrationCandidate[];
  summary: {
    rowsRead: number;
    valid: number;
    rejected: number;
    duplicates: number;
    warnings: number;
    errors: number;
  };
}

function sourceValue(value: unknown): SourceCellValue {
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

function addIssue(
  issues: NormalizationIssue[],
  field: string,
  severity: NormalizationIssue['severity'],
  message: string
): void {
  issues.push({ field, severity, message });
}

function normalizeSector(value: SourceCellValue): {
  normalized: string;
  issues: NormalizationIssue[];
} {
  const result = normalizeText(value);
  const text = typeof result.normalized === 'string' ? result.normalized : '';
  const key = text
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const normalized = SECTOR_ALIASES[key] ?? 'OUTRO';
  const issues = [...result.issues];

  if (!text) {
    addIssue(issues, 'Setor', 'warning', 'Setor ausente; será usado OUTRO para revisão.');
  } else if (!SECTOR_ALIASES[key]) {
    addIssue(
      issues,
      'Setor',
      'warning',
      `Setor "${text}" não pertence ao catálogo atual; será usado OUTRO para revisão.`
    );
  }

  return { normalized, issues };
}

function buildOrigin(file: string, row: number): SourceRecord['origin'] {
  return {
    file,
    sheet: SHEET_NAME,
    row,
    sourceKey: `${file}|${SHEET_NAME}|${row}|colaborador`,
  };
}

export function mapImprodutivosCollaborators(filePath: string): CollaboratorMigrationPreview {
  const workbook = XLSX.read(readFileSync(filePath), { cellDates: true, cellFormula: true });
  const sheet = workbook.Sheets[SHEET_NAME];
  if (!sheet) throw new Error(`Aba não encontrada: ${SHEET_NAME}`);

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null, raw: true });
  const headerRowIndex = findHeaderRow(rows);
  const headerRow = rows[headerRowIndex];
  const codeColumn = columnIndex(headerRow, 'Código');
  const nameColumn = columnIndex(headerRow, 'Colaborador');
  const sectorColumn = columnIndex(headerRow, 'Setor');
  const functionColumn = columnIndex(headerRow, 'Função');
  const file = basename(filePath);
  const candidates: CollaboratorMigrationCandidate[] = [];
  const seenRegistrations = new Map<string, number>();

  for (let rowIndex = headerRowIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const registration = sourceValue(row[codeColumn]);
    const name = sourceValue(row[nameColumn]);
    const sector = sourceValue(row[sectorColumn]);
    const role = sourceValue(row[functionColumn]);

    if ([registration, name, sector, role].every((value) => value === null || value === '')) continue;

    const origin = buildOrigin(file, rowIndex + 1);
    const valuesOriginal = {
      Código: registration,
      Colaborador: name,
      Setor: sector,
      Função: role,
    };
    const registrationResult = normalizeRegistration(registration, 'Código');
    const nameResult = normalizeText(name);
    const sectorResult = normalizeSector(sector);
    const roleResult = normalizeText(role);
    const issues = [...registrationResult.issues, ...sectorResult.issues];
    const normalizedRegistration = registrationResult.normalized;
    const normalizedName = nameResult.normalized;
    const normalizedRole = roleResult.normalized;
    const valuesNormalized = {
      Código: normalizedRegistration,
      Colaborador: normalizedName,
      Setor: sectorResult.normalized,
      Função: normalizedRole,
    };

    if (typeof normalizedName !== 'string' || normalizedName.length < 3) {
      addIssue(issues, 'Colaborador', 'error', 'Nome deve conter no mínimo 3 caracteres.');
    }
    if (typeof normalizedRole !== 'string' || normalizedRole.length < 2) {
      addIssue(issues, 'Função', 'warning', 'Função ausente; será necessária revisão.');
    }

    const registrationKey = typeof normalizedRegistration === 'string' ? normalizedRegistration : '';
    if (registrationKey && seenRegistrations.has(registrationKey)) {
      addIssue(
        issues,
        'Código',
        'error',
        `Matrícula duplicada; primeira ocorrência na linha ${seenRegistrations.get(registrationKey)}.`
      );
    } else if (registrationKey) {
      seenRegistrations.set(registrationKey, rowIndex + 1);
    }

    let candidate: CreateColaboradorInput | null = null;
    if (!issues.some((issue) => issue.severity === 'error')) {
      const parsed = CreateColaboradorSchema.safeParse({
        id: `legacy-${registrationKey}`,
        matricula: registrationKey,
        nome: normalizedName,
        setor: SetorFabrilSchema.parse(sectorResult.normalized),
        funcao: normalizedRole || 'Não informado',
        ativo: true,
      });

      if (parsed.success) {
        candidate = parsed.data;
      } else {
        for (const issue of parsed.error.issues) {
          addIssue(issues, issue.path.join('.') || 'colaborador', 'error', issue.message);
        }
      }
    }

    candidates.push({
      origin,
      valuesOriginal,
      valuesNormalized,
      candidate,
      issues,
      action: candidate ? 'CREATE' : 'REJECT',
    });
  }

  const summary = candidates.reduce(
    (result, collaborator) => {
      result.valid += collaborator.action === 'CREATE' ? 1 : 0;
      result.rejected += collaborator.action === 'REJECT' ? 1 : 0;
      result.warnings += collaborator.issues.filter((issue) => issue.severity === 'warning').length;
      result.errors += collaborator.issues.filter((issue) => issue.severity === 'error').length;
      result.duplicates += collaborator.issues.some((issue) => issue.message.startsWith('Matrícula duplicada')) ? 1 : 0;
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
