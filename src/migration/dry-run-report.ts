import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { mapImprodutivosCollaborators } from './adapters/improdutivos-collaborators.adapter';
import { mapImprodutivosItems } from './adapters/improdutivos-items.adapter';
import type { ClassifiedMigrationIssue } from './issue-classification';

const DEFAULT_INPUT = resolve(
  'docs/excel/Cont. de Estoque Disco Flap, Mat. de Solda e Brocas.xlsx'
);
const DEFAULT_OUTPUT = resolve('migration-reports/improdutivos-dry-run.json');

export interface DryRunIssue {
  entity: 'ITEM' | 'COLABORADOR';
  sourceKey: string;
  file: string;
  sheet: string;
  row: number;
  field: string;
  severity: ClassifiedMigrationIssue['severity'];
  message: string;
  category: ClassifiedMigrationIssue['category'];
  action: ClassifiedMigrationIssue['action'];
  blocking: boolean;
}

export interface DryRunReport {
  generatedAt: string;
  mode: 'DRY_RUN';
  sources: Array<{ file: string; sheet: string; headerRow: number }>;
  entities: {
    items: ReturnType<typeof mapImprodutivosItems>['summary'];
    collaborators: ReturnType<typeof mapImprodutivosCollaborators>['summary'];
  };
  summary: {
    rowsRead: number;
    valid: number;
    rejected: number;
    duplicates: number;
    warnings: number;
    errors: number;
  };
  issues: DryRunIssue[];
  issueCategories: Record<
    ClassifiedMigrationIssue['category'],
    { count: number; blocking: number }
  >;
}

function argument(name: string): string | undefined {
  return process.argv.find((value) => value.startsWith(`${name}=`))?.slice(name.length + 1);
}

function collectIssues(
  entity: DryRunIssue['entity'],
  candidates: Array<{
    origin: { sourceKey: string; file: string; sheet: string; row: number };
    issues: ClassifiedMigrationIssue[];
  }>
): DryRunIssue[] {
  return candidates.flatMap((candidate) =>
    candidate.issues.map((issue) => ({
      entity,
      sourceKey: candidate.origin.sourceKey,
      file: candidate.origin.file,
      sheet: candidate.origin.sheet,
      row: candidate.origin.row,
      field: issue.field,
      severity: issue.severity,
      message: issue.message,
      category: issue.category,
      action: issue.action,
      blocking: issue.blocking,
    }))
  );
}

export function buildImprodutivosDryRunReport(
  inputPath: string = DEFAULT_INPUT
): DryRunReport {
  const items = mapImprodutivosItems(inputPath);
  const collaborators = mapImprodutivosCollaborators(inputPath);
  const issues = [
    ...collectIssues('ITEM', items.candidates),
    ...collectIssues('COLABORADOR', collaborators.candidates),
  ];
  const issueCategories = issues.reduce<DryRunReport['issueCategories']>((result, issue) => {
    const current = result[issue.category] ?? { count: 0, blocking: 0 };
    current.count += 1;
    current.blocking += issue.blocking ? 1 : 0;
    result[issue.category] = current;
    return result;
  }, {} as DryRunReport['issueCategories']);

  return {
    generatedAt: new Date().toISOString(),
    mode: 'DRY_RUN',
    sources: [items.source, collaborators.source],
    entities: {
      items: items.summary,
      collaborators: collaborators.summary,
    },
    summary: {
      rowsRead: items.summary.rowsRead + collaborators.summary.rowsRead,
      valid: items.summary.valid + collaborators.summary.valid,
      rejected: items.summary.rejected + collaborators.summary.rejected,
      duplicates: items.summary.duplicates + collaborators.summary.duplicates,
      warnings: items.summary.warnings + collaborators.summary.warnings,
      errors: items.summary.errors + collaborators.summary.errors,
    },
    issues,
    issueCategories,
  };
}

function main(): void {
  const input = resolve(argument('--input') ?? DEFAULT_INPUT);
  const output = resolve(argument('--output') ?? DEFAULT_OUTPUT);
  const report = buildImprodutivosDryRunReport(input);

  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(
    `Relatório dry-run gerado: ${output}\n` +
      `Registros: ${report.summary.rowsRead} | Válidos: ${report.summary.valid} | ` +
      `Rejeitados: ${report.summary.rejected} | Duplicados: ${report.summary.duplicates} | ` +
      `Avisos: ${report.summary.warnings} | Erros: ${report.summary.errors}`
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
